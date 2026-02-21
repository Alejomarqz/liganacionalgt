// services/agendaService.js
import { API_WEB_DEPORT_URL, API_JORNADAS_URL } from '@env';

// TTL 1 hora
const TTL_MS = 60 * 60 * 1000;

// Cache en memoria por clave (scope|from|days)
const _cache = new Map();

/* ================== Helpers fecha ================== */
function ymd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

/** Inclusivo: desde 00:00:00 del “from” hasta 23:59:59 del “from + (days-1)” */
function inRange(matchDateStr, from, days) {
  if (!matchDateStr) return false;
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate(), 0,0,0,0);
  const endDate = addDays(from, Math.max(1, days) - 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23,59,59,999);
  const [Y,M,D] = String(matchDateStr).split('-').map(Number);
  if (!Y || !M || !D) return false;
  const dt = new Date(Y, M-1, D, 12,0,0,0);
  return dt >= start && dt <= end;
}

/* ================== Normalizadores ================== */
// jornadas-todo.json (lista plana)
function normalizeFromJornadas(list) {
  return (Array.isArray(list) ? list : []).map(it => ({
    matchId: Number(it.matchId),
    matchDate: it.matchDate,           // 'YYYY-MM-DD'
    hora: it.hora,                     // 'HH:mm'
    statusId: Number(it.statusId || 0),
    jornada: it.jornada ?? null,
    estadio: it.estadio ?? null,
    home: { id: it.homeTeamId, name: it.homeTeamName },
    away: { id: it.awayTeamId, name: it.awayTeamName },
    // anchors opcionales si vinieran
    startTs: it.startTs ?? null,
    htTs: it.htTs ?? null,
    shTs: it.shTs ?? null,
    ft90Ts: it.ft90Ts ?? null,
    et1Ts: it.et1Ts ?? null,
    et1EndTs: it.et1EndTs ?? null,
    et2Ts: it.et2Ts ?? null,
    et2EndTs: it.et2EndTs ?? null,
    pensTs: it.pensTs ?? null,
  }));
}

// agenda.json (events: { 'deportes.futbol.<scope>.<id>': {...} })
function normalizeFromAgenda(agendaObj) {
  const ev = agendaObj?.events || {};
  const out = [];
  for (const key in ev) {
    const idStr = String(key).split('.').pop();
    const row = ev[key] || {};
    out.push({
      matchId: Number(idStr),
      matchDate: String(row.date), // 20250719 → lo convertimos abajo
      hora: (row.scheduledStart || '00:00:00').slice(0,5),
      statusId: Number(row.statusId || 0),
      jornada: null,
      estadio: null,
      home: { id: row?.teams?.homeTeamId ?? null, name: row?.teams?.homeTeamName ?? '' },
      away: { id: row?.teams?.awayTeamId ?? null, name: row?.teams?.awayTeamName ?? '' },
      gmt: row?.gmt ?? -3,
    });
  }
  // date num → 'YYYY-MM-DD'
  return out.map(it => {
    const s = String(it.matchDate || '');
    if (s.length === 8 && !s.includes('-')) {
      const y = s.slice(0,4), m = s.slice(4,6), d = s.slice(6,8);
      return { ...it, matchDate: `${y}-${m}-${d}` };
    }
    return it;
  });
}

/* ================== Fetchers ================== */
async function fetchJornadas(scope) {
  // actualmente solo Guatemala tiene jornadas-todo.json
  if (String(scope) !== 'guatemala') return null;
  const r = await fetch(API_JORNADAS_URL, { headers: { 'Cache-Control': 'no-cache' }});
  if (!r.ok) throw new Error('jornadas HTTP ' + r.status);
  return normalizeFromJornadas(await r.json());
}
async function fetchAgenda(scope) {
  const url = `${API_WEB_DEPORT_URL}/${scope}/agendaMaM/es/agenda.json`;
  const r = await fetch(url, { headers: { 'Cache-Control': 'no-cache' }});
  if (!r.ok) throw new Error('agenda HTTP ' + r.status);
  return normalizeFromAgenda(await r.json());
}

/* ================== API principal ================== */
export async function getWeek({ scope = 'guatemala', from, days = 7 }) {
  if (!from) throw new Error('from requerido');
  const key = `${scope}|${ymd(from)}|${days}`;
  const hit = _cache.get(key);
  const now = Date.now();
  if (hit && (now - hit.t) < TTL_MS) return hit.data;

  let rows = null;
  // 1) intentar jornadas (cuando aplique)
  try { rows = await fetchJornadas(scope); } catch { /* ignore */ }
  // 2) si no hay, agenda Datafactory
  if (!rows || !rows.length) {
    try { rows = await fetchAgenda(scope); } catch { rows = []; }
  }

  // filtrar por rango inclusivo
  const filtered = rows.filter(it => inRange(it.matchDate, from, days));

  // orden por fecha y hora
  filtered.sort((a, b) => {
    const ad = String(a.matchDate || '').localeCompare(String(b.matchDate || ''));
    if (ad !== 0) return ad;
    return String(a.hora || '').localeCompare(String(b.hora || ''));
  });

  _cache.set(key, { t: now, data: filtered });
  return filtered;
}

export function invalidateAgendaCache() {
  _cache.clear();
}

/* ================== Agenda global (multi-competencia) ================== */
export async function getRangeMulti({ scopes = ['guatemala','concacaf','nationsleague'], from, days = 8 }) {
  const chunks = await Promise.all(
    scopes.map(scope => getWeek({ scope, from, days }).catch(() => []))
  );

  const merged = [];
  for (let i = 0; i < scopes.length; i++) {
    const scope = scopes[i];
    (chunks[i] || []).forEach(row => merged.push({ ...row, scope }));
  }

  merged.sort((a, b) => {
    const ad = String(a.matchDate || '').localeCompare(String(b.matchDate || ''));
    if (ad !== 0) return ad;
    return String(a.hora || '').localeCompare(String(b.hora || ''));
  });

  return merged;
}
