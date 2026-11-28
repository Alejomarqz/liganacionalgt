// src/features/manager/economy.js
// Economía de Liga Manager en Firestore (plan gratuito).
//
//   managers/{uid}            → { club, coins, freePackDay, adDay, adPacks, missions:{day, claimed:[]}, lineup:{slot: cardId}, formation }
//   managers/{uid}/cards/{id} → copia de la carta + { source, createdAt }
//
// Límites (también en reglas): 1 sobre gratis al día, 3 sobres por anuncio al día.

import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { todayKey } from '../games/daily';
import { QUICK_SELL } from './catalog';

const db = () => firestore();
const managerRef = (uid) => db().collection('managers').doc(uid);
const cardsCol = (uid) => managerRef(uid).collection('cards');

export const PACKS = {
  daily: { key: 'daily', name: 'Sobre diario', size: 5, guaranteed: 'oro', cost: 0 },
  ad: { key: 'ad', name: 'Sobre por anuncio', size: 3, guaranteed: 'plata', cost: 0 },
  gold: { key: 'gold', name: 'Sobre Oro', size: 5, guaranteed: 'oro', cost: 2500 },
};
export const AD_PACKS_PER_DAY = 3;
export const WELCOME_COINS = 2000;

// Probabilidades por carta (la garantizada va aparte)
const ODDS = [
  ['elite', 0.04],
  ['oro', 0.18],
  ['plata', 0.38],
  ['bronce', 0.4],
];
const ORDER = ['bronce', 'plata', 'oro', 'elite'];

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];

function drawTier() {
  const x = Math.random();
  let acc = 0;
  for (const [t, p] of ODDS) {
    acc += p;
    if (x < acc) return t;
  }
  return 'bronce';
}

/** Saca n cartas del catálogo; la primera respeta el nivel garantizado. */
export function drawCards(catalog, n, guaranteed) {
  const out = [];
  for (let i = 0; i < n; i += 1) {
    let tier = drawTier();
    if (i === 0 && guaranteed && ORDER.indexOf(tier) < ORDER.indexOf(guaranteed)) tier = guaranteed;
    // si un nivel está vacío, bajamos al siguiente disponible
    let idx = ORDER.indexOf(tier);
    while (idx >= 0 && !catalog.byTier[ORDER[idx]]?.length) idx -= 1;
    if (idx < 0) idx = ORDER.findIndex((t) => catalog.byTier[t]?.length);
    if (idx < 0) break;
    out.push(rnd(catalog.byTier[ORDER[idx]]));
  }
  // ordenadas de menor a mayor: la mejor se revela al final
  return out.sort((a, b) => a.rating - b.rating);
}

/** Once inicial de bienvenida: 1 POR, 4 DEF, 3 MED, 3 DEL de nivel bronce/plata. */
function welcomeSquad(catalog) {
  const pick = (group, k) => {
    const pool = (catalog.byGroup[group] || []).filter((c) => c.tier === 'bronce' || c.tier === 'plata');
    const src = pool.length >= k ? pool : catalog.byGroup[group] || [];
    const copy = [...src];
    const res = [];
    while (res.length < k && copy.length) res.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    return res;
  };
  return [...pick('gk', 1), ...pick('df', 4), ...pick('mf', 3), ...pick('fw', 3)];
}

const cardDoc = (c, source) => ({
  playerId: c.playerId,
  name: c.name,
  short: c.short,
  photo: c.photo || null,
  group: c.group,
  pos: c.pos,
  club: c.club || null,
  rating: c.rating,
  tier: c.tier,
  stats: c.stats,
  source,
  createdAt: firestore.FieldValue.serverTimestamp(),
});

/* ─────────── Lectura en vivo ─────────── */

export function useManager(uid) {
  const [state, setState] = useState({ loading: true, manager: null });
  useEffect(() => {
    if (!uid) return undefined;
    const unsub = managerRef(uid).onSnapshot(
      (snap) => {
        const exists = typeof snap?.exists === 'function' ? snap.exists() : snap?.exists;
        setState({ loading: false, manager: exists ? snap.data() : null });
      },
      () => setState((s) => ({ ...s, loading: false })),
    );
    return () => unsub();
  }, [uid]);
  return state;
}

export function useMyCards(uid) {
  const [state, setState] = useState({ loading: true, cards: [] });
  useEffect(() => {
    if (!uid) return undefined;
    const unsub = cardsCol(uid).onSnapshot(
      (snap) => setState({ loading: false, cards: (snap?.docs || []).map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.rating - a.rating) }),
      () => setState((s) => ({ ...s, loading: false })),
    );
    return () => unsub();
  }, [uid]);
  return state;
}

/* ─────────── Acciones ─────────── */

