// src/features/games/scoring.js
// Reglas de puntos de la Quiniela (iguales para todos, se muestran en la app).
//   Marcador exacto ............................ 5 pts
//   Ganador (o empate) + diferencia de goles .... 3 pts
//   Solo ganador (o empate) ..................... 2 pts
//   Fallo ....................................... 0 pts

export const POINTS = { exact: 5, diff: 3, result: 2, miss: 0 };

const sign = (n) => (n > 0 ? 1 : n < 0 ? -1 : 0);

/** pick {home, away} vs final {home, away} → { points, kind } */
export function scorePick(pick, final) {
  if (!pick || final?.home == null || final?.away == null) return { points: 0, kind: 'none' };
  const ph = Number(pick.home);
  const pa = Number(pick.away);
  const fh = Number(final.home);
  const fa = Number(final.away);
  if (ph === fh && pa === fa) return { points: POINTS.exact, kind: 'exact' };
  if (sign(ph - pa) === sign(fh - fa)) {
    if (ph - pa === fh - fa) return { points: POINTS.diff, kind: 'diff' };
    return { points: POINTS.result, kind: 'result' };
  }
  return { points: POINTS.miss, kind: 'miss' };
}

/** ¿Se puede pronosticar? Solo partidos programados que aún no empiezan. */
export const isOpen = (m) => Boolean(m?.isScheduled && m.kickoff && m.kickoff.getTime() > Date.now());

/**
 * Totales a partir de los pronósticos (todas las jornadas) y los partidos.
 * predictionsByRound: { [roundId]: { picks: { [matchId]: {home, away} } } }
 */
export function computeTotals(predictionsByRound, matchesById) {
  let points = 0;
  let exact = 0;
  let played = 0;
  const rounds = {};
  for (const [roundId, doc] of Object.entries(predictionsByRound || {})) {
    let rp = 0;
    for (const [matchId, pick] of Object.entries(doc?.picks || {})) {
      const m = matchesById[matchId];
      if (!m?.isFinished) continue;
      const r = scorePick(pick, { home: m.score.home, away: m.score.away });
      rp += r.points;
      played += 1;
      if (r.kind === 'exact') exact += 1;
    }
    rounds[roundId] = rp;
    points += rp;
  }
  return { points, exact, played, rounds };
}
