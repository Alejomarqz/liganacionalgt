// src/api/clock.js
// Reloj de partido en vivo que avanza cada segundo en el teléfono
// usando el reloj del servidor como ancla (sin pedir la API cada segundo).

import { useEffect, useState } from 'react';

export function liveSeconds(clock, receivedAt = Date.now()) {
  if (!clock) return 0;
  const base = Number(clock.currentSeconds ?? clock.baseSeconds ?? 0);
  if (!clock.running) return base;
  return base + Math.max(0, (Date.now() - receivedAt) / 1000);
}

/** Etiqueta del minuto: 37' · 45+2' · ENT · FIN */
export function minuteLabel(match, nowSeconds) {
  if (!match) return '';
  const s = match.status;
  if (s === 'halftime') return 'ENT';
  if (s === 'penalties') return 'PEN';
  if (match.isFinished) return match.statusCompact || 'FIN';
  if (!match.isLive) return '';
  const c = match.clock || {};
  // Tiempo añadido: el servidor manda minuto base (45/90) + stoppage
  if (c.minute && c.stoppage > 0) return `${c.minute}+${c.stoppage}'`;
  const sec = nowSeconds ?? liveSeconds(c, match.receivedAt);
  return `${Math.max(1, Math.floor(sec / 60) + 1)}'`;
}

/** Hook que re-renderiza sólo el componente del reloj cada segundo. */
export function useLiveMinute(match) {
  const running = Boolean(match?.isLive && match?.clock?.running);
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    const t = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [running]);
  return minuteLabel(match);
}

/** Cuenta regresiva para el próximo partido / transmisión. */
export function useCountdown(target) {
  const ts = target instanceof Date ? target.getTime() : target ? new Date(target).getTime() : 0;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!ts) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [ts]);
  const diff = Math.max(0, ts - now);
  return {
    done: ts > 0 && diff === 0,
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
  };
}

/* ── Hora oficial de la Liga: Guatemala (UTC-6, sin horario de verano) ──
   Todas las horas se muestran en hora de Guatemala, igual que la web y la API,
   sin depender de la zona horaria configurada en el teléfono. */
const GT_OFFSET_MS = -6 * 3600 * 1000;

/** Partes de fecha/hora en Guatemala para un Date (o ISO). */
export function gt(date) {
  if (!date) return null;
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const s = new Date(d.getTime() + GT_OFFSET_MS);
  return {
    year: s.getUTCFullYear(),
    month: s.getUTCMonth(),
    day: s.getUTCDate(),
    weekday: s.getUTCDay(),
    hours: s.getUTCHours(),
    minutes: s.getUTCMinutes(),
    key: `${s.getUTCFullYear()}-${s.getUTCMonth()}-${s.getUTCDate()}`,
  };
}

export const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** "15:00" */
export function formatTime24(date) {
  const p = gt(date);
  return p ? `${String(p.hours).padStart(2, '0')}:${String(p.minutes).padStart(2, '0')}` : '--:--';
}

/** "Sáb 28 nov" · long: "Sábado 28 nov" */
export function formatDay(date, long = false) {
  const p = gt(date);
  if (!p) return '';
  return `${(long ? DAYS_LONG : DAYS_SHORT)[p.weekday]} ${p.day} ${MONTHS[p.month]}`;
}

/** "Sábado 28" (encabezados de grupo) */
export function formatDayHeader(date) {
  const p = gt(date);
  return p ? `${DAYS_LONG[p.weekday]} ${p.day}` : 'Por definir';
}

/** "Hoy · 15:00" / "Mañana · 15:00" / "Sáb 28 nov · 15:00" */
export function formatKickoff(date) {
  const p = gt(date);
  if (!p) return '';
  const today = gt(new Date());
  const tomorrow = gt(new Date(Date.now() + 86400000));
  const time = formatTime24(date);
  if (p.key === today.key) return `Hoy · ${time}`;
  if (p.key === tomorrow.key) return `Mañana · ${time}`;
  return `${formatDay(date)} · ${time}`;
}

export const formatTime = formatTime24;

// Guatemala: Apertura (jul–dic) · Clausura (ene–jun)
export function seasonLabel(d = new Date()) {
  return `${d.getMonth() >= 6 ? 'Apertura' : 'Clausura'} ${d.getFullYear()}`;
}
