// src/api/liga.js
// Endpoints del Núcleo Liga Nacional GT + hooks listos para pantallas.
// Única fuente de datos de la app v3: el Núcleo de liganacionalgt.com.

import { useMemo } from 'react';
import { request } from './client';
import { useQuery } from './store';
import { normalizeMatch, normalizeScorer, normalizeStandingRow, normalizeTeam, pickArray } from './normalize';

/* ─────────── Fetchers ─────────── */

export const api = {
  home: () => request('home.php'),
  matches: (filters) => request('matches.php', { params: filters }),
  matchCenter: (id) => request('match-center.php', { params: { id } }),
  standings: () => request('standings.php'),
  scorers: (params) => request('scorers.php', { params }),
  cards: () => request('cards.php'),
  teams: () => request('teams.php'),
  team: (id) => request('team.php', { params: { id } }),
  players: (params) => request('players.php', { params }),
  player: (id) => request('player.php', { params: { id } }),
  rounds: () => request('rounds.php'),
  h2h: (a, b, limit = 5) => request('h2h.php', { params: { team_a: a, team_b: b, limit } }),
  search: (q) => request('search.php', { params: { q } }),
  meta: () => request('meta.php'),
};

/* ─────────── Intervalos de refresco ─────────── */
const LIVE_POLL = 15000; // con partido en vivo
const IDLE_POLL = 120000; // día normal

/* ─────────── Hooks ─────────── */

export function useHome() {
  return useQuery('home', api.home, {
    staleTime: 20000,
    refetchInterval: (d) => (d?.liveMatchIds?.length ? LIVE_POLL : IDLE_POLL),
  });
}

/* Fetchers con la misma forma que guardan los hooks (para precargar en el splash) */
export const fetchers = {
  home: () => api.home(),
  matches: async () => {
    const raw = await api.matches();
    return { version: raw?.version, seasonId: raw?.seasonId ?? null, matches: pickArray(raw, 'matches', 'data', 'items') };
  },
  standings: () => api.standings(),
  scorers: () => api.scorers(),
};

export function useMatches() {
  const q = useQuery(
    'matches',
    fetchers.matches,
    {
      staleTime: 20000,
      refetchInterval: (d) => (d?.matches?.some((m) => m.isLive) ? LIVE_POLL : IDLE_POLL),
    },
  );
  const matches = useMemo(() => (q.data?.matches || []).map(normalizeMatch).filter(Boolean), [q.data]);
  return { ...q, matches, seasonId: q.data?.seasonId ?? null };
}

export function useStandings() {
  const q = useQuery('standings', api.standings, { staleTime: 60000 });
  const rows = useMemo(() => pickArray(q.data, 'standings').map(normalizeStandingRow), [q.data]);
  return { ...q, rows, projectionActive: Boolean(q.data?.projectionActive) };
}

export function useScorers() {
  const q = useQuery('scorers', fetchers.scorers, { staleTime: 120000 });
  const rows = useMemo(() => pickArray(q.data, 'scorers', 'data').map(normalizeScorer), [q.data]);
  return { ...q, rows };
}

export function useMatchCenter(id) {
  return useQuery(`match-center:${id}`, () => api.matchCenter(id), {
    enabled: Boolean(id),
    staleTime: 10000,
    refetchInterval: (d) => (d?.match?.isLive ? 10000 : 0),
  });
}

export function useTeams() {
  const q = useQuery('teams', api.teams, { staleTime: 6 * 3600 * 1000 });
  const teams = useMemo(() => pickArray(q.data, 'teams', 'data').map(normalizeTeam), [q.data]);
  return { ...q, teams };
}

/* ─────────── Selectores ─────────── */

const byKickoff = (a, b) => (a.kickoff?.getTime() || 0) - (b.kickoff?.getTime() || 0);

/** Agrupa partidos para el Home: en vivo, siguiente, jornada actual. */
export function selectMatchday(matches, featuredRoundId) {
  const sorted = [...matches].sort(byKickoff);
  const live = sorted.filter((m) => m.isLive);
  const now = Date.now();
  const upcoming = sorted.filter((m) => m.isScheduled && (m.kickoff?.getTime() || 0) >= now - 3 * 3600 * 1000);
  const recent = sorted.filter((m) => m.isFinished).reverse();

  // Jornada destacada: la de la API; si no, la del próximo partido; si no, la última jugada
  const roundId = featuredRoundId ?? upcoming[0]?.round?.id ?? recent[0]?.round?.id ?? null;
  const round = sorted.filter((m) => m.round?.id === roundId);

  return {
    live,
    next: upcoming[0] || null,
    upcoming,
    recent,
    round,
    roundInfo: round[0]?.round || null,
  };
}

/** Partidos de un equipo (para "Mi equipo"). */
export const selectTeamMatches = (matches, teamId) =>
  matches.filter((m) => m.home?.id === teamId || m.away?.id === teamId).sort(byKickoff);
