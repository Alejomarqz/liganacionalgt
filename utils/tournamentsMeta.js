// utils/tournamentsMeta.js

export const TOURNEY_META = {
  guatemala: {
    label: 'Liga Nacional',
    short: 'Liga Nacional',
    color: '#16a34a',
    icon: require('../resources/guatemala.webp'), // no se usa, puedes borrarlo si quieres
  },
  concacaf: {
    label: 'Eliminatorias CONCACAF',
    short: 'Eliminatorias',          // 👈 sin espacio al inicio
    color: '#d8b97d',           // dorado (tu color)
    icon: require('../resources/concacaf.webp'),
  },
  nationsleague: {
    label: 'CONCACAF Nations League',
    short: 'NationsLeague',
    color: '#7c3aed',
    icon: require('../resources/nationsleague.webp'),
  },
};

export function tourneyLabel(scope, competitionText) {
  const base = TOURNEY_META[scope] || {
    label: scope,
    short: scope,
    color: '#64748b',
    icon: null,
  };
  if (!competitionText) return base;

  const short = String(competitionText)
    .replace(/^CONCACAF\s*-\s*/i, '')
    .replace(/^Guatemala\s*-\s*/i, '')
    .replace(/Liga de las Naciones/gi, 'Nations League')
    .replace(/Torneo\s+/gi, '')
    .trim();

  return { ...base, label: competitionText, short: short || base.short };
}
