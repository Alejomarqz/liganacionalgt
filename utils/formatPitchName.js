// utils/formatPitchName.js
const PARTICLES = new Set([ 'de','del','la','las','los','y','e','el','da','do','dos','das','di','van','von','der','den','ter' ]);
const tidy = (s='') => String(s).trim().replace(/\s+/g,' ');
const cap  = (w='') => (w ? w[0].toUpperCase()+w.slice(1).toLowerCase() : '');

export function formatPitchLabel(name = {}, number = null) {
  let first = tidy(name.first || ''), last = tidy(name.last || '');
  if (!first || !last) {
    const s = tidy(name.shortName || name.nick || '');
    if (s) {
      const t = s.split(' ');
      if (!first) first = t[0] || '';
      if (!last && t.length > 1) last = t.slice(1).join(' ');
    }
  }
  const initial = first ? (first[0].toUpperCase() + '.') : '';
  const tokens = last ? last.split(' ') : [];
  let out = [], i = 0;
  while (i < tokens.length && PARTICLES.has(tokens[i].toLowerCase())) { out.push(tokens[i].toLowerCase()); i++; }
  if (i < tokens.length) out.push(tokens[i]);
  const surname = out.map(w => (PARTICLES.has(w.toLowerCase()) ? w.toLowerCase() : cap(w))).join(' ').trim();
  const jersey  = (number != null && number !== '') ? ` ${number}` : '';
  return [initial, surname].filter(Boolean).join(' ') + jersey;
}
