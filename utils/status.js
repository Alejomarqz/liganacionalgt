// utils/status.js
export const LIVE_SET = new Set([1,6,8,10,12]);
export const isLive = id => LIVE_SET.has(Number(id));
export function statusLabel(id) {
  switch (Number(id)) {
    case 0: return 'Programado';
    case 1: return 'Primer Tiempo';
    case 2: return 'Finalizado';
    case 3: return 'Suspendido';
    case 4: return 'Postergado';
    case 5: return 'Entretiempo'; // 👈 regla del proyecto
    case 6: return 'Segundo Tiempo';
    case 7: return 'Fin 90′';
    case 8: return 'Alargue 1';
    case 9: return 'Fin alargue 1';
    case 10: return 'Alargue 2';
    case 11: return 'Fin alargue 2';
    case 12: return 'Penales';
    default: return '—';
  }
}
export const SEP = '\u202F\u00B7\u202F'; // “ · ” angosto con no-break
