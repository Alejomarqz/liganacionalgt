// components/TeamSummary.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { API_WEB_DEPORT_URL, API_CUSTOM_DIGITAL } from '@env';
import Card from './Card';
import LogoImg from './LogoImg';
import Avatar from './Avatar';
import changeName, { bestPersonNameFromObj } from '../utils/changeName';
import { useNavigation } from '@react-navigation/native';
import { withTheme } from '../utils/ThemeContext';


const BASE = String(API_WEB_DEPORT_URL || '').replace(/\/+$/, '');
const CUSTOM = String(API_CUSTOM_DIGITAL || '').replace(/\/+$/, '');
const FUTURE = new Set([0]); // statusId = 0 → programado
// --- CONFIG / URLs ---
const API_JORNADAS_URL =
  (typeof global !== 'undefined' && global.API_JORNADAS_URL) ||
  'https://futbolchapin.net/edit/agenda-jornadas.json';

// Si en tu proyecto ya existe API_WEB_DEPORT_URL, esto lo respeta.
// Si no existe, reemplázalo por tu base real (¡importante!).
const API_WEB_DEPORT_URL_FALLBACK =
  (typeof global !== 'undefined' && global.API_WEB_DEPORT_URL) ||
  'https://futbolchapin.net/html/v3/htmlCenter/data/deportes/futbol';

  

const firstValidId = (...vals) => {
  for (const v of vals) {
    const n = typeof v === 'number' ? v : Number(v);
    if (isPosNum(n)) return n;
    const tail = extractTailId(v);
    if (isPosNum(tail)) return tail;
  }
  return NaN;
};




/* ============================== Utils ============================== */
const isHHMM = (s) => /^\d{2}:\d{2}$/.test(String(s || '').slice(0, 5));
const sanitizeForCard = (m) => ({
  ...m,
  _dateAdj: String(m._dateAdj || m.date || '').replace(/-/g, '').slice(0, 8),
  scheduledStart: isHHMM(m.scheduledStart) ? String(m.scheduledStart).slice(0, 5) : '',
  gmt: m.gmt != null && isFinite(+m.gmt) ? Number(m.gmt) : null,
});

// === Overlay helpers (jornadas + events) ===
const isPosNum = (v) => Number.isFinite(Number(v)) && Number(v) > 0;
const extractTailId = (v) => {
  const m = String(v ?? '').match(/(\d{4,})$/);
  return m ? Number(m[1]) : NaN;
};

const pickOverlay = (ev) => {
  if (!ev || typeof ev !== 'object') return null;
  return {
    statusId: Number(ev.statusId ?? ev?.status?.statusId ?? NaN),
    scoreStatus: ev.scoreStatus ?? null,
    score: ev.score ?? (ev.scoreHA ? { H: Number(ev.scoreHA.H), A: Number(ev.scoreHA.A) } : null),
    scheduledStart: ev.scheduledStart ?? ev.scheduled ?? ev?.match?.scheduledStart ?? null,
    gmt: ev.gmt ?? ev?.match?.gmt ?? null,
  };
};

const mergeOverlay = (m, o) => {
  if (!o) return m;
  return {
    ...m,
    statusId: Number.isFinite(Number(o.statusId)) ? Number(o.statusId) : m.statusId,
    scoreStatus: o.scoreStatus ?? m.scoreStatus ?? null,
    score: o.score ?? m.score ?? null,
    scheduledStart: o.scheduledStart ?? m.scheduledStart ?? null,
    gmt: o.gmt ?? m.gmt ?? null,
  };
};

async function overlayFromJornadas(ids, scope, bust=false) {
  try {
    const qs = bust ? `?t=${Date.now()}` : '';
    const opts = bust ? { headers:{'Cache-Control':'no-cache'} } : {};
    const r = await fetch(`${BASE}/${scope}/agenda-jornadas.json${qs}`, opts);
    if (!r.ok) return {};
    const data = await r.json();
    const events = data?.events || data || {};
    const out = {};
    for (const [key, ev] of Object.entries(events)) {
      const id = extractTailId(key);
      if (ids.includes(id)) out[id] = pickOverlay(ev);
    }
    return out;
  } catch (e) {
    console.log('[TeamSummary] jornadas overlay', e?.message || e);
    return {};
  }
}

async function overlayFromEvent(id, scope, bust=false) {
  try {
    const qs = bust ? `?t=${Date.now()}` : '';
    const opts = bust ? { headers:{'Cache-Control':'no-cache'} } : {};
    const r = await fetch(`${BASE}/${scope}/events/${id}.json${qs}`, opts);
    if (!r.ok) return {};
    const ev = await r.json();
    return (
      pickOverlay(ev) || {
        statusId: Number(ev?.status?.statusId ?? NaN),
        scoreStatus: ev?.scoreStatus ?? null,
        scheduledStart: ev?.match?.scheduledStart ?? null,
        gmt: ev?.match?.gmt ?? null,
      }
    );
  } catch (e) {
    console.log('[TeamSummary] event overlay', id, e?.message || e);
    return {};
  }
}




