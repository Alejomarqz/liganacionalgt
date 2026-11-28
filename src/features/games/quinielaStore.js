// src/features/games/quinielaStore.js
// Datos de la Quiniela en Firestore (plan gratuito).
//
// Colecciones:
//   quiniela_predictions/{uid}_{roundId}  → { uid, roundId, seasonId, picks: { matchId: {home, away, kickoff} }, updatedAt }
//   quiniela_scores/{uid}                 → { uid, nick, seasonId, points, exact, played, rounds, updatedAt }
//   quiniela_leagues/{code}               → { code, name, ownerUid, members: [uid], seasonId, createdAt }
// Reglas de seguridad: docs/firestore.rules

import { useEffect, useMemo, useRef, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { computeTotals } from './scoring';

const PRED = 'quiniela_predictions';
const SCORES = 'quiniela_scores';
const LEAGUES = 'quiniela_leagues';

const db = () => firestore();

/* ─────────── Pronósticos ─────────── */

/** Todos mis pronósticos (todas las jornadas), en vivo. */
export function useMyPredictions(uid) {
  const [state, setState] = useState({ loading: true, byRound: {} });
  useEffect(() => {
    if (!uid) return undefined;
    const unsub = db()
      .collection(PRED)
      .where('uid', '==', uid)
      .onSnapshot(
        (snap) => {
          const byRound = {};
          snap?.docs?.forEach((d) => {
            const data = d.data();
            byRound[String(data.roundId)] = data;
          });
          setState({ loading: false, byRound });
        },
        () => setState((s) => ({ ...s, loading: false })),
      );
    return () => unsub();
  }, [uid]);
  return state;
}

export async function savePick({ uid, seasonId, match, home, away }) {
  const roundId = String(match.round?.id ?? 'x');
  const ref = db().collection(PRED).doc(`${uid}_${roundId}`);
  await ref.set(
    {
      uid,
      roundId,
      seasonId: seasonId ?? null,
      lastMatchId: String(match.id), // las reglas validan solo este partido nuevo
      picks: {
        [String(match.id)]: {
          home: Math.round(Math.max(0, Math.min(20, Number(home) || 0))),
          away: Math.round(Math.max(0, Math.min(20, Number(away) || 0))),
          kickoff: firestore.Timestamp.fromDate(match.kickoff),
        },
      },
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
}

/* ─────────── Puntaje propio ─────────── */

/**
 * Calcula mis puntos con los resultados finales, suma el reto diario y los
 * publica para el ranking (solo si cambiaron). Devuelve los totales.
 */
export function useMyScore({ uid, nick, seasonId, byRound, matches, daily = { points: 0, wins: 0 } }) {
  const matchesById = useMemo(() => {
    const o = {};
    for (const m of matches) o[String(m.id)] = m;
    return o;
  }, [matches]);
  const q = useMemo(() => computeTotals(byRound, matchesById), [byRound, matchesById]);
  const totals = useMemo(() => ({ ...q, daily: daily.points, dailyWins: daily.wins, total: q.points + daily.points }), [q, daily.points, daily.wins]);
  const lastKey = useRef(null);

  useEffect(() => {
    if (!uid || !nick || seasonId == null || !matches.length) return;
    const key = JSON.stringify([totals.total, totals.points, totals.exact, totals.played, totals.daily, nick]);
    if (lastKey.current === key) return;
    lastKey.current = key;
    db()
      .collection(SCORES)
      .doc(uid)
      .set(
        {
          uid,
          nick,
          seasonId,
          total: totals.total,
          points: totals.points,
          daily: totals.daily,
          dailyWins: totals.dailyWins,
          exact: totals.exact,
          played: totals.played,
          rounds: totals.rounds,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      .catch(() => {});
  }, [uid, nick, seasonId, totals, matches.length]);

  return totals;
}

/* ─────────── Reto diario (puntos al ranking) ─────────── */

const DAILY = 'daily_results';
/** Puntos del reto: 1er intento 6 … 6to intento 1 · fallo 0 */
export const dailyPoints = (won, tries) => (won ? Math.max(1, 7 - tries) : 0);

export async function submitDaily({ uid, date, won, tries, seasonId }) {
  const ref = db().collection(DAILY).doc(`${uid}_${date}`);
  const snap = await ref.get();
  const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
  if (exists) return;
  await ref.set({ uid, date, won: Boolean(won), tries, points: dailyPoints(won, tries), seasonId: seasonId ?? null, createdAt: firestore.FieldValue.serverTimestamp() });
}

export function useMyDaily(uid) {
  const [state, setState] = useState({ points: 0, wins: 0 });
  useEffect(() => {
    if (!uid) return undefined;
    const unsub = db()
      .collection(DAILY)
      .where('uid', '==', uid)
      .onSnapshot(
        (snap) => {
          let points = 0;
          let wins = 0;
          snap?.docs?.forEach((d) => {
            const x = d.data();
            points += x.points || 0;
            wins += x.won ? 1 : 0;
          });
          setState({ points, wins });
        },
        () => {},
      );
    return () => unsub();
  }, [uid]);
  return state;
}

/* ─────────── Ranking nacional ─────────── */

export function useLeaderboard(seasonId, limit = 50) {
  const [state, setState] = useState({ loading: true, rows: [] });
  useEffect(() => {
    if (seasonId == null) return undefined;
    const unsub = db()
      .collection(SCORES)
      .where('seasonId', '==', seasonId)
      .orderBy('total', 'desc')
      .limit(limit)
      .onSnapshot(
        (snap) => setState({ loading: false, rows: snap?.docs?.map((d) => d.data()) || [] }),
        () => setState((s) => ({ ...s, loading: false })),
      );
    return () => unsub();
  }, [seasonId, limit]);
  return state;
}

/** Mi posición nacional = cuántos tienen más puntos que yo + 1. */
export function useMyRank(seasonId, points) {
  // points = total (quiniela + reto)
  const [rank, setRank] = useState(null);
  const [total, setTotal] = useState(null);
  useEffect(() => {
    if (seasonId == null || points == null) return;
    let alive = true;
    const base = db().collection(SCORES).where('seasonId', '==', seasonId);
    Promise.all([base.where('total', '>', points).count().get(), base.count().get()])
      .then(([above, all]) => {
        if (!alive) return;
        setRank(above.data().count + 1);
        setTotal(all.data().count);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [seasonId, points]);
  return { rank, total };
}

/* ─────────── Ligas con amigos ─────────── */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O/1/I para no confundir
const newCode = () => Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

export async function createLeague({ uid, name, seasonId }) {
  const clean = String(name || '').trim().slice(0, 30);
  if (clean.length < 3) throw new Error('El nombre debe tener al menos 3 letras.');
  for (let i = 0; i < 5; i += 1) {
    const code = newCode();
    const ref = db().collection(LEAGUES).doc(code);
    // eslint-disable-next-line no-await-in-loop
    const snap = await ref.get();
    const taken = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
    if (taken) continue;
    // eslint-disable-next-line no-await-in-loop
    await ref.set({ code, name: clean, ownerUid: uid, members: [uid], seasonId: seasonId ?? null, createdAt: firestore.FieldValue.serverTimestamp() });
    return code;
  }
  throw new Error('No se pudo crear la liga, intenta de nuevo.');
}

export async function joinLeague({ uid, code }) {
  const c = String(code || '').trim().toUpperCase();
  if (c.length !== 6) throw new Error('El código tiene 6 caracteres.');
  const ref = db().collection(LEAGUES).doc(c);
  const snap = await ref.get();
  const exists = typeof snap.exists === 'function' ? snap.exists() : snap.exists;
  if (!exists) throw new Error('No existe una liga con ese código.');
  const members = snap.data()?.members || [];
  if (members.length >= 100) throw new Error('Esta liga ya está llena (100 personas).');
  await ref.update({ members: firestore.FieldValue.arrayUnion(uid) });
  return snap.data();
}

export async function leaveLeague({ uid, code }) {
  await db().collection(LEAGUES).doc(code).update({ members: firestore.FieldValue.arrayRemove(uid) });
}

export function useMyLeagues(uid) {
  const [state, setState] = useState({ loading: true, leagues: [] });
  useEffect(() => {
    if (!uid) return undefined;
    const unsub = db()
      .collection(LEAGUES)
      .where('members', 'array-contains', uid)
      .onSnapshot(
        (snap) => setState({ loading: false, leagues: (snap?.docs?.map((d) => d.data()) || []).sort((a, b) => a.name.localeCompare(b.name, 'es')) }),
        () => setState((s) => ({ ...s, loading: false })),
      );
    return () => unsub();
  }, [uid]);
  return state;
}

/** Tabla de una liga: puntajes de sus miembros (consultas en grupos de 10). */
export function useLeagueTable(members = []) {
  const [state, setState] = useState({ loading: true, rows: [] });
  const key = members.slice().sort().join(',');
  useEffect(() => {
    let alive = true;
    const ids = key ? key.split(',') : [];
    if (!ids.length) {
      setState({ loading: false, rows: [] });
      return undefined;
    }
    const chunks = [];
    for (let i = 0; i < ids.length; i += 10) chunks.push(ids.slice(i, i + 10));
    Promise.all(chunks.map((c) => db().collection(SCORES).where(firestore.FieldPath.documentId(), 'in', c).get()))
      .then((snaps) => {
        if (!alive) return;
        const found = {};
        snaps.forEach((s) => s.docs.forEach((d) => (found[d.id] = d.data())));
        const rows = ids
          .map((id) => found[id] || { uid: id, nick: 'Sin jugar aún', total: 0, points: 0, exact: 0, played: 0 })
          .sort((a, b) => (b.total ?? b.points ?? 0) - (a.total ?? a.points ?? 0) || (b.exact || 0) - (a.exact || 0));
        setState({ loading: false, rows });
      })
      .catch(() => alive && setState({ loading: false, rows: [] }));
    return () => {
      alive = false;
    };
  }, [key]);
  return state;
}
