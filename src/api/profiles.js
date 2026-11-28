// src/api/profiles.js
// Perfiles de equipo y jugador. Los normalizadores son tolerantes a varias
// formas de respuesta (team.php / players.php / player.php) para no romperse
// si el Núcleo agrega o renombra campos.

import { useMemo } from 'react';
import { api } from './liga';
import { useQuery } from './store';
import { normalizeTeam, normalizeMatch, pickArray } from './normalize';

const first = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/* ─────────── Equipo ─────────── */

export function normalizeTeamProfile(raw, fallback = {}) {
  const t = raw?.team || raw?.data?.team || raw?.data || raw || {};
  const base = normalizeTeam({ ...fallback, ...t });
  const stadium = typeof t.stadium === 'object' ? t.stadium : t.stadium ? { name: t.stadium } : fallback.stadium || null;
  return {
    ...base,
    city: first(t.city, t.location, fallback.city, ''),
    coach: first(t.coach?.name, t.coach, fallback.coach, ''),
    founded: first(t.founded, t.foundedYear, t.foundation, null),
    nickname: first(t.nickname, t.nick, t.apodo, ''),
    colors: first(t.colors, null),
    stadium,
    rosterCount: first(t.rosterCount, fallback.rosterCount, null),
    goalsFor: first(t.goalsFor, fallback.goalsFor, null),
    goalsAgainst: first(t.goalsAgainst, fallback.goalsAgainst, null),
    titles: first(t.titles, t.championships, null),
    social: t.social || t.links || null,
    raw: t,
  };
}

export function normalizeRosterPlayer(p) {
  const pos = String(first(p.position, p.pos, p.position_code, '') || '').toUpperCase();
  return {
    id: first(p.id, p.player_id),
    name: first(p.name, p.full_name, p.player_name, ''),
    photo: first(p.photo, p.photo_url, p.image, null),
    number: first(p.shirtNumber, p.shirt_number, p.number, null),
    position: pos,
    group: positionGroup(pos),
    nationality: first(p.nationality, p.country, ''),
    age: num(first(p.age, null)),
    goals: num(first(p.goals, p.stats?.goals, 0)) || 0,
    appearances: num(first(p.appearances, p.matches, p.stats?.appearances, null)),
    team: p.team ? normalizeTeam(p.team) : null,
  };
}

// Códigos en español que usa el Núcleo: POR, DEF/DFC/LI/LD, MED/MC/MCD/MCO, DEL/DC/EI/ED
export function positionGroup(pos = '') {
  const p = String(pos).toUpperCase();
  if (!p) return 'other';
  if (p.startsWith('POR') || p === 'GK' || p === 'ARQ') return 'gk';
  if (['DEL', 'DC', 'EI', 'ED', 'SD', 'EXT', 'FW', 'ST', 'DELANTERO'].some((k) => p.startsWith(k))) return 'fw';
  if (p.startsWith('D') || ['LI', 'LD', 'LTI', 'LTD', 'CAR', 'DF'].includes(p)) return 'df';
  if (p.startsWith('M') || ['VOL', 'CEN', 'MF', 'MI', 'MD'].includes(p)) return 'mf';
  return 'other';
}

export const GROUP_LABEL = { gk: 'Porteros', df: 'Defensas', mf: 'Mediocampistas', fw: 'Delanteros', other: 'Plantel' };
export const GROUP_ORDER = ['gk', 'df', 'mf', 'fw', 'other'];

export function useTeamProfile(teamId) {
  return useQuery(`team:${teamId}`, () => api.team(teamId), { enabled: Boolean(teamId), staleTime: 5 * 60000 });
}

export function useRoster(teamId) {
  const q = useQuery(`roster:${teamId}`, () => api.players({ team_id: teamId }), {
    enabled: Boolean(teamId),
    staleTime: 30 * 60000,
  });
  const players = useMemo(() => {
    const list = pickArray(q.data, 'players', 'data', 'roster', 'items').map(normalizeRosterPlayer).filter((p) => p.id && p.name);
    const groups = {};
    for (const p of list) (groups[p.group] = groups[p.group] || []).push(p);
    for (const g of Object.values(groups)) g.sort((a, b) => (a.number ?? 999) - (b.number ?? 999));
    return { list, groups };
  }, [q.data]);
  return { ...q, ...players };
}

/* ─────────── Jugador ─────────── */

export function normalizePlayerProfile(raw, fallback = {}) {
  const p = raw?.player || raw?.data?.player || raw?.data || raw || {};
  const s = p.stats || p.statistics || p.season || raw?.stats || raw?.statistics || {};
  const base = normalizeRosterPlayer({ ...fallback, ...p });
  const team = p.team || raw?.team || fallback.team || null;
  return {
    ...base,
    team: team ? normalizeTeam(team) : null,
    birthDate: first(p.birthDate, p.birth_date, p.dob, null),
    height: first(p.height, null),
    weight: first(p.weight, null),
    foot: first(p.foot, p.preferredFoot, null),
    stats: {
      appearances: num(first(s.appearances, s.matches, s.played, p.appearances, null)),
      starts: num(first(s.starts, s.starter, null)),
      minutes: num(first(s.minutes, s.minutesPlayed, null)),
      goals: num(first(s.goals, p.goals, null)),
      assists: num(first(s.assists, null)),
      yellow: num(first(s.yellowCards, s.yellow_cards, s.yellow, null)),
      red: num(first(s.redCards, s.red_cards, s.red, null)),
      penalties: num(first(s.penaltyGoals, s.penalties, null)),
    },
    matches: pickArray(raw, 'matches', 'recentMatches', 'lastMatches').concat(pickArray(p, 'matches', 'recentMatches'))
      .slice(0, 10)
      .map((m) => ({
        ...normalizeMatch(m.match || m),
        playerGoals: num(first(m.goals, m.playerGoals, 0)) || 0,
        playerMinutes: num(first(m.minutes, null)),
      })),
    events: pickArray(raw, 'events', 'goals').concat(pickArray(p, 'events')),
    raw: p,
  };
}

export function usePlayer(playerId) {
  return useQuery(`player:${playerId}`, () => api.player(playerId), { enabled: Boolean(playerId), staleTime: 10 * 60000 });
}