// Carga agenda del equipo (usa agendaMaM y cae a agenda-jornadas)
async function fetchAgendaForTeam(teamId, scope, bust=false) {
  const teamUrl = `${BASE}/${scope}/agendaMaM/agenda_${teamId}.json`;
  const allUrl = `${BASE}/${scope}/agenda-jornadas.json`;
  try {
    const qs = bust ? `?t=${Date.now()}` : '';
    const opts = bust ? { headers:{'Cache-Control':'no-cache'} } : {};
    const r = await fetch(`${teamUrl}${qs}`, opts);
    if (r.ok) {
      const j = await r.json();
      return (j && j.events) || j || {};
    }
  } catch {}
  try {
    const r2 = await fetch(`${allUrl}${qs}`, opts);
    if (r.ok) {
      const j = await r.json();
      return (j && j.events) || j || {};
    }
  } catch {}
  return {};
}

/**
 * Construye un índice { matchId -> overlay } desde agenda-jornadas.json
 * Estructura tolerante: ya sea objeto {channelKey:{...}} o por rondas con "events".
 */
const buildJornadasIndex = (data) => {
  const map = new Map();

  const tryAdd = (key, ev) => {
    const mid = firstValidId(key, ev?.matchId, ev?.id, ev?.eventId, ev?.channel);
    if (!isPosNum(mid)) return;
    const ov = pickOverlay(ev);
    if (!ov) return;
    map.set(mid, ov);
  };

  if (!data) return map;

  // Caso 1: objeto plano { "<channelKey>": { ...event } }
  if (!Array.isArray(data) && typeof data === 'object') {
    for (const [key, ev] of Object.entries(data)) {
      // algunos JSON traen subnodos .events
      if (ev && typeof ev === 'object' && ev.events && typeof ev.events === 'object') {
        for (const [k2, ev2] of Object.entries(ev.events)) tryAdd(k2, ev2);
      } else {
        tryAdd(key, ev);
      }
    }
    return map;
  }

  // Caso 2: arreglo por jornadas [{ title, events:{...} }, ...]
  if (Array.isArray(data)) {
    for (const round of data) {
      const evs = round?.events;
      if (evs && typeof evs === 'object') {
        for (const [key, ev] of Object.entries(evs)) tryAdd(key, ev);
      }
    }
  }

  return map;
};


/**
 * Enriquecer los 5 últimos partidos con overlay híbrido.
 * 1) Si scope==='guatemala' intenta jornadas (un solo fetch).
 * 2) Para los que falten, pide events/{id}.json (máx. 5 fetch).
 */
const enrichPastFiveHybrid = async (pastFive, scope = 'guatemala') => {
  if (!Array.isArray(pastFive) || pastFive.length === 0) return pastFive;

  const ids = pastFive.map((m) => Number(m?.matchId)).filter(isPosNum);
  if (!ids.length) return pastFive;

  let byId = {};
  if (scope === 'guatemala') {
    const jOver = await overlayFromJornadas(ids);
    byId = { ...jOver };
  }

  // Fallback puntual para los que aún no tienen overlay
  const missing = ids.filter((id) => byId[id] == null);
  if (missing.length) {
    const results = await Promise.all(missing.map((id) => overlayFromEvent(id, scope)));
    missing.forEach((id, i) => {
      if (results[i] && Object.keys(results[i]).length) byId[id] = results[i];
    });
  }

  // Merge final
  return pastFive.map((m) => mergeOverlay(m, byId[m.matchId]));
};


// Convierte item del feed a match para <Card/>
function eventToMatch(key, ev, scope) {
  if (!ev || typeof ev !== 'object') return null;

  // --- ID robusto ---
  const extractNumTail = (v) => {
    const m = String(v ?? '').match(/(\d{4,})$/);
    return m ? Number(m[1]) : NaN;
  };
  const firstValidId = (...vals) => {
    for (const v of vals) {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n) && n > 0) return n;
      const tail = extractNumTail(v);
      if (Number.isFinite(tail) && tail > 0) return tail;
    }
    return null;
  };

  // 1) Intentar con el key (ahora sí preservado)  2) campos comunes en el evento
  const id = firstValidId(
    key,
    ev.matchId, ev.id, ev.eventId, ev.event_id,
    ev?.match?.id, ev?.event?.id,
    ev.channel, ev.channelKey, ev.key, ev.url, ev.href
  );
  if (!id) return null; // sin ID válido no pintamos Card (evita "matchId: 0")

  const t = ev.teams || {};
  const out = {
    channelKey: String(key ?? ''),
    matchId: id,
    scope,
    date: String(ev.date || '').replace(/-/g, ''),
    _dateAdj: String(ev.date || '').replace(/-/g, ''),
    scheduledStart: String(ev.scheduledStart || ev.scheduled || '').slice(0, 5),
    gmt: ev.gmt,
    statusId: Number(ev.statusId != null ? ev.statusId : 0),
    teams: {
      homeTeamId: t.homeTeamId ?? t.homeId ?? null,
      awayTeamId: t.awayTeamId ?? t.awayId ?? null,
      homeTeamName: changeName(t.homeTeamName || t.homeName || ''),
      awayTeamName: changeName(t.awayTeamName || t.awayName || ''),
    },
    score: ev.score ?? null,
    scoreStatus: ev.scoreStatus ?? null,
  };
  return sanitizeForCard(out);
}



