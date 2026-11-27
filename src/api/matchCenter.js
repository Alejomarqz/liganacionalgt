// src/api/matchCenter.js
// Normaliza match-center.php a un modelo único para la pantalla de partido.

import { useMemo } from 'react';
import { normalizeMatch, normalizeTeam } from './normalize';
import { useMatchCenter } from './liga';

const n = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

/* ── Eventos ── */
const GOAL_TYPES = new Set(['goal', 'penalty_goal', 'own_goal', 'goal_penalty']);
const CARD_TYPES = new Set(['yellow_card', 'red_card', 'second_yellow', 'yellow_red_card']);

export function eventKind(type = '') {
  const t = String(type).toLowerCase();
  if (t === 'own_goal') return 'own_goal';
  if (t.includes('penalty') && t.includes('miss')) return 'penalty_miss';
  if (GOAL_TYPES.has(t) || t.includes('goal')) return t.includes('penalty') ? 'penalty_goal' : 'goal';
  if (t === 'red_card') return 'red';
  if (t === 'second_yellow' || t === 'yellow_red_card') return 'second_yellow';
  if (CARD_TYPES.has(t) || t.includes('yellow')) return 'yellow';
  if (t.includes('sub')) return 'sub';
  if (t.includes('var')) return 'var';
  return 'other';
}

export const minuteText = (e) => (e.stoppage > 0 ? `${e.minute}+${e.stoppage}'` : `${e.minute}'`);

function normalizeEvent(e, homeId) {
  const kind = eventKind(e.event_type);
  // Autogol: cuenta para el rival del equipo del jugador
  const teamSide = Number(e.team_id) === Number(homeId) ? 'home' : 'away';
  return {
    id: e.id,
    kind,
    type: e.event_type,
    side: teamSide,
    scoringSide: kind === 'own_goal' ? (teamSide === 'home' ? 'away' : 'home') : teamSide,
    minute: Number(e.minute) || 0,
    stoppage: Number(e.stoppage) || 0,
    period: e.period || null,
    playerId: e.player_id ?? null,
    playerName: e.player_name || '',
    relatedId: e.related_player_id ?? null,
    relatedName: e.related_player_name || '',
    teamName: e.team_name || '',
    display: e.display || '',
    sort: (Number(e.minute) || 0) * 100 + (Number(e.stoppage) || 0) + (e.period === 'second_half' ? 10000 : 0),
  };
}

/* ── Alineaciones ── */
function normalizePlayer(p) {
  return {
    id: p.id,
    name: p.name || '',
    shortName: shortName(p.name),
    number: p.shirtNumber ?? null,
    position: p.position || null,
    photo: p.photo || null,
    x: n(p.fieldX),
    y: n(p.fieldY),
    onField: Boolean(p.onField),
    entered: Boolean(p.entered),
    participated: Boolean(p.participated),
    sentOff: Boolean(p.sentOff),
  };
}

export function shortName(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] || '';
  // Quitamos el primer nombre; si queda largo, nos quedamos con el primer apellido
  const rest = parts.slice(1);
  const joined = rest.join(' ');
  if (joined.length <= 14) return joined;
  return rest.length >= 3 ? rest[rest.length - 2] : rest[0];
}

const side = (s) => ({
  starters: (s?.starters || []).map(normalizePlayer),
  subs: (s?.substitutes || []).map(normalizePlayer),
});

/* ── Estadísticas ── */
const STAT_DEFS = [
  ['possession', 'Posesión', '%'],
  ['shots', 'Remates', ''],
  ['shots_on_target', 'Remates al arco', ''],
  ['corners', 'Tiros de esquina', ''],
  ['fouls', 'Faltas', ''],
  ['offsides', 'Fueras de juego', ''],
  ['yellow_cards', 'Amarillas', ''],
  ['red_cards', 'Rojas', ''],
  ['saves', 'Atajadas', ''],
];

function normalizeStats(s, events) {
  const rows = [];
  for (const [key, label, unit] of STAT_DEFS) {
    let h = n(s?.[`home_${key}`]);
    let a = n(s?.[`away_${key}`]);
    // Tarjetas: si la API no las trae, se calculan de los eventos
    if ((h === null || a === null) && key.endsWith('_cards')) {
      const k = key === 'yellow_cards' ? 'yellow' : 'red';
      h = events.filter((e) => e.side === 'home' && (e.kind === k || (k === 'red' && e.kind === 'second_yellow'))).length;
      a = events.filter((e) => e.side === 'away' && (e.kind === k || (k === 'red' && e.kind === 'second_yellow'))).length;
    }
    if (h === null || a === null) continue;
    rows.push({ key, label, unit, home: h, away: a });
  }
  return rows;
}

/* ── Modelo final ── */
export function normalizeMatchCenter(raw) {
  if (!raw?.match) return null;
  const m = raw.match;
  const match = normalizeMatch({
    ...m,
    round: m.roundInfo || (typeof m.round === 'object' ? m.round : { name: m.round }),
    teams: raw.teams,
    score: raw.score,
    clock: raw.clock,
    stadium: raw.stadium || m.stadium,
  });

  const homeId = match.home?.id;
  const events = (raw.events || [])
    .filter((e) => e.active !== 0)
    .map((e) => normalizeEvent(e, homeId))
    .sort((a, b) => a.sort - b.sort);

  const goals = events.filter((e) => ['goal', 'penalty_goal', 'own_goal'].includes(e.kind));

  // Mapa jugador → íconos (para la cancha)
  const playerMarks = {};
  const mark = (id, k) => {
    if (!id) return;
    if (!playerMarks[id]) playerMarks[id] = [];
    playerMarks[id].push(k);
  };
  for (const e of events) {
    if (e.kind === 'sub') {
      mark(e.playerId, 'sub_in');
      mark(e.relatedId, 'sub_out');
    } else mark(e.playerId, e.kind);
  }

  const ctx = raw.context || {};

  return {
    match,
    referee: m.referee || null,
    competition: m.competition || 'Liga Nacional de Guatemala',
    season: m.season || '',
    stadium: raw.stadium || null,
    formations: raw.formations || {},
    lineupConfirmed: raw.lineupConfirmed || {},
    lineups: { home: side(raw.lineups?.home), away: side(raw.lineups?.away) },
    hasLineups: Boolean(raw.lineups?.home?.starters?.length || raw.lineups?.away?.starters?.length),
    events,
    goals,
    playerMarks,
    stats: normalizeStats(raw.statistics, events),
    penaltyKicks: raw.penaltyKicks || [],
    playerOfMatch: raw.playerOfMatch || null,
    polls: raw.polls || [],
    pollWindow: raw.pollWindow || null,
    context: {
      positions: ctx.positions || null,
      form: ctx.form || null,
      streaks: ctx.streaks || null,
      h2h: ctx.headToHead
        ? {
            ...ctx.headToHead,
            matches: (ctx.headToHead.matches || []).map(normalizeMatch),
          }
        : null,
      topScorers: ctx.topScorers || null,
      liveStandings: (ctx.liveStandings || []).map((r) => ({
        position: Number(r.position),
        team: normalizeTeam(r),
        played: Number(r.played) || 0,
        gd: Number(r.gd) || 0,
        points: Number(r.points) || 0,
      })),
    },
    revision: m.revision ?? 0,
  };
}

/* ── Hook ── */

export function useMatchCenterModel(matchId) {
  const q = useMatchCenter(matchId);
  const model = useMemo(() => normalizeMatchCenter(q.data), [q.data]);
  return { ...q, model };
}
