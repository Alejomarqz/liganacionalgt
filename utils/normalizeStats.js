// utils/normalizeStats.js
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function pairFrom(node) {
  if (!node || typeof node !== 'object') return null;
  const home = toNum(node.homeQty);
  const away = toNum(node.awayQty);
  if (home == null && away == null) return null;
  return { home: home ?? 0, away: away ?? 0 };
}

export function normalizeStats(input) {
  // admite j completo o j.summary directamente
  const summary = (input && input.summary && typeof input.summary === 'object')
    ? input.summary
    : (input && typeof input === 'object' ? input : null);

  if (!summary) return null;

  // 👇 nombres EXACTOS que maneja tu feed (incluye 'ballPossesion')
  const stats = {
    possession: pairFrom(summary.ballPossesion),
    shots:      pairFrom(summary.shots),
    onTarget:   pairFrom(summary.shotsOnTarget),
    offTarget:  pairFrom(summary.shotsOffTarget),
    woodwork:   pairFrom(summary.shotsOnWoodwork),
    corners:    pairFrom(summary.cornerKicks),
    offsides:   pairFrom(summary.offsides),
    fouls:      pairFrom(summary.fouls),
    yellows:    pairFrom(summary.yellowCards),
    reds:       pairFrom(summary.redCards),
    saves:      pairFrom(summary.saves),
    freeKicks:  pairFrom(summary.freeKicks),
  };

  // si todas son null, devolvemos null para que el UI muestre “Sin estadísticas”
  const hasAny = Object.values(stats).some(Boolean);
  return hasAny ? stats : null;
}
