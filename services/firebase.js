// services/firebase.js
// Inicializa login anónimo y utilidades para token + Firestore en RNFirebase.

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';


/* ============================================================================
 *  Autenticación anónima
 * ==========================================================================*/
export async function ensureAnonLogin() {
  try {
    if (!auth().currentUser) {
      await auth().signInAnonymously();
    }
  } catch (e) {
    console.warn('[firebase] signInAnonymously:', e?.message || e);
  }
}

/** UID actual (garantiza sesión anónima si no existe) */
export async function getUid() {
  const user = auth().currentUser || (await auth().signInAnonymously()).user;
  return user.uid;
}

/** Token de ID (para llamar Cloud Run con Authorization: Bearer <token>) */
export async function getIdToken() {
  const user = auth().currentUser || (await auth().signInAnonymously()).user;
  return user.getIdToken(false); // sin forzar refresh
}

/* ============================================================================
 *  Firestore
 * ==========================================================================*/
export const db = firestore();

/** Escucha en vivo el contador de seguidores de un equipo (teams/{teamId}.followersCount) */
export function onTeamFollowers(teamId, cb) {
  return db
    .collection('teams')
    .doc(String(teamId))
    .onSnapshot((s) => cb(s.exists ? s.data()?.followersCount || 0 : 0));
}

/* ============================================================================
 *  Helpers de “seguir equipo” (verdad por usuario)
 *  users/{uid}/follows/{teamId} => doc vacío o con metadata (p.ej. ts)
 * ==========================================================================*/

/** Ref al doc users/{uid}/follows/{teamId} */
function followDocRef(uid, teamId) {
  return db
    .collection('users')
    .doc(String(uid))
    .collection('follows')
    .doc(String(teamId));
}

/** Lee 1 vez si el usuario (uid anónimo) sigue al equipo */
export async function isFollowingTeam(teamId) {
  try {
    const uid = await getUid();
    const snap = await followDocRef(uid, teamId).get();
    return snap.exists === true;
  } catch (_e) {
    return false;
  }
}

/**
 * Escucha cambios en vivo del follow del usuario sobre un equipo.
 * Devuelve una función para desuscribir (igual que onSnapshot).
 *
 * Uso:
 *   const off = onFollowTeam(teamId, setFollowOn);
 *   // ...
 *   off(); // para limpiar
 */
export function onFollowTeam(teamId, cb) {
  let unsub = null;
  let canceled = false;

  getUid()
    .then((uid) => {
      if (canceled) return;
      unsub = followDocRef(uid, teamId).onSnapshot(
        (s) => cb(!!s.exists),
        () => cb(false)
      );
    })
    .catch(() => cb(false));

  return () => {
    canceled = true;
    try {
      unsub && unsub();
    } catch {}
  };
}
// Inicializa permisos de notificaciones y registro del dispositivo (FCM)
export async function initPush() {
  try {
    // 1) Pedir permiso (iOS / Android 13+)
    await messaging().requestPermission().catch(() => {});

    // 2) Registrar el dispositivo para mensajes remotos
    await messaging().registerDeviceForRemoteMessages().catch(() => {});

    // 3) Obtener el token actual (útil para debug o enviar a tu backend si quisieras)
    const token = await messaging().getToken().catch(() => null);
    if (__DEV__) console.log('[FCM] token:', token);
  } catch (e) {
    console.warn('[FCM] initPush error:', e?.message || e);
  }
}