// W/D/L + rival + marcador (para chips de forma)
function resultChipFor(match, teamId) {
  const hid = String(match?.teams?.homeTeamId || '');
  const aid = String(match?.teams?.awayTeamId || '');

  // intenta leer H/A desde varias fuentes
  let hs = null, as = null;

  // 1) scoreStatus { [teamId]: {score} }
  if (match?.scoreStatus) {
    const hs0 = match.scoreStatus[hid]?.score;
    const as0 = match.scoreStatus[aid]?.score;
    if (Number.isFinite(+hs0) && Number.isFinite(+as0)) { hs = +hs0; as = +as0; }
  }
  // 2) "3-1" o "3:1"
  if (hs == null && typeof match?.score === 'string') {
    const m = /^\s*(\d+)f\s*[-:]\s*(\d+)\s*$/.exec(match.score);
    if (m) { hs = +m[1]; as = +m[2]; }
  }
  // 3) objeto scoreHA {H,A}
  if (hs == null && match?.scoreHA && Number.isFinite(+match.scoreHA.H) && Number.isFinite(+match.scoreHA.A)) {
    hs = +match.scoreHA.H; as = +match.scoreHA.A;
  }

  const isHome = String(teamId) === hid;
  const oppId   = isHome ? match?.teams?.awayTeamId : match?.teams?.homeTeamId;
  const oppName = isHome ? match?.teams?.awayTeamName : match?.teams?.homeTeamName;

  let res = null, scoreStr = '—';
  if (hs != null && as != null) {
    const diff = isHome ? (hs - as) : (as - hs);
    res = diff > 0 ? 'W' : (diff === 0 ? 'D' : 'L');
    scoreStr = isHome ? `${hs} - ${as}` : `${as} - ${hs}`;
  }
  // res: W/D/L/NULL (NULL = desconocido → gris)
  return { res, scoreStr, oppId, oppName: changeName(oppName), matchId: match.matchId };
}


