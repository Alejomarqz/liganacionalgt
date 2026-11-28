// src/features/games/identity.js
// Identidad para juegos: usuario anónimo de Firebase + apodo público.
// Sin registro: la gente juega desde el primer toque.
import { useCallback, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Misma clave que el chat de Liga TV: un solo apodo en toda la app
const NICK_KEY = '@lngt:v3:chat_nick';
export const NICK_MAX = 20;

export async function getUid() {
  const u = auth().currentUser || (await auth().signInAnonymously()).user;
  return u.uid;
}

export async function getNick() {
  let n = await AsyncStorage.getItem(NICK_KEY);
  if (!n) {
    n = `Afición${Math.floor(1000 + Math.random() * 9000)}`;
    await AsyncStorage.setItem(NICK_KEY, n);
  }
  return n;
}

const BLOCK = ['puta', 'puto', 'mierda', 'pendejo', 'hijueputa', 'culero', 'verga', 'maricon'];

export function cleanNick(raw = '') {
  let n = String(raw).replace(/\s+/g, ' ').trim().slice(0, NICK_MAX);
  if (BLOCK.some((w) => n.toLowerCase().includes(w))) n = '';
  return n;
}

/* ───────── Apodos únicos ─────────
   nicknames/{clave} = { uid, nick, updatedAt }
   La clave ignora mayúsculas, tildes, espacios y símbolos:
   "José Pérez", "jose perez" y "JOSE_PEREZ" son el MISMO apodo. */
const NICKS = 'nicknames';
const CLAIMED_KEY = '@lngt:v3:nick_claimed';

export function nickKey(raw = '') {
  return String(raw)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9ñ]/g, '');
}

/** 'free' | 'mine' | 'taken' | 'invalid' */
export async function checkNick(raw) {
  const n = cleanNick(raw);
  const key = nickKey(n);
  if (n.length < 3 || key.length < 3) return 'invalid';
  const uid = await getUid();
  const snap = await firestore().collection(NICKS).doc(key).get();
  const data = snap?.data?.();
  if (!data) return 'free';
  return data.uid === uid ? 'mine' : 'taken';
}

// Reserva el apodo nuevo y libera el anterior en una sola transacción
async function claimNick(n, previous) {
  const uid = await getUid();
  const key = nickKey(n);
  const oldKey = previous ? nickKey(previous) : null;
  const db = firestore();
  await db.runTransaction(async (tx) => {
    const ref = db.collection(NICKS).doc(key);
    const snap = await tx.get(ref);
    const owner = snap?.data?.()?.uid;
    if (owner && owner !== uid) {
      const e = new Error(`"${n}" ya lo está usando otra persona. Prueba con otro.`);
      e.code = 'NICK_TAKEN';
      throw e;
    }
    let oldRef = null;
    if (oldKey && oldKey !== key) {
      oldRef = db.collection(NICKS).doc(oldKey);
      const old = await tx.get(oldRef);
      if (old?.data?.()?.uid !== uid) oldRef = null; // solo liberamos lo que es nuestro
    }
    tx.set(ref, { uid, nick: n, updatedAt: firestore.FieldValue.serverTimestamp() });
    if (oldRef) tx.delete(oldRef);
  });
  await AsyncStorage.setItem(CLAIMED_KEY, key);
}

export async function setNick(raw) {
  const n = cleanNick(raw);
  if (n.length < 3 || nickKey(n).length < 3) throw new Error('El apodo debe tener al menos 3 letras o números.');
  const previous = await AsyncStorage.getItem(NICK_KEY);
  await claimNick(n, previous);
  await AsyncStorage.setItem(NICK_KEY, n);
  return n;
}

// El apodo automático (Afición1234) también se reserva; si ya existe, se genera otro
async function ensureClaimed(nick) {
  try {
    if ((await AsyncStorage.getItem(CLAIMED_KEY)) === nickKey(nick)) return nick;
    for (let i = 0; i < 4; i++) {
      const candidate = i === 0 ? nick : `Afición${Math.floor(10000 + Math.random() * 90000)}`;
      try {
        await claimNick(candidate, null);
        if (candidate !== nick) await AsyncStorage.setItem(NICK_KEY, candidate);
        return candidate;
      } catch (e) {
        if (e?.code !== 'NICK_TAKEN') return nick; // sin red: seguimos con el local
      }
    }
  } catch {}
  return nick;
}

/** { uid, nick, ready, rename } */
export function useGameIdentity() {
  const [state, setState] = useState({ uid: null, nick: '', ready: false });
  useEffect(() => {
    let alive = true;
    Promise.all([getUid().catch(() => null), getNick()])
      .then(async ([uid, nick]) => {
        if (alive) setState({ uid, nick, ready: true });
        const final = uid ? await ensureClaimed(nick) : nick;
        if (alive && final !== nick) setState((s) => ({ ...s, nick: final }));
      });
    return () => {
      alive = false;
    };
  }, []);
  const rename = useCallback(async (raw) => {
    const nick = await setNick(raw);
    setState((s) => ({ ...s, nick }));
    return nick;
  }, []);
  return { ...state, rename };
}

/** Disponibilidad en vivo mientras escribe: { status: 'idle'|'checking'|'free'|'mine'|'taken'|'invalid' } */
export function useNickAvailability(draft, enabled = true) {
  const [status, setStatus] = useState('idle');
  useEffect(() => {
    if (!enabled) return setStatus('idle');
    const n = cleanNick(draft);
    if (n.length < 3 || nickKey(n).length < 3) return setStatus(draft ? 'invalid' : 'idle');
    setStatus('checking');
    let alive = true;
    const t = setTimeout(() => {
      checkNick(n)
        .then((r) => alive && setStatus(r))
        .catch(() => alive && setStatus('idle'));
    }, 450);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [draft, enabled]);
  return status;
}
