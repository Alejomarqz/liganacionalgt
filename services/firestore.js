// services/firestore.js
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// ✅ Firestore DEFAULT del proyecto (futbolchapin-ae164)
export function followersDb() {
  return firestore();
}

export function followersAuth() {
  return auth();
}

/** Helpers compatibles con exists boolean o exists() function */
function snapExists(snap) {
  return typeof snap?.exists === 'function' ? snap.exists() : !!snap?.exists;
}
function snapData(snap) {
  return typeof snap?.data === 'function' ? snap.data() : (snap?.data || null);
}

/** Usuario anónimo garantizado */
let _authReady = null;
export async function ensureAnonUser() {
  if (_authReady) return _authReady;
  _authReady = (async () => {
    const a = followersAuth();
    const cur = a.currentUser;
    if (cur) return cur;
    const cred = await a.signInAnonymously();
    return cred.user;
  })();
  return _authReady;
}

/** teams/{teamId} */
function teamRef(teamId) {
  return followersDb().collection('teams').doc(String(teamId));
}

/** Escucha contador */
export function listenFollowersCount(teamId, cb) {
  return teamRef(teamId).onSnapshot((doc) => {
    const d = snapData(doc) || {};
    cb(Number(d.followersCount || 0));
  });
}

/** Estado follow leyendo users/{uid}/follows/{teamId} */
export async function getFollowState(teamId) {
  const user = await ensureAnonUser();
  const tid = String(teamId);

  const snap = await followersDb()
    .collection('users')
    .doc(user.uid)
    .collection('follows')
    .doc(tid)
    .get();

  return snapExists(snap);
}

/** Toggle follow (transacción) */
export async function toggleFollowTeam(teamId) {
  const db = followersDb();
  const user = await ensureAnonUser();

  const uid = user.uid;
  const tid = String(teamId);

  const tRef = db.collection('teams').doc(tid);
  const folRef = tRef.collection('followers').doc(uid);
  const userRef = db.collection('users').doc(uid).collection('follows').doc(tid);

  return db.runTransaction(async (tx) => {
    const [folSnap, teamSnap] = await Promise.all([
      tx.get(folRef),
      tx.get(tRef),
    ]);

    const teamExists = snapExists(teamSnap);
    const folExists = snapExists(folSnap);

    const teamData = snapData(teamSnap) || {};
    const prev = teamExists ? Number(teamData.followersCount || 0) : 0;

    // si no existe el team doc, lo creamos
    if (!teamExists) {
      tx.set(tRef, { followersCount: 0 }, { merge: true });
    }

    if (!folExists) {
      // FOLLOW
      tx.set(folRef, { uid, ts: firestore.FieldValue.serverTimestamp() });
      tx.set(userRef, { teamId: tid, ts: firestore.FieldValue.serverTimestamp() });

      const next = prev + 1;
      tx.set(tRef, { followersCount: next }, { merge: true });

      return { following: true, followersCount: next, uid };
    } else {
      // UNFOLLOW
      tx.delete(folRef);
      tx.delete(userRef);

      const next = Math.max(0, prev - 1);
      tx.set(tRef, { followersCount: next }, { merge: true });

      return { following: false, followersCount: next, uid };
    }
  });
}
// ✅ Estado en vivo (contador + si lo sigue)
export function listenTeamFollowState(teamId, uid, cb) {
  const db = followersDb();
  const tid = String(teamId);

  const teamRef = db.collection("teams").doc(tid);
  const folRef = teamRef.collection("followers").doc(uid);

  let teamCount = 0;
  let following = false;

  const emit = () => cb({ followersCount: teamCount, following });

  const unsubTeam = teamRef.onSnapshot((snap) => {
    teamCount = Number((snap.data() || {}).followersCount || 0);
    emit();
  });

  const unsubFol = folRef.onSnapshot((snap) => {
    const ex = typeof snap?.exists === "function" ? snap.exists() : !!snap?.exists;
    following = ex;
    emit();
  });

  return () => {
    try { unsubTeam(); } catch {}
    try { unsubFol(); } catch {}
  };
}

