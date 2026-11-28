// services/push-watcher.js
// ─────────────────────────────────────────────────────────────
// Vigilante automático de notificaciones push (GRATIS: usa FCM).
// Lee NUESTRA API (liganacionalgt.com/sistema/api), detecta cambios y
// envía la notificación a quien sigue el partido o a los equipos:
//
//   • Alineaciones confirmadas      • ¡Arrancó el partido!
//   • ⚽ Gol (con marcador)          • 🟥 Expulsión
//   • Medio tiempo                  • Arranca el 2º tiempo
//   • Final del partido
//
// Corre en el MISMO servidor que services/server.js (usa su serviceAccountKey.json):
//   node services/push-watcher.js            → en producción
//   DRY_RUN=1 node services/push-watcher.js  → solo imprime, no envía (para probar)
//   pm2 start services/push-watcher.js --name lngt-push-watcher
//
// Variables opcionales (.env):
//   API_BASE=https://liganacionalgt.com/sistema/api
//   GLOBAL_TOPIC=liganacionalgt           (todos los usuarios)
//   GLOBAL_EVENTS=goal,final              (qué también va a TODOS; vacío = nada)
//   STATE_FILE=./push-state.json
// ─────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const API_BASE = (process.env.API_BASE || 'https://liganacionalgt.com/sistema/api').replace(/\/+$/, '');
const GLOBAL_TOPIC = process.env.GLOBAL_TOPIC || 'liganacionalgt';
const GLOBAL_EVENTS = new Set(String(process.env.GLOBAL_EVENTS ?? 'goal,final').split(',').map((s) => s.trim()).filter(Boolean));
const STATE_FILE = process.env.STATE_FILE || path.join(__dirname, 'push-state.json');
const DRY_RUN = process.env.DRY_RUN === '1';

const FAST_MS = 20_000; // hay partido en juego o por empezar
const SLOW_MS = 5 * 60_000; // no hay nada cerca
const WINDOW_BEFORE_MS = 75 * 60_000; // vigilar desde 75 min antes (alineaciones)
const WINDOW_AFTER_MS = 4 * 3600_000; // y hasta 4 h después del inicio

const LIVE = new Set(['live', 'first_half', 'second_half', 'extra_time', 'penalties', 'halftime']);

if (!DRY_RUN) {
  admin.initializeApp({ credential: admin.credential.cert(require('./serviceAccountKey.json')) });
}

/* ───────── Estado (para no repetir notificaciones aunque se reinicie) ───────── */
let state = {};
try {
  state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
} catch {
  state = {};
}
const saveState = () => {
  // limpiamos partidos de hace más de 3 días
  const cutoff = Date.now() - 3 * 86400_000;
  for (const k of Object.keys(state)) if ((state[k].seenAt || 0) < cutoff) delete state[k];
  fs.writeFileSync(STATE_FILE, JSON.stringify(state));
};

/* ───────── API ───────── */
async function get(file, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API_BASE}/${file}${qs ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json', 'X-LNGT-Client': 'push-watcher' },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`${file} HTTP ${res.status}`);
  return res.json();
}
const pickArray = (raw, ...keys) => {
  if (Array.isArray(raw)) return raw;
  for (const k of keys) if (Array.isArray(raw?.[k])) return raw[k];
  return [];
};

const teamOf = (t) => (t ? { id: t.id ?? t.team_id, name: t.short_name && t.name?.length > 16 ? t.short_name : t.name || '' } : { id: null, name: '' });
const scoreOf = (mc) => {
  const s = mc.score || {};
  const h = mc.teams?.home?.score ?? s.home ?? mc.match?.home?.score ?? 0;
  const a = mc.teams?.away?.score ?? s.away ?? mc.match?.away?.score ?? 0;
  return [Number(h) || 0, Number(a) || 0];
};
const minuteOf = (e) => (Number(e.stoppage) > 0 ? `${e.minute}+${e.stoppage}'` : `${e.minute}'`);
const kindOf = (type = '') => {
  const t = String(type).toLowerCase();
  if (t.includes('penalty') && t.includes('miss')) return 'other';
  if (t === 'own_goal') return 'own_goal';
  if (t.includes('goal')) return 'goal';
  if (t === 'red_card' || t === 'second_yellow' || t === 'yellow_red_card') return 'red';
  return 'other';
};

/* ───────── Envío FCM ───────── */
async function send({ type, matchId, home, away, title, body, initialTab }) {
  // Una sola notificación por persona aunque siga partido + equipo + global
  const topics = [`match_${matchId}`];
  if (home.id) topics.push(`team_${home.id}`);
  if (away.id) topics.push(`team_${away.id}`);
  if (GLOBAL_EVENTS.has(type)) topics.push(GLOBAL_TOPIC);
  const condition = topics.map((t) => `'${t}' in topics`).join(' || ');

  const message = {
    condition,
    notification: { title, body },
    data: {
      type,
      screen: 'Match',
      matchId: String(matchId),
      homeTeamId: String(home.id ?? ''),
      awayTeamId: String(away.id ?? ''),
      initialTab: initialTab || '',
      title,
      body,
    },
    android: { priority: 'high', collapseKey: `match_${matchId}`, notification: { channelId: 'default', sound: 'default', tag: `${type}_${matchId}` } },
    apns: { payload: { aps: { sound: 'default' } } },
  };

  console.log(`[push] ${type} · ${title} — ${body}  →  ${condition}`);
  if (DRY_RUN) return;
  try {
    await admin.messaging().send(message);
  } catch (e) {
    console.error('[push] error', e?.message || e);
  }
}

