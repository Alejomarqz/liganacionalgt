// src/features/manager/squad.js
// Mi Once: formación 4-3-3, media del equipo y química.
export const FORMATION_433 = [
  { slot: 'POR', group: 'gk', x: 0.5, y: 0.9 },
  { slot: 'LI', group: 'df', x: 0.13, y: 0.7 },
  { slot: 'DFC1', group: 'df', x: 0.37, y: 0.73 },
  { slot: 'DFC2', group: 'df', x: 0.63, y: 0.73 },
  { slot: 'LD', group: 'df', x: 0.87, y: 0.7 },
  { slot: 'MC1', group: 'mf', x: 0.22, y: 0.47 },
  { slot: 'MCO', group: 'mf', x: 0.5, y: 0.43 },
  { slot: 'MC2', group: 'mf', x: 0.78, y: 0.47 },
  { slot: 'EI', group: 'fw', x: 0.17, y: 0.18 },
  { slot: 'DC', group: 'fw', x: 0.5, y: 0.13 },
  { slot: 'ED', group: 'fw', x: 0.83, y: 0.18 },
];
export const SLOT_LABEL = { POR: 'POR', LI: 'LI', DFC1: 'DFC', DFC2: 'DFC', LD: 'LD', MC1: 'MC', MCO: 'MCO', MC2: 'MC', EI: 'EI', DC: 'DC', ED: 'ED' };

/** Resuelve las cartas del once a partir del lineup {slot: cardId}. */
export function resolveLineup(lineup = {}, cards = []) {
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  return FORMATION_433.map((s) => ({ ...s, card: byId[lineup[s.slot]] || null }));
}

/**
 * Química por jugador (0–3):
 *  +1 si juega en su posición natural
 *  +1 si hay al menos 1 compañero de su club en el once
 *  +1 si hay 2 o más compañeros de su club
 */
export function chemistry(slots) {
  const clubs = {};
  slots.forEach((s) => s.card?.club?.id && (clubs[s.card.club.id] = (clubs[s.card.club.id] || 0) + 1));
  let total = 0;
  const per = slots.map((s) => {
    if (!s.card) return 0;
    let c = s.card.group === s.group ? 1 : 0;
    const mates = (clubs[s.card.club?.id] || 1) - 1;
    if (mates >= 1) c += 1;
    if (mates >= 2) c += 1;
    total += c;
    return c;
  });
  return { total, max: slots.length * 3, per };
}

export function teamRating(slots) {
  const filled = slots.filter((s) => s.card);
  if (!filled.length) return 0;
  // las vacías cuentan como 0 para motivar completar el once
  return Math.round(filled.reduce((a, s) => a + s.card.rating, 0) / slots.length);
}

/** Auto-armar: la mejor carta disponible por posición (sin repetir jugador). */
export function autoLineup(cards) {
  const used = new Set();
  const usedPlayers = new Set();
  const lineup = {};
  const sorted = [...cards].sort((a, b) => b.rating - a.rating);
  for (const s of FORMATION_433) {
    const pick = sorted.find((c) => c.group === s.group && !used.has(c.id) && !usedPlayers.has(c.playerId)) || sorted.find((c) => !used.has(c.id) && !usedPlayers.has(c.playerId));
    if (pick) {
      lineup[s.slot] = pick.id;
      used.add(pick.id);
      usedPlayers.add(pick.playerId);
    }
  }
  return lineup;
}