// Calcula goleador(es) del equipo según el scope.
// - GUATEMALA: usa CUSTOM/players (goleadores.persona)
// - OTROS scopes: lee statsCenter/teams/{teamId}.json y toma j.players[*].summary.goals.qty
async function fetchTopScorers(teamId, scope) {
  const teamStr = String(teamId);
  const scopeSafe = String(scope || 'guatemala').toLowerCase();

  // === Guatemala → igual que siempre ===
  if (scopeSafe === 'guatemala') {
    if (!CUSTOM) return [];
    try {
      const r = await fetch(`${CUSTOM}/players?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!r.ok) return [];
      const j = await r.json();
      const list = Array.isArray(j?.goleadores?.persona) ? j.goleadores.persona : [];
      const rows = list.map((p) => ({
        playerId: Number(p?.id?.[0] ?? p?.id ?? 0),
        name: bestPersonNameFromObj(p),
        goals: Number(p?.goles?.[0] ?? p?.goles ?? 0),
        teamId: String(p?.equipo?.[0]?.id?.[0] ?? p?.equipo?.id ?? ''),
      })).filter(x => x.playerId && x.teamId === teamStr && x.goals > 0);

      if (!rows.length) return [];
      rows.sort((a,b)=> b.goals - a.goals || a.name.localeCompare(b.name));
      const maxG = rows[0].goals;
      return rows.filter(x => x.goals === maxG);
    } catch { return []; }
  }

  // === CONCACAF / otros scopes ===
  const base = String(BASE || '').replace(/\/+$/, '');
  const url = `${base}/${scopeSafe}/statsCenter/teams/${teamStr}.json`;

  try {
    const r = await fetch(`${url}?t=${Date.now()}`, { headers: { 'Cache-Control': 'no-cache' } });
    if (!r.ok) return [];

    const j = await r.json();

    // --- norma: los jugadores vienen en j.players (obj con keys pid) ---
    let entries = [];
    if (j && typeof j === 'object') {
      if (j.players && typeof j.players === 'object') {
        entries = Object.entries(j.players).map(([pid, obj]) => ({ pid, ...obj }));
      } else {
        // fallback por si alguna vez el feed viene como { [pid]: {...} } en la raíz
        const maybePidShape = Object.values(j).every(v => v && typeof v === 'object' && ('info' in v || 'summary' in v));
        if (maybePidShape) {
          entries = Object.entries(j).map(([pid, obj]) => ({ pid, ...obj }));
        }
      }
    }
    // último fallback: si fuera array
    if (!entries.length && Array.isArray(j)) {
      entries = j;
    }

    const rows = entries.map(p => {
      const pid = Number(p?.pid ?? p?.playerId ?? p?.id);
      const goals = Number(
        (p?.summary?.goals && (p.summary.goals.qty ?? p.summary.goals)) ?? 0
      );
      const n = p?.info?.name || {};
      const name = (n.nick && String(n.nick).trim())
        || [n.first, n.middle, n.last].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
      const tid = String(p?.info?.teamId ?? p?.teamId ?? teamStr);
      return { playerId: pid, name, goals, teamId: tid };
    }).filter(x => x.playerId && x.teamId === teamStr && x.goals > 0);

    if (!rows.length) return [];
    rows.sort((a,b)=> b.goals - a.goals || a.name.localeCompare(b.name));
    const maxG = rows[0].goals;
    return rows.filter(x => x.goals === maxG);
  } catch {
    return [];
  }
}

/* ============================ Componente ============================ */
function TeamSummary({ teamId, scope, navigation, standings, onOpenPartidos, theme }) {
  const { colors } = theme;
  const isDark = theme.mode === 'dark';

  const [nextMatch, setNextMatch] = React.useState(null);
  const [lastMatch, setLastMatch] = React.useState(null);
  const [recentFive, setRecentFive] = React.useState([]); // [{res,scoreStr,oppId,oppName,matchId}]
  const [topScorers, setTopScorers] = React.useState([]); // empatados en el máximo
  const [topRated, setTopRated] = React.useState([]); // ← nuevos “destacados por rating”
  
  const teamIdNum = Array.isArray(teamId) ? Number(teamId[0]) : Number(teamId);


const goPlayer = React.useCallback((pid) => {
  const id = Number(pid);
  if (!navigation?.navigate || !Number.isFinite(id)) return;
  // 👇 Cambia 'PlayerScreen' por el nombre real de tu ruta si es distinto (ej. 'Player')
  navigation.navigate('PlayerScreen', { playerId: id, teamId, scope });
}, [navigation, teamId, scope]);


  // helpers para leer números de "posiciones"
const numFrom = (row, key) => {
  const v = row?.[key];
  const raw = Array.isArray(v) ? v[0] : v;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
};
const maybeNumFrom = (row, key) => {
  const v = row?.[key];
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw == null || raw === '') return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
};

const extractTeamId = (row) =>
  String(
    row?.teamId ??
    row?.id?.[0] ??
    row?.team?.id ??
    row?.team_id ??
    row?.equipoId ??
    ''
  );

// ===== Helpers robustos para leer la tabla de posiciones =====

// Convierte a número desde string o array de 1 elemento. Si falla → 0.
const toNum = (v) => {
  const raw = Array.isArray(v) ? v[0] : v;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 0;
};
// Igual que toNum pero si falta devuelve undefined (para mostrar “-”)
const toMaybeNum = (v) => {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw == null || raw === '') return undefined;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : undefined;
};

// Lee el primer campo existente de una lista de posibles claves
const pickNum = (row, keys) => {
  for (const k of keys) {
    if (row && row[k] != null) return toNum(row[k]);
  }
  return 0;
};
const pickMaybeNum = (row, keys) => {
  for (const k of keys) {
    if (row && row[k] != null) return toMaybeNum(row[k]);
  }
  return undefined;
};

// Todas las variantes de id de equipo que hemos visto
const getTeamId = (row) =>
  String(
    row?.teamId ??
    row?.id?.[0] ??
    row?.team?.id ??
    row?.team_id ??
    row?.equipoId ??
    ''
  );

// Puntos: si viene “puntosactual/puntos”, úsalo; si no, 3*G + E
const computePoints = (row) => {
  const fromField = pickMaybeNum(row, ['puntosactual', 'puntos', 'pts']);
  if (fromField != null) return fromField;
  const w = pickNum(row, ['ganadosactual', 'ganados', 'g']);
  const d = pickNum(row, ['empatadosactual', 'empatados', 'e']);
  return w * 3 + d;
};

// ===== teamRow a partir de standings =====
const teamRow = React.useMemo(() => {
  if (!Array.isArray(standings) || !standings.length) return null;

  const wanted = String(teamId);
  const idx = standings.findIndex(r => getTeamId(r) === wanted);
  if (idx === -1) return null;

  const src = standings[idx];

  return {
    teamId:   getTeamId(src),
    position: idx + 1, // el array ya viene ordenado por puesto

    points: computePoints(src),
    played: pickNum(src, ['jugadosactual', 'jugados', 'j']),
    wins:   pickNum(src, ['ganadosactual', 'ganados', 'g']),
    draws:  pickNum(src, ['empatadosactual', 'empatados', 'e']),
    losses: pickNum(src, ['perdidosactual', 'perdidos', 'p']),
    goalDiff: pickNum(src, ['difgolactual', 'diferencia', 'dif']),

    // Muchos feeds no traen GF/GC → quedarán “-”
    goalsFor:     pickMaybeNum(src, ['golesfavoractual', 'golesfavor', 'gf']),
    goalsAgainst: pickMaybeNum(src, ['golescontraactual', 'golescontra', 'gc']),
  };
}, [standings, teamId]);

// Colores del badge según posición
const totalTeams = Array.isArray(standings) ? standings.length : 12;
const pos = Number(teamRow?.position || 0);
const scopeSafe = String(scope || 'guatemala').toLowerCase();

// ➜ Ronda Final CONCACAF: 4 equipos → 1º verde, resto blanco
const isConcacafFinal = (scopeSafe === 'concacaf' && totalTeams === 4);

let badgeBg = '#16a34a';   // verde
let badgeTxt = '#fff';
let badgeBorder = null;

if (isConcacafFinal) {
  if (pos === 1) {
    badgeBg = '#16a34a';  // verde 1er lugar
    badgeTxt = '#fff';
    badgeBorder = null;
  } else {
    badgeBg = '#fff';     // blanco para 2º-4º
    badgeTxt = '#0f172a';
    badgeBorder = { borderWidth: 1, borderColor: '#cbd5e1' };
  }
} else {
  // lógica general existente
  if (totalTeams === 12) {
    if (pos <= 8) {          // verde
      badgeBg = '#16a34a'; badgeTxt = '#fff';
    } else if (pos <= 10) {  // neutro (blanco)
      badgeBg = '#fff'; badgeTxt = '#0f172a'; badgeBorder = { borderWidth: 1, borderColor: '#cbd5e1' };
    } else {                 // rojo
      badgeBg = '#ef4444'; badgeTxt = '#fff';
    }
  } else {
    if (pos > totalTeams - 2) {            // últimos 2 → rojo
      badgeBg = '#ef4444'; badgeTxt = '#fff';
    } else if (pos > totalTeams - 4) {     // penúltimos 2 → blanco
      badgeBg = '#fff'; badgeTxt = '#0f172a'; badgeBorder = { borderWidth: 1, borderColor: '#cbd5e1' };
    } else {                               // resto → verde
      badgeBg = '#16a34a'; badgeTxt = '#fff';
    }
  }
}



React.useEffect(() => {
  console.log('[TeamSummary] teamRow =', teamRow);
}, [teamRow]);

  React.useEffect(() => {
  let alive = true;

  (async () => {
    // HOIST para usar después
    let next = null;
    let last = null;
    let last5 = [];

    // ===== 1) AGENDA: forma, próximo, último =====
    try {
      const evsObj = await fetchAgendaForTeam(teamId, scope);

      // Preservar keys si viene como objeto
      const keyedList = Array.isArray(evsObj)
        ? evsObj.map((row, idx) => ({
            key: row?.channel || row?.channelKey || row?.id || row?.key || `k#${idx}`,
            row,
          }))
        : Object.entries(evsObj || {}).map(([key, row]) => ({ key, row }));

      const matches = keyedList
        .map(({ key, row }, idx) => eventToMatch(key || `k#${idx}`, row, scope))
        .filter(Boolean)
        .sort((a, b) => {
          const ka = `${a._dateAdj}${a.scheduledStart}${String(a.matchId).padStart(9, '0')}`;
          const kb = `${b._dateAdj}${b.scheduledStart}${String(b.matchId).padStart(9, '0')}`;
          return ka.localeCompare(kb);
        });

      const future = matches.filter(m => FUTURE.has(Number(m.statusId)));
      const past   = matches.filter(m => !FUTURE.has(Number(m.statusId)));

      next = future.length ? future[0] : null;
      last = past.length   ? past[past.length - 1] : null;

      const pastDesc = past.slice().reverse();
      const pastFiveMatches = pastDesc.slice(0, 5);

      // === evitar segunda descarga de agenda-jornadas.json ===
      const idsNeeded = pastFiveMatches
        .map(m => Number(m.matchId))
        .filter(Number.isFinite);

      const byId = {};
      const scan = Array.isArray(evsObj) ? evsObj : Object.values(evsObj || {});
      for (const raw of scan) {
        const id = Number(raw?.matchId ?? raw?.id ?? raw?.eventId ?? raw?.eid);
        if (!Number.isFinite(id) || !idsNeeded.includes(id)) continue;

        const ov = {
          statusId: Number(raw?.statusId ?? raw?.status?.id),
          homeScore: Number(raw?.homeScore ?? raw?.scores?.home ?? raw?.result?.homeGoals),
          awayScore: Number(raw?.awayScore ?? raw?.scores?.away ?? raw?.result?.awayGoals),
          scheduledStart: raw?.scheduledStart ?? raw?.hhmm ?? null,
          gmt: raw?.gmt ?? null,
        };

        if (
          Number.isFinite(ov.statusId) ||
          Number.isFinite(ov.homeScore) ||
          Number.isFinite(ov.awayScore)
        ) {
          byId[id] = ov;
        }
      }

      // Para los que falten, pedir evento puntual (máx 5)
      const missing = idsNeeded.filter(id => byId[id] == null).slice(0, 5);
      if (missing.length) {
        const results = await Promise.all(
          missing.map(id => overlayFromEvent(id, scope).catch(() => ({})))
        );
        missing.forEach((id, i) => {
          const ov = results[i];
          if (ov && Object.keys(ov).length) byId[id] = ov;
        });
      }

      const enrichedFive = pastFiveMatches.map(m => {
        const ov = byId[m.matchId];
        return ov ? { ...m, ...mergeOverlay(m, ov) } : m;
      });
      last5 = enrichedFive.map(m => resultChipFor(m, teamId));

      if (alive) {
        setNextMatch(next);
        setLastMatch(last);
        setRecentFive(last5); // ← solo una vez
      }
    } catch {}

    // ===== 2) GOLEADORES (temporada) =====
    try {
      const tops = await fetchTopScorers(teamId, scope);
      if (alive) setTopScorers(tops);
    } catch {}

    // ===== 3) DESTACADOS POR RATING (último partido) =====
    try {
      const candidate =
        (last && (last.matchId ?? last.id)) ??
        (next && (next.matchId ?? next.id));
      const lastId = Number(candidate);

      console.log('[TeamSummary] last:', last, 'next:', next, 'lastId:', lastId);

      if (Number.isFinite(lastId)) {
        const scopeSafe = String(scope || 'guatemala').toLowerCase();
        const base = String(BASE || '').replace(/\/+$/,'');
        const url = `${base}/${scopeSafe}/events/${lastId}.json?t=${Date.now()}`;

        console.log('[TeamSummary] URL evento para ratings:', url);

        const resp = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
        if (resp.ok) {
          const j = await resp.json();

          const toArray = (x) =>
            Array.isArray(x) ? x :
            (x && typeof x === 'object'
              ? Object.entries(x).map(([pid,p]) => ({ pid, ...p }))
              : []);

          const pools = [j?.players, j?.lineups?.players, j?.stats?.players];
          let rows = [];
          for (const src of pools) {
            const arr = toArray(src);
            if (arr.length) { rows = arr; break; }
          }

          const teamIdStr = String(Array.isArray(teamId) ? teamId[0] : teamId);

          const norm = rows.map(p => {
            const playerId = Number(p?.playerId ?? p?.id ?? p?.pid ?? p?.personId ?? p?.personaId);
            const tId = String(p?.teamId ?? p?.team?.id ?? p?.team_id ?? p?.equipoId ?? p?.equipo?.id ?? '');
            const name =
              p?.name?.shortName || p?.name?.nick ||
              [p?.name?.first, p?.name?.last].filter(Boolean).join(' ') ||
              p?.name || p?.fullName || p?.shortName || '';
            const rating = Number(
              p?.rating ?? p?.nota ?? p?.calificacion ?? p?.score ??
              (p?.ratings && (p?.ratings?.whoscored ?? p?.ratings?.sofascore))
            );
            return { playerId, teamIdFromPlayer: tId, name, rating };
          });

          const mine = norm
            .filter(x => x.teamIdFromPlayer && x.teamIdFromPlayer == teamIdStr && Number.isFinite(x.rating) && x.rating > 0)
            .sort((a,b) => (b.rating - a.rating) || a.name.localeCompare(b.name));

          if (alive) setTopRated(mine.slice(0, 3));
          console.log('[TeamSummary] topRated →', mine.slice(0, 3));
        } else {
          console.log('[TeamSummary] Evento no encontrado o error HTTP:', resp.status);
        }
      } else {
        console.log('[TeamSummary] Sin lastId válido → no ratings');
      }
    } catch (err) {
      console.log('[TeamSummary] Error obteniendo ratings:', err);
    }
    // ===== fin ratings =====

  })();

  return () => { alive = false; };
}, [teamId, scope]);



  
  // UI helpers
