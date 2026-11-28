// src/features/teams/useTeamColor.js
// Color de cabecera por club (perfil de equipo y jugador).
// Mapa curado por slug: sin librerías nativas. Los clubes que no estén aquí
// usan el azul Liga, que es el color de la identidad. Para agregar o corregir
// un club, basta con editar CLUB_COLORS (se oscurece solo si hace falta).

const CLUB_COLORS = {
  municipal: '#C8102E',
  comunicaciones: '#2F6FD6',
  'antigua-gfc': '#0B7A3E',
  antigua: '#0B7A3E',
  xelaju: '#B5121B',
  'xelaju-mc': '#B5121B',
  guastatoya: '#C99700',
};

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const toHex = (rgb) => `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

// Oscurece hasta que el texto blanco sea legible encima
function ensureDark(hex) {
  let rgb = hexToRgb(hex);
  if (!rgb) return null;
  let guard = 0;
  while (luminance(rgb) > 0.42 && guard < 12) {
    rgb = rgb.map((v) => v * 0.85);
    guard += 1;
  }
  return toHex(rgb);
}

const slugify = (s = '') =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

export function teamColor(team, fallback) {
  if (!team) return fallback;
  const key = team.slug || slugify(team.name);
  const hit = CLUB_COLORS[key] || CLUB_COLORS[slugify(team.name)];
  return hit ? ensureDark(hit) : fallback;
}

/** Hook para mantener la misma API en las pantallas. */
export function useTeamColor(team, fallback) {
  return teamColor(team, fallback);
}
