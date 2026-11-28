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

/* ── Formato de fecha/hora en español Guatemala ── */
const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatKickoff(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  const hh = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const h12 = hh % 12 || 12;
  const time = `${h12}:${mm} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
  if (same(d, today)) return `Hoy · ${time}`;
  if (same(d, tomorrow)) return `Mañana · ${time}`;
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${time}`;
}

export function formatTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  const hh = d.getHours();
  return `${hh % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// Guatemala: Apertura (jul–dic) · Clausura (ene–jun)
export function seasonLabel(d = new Date()) {
  return `${d.getMonth() >= 6 ? 'Apertura' : 'Clausura'} ${d.getFullYear()}`;
}
