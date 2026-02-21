// utils/datetime.js
export const GT_OFFSET = -6; // America/Guatemala

export function parseYmd(s) {
  if (s == null) return null;
  const str = String(s);
  if (str.includes('-')) {
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0);
  }
  if (str.length >= 8) {
    const y = +str.slice(0, 4), m = +str.slice(4, 6), d = +str.slice(6, 8);
    return new Date(y, m - 1, d, 0, 0, 0);
  }
  return null;
}
export function ddmmyyyy(d) {
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}
export function weekdayTimeES(d, hhmm) {
  try {
    const wd = d.toLocaleDateString('es-ES',{ weekday:'short' }).replace('.','');
    return `${wd}, ${hhmm || '--:--'}`;
  } catch {
    const names = ['dom','lun','mar','mié','jue','vie','sáb'];
    return `${names[d.getDay()]}, ${hhmm || '--:--'}`;
  }
}
export function adjustTimeToGuatemala(hhmm, gmt) {
  if (!hhmm) return { hhmm:'--:--', shift:0 };
  const [h,m] = hhmm.split(':').map(n => parseInt(n,10));
  const g = Number.isFinite(Number(gmt)) ? Number(gmt) : GT_OFFSET;
  const delta = GT_OFFSET - g;
  let total = h*60 + m + delta*60;
  let shift = 0;
  while (total < 0) { total += 1440; shift -= 1; }
  while (total >= 1440) { total -= 1440; shift += 1; }
  const HH = String(Math.floor(total/60)).padStart(2,'0');
  const MM = String(total%60).padStart(2,'0');
  return { hhmm:`${HH}:${MM}`, shift };
}
export function shiftYmd(ymd, shift) {
  const str = String(ymd||''); if (!shift || str.length<8) return str || '';
  const y=+str.slice(0,4), mo=+str.slice(4,6)-1, d=+str.slice(6,8);
  const dt = new Date(Date.UTC(y,mo,d)); dt.setUTCDate(dt.getUTCDate()+shift);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth()+1).padStart(2,'0');
  const dd = String(dt.getUTCDate()).padStart(2,'0');
  return `${yy}${mm}${dd}`;
}
export function linesForCard(dateYmd, hhmmGT) {
  const d = parseYmd(dateYmd);
  return {
    line1: d ? ddmmyyyy(d) : '',
    line2: d ? weekdayTimeES(d, hhmmGT) : '',
  };
}
