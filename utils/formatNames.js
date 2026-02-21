// utils/formatNames.js
const PARTICLES = new Set([
  'de','del','la','las','los','y','e','el',
  'da','do','dos','das','di','van','von','der','den','ter'
]);

const tidy = (s='') => String(s).trim().replace(/\s+/g, ' ');
const cap  = (w='') => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : '');

/**
 * Devuelve "First Surname" respetando partículas (de, del, da, la, el, van, von, der…).
 * Usa shortName/nick como fallback si faltan first/last.
 */
export function formatSubName(name = {}) {
  let first = tidy(name.first || '');
  let last  = tidy(name.last  || '');

  if (!first || !last) {
    const s = tidy(name.shortName || name.nick || '');
    if (s) {
      const t = s.split(' ');
      if (!first) first = t[0] || '';
      if (!last && t.length > 1) last = t.slice(1).join(' ');
    }
  }

  const tokens = last ? last.split(' ') : [];
  let out = [], i = 0;
  while (i < tokens.length && PARTICLES.has(tokens[i].toLowerCase())) {
    out.push(tokens[i].toLowerCase()); i++;
  }
  if (i < tokens.length) out.push(tokens[i]);

  const surname = out
    .map(w => PARTICLES.has(w.toLowerCase()) ? w.toLowerCase() : cap(w))
    .join(' ')
    .trim();

  return [cap(first), surname].filter(Boolean).join(' ');
}
