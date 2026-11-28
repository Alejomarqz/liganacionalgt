// src/features/games/useGameStats.js
// Todo lo del jugador en un solo hook: identidad, pronósticos, reto diario,
// puntos (se publican al ranking) y posición nacional.
import { useMatches } from '../../api/liga';
import { useGameIdentity } from './identity';
import { useMyPredictions, useMyScore, useMyRank, useMyDaily, useLeaderboard } from './quinielaStore';

export function useGameStats({ withBoard = false } = {}) {
  const identity = useGameIdentity();
  const matchesQ = useMatches();
  const seasonId = matchesQ.seasonId;
  const preds = useMyPredictions(identity.uid);
  const daily = useMyDaily(identity.uid);
  const totals = useMyScore({ uid: identity.uid, nick: identity.nick, seasonId, byRound: preds.byRound, matches: matchesQ.matches, daily });
  const counted = useMyRank(seasonId, identity.ready && !preds.loading ? totals.total : null);
  const board = useLeaderboard(withBoard ? seasonId : null, 50);

  // Si estoy en el top cargado, la posición sale de ahí (más confiable que el conteo)
  const idx = board.rows.findIndex((r) => r.uid === identity.uid);
  const rank = idx >= 0 ? idx + 1 : counted.rank;

  return { ...identity, matchesQ, seasonId, preds, daily, totals, rank, totalPlayers: counted.total ?? (board.rows.length || null), board };
}
