// src/api/normalize.js
// Convierte las respuestas del Núcleo a modelos estables para la UI.
// Si la API cambia un nombre de campo, se arregla AQUÍ y no en 40 pantallas.

import { registerTeam } from './logoRegistry';

const num = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);

export function normalizeTeam(t) {
  if (!t) return null;
  const team = {
    id: t.id ?? t.team_id ?? null,
    name: t.name ?? '',
    short: t.short ?? t.short_name ?? (t.name ? t.name.slice(0, 3).toUpperCase() : ''),
    slug: t.slug ?? '',
    logo: t.logo ?? t.logo_url ?? null,
  };
  registerTeam(team);
  return team;
}

export const LIVE_STATUSES = new Set(['live', 'halftime', 'penalties', 'first_half', 'second_half', 'extra_time']);

export function normalizeMatch(m) {
  if (!m) return null;
  const status = m.status || 'scheduled';
  const isLive = Boolean(m.isLive) || LIVE_STATUSES.has(status);
  const home = normalizeTeam(m.home || m.teams?.home);
  const away = normalizeTeam(m.away || m.teams?.away);
  const hs = m.home?.score ?? m.score?.home ?? null;
  const as = m.away?.score ?? m.score?.away ?? null;

  return {
    id: m.id,
    slug: m.slug,
    kickoff: m.kickoff ? new Date(m.kickoff) : null,
    status,
    statusLabel: m.statusLabel || '',
    statusCompact: m.statusCompact || '',
    isLive,
    isFinished: status === 'finished',
    isScheduled: status === 'scheduled',
    round: m.round || m.roundInfo || null,
    stadium: typeof m.stadium === 'string' ? { name: m.stadium } : m.stadium || null,
    home,
    away,
    score: {
      home: hs === null ? null : num(hs),
      away: as === null ? null : num(as),
      penHome: num(m.home?.penalties ?? m.score?.penalties?.home),
      penAway: num(m.away?.penalties ?? m.score?.penalties?.away),
    },
    clock: m.clock || null,
    revision: m.revision ?? 0,
    // momento local en que recibimos el reloj (para animarlo sin pedir a la API cada segundo)
    receivedAt: Date.now(),
  };
}

export function normalizeStandingRow(r) {
  return {
    position: num(r.position),
    team: normalizeTeam(r.team || r),
    played: num(r.played),
    won: num(r.won),
    drawn: num(r.drawn),
    lost: num(r.lost),
    gf: num(r.gf),
    ga: num(r.ga),
    gd: num(r.gd),
    points: num(r.points),
  };
}

export function normalizeScorer(r) {
  return {
    position: num(r.position),
    player: {
      id: r.player?.id,
      name: r.player?.name || '',
      slug: r.player?.slug,
      photo: r.player?.photo || null,
      shirtNumber: r.player?.shirtNumber ?? null,
    },
    team: normalizeTeam(r.team),
    goals: num(r.goals),
  };
}

export const pickArray = (payload, ...keys) => {
  for (const k of keys) if (Array.isArray(payload?.[k])) return payload[k];
  return Array.isArray(payload) ? payload : [];
};
