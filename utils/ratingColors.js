// utils/ratingColors.js
// Paleta y reglas tomadas de tu Match.js (>=7 verde, >=6 amarillo, else naranja)
export function ratingChipStyle(r) {
  const n = Number(r);
  if (!Number.isFinite(n) || n <= 0) return { display: 'none' }; // oculta 0 o inválidos
  if (n >= 7) return { backgroundColor: '#1e8f4c' };   // verde
  if (n >= 6) return { backgroundColor: '#e0b000' };   // amarillo
  return { backgroundColor: '#d26a19' };               // naranja
}