// UI helpers
const renderFormChips = (keyPrefix = 'f') => (
  <View style={styles.formRow}>
    {recentFive.map((g, idx) => {
      const bg =
        g.res === 'W' ? '#22c55e' :
        g.res === 'D' ? '#94a3b8' :
        g.res === 'L' ? '#ef4444' :
        '#cbd5e1';

      const key = [
        keyPrefix,
        g.matchId ?? 'm',
        g.oppId ?? 'o',
        g.scoreStr ?? '-',
        idx
      ].join('-');

      const onOpenMatch = () => {
        const rawId = g?.matchId;
        const idNum = Number(rawId);
        if (!Number.isFinite(idNum) || idNum <= 0) return;
        const channel = String(scope || 'guatemala').toLowerCase();
        navigation?.push?.('Match', { matchId: String(idNum), channel });
      };

      return (
        <TouchableOpacity
          key={key}
          onPress={onOpenMatch}
          activeOpacity={0.8}
          style={styles.formChip}
        >
          <View style={[styles.formScoreBadge, { backgroundColor: bg }]}>
            <Text style={styles.formChipScore}>{g.scoreStr}</Text>
          </View>
          <LogoImg teamId={g.oppId} size={28} style={{ marginTop: 6 }} />
        </TouchableOpacity>
      );
    })}
  </View>
);




  const mainScorer = topScorers[0];
  const otherScorers = topScorers.slice(1);

  return (
    <View style={{ paddingHorizontal: 0, gap: 12 }}>
      
      {/* 1) Partido siguiente (tarjeta única) */}
{nextMatch ? (
  <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

    <Text style={[styles.summaryTitle, { color: colors.text }]}>Siguiente partido</Text>

    <View style={{ marginTop: 8 }}>
      <Card
        match={nextMatch}
        showTourneyBadge={false}
        tourneyText=""
        variant="flat"               // sin borde ni fondo (usa el de summaryCard)
        style={{ marginTop: 0 }}
        onPress={() => {
          // Guardas para asegurar navegación correcta
          const rawId = nextMatch?.matchId;
          const idNum = Number(rawId);
          if (!Number.isFinite(idNum) || idNum <= 0) {
            console.log('[TeamSummary] matchId inválido:', rawId, 'nextMatch:', nextMatch);
            return; // evita abrir Match si el id no es válido
          }

          const channel =
            nextMatch?.scope || scope || 'guatemala'; // fallback seguro como en Calendar

          // Log útil mientras pruebas (puedes quitarlo luego)
console.log('[TS] abrir Match →', nextMatch.matchId, nextMatch.scope || scope || 'guatemala');

          navigation?.push?.('Match', {
            matchId: String(idNum),
            channel,
            pre: {
              id: String(idNum),
              teams: {
                homeTeamId: String(nextMatch?.teams?.homeTeamId ?? ''),
                awayTeamId: String(nextMatch?.teams?.awayTeamId ?? ''),
                homeTeamName: nextMatch?.teams?.homeTeamName ?? '',
                awayTeamName: nextMatch?.teams?.awayTeamName ?? '',
              },
              date: nextMatch?._dateAdj || nextMatch?.date || null,
              scheduledStart: nextMatch?.scheduledStart ?? null,
              gmt: nextMatch?.gmt ?? null,
            },
          });
        }}
      />
    </View>
  </View>
) : null}



      {/* 3) Últimos partidos (atajo → Partidos > Resultados) */}
{!!recentFive.length && (
  <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

    <View style={styles.summaryHeaderRow}>
      <Text style={[styles.summaryTitle, { color: colors.text }]}>Últimos partidos</Text>

      {/* 👉 solo la flechita navega a la pestaña de Resultados */}
      <TouchableOpacity
        onPress={() => onOpenPartidos && onOpenPartidos()}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        activeOpacity={0.7}
      >
        <Text style={[styles.linkArrow, { color: colors.accent }]}>›</Text>

      </TouchableOpacity>
    </View>

    {renderFormChips('last')}
  </View>
)}


      {/* 4) Jugador destacado (máximo goleador) */}
      {mainScorer && (
  <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

    <Text style={[styles.summaryTitle, { color: colors.text }]}>Goleador</Text>


    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('Player', {
          playerId: Number(mainScorer.playerId),
          teamId: teamIdNum,
          scope,
        })
      }
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 }}
    >
      <Avatar id={mainScorer.playerId} size={80} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '900', color: colors.text }}> {mainScorer.name}</Text>
        <Text style={{ color: colors.text }}> Goles: {mainScorer.goals}</Text>


        {!!otherScorers.length && (
          <>
            <Text style={{ color: colors.text, marginTop: 4, fontSize: 12 }}> Otros goleadores ({mainScorer.goals}):</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
              {otherScorers.map((s) => (
                <Text
                  key={s.playerId || s.name}
                  onPress={() =>
                    navigation.navigate('Player', {
                      playerId: Number(s.playerId),
                      teamId: teamIdNum,
                      scope,
                    })
                  }
                  style={{ color: colors.text, fontSize: 12, textDecorationLine: 'underline', marginRight: 8, marginBottom: 4,}}
                >
                  {s.name}
                </Text>
              ))}
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  </View>
)}




      {/* Destacados por rating (último partido) */}
{!!topRated.length && (
  <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

    <Text style={[styles.summaryTitle, { color: colors.text }]}>Mejores jugadores (último partido)</Text>

    <View style={{ marginTop: 10 }}>
      {topRated.map((p) => (
        <TouchableOpacity
          key={p.playerId}
          activeOpacity={0.7}
          onPress={() => {
            const tid = Array.isArray(teamId) ? Number(teamId[0]) : Number(teamId);
            navigation?.navigate?.('Player', {
              playerId: Number(p.playerId),
              teamId: tid,
              scope,
            });
          }}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}
        >
          <Avatar id={p.playerId} size={40} overlayRating={p.rating} />
          <View style={{ marginLeft: 10, flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.text }}> {p.name}</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted }}> Rating: {Number(p.rating).toFixed(1)}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  </View>
)}


      {/* 5) Posición en la tabla */}
{teamRow && (
  <View style={[styles.summaryCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
    <Text style={[styles.summaryTitle, { color: colors.text }]}>Posición en la tabla</Text>


    <View style={styles.infoWrap}>
      {/* Encabezados */}
      <View style={[styles.infoHeaderRowSoft, { backgroundColor: (colors.rowBg || colors.cardBg) }]}>
        {['Pos','Pts','PJ','G','E','P','GF','GC','Dif'].map((h) => (
          <Text key={`h-${h}`} style={[styles.infoHeadCell, { color: colors.textMuted }]} numberOfLines={1} > {h} </Text>
        ))}
      </View>

      {/* Valores (una sola fila) */}
      <View style={[styles.infoRowSoft, { backgroundColor: colors.cardBg }]}>

        {[
          teamRow.position ?? '-',
          teamRow.points ?? '-',
          teamRow.played ?? '-',
          teamRow.wins ?? '-',
          teamRow.draws ?? '-',
          teamRow.losses ?? '-',
          teamRow.goalsFor ?? '-',
          teamRow.goalsAgainst ?? '-',
          teamRow.goalDiff ?? '-',
        ].map((v, i) => (
          i === 0 ? (
            // Celda especial: posición con badge verde
            <View key={`v-${i}`} style={styles.infoValCellBox}>
    <View style={[styles.posBadge, { backgroundColor: badgeBg }, badgeBorder]}>
      <Text style={[styles.posBadgeTxt, { color: badgeTxt }]}>{String(v)}</Text>
    </View>
  </View>
) : (
  <Text key={`v-${i}`} style={[styles.infoValCell, { color: colors.text }]} numberOfLines={1}> {String(v)} </Text> )))}
      </View>
    </View>
  </View>
)}


    </View>
  );
}

