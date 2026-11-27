// src/features/teams/useTeamColor.js
// Color de marca de cada equipo extraído de su escudo (react-native-image-colors,
// ya instalado). Se cachea en memoria. Garantiza contraste con texto blanco.
import { useEffect, useState } from 'react';
import ImageColors from 'react-native-image-colors';

const cache = new Map();

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
const toHex = (rgb) => `#${rgb.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
const luminance = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const saturation = ([r, g, b]) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
};

// Oscurece hasta que el blanco sea legible encima
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

function pick(res) {
  const cands =
    res.platform === 'ios'
      ? [res.primary, res.secondary, res.detail, res.background]
      : [res.vibrant, res.darkVibrant, res.dominant, res.muted, res.darkMuted];
  // Preferimos colores saturados (evita blanco/gris del fondo del escudo)
  const ranked = cands
    .map((c) => ({ c, rgb: hexToRgb(c) }))
    .filter((x) => x.rgb && saturation(x.rgb) > 0.25 && luminance(x.rgb) > 0.06 && luminance(x.rgb) < 0.92);
  return ranked[0]?.c || cands.find(Boolean) || null;
}

export function useTeamColor(logo, fallback) {
  const [color, setColor] = useState(() => cache.get(logo) || fallback);
  useEffect(() => {
    if (!logo) return undefined;
    if (cache.has(logo)) {
      setColor(cache.get(logo));
      return undefined;
    }
    let alive = true;
    ImageColors.getColors(logo, { fallback: fallback || '#3B5BDB', cache: true, key: logo, quality: 'low' })
      .then((res) => {
        const c = ensureDark(pick(res)) || fallback;
        cache.set(logo, c);
        if (alive) setColor(c);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [logo, fallback]);
  return color;
}
