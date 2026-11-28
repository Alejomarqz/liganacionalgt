// src/features/games/daily.js
// Lógica de "¿Quién es el jugador?": jugador del día, intentos, pistas y racha.
// Todo en el teléfono (sin servidor). El jugador del día es el mismo para todos:
// sale de la fecha de Guatemala + lista de goleadores ordenada por id.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { gt } from '../../api/clock';

const KEY = '@lngt:v3:daily_player';
export const MAX_TRIES = 6;
export const BLUR_BY_TRY = [26, 18, 12, 7, 3, 0]; // la foto se aclara con cada fallo

export const todayKey = () => {
  const p = gt(new Date());
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

const yesterdayKey = () => {
  const p = gt(new Date(Date.now() - 86400000));
  return `${p.year}-${String(p.month + 1).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Candidatos: goleadores con al menos 1 gol, orden estable por id. */
export function buildPool(scorers) {
  return scorers
    .filter((s) => s.player?.id && s.player?.name && s.goals > 0)
    .map((s) => ({ id: String(s.player.id), name: s.player.name, photo: s.player.photo, number: s.player.shirtNumber ?? null, goals: s.goals, team: s.team }))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
}

export async function loadState() {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) || 'null') || { streak: 0, best: 0, played: 0, wins: 0, days: {} };
  } catch {
    return { streak: 0, best: 0, played: 0, wins: 0, days: {} };
  }
}

export async function saveState(s) {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}

/** Elige (y fija para todo el día) el jugador de hoy. */
export function pickAnswer(state, pool) {
  const k = todayKey();
  const fixed = state.days?.[k]?.answerId;
  if (fixed) return pool.find((p) => p.id === fixed) || null;
  if (!pool.length) return null;
  return pool[hash(`lngt-${k}`) % pool.length];
}

/** Comparación de un intento contra la respuesta (para las pistas). */
export function compare(guess, answer) {
  const sameTeam = guess.team?.id && answer.team?.id && String(guess.team.id) === String(answer.team.id);
  const cmp = (g, a) => (g == null || a == null ? 'unknown' : g === a ? 'equal' : g < a ? 'higher' : 'lower');
  return {
    correct: guess.id === answer.id,
    team: sameTeam ? 'equal' : 'diff',
    goals: cmp(guess.goals, answer.goals), // 'higher' = la respuesta tiene MÁS goles
    number: cmp(guess.number, answer.number),
  };
}

/** Registra el final del día y actualiza la racha. */
export function finishDay(state, { won, tries, answerId, guesses }) {
  const k = todayKey();
  const days = { ...(state.days || {}) };
  days[k] = { won, tries, answerId, guesses, done: true };
  const continued = days[yesterdayKey()]?.won;
  const streak = won ? (continued ? (state.streak || 0) + 1 : 1) : 0;
  // guardamos solo los últimos 60 días
  const keys = Object.keys(days).sort().slice(-60);
  const trimmed = Object.fromEntries(keys.map((x) => [x, days[x]]));
  return {
    ...state,
    days: trimmed,
    streak,
    best: Math.max(state.best || 0, streak),
    played: (state.played || 0) + 1,
    wins: (state.wins || 0) + (won ? 1 : 0),
  };
}

/** Texto para compartir, estilo Wordle. */
export function shareText({ won, tries, streak }) {
  const p = gt(new Date());
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const squares = Array.from({ length: won ? tries : MAX_TRIES }, (_, i) => (won && i === tries - 1 ? '🟩' : '🟥')).join('');
  return `¿Quién es el jugador? · ${p.day} ${months[p.month]}\n${won ? `${tries}/${MAX_TRIES}` : `X/${MAX_TRIES}`} ${squares}${streak > 1 ? `\n🔥 Racha de ${streak} días` : ''}\nJuega en la app oficial de la Liga Nacional GT`;
}