/** Crea el club la primera vez: monedas + once de bienvenida. */
export async function ensureManager({ uid, nick, catalog }) {
  const ref = managerRef(uid);
  const snap = await ref.get();
  const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
  if (exists) return false;
  if (!catalog.cards.length) return false;
  const batch = db().batch();
  batch.set(ref, {
    uid,
    club: `${nick || 'Mi'} FC`.slice(0, 24),
    coins: WELCOME_COINS,
    formation: '4-3-3',
    lineup: {},
    missions: { day: todayKey(), claimed: [] },
    freePackDay: '',
    adDay: '',
    adPacks: 0,
    createdAt: firestore.FieldValue.serverTimestamp(),
  });
  welcomeSquad(catalog).forEach((c) => batch.set(cardsCol(uid).doc(), cardDoc(c, 'welcome')));
  await batch.commit();
  return true;
}

/** ¿Qué sobres puede abrir hoy? */
export function packAvailability(manager) {
  const today = todayKey();
  const adUsed = manager?.adDay === today ? manager.adPacks || 0 : 0;
  return {
    daily: manager ? manager.freePackDay !== today : false,
    adLeft: Math.max(0, AD_PACKS_PER_DAY - adUsed),
    gold: (manager?.coins || 0) >= PACKS.gold.cost,
  };
}

/**
 * Abre un sobre: valida en una transacción (no se puede abrir dos veces el
 * diario), guarda las cartas y devuelve [{ id, ...carta }] para revelarlas.
 */
export async function openPack({ uid, type, catalog }) {
  const pack = PACKS[type];
  if (!pack) throw new Error('Sobre no válido.');
  const today = todayKey();
  const cards = drawCards(catalog, pack.size, pack.guaranteed);
  if (!cards.length) throw new Error('Las cartas aún se están cargando, intenta en un momento.');
  const refs = cards.map(() => cardsCol(uid).doc());

  await db().runTransaction(async (tx) => {
    const snap = await tx.get(managerRef(uid));
    const m = snap.data() || {};
    const update = {};
    if (type === 'daily') {
      if (m.freePackDay === today) throw new Error('Ya abriste tu sobre de hoy. Vuelve mañana.');
      update.freePackDay = today;
    } else if (type === 'ad') {
      const used = m.adDay === today ? m.adPacks || 0 : 0;
      if (used >= AD_PACKS_PER_DAY) throw new Error('Ya usaste tus sobres por anuncio de hoy.');
      update.adDay = today;
      update.adPacks = used + 1;
    } else if (type === 'gold') {
      if ((m.coins || 0) < pack.cost) throw new Error('No te alcanzan las monedas.');
      update.coins = (m.coins || 0) - pack.cost;
    }
    tx.update(managerRef(uid), update);
    refs.forEach((r, i) => tx.set(r, cardDoc(cards[i], type)));
  });

  return cards.map((c, i) => ({ id: refs[i].id, ...c }));
}

/** Venta rápida: la carta desaparece y suma monedas fijas por nivel. */
export async function quickSell({ uid, card, manager }) {
  const value = QUICK_SELL[card.tier] || 100;
  const batch = db().batch();
  batch.delete(cardsCol(uid).doc(card.id));
  const update = { coins: firestore.FieldValue.increment(value) };
  const lineup = manager?.lineup || {};
  const slot = Object.keys(lineup).find((k) => lineup[k] === card.id);
  if (slot) update[`lineup.${slot}`] = firestore.FieldValue.delete();
  batch.update(managerRef(uid), update);
  await batch.commit();
  return value;
}

export async function saveLineup({ uid, lineup }) {
  await managerRef(uid).update({ lineup });
}

export async function renameClub({ uid, name }) {
  const n = String(name || '').trim().slice(0, 24);
  if (n.length < 3) throw new Error('El nombre debe tener al menos 3 letras.');
  await managerRef(uid).update({ club: n });
}

/* ─────────── Misiones diarias ─────────── */

export const MISSIONS = [
  { key: 'daily_pack', title: 'Abre tu sobre diario', reward: 200 },
  { key: 'quiniela', title: 'Confirma 3 pronósticos de la quiniela', reward: 300 },
  { key: 'daily_player', title: 'Juega ¿Quién es el jugador?', reward: 200 },
  { key: 'lineup', title: 'Completa tu once (11 jugadores)', reward: 150 },
];

export async function claimMission({ uid, key }) {
  const mission = MISSIONS.find((m) => m.key === key);
  if (!mission) return 0;
  const today = todayKey();
  await db().runTransaction(async (tx) => {
    const snap = await tx.get(managerRef(uid));
    const m = snap.data() || {};
    const claimed = m.missions?.day === today ? m.missions.claimed || [] : [];
    if (claimed.includes(key)) throw new Error('Ya reclamaste esta misión.');
    tx.update(managerRef(uid), { coins: (m.coins || 0) + mission.reward, missions: { day: today, claimed: [...claimed, key] } });
  });
  return mission.reward;
}

export const claimedToday = (manager) => (manager?.missions?.day === todayKey() ? manager.missions.claimed || [] : []);
