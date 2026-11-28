// src/features/teams/legacyIds.js
// La versión anterior de la app (Play Store hasta la 5.x) usaba los IDs del proveedor
// de datos anterior. Sus seguidores quedaron guardados en teams/{idViejo}.
// Mapa: ID de nuestra API → ID viejo (identificados por escudo).
// San Pedro (10) y Suchitepéquez (12) no existían en la app anterior.
export const LEGACY_TEAM_ID = {
  1: '1292', // Municipal
  2: '1773', // Comunicaciones
  3: '2067', // Xelajú
  4: '2070', // Marquense
  5: '2247', // Malacateco
  6: '4735', // Aurora FC
  7: '5154', // Antigua GFC
  8: '5155', // Guastatoya
  9: '5751', // Cobán Imperial
  11: '6549', // Mixco
};

export const legacyIdOf = (teamId) => LEGACY_TEAM_ID[Number(teamId)] || null;
