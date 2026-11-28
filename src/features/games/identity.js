// src/features/games/identity.js
// Identidad para juegos: usuario anónimo de Firebase + apodo público.
// Sin registro: la gente juega desde el primer toque.
import { useCallback, useEffect, useState } from 'react';
import auth from '@react-native-firebase/auth';
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

export async function setNick(raw) {
  const n = cleanNick(raw);
  if (n.length < 3) throw new Error('El apodo debe tener al menos 3 letras.');
  await AsyncStorage.setItem(NICK_KEY, n);
  return n;
}

/** { uid, nick, ready, rename } */
export function useGameIdentity() {
  const [state, setState] = useState({ uid: null, nick: '', ready: false });
  useEffect(() => {
    let alive = true;
    Promise.all([getUid().catch(() => null), getNick()]).then(([uid, nick]) => alive && setState({ uid, nick, ready: true }));
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
