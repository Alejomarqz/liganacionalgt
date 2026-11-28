// src/features/manager/catalog.js
// Catálogo de cartas de Liga Manager a partir de los planteles reales
// (teams.php + players.php?team_id) y la tabla de goleo (scorers.php).
// La media se calcula con la temporada real del jugador y es estable (misma
// carta para todos), así las cartas valen lo mismo en el mercado.

import { useMemo } from 'react';
import { request } from '../../api/client';
import { useQuery } from '../../api/store';
import { useScorers } from '../../api/liga';
import { normalizeTeam, pickArray } from '../../api/normalize';
import { normalizeRosterPlayer, positionGroup } from '../../api/profiles';

export const TIERS = ['bronce', 'plata', 'oro', 'elite'];
export const TIER_LABEL = { bronce: 'Bronce', plata: 'Plata', oro: 'Oro', elite: 'Élite' };
export const QUICK_SELL = { bronce: 150, plata: 400, oro: 1200, elite: 4000 };

export const tierFor = (r) => (r >= 83 ? 'elite' : r >= 75 ? 'oro' : r >= 65 ? 'plata' : 'bronce');

const GROUP_CODE = { gk: 'POR', df: 'DEF', mf: 'MED', fw: 'DEL', other: 'MED' };

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, Math.round(v)));

/** Media de la carta (55–92) a partir de la temporada real. */
export function ratingFor(p, extra = {}) {
  const seed = hash(`lngt-${p.id}`);
  const group = p.group || positionGroup(p.position);
  let r = 58 + (seed % 13); // 58–70 de base
  const apps = p.appearances ?? extra.appearances ?? null;
  if (apps != null) r += Math.min(apps, 22) * 0.45;
  const goals = extra.goals ?? p.goals ?? 0;
  const perGoal = { fw: 1.4, mf: 2, df: 2.8, gk: 3, other: 1.8 }[group] || 1.6;
  r += Math.min(goals * perGoal, 16);
  if (extra.scorerRank === 1) r += 3;
  else if (extra.scorerRank && extra.scorerRank <= 5) r += 1.5;
  if (p.photo) r += 1;
  return clamp(r, 55, 92);
}

/** Atributos (RIT, TIR, PAS, REG, DEF, FIS) coherentes con la posición. */
export function statsFor(id, rating, group) {
  const s = hash(`stats-${id}`);
  const n = (k) => ((s >> (k * 3)) % 9) - 4; // -4..+4
  const prof = {
    gk: [-14, -30, -8, -16, 4, 0],
    df: [-4, -16, -6, -8, 6, 4],
    mf: [0, -2, 6, 4, -8, -2],
    fw: [4, 6, -4, 2, -30, 0],
    other: [0, 0, 0, 0, 0, 0],
  }[group] || [0, 0, 0, 0, 0, 0];
  const keys = ['RIT', 'TIR', 'PAS', 'REG', 'DEF', 'FIS'];
  return Object.fromEntries(keys.map((k, i) => [k, clamp(rating + prof[i] + n(i), 25, 95)]));
}

export function buildCard(p, team, extra = {}) {
  const group = p.group && p.group !== 'other' ? p.group : positionGroup(p.position);
  const rating = ratingFor({ ...p, group }, extra);
  return {
    playerId: String(p.id),
    name: p.name,
    short: shortCardName(p.name),
    photo: p.photo || null,
    group,
    pos: (p.position && p.position.length <= 4 ? p.position : GROUP_CODE[group]) || GROUP_CODE[group],
    club: team ? { id: team.id, short: team.short, name: team.name, logo: team.logo } : null,
    rating,
    tier: tierFor(rating),
    stats: statsFor(p.id, rating, group),
  };
}

export function shortCardName(name = '') {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  const last = parts.slice(1).join(' ');
  return last.length <= 13 ? last : parts[parts.length - 1];
}

async function fetchCatalog() {
  const teamsRaw = await request('teams.php');
  const teams = pickArray(teamsRaw, 'teams').map((t) => normalizeTeam(t));
  const rosters = await Promise.all(
    teams.map((t) =>
      request('players.php', { params: { team_id: t.id } })
        .then((r) => ({ team: t, players: pickArray(r, 'players', 'data', 'roster', 'items').map(normalizeRosterPlayer) }))
        .catch(() => ({ team: t, players: [] })),
    ),
  );
  return rosters;
}

/**
 * Catálogo completo { cards, byId, byTier }.
 * Si los planteles no cargan, usa la tabla de goleo como respaldo.
 */
export function useCatalog() {
  const q = useQuery('manager-catalog', fetchCatalog, { staleTime: 6 * 3600 * 1000 });
  const scorers = useScorers();

  const catalog = useMemo(() => {
    const goalsById = {};
    scorers.rows.forEach((s, i) => {
      if (s.player?.id) goalsById[String(s.player.id)] = { goals: s.goals, scorerRank: s.position || i + 1, photo: s.player.photo, team: s.team };
    });

    const byId = {};
    (q.data || []).forEach(({ team, players }) => {
      players.forEach((p) => {
        if (!p.id || !p.name) return;
        const g = goalsById[String(p.id)] || {};
        byId[String(p.id)] = buildCard({ ...p, photo: p.photo || g.photo }, team, g);
      });
    });
    // Respaldo / complemento: goleadores que no vinieron en planteles
    scorers.rows.forEach((s, i) => {
      const id = String(s.player?.id || '');
      if (id && !byId[id]) byId[id] = buildCard({ id, name: s.player.name, photo: s.player.photo, position: 'DEL', goals: s.goals }, s.team, { goals: s.goals, scorerRank: s.position || i + 1 });
    });

    const cards = Object.values(byId);
    const byTier = { bronce: [], plata: [], oro: [], elite: [] };
    cards.forEach((c) => byTier[c.tier].push(c));
    const byGroup = { gk: [], df: [], mf: [], fw: [] };
    cards.forEach((c) => (byGroup[c.group] || byGroup.mf).push(c));
    return { cards, byId, byTier, byGroup };
  }, [q.data, scorers.rows]);

  return { ...q, ...catalog, loading: q.loading && !catalog.cards.length };
}