/* ───────── Lógica por partido ───────── */
async function checkMatch(m) {
  const id = String(m.id);
  const raw = await get('match-center.php', { id });
  const mc = raw?.data && raw.data.match ? raw.data : raw;
  if (!mc?.match) return;

  const home = teamOf(mc.teams?.home || mc.match.home);
  const away = teamOf(mc.teams?.away || mc.match.away);
  const status = mc.match.status || m.status || 'scheduled';
  const [hs, as] = scoreOf(mc);
  const vs = `${home.name} ${hs}-${as} ${away.name}`;
  const events = (mc.events || []).filter((e) => e.active !== 0);
  const hasLineups = Boolean(mc.lineups?.home?.starters?.length && mc.lineups?.away?.starters?.length);

  const prev = state[id];
  // Primera vez que vemos el partido: memorizamos SIN notificar (evita avalancha al reiniciar)
  if (!prev) {
    state[id] = { status, events: events.map((e) => String(e.id)), lineups: hasLineups, seenAt: Date.now() };
    return;
  }
  prev.seenAt = Date.now();
  const base = { matchId: id, home, away };

  // Alineaciones
  if (hasLineups && !prev.lineups) {
    prev.lineups = true;
    if (status === 'scheduled') await send({ ...base, type: 'lineups', initialTab: 'lineups', title: '📋 Alineaciones confirmadas', body: `${home.name} vs ${away.name} · Mira los onces titulares` });
  }

  // Cambios de estado
  if (status !== prev.status) {
    const was = prev.status;
    prev.status = status;
    if ((status === 'first_half' || status === 'live') && !LIVE.has(was)) await send({ ...base, type: 'kickoff', title: '🟢 ¡Arrancó el partido!', body: `${home.name} vs ${away.name}` });
    else if (status === 'halftime') await send({ ...base, type: 'halftime', title: '⏸️ Medio tiempo', body: vs });
    else if (status === 'second_half' && was === 'halftime') await send({ ...base, type: 'second_half', title: '▶️ Arranca el segundo tiempo', body: vs });
    else if (status === 'finished' && was !== 'finished') await send({ ...base, type: 'final', title: '🏁 Final del partido', body: vs });
  }

  // Eventos nuevos (goles y expulsiones)
  const known = new Set(prev.events);
  for (const e of events) {
    const eid = String(e.id);
    if (known.has(eid)) continue;
    prev.events.push(eid);
    const k = kindOf(e.event_type);
    const side = Number(e.team_id) === Number(home.id) ? home : away;
    const player = e.player_name || '';
    if (k === 'goal' || k === 'own_goal') {
      const scorerTeam = k === 'own_goal' ? (side === home ? away : home) : side;
      await send({
        ...base,
        type: 'goal',
        title: `⚽ ¡GOOOL de ${scorerTeam.name}!`,
        body: `${player ? `${player}${k === 'own_goal' ? ' (autogol)' : ''} ${minuteOf(e)} · ` : ''}${vs}`,
      });
    } else if (k === 'red') {
      await send({ ...base, type: 'red', title: `🟥 Expulsado en ${side.name}`, body: `${player ? `${player} ${minuteOf(e)} · ` : ''}${vs}` });
    }
  }
}

/* ───────── Bucle ───────── */
async function tick() {
  let next = SLOW_MS;
  try {
    const raw = await get('matches.php');
    const list = pickArray(raw, 'matches', 'data', 'items');
    const now = Date.now();
    const watch = list.filter((m) => {
      const ko = m.kickoff ? new Date(m.kickoff).getTime() : NaN;
      if (LIVE.has(m.status) || m.isLive) return true;
      if (!Number.isFinite(ko)) return false;
      return ko - now < WINDOW_BEFORE_MS && now - ko < WINDOW_AFTER_MS;
    });
    for (const m of watch) {
      try {
        await checkMatch(m);
      } catch (e) {
        console.error(`[watch] partido ${m.id}:`, e?.message || e);
      }
    }
    saveState();
    if (watch.length) next = FAST_MS;
  } catch (e) {
    console.error('[watch] API:', e?.message || e);
    next = 60_000;
  }
  setTimeout(tick, next);
}

console.log(`[watch] iniciado · API ${API_BASE} · ${DRY_RUN ? 'MODO PRUEBA (no envía)' : 'enviando con FCM'}`);
tick();