/* ============================== Estilos ============================== */
const styles = StyleSheet.create({
  summaryCard: {
  backgroundColor: '#fff',   // se sobreescribe con colors.cardBg
  borderRadius: 10,
  padding: 12,
  elevation: 1,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 4,
  marginTop: 2,
  borderWidth: 1,
  borderColor: 'transparent', // se sobreescribe con colors.cardBorder
},

  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryTitle: {
  fontSize: 16,
  fontWeight: '800',
  color: '#0f172a', // se sobreescribe en uso si quieres, o déjalo así
},

  linkArrow: { fontSize: 23, color: '#d32f2f', fontWeight: '900' },
  formRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  formChip: {
    width: 61.5, height: 50, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', paddingTop: 10, paddingBottom: 10,
  },
  formChipScore: { color: '#fff', fontWeight: '800', fontSize: 12, lineHeight: 18, },
  infoTable: {
  marginTop: 8,
  borderWidth: 1,
  borderColor: '#e5e7eb',
  borderRadius: 8,
  overflow: 'hidden',
  backgroundColor: '#fff',
},
formScoreBadge: {
  minWidth: 36,            // ancho mínimo del “píldora”
  paddingHorizontal: 10,
  paddingVertical: 2,
  borderRadius: 999,       // píldora redonda
  alignItems: 'center',
  justifyContent: 'center',
},

// --- Info del equipo (full-bleed dentro del summaryCard) ---
infoWrap: {
  marginTop: 8,
  borderRadius: 10,
  overflow: 'hidden',
  marginBottom: -10,
},
infoHeaderRowSoft: {
  flexDirection: 'row',
  backgroundColor: '#f1f5f9',   // se sobreescribe con colors.rowBg/cardBg
  paddingVertical: 6,
  paddingHorizontal: 8,
},
infoRowSoft: {
  flexDirection: 'row',
  backgroundColor: '#fff',      // se sobreescribe con colors.cardBg
  paddingVertical: 10,
  paddingHorizontal: 8,
},

infoHeadCell: {
  flex: 1,
  minWidth: 32,
  textAlign: 'center',
  fontSize: 12,
  fontWeight: '700',
  color: '#64748b', // se sobreescribe al usar colors.textMuted
},
infoValCell: {
  flex: 1,
  minWidth: 32,
  textAlign: 'center',
  fontSize: 12,
  fontWeight: '800',
  color: '#0f172a', // se sobreescribe al usar colors.text
  marginTop: 2,
},

// celda contenedora para la posición (para poder centrar el badge)
infoValCellBox: {
  flex: 1,
  minWidth: 32,
  alignItems: 'center',
  justifyContent: 'center',
},
// badge verde tipo PositionsBlock (redondo/pastilla)
posBadge: {
  backgroundColor: '#10B981',   // verde
  minWidth: 22,
  height: 22,
  paddingHorizontal: 8,         // si hay 2 dígitos no se corta
  borderRadius: 999,
  alignItems: 'center',
  justifyContent: 'center',
},
posBadgeTxt: {
  color: '#fff',
  fontWeight: '800',
  fontSize: 12,
  lineHeight: 16,
},
});
export default withTheme(TeamSummary);
