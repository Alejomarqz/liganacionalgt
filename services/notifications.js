// services/notifications.js
// ======================================================
// Push routing + topics + helpers para React Navigation
// ======================================================

import { Platform, PermissionsAndroid, InteractionManager } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import analytics from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native'; // ← NUEVO

import { setPushGrace } from '../ads/AdManager';
import { setOpenAdGrace } from '../ads/AppOpenAdManager';


// =====================
// Estado interno simple
// =====================
let navRef = null;
let navReady = false;
let pendingRouteData = null;   // último payload data recibido por push
let hasTriedInitialNav = false;
let startedFromPush = false;

// =====================
// Claves de almacenamiento
// =====================
const KS = {
  FOLLOW_MATCH: (id) => `fc_follow_match_${id}`,
  FOLLOW_TEAM:  (id) => `fc_follow_team_${id}`,
};

// =====================
// Helpers de texto y tabs
// =====================
const norm = (s = '') =>
  s.toString()
   .toLowerCase()
   .normalize('NFD')
   .replace(/[\u0300-\u036f]/g, '')
   .replace(/\s+/g, '');

const TAB_ALIAS = {
  alineacion: 'Alineaciones',
  alineaciones: 'Alineaciones',
  detalle: 'Detalles',
  detalles: 'Detalles',
  estadistica: 'Estadísticas',
  estadisticas: 'Estadísticas',
  tabla: 'Posiciones',
  posicion: 'Posiciones',
  posiciones: 'Posiciones',
  live: 'En vivo',
  envivo: 'En vivo',
  'en-vivo': 'En vivo',
  'en_vivo': 'En vivo',
};

function mapInitialTab(raw) {
  if (!raw) return null;
  const key = norm(raw);
  return TAB_ALIAS[key] || raw;
}

// =====================
// Analytics helper
// =====================
async function logA(eventName, params = {}) {
  try {
    await analytics().logEvent(eventName, params);
  } catch {
    // silencioso
  }
}


// =====================
// Permisos
// =====================
export async function requestUserPermissionIfNeeded() {
  try {
    // Android 13+ requiere POST_NOTIFICATIONS
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
      // granted: 'granted' | 'denied' | 'never_ask_again'
      // no necesitamos usar el valor aquí
    }

    // iOS / Android (FCM) – pide permiso en iOS y registra en Android
    const authStatus = await messaging().requestPermission();
    // Opcional: puedes loguear el status si quieres
    return authStatus;
  } catch (e) {
    // Silencioso para no romper flujo
    return null;
  }
}

// =====================
// Flags "empecé por push"
// =====================
export function setStartedFromPush(v) {
  startedFromPush = !!v;
}
export function getStartedFromPush() {
  return startedFromPush;
}

// =====================
// Suscripción a tópicos
// =====================
export async function followMatch(matchId) {
  const id = String(matchId || '').trim();
  if (!id) return false;

  await messaging().subscribeToTopic(`match_${id}`);
  await AsyncStorage.setItem(KS.FOLLOW_MATCH(id), '1');

  await logA('follow_match', { match_id: id }); // ✅ NUEVO
  return true;
}

export async function unfollowMatch(matchId) {
  const id = String(matchId || '').trim();
  if (!id) return false;

  await messaging().unsubscribeFromTopic(`match_${id}`);
  await AsyncStorage.removeItem(KS.FOLLOW_MATCH(id));

  await logA('unfollow_match', { match_id: id }); // ✅ NUEVO
  return true;
}


export async function isFollowingMatch(matchId) {
  const id = String(matchId || '').trim();
  if (!id) return false;
  const v = await AsyncStorage.getItem(KS.FOLLOW_MATCH(id));
  return v === '1';
}

export async function followTeam(teamId) {
  const id = String(teamId || '').trim();
  if (!id) return false;

  await messaging().subscribeToTopic(`team_${id}`);
  await AsyncStorage.setItem(KS.FOLLOW_TEAM(id), '1');

  await logA('follow_team', { team_id: id }); // ✅ NUEVO
  return true;
}

export async function unfollowTeam(teamId) {
  const id = String(teamId || '').trim();
  if (!id) return false;

  await messaging().unsubscribeFromTopic(`team_${id}`);
  await AsyncStorage.removeItem(KS.FOLLOW_TEAM(id));

  await logA('unfollow_team', { team_id: id }); // ✅ NUEVO
  return true;
}


export async function isFollowingTeam(teamId) {
  const id = String(teamId || '').trim();
  if (!id) return false;
  const v = await AsyncStorage.getItem(KS.FOLLOW_TEAM(id));
  return v === '1';
}

// =============================================
// Suscripción al TOPIC GLOBAL "futbolchapin"
// =============================================

const GLOBAL_TOPIC_KEY = 'fc_global_topic_futbolchapin_v1';

export async function subscribeGlobalTopic() {
  try {
    await messaging().subscribeToTopic('futbolchapin');
    await AsyncStorage.setItem(GLOBAL_TOPIC_KEY, '1');

    await logA('global_topic_subscribe', { topic: 'futbolchapin' }); // ✅ NUEVO
    console.log('[NOTIF] Suscrito a topic global futbolchapin');
    return true;
  } catch (e) {
    console.log('[NOTIF] ERROR al suscribir topic global:', e);
    return false;
  }
}

export async function unsubscribeGlobalTopic() {
  try {
    await messaging().unsubscribeFromTopic('futbolchapin');
    await AsyncStorage.removeItem(GLOBAL_TOPIC_KEY);

    await logA('global_topic_unsubscribe', { topic: 'futbolchapin' }); // ✅ NUEVO
    console.log('[NOTIF] Eliminada suscripción global futbolchapin');
    return true;
  } catch (e) {
    console.log('[NOTIF] ERROR al eliminar topic global:', e);
    return false;
  }
}


export async function isSubscribedGlobalTopic() {
  const v = await AsyncStorage.getItem(GLOBAL_TOPIC_KEY);
  return v === '1';
}

// Para ejecutar solo UNA VEZ cuando la app arranca
export async function ensureGlobalTopicOnce() {
  const v = await AsyncStorage.getItem(GLOBAL_TOPIC_KEY);
  if (v === '1') return;
  await subscribeGlobalTopic();
}


// =====================
// Navegación (routing)
// =====================
function safeNavigate(screen, params) {
  try {
    navRef?.current?.navigate(screen, params);
    return true;
  } catch (e) {
    return false;
  }
}

// ← NUEVO: reset al stack [Home, destino] cuando arrancas desde push
function resetToHomeThen(screen, params) {
  try {
    navRef?.current?.dispatch(
      CommonActions.reset({
        index: 1,
        routes: [
          { name: 'Home' },
          { name: screen, params },
        ],
      })
    );
    return true;
  } catch (e) {
    return false;
  }
}

// Lee payload.data y navega
// Lee payload.data y navega
function handleRoute(data = {}) {
  // 👀 Log para ver qué llega realmente del push
  console.log('[NOTIF][handleRoute:data]', data);

  // Fallback: si viene matchId pero NO viene screen, asumimos que es un partido
  if (!data.screen && data.matchId) {
    data.screen = 'Match';
  }

  // Esperamos data como:
  // {
  //   screen: 'Match' | 'Team' | ...
  //   matchId: '784700',
  //   channel: 'guatemala',    // estándar
  //   scope: 'guatemala',      // legacy (se mapea a channel)
  //   tab: 'alineaciones'      // o initialTab
  // }

  const screenRaw = data.screen || '';
  const screen = screenRaw.toString();
  const matchId = data.matchId ? String(data.matchId) : '';
  const channel = (data.channel || data.scope || 'guatemala').toString();
  const initialTab = mapInitialTab(data.initialTab || data.tab || '');

  if (norm(screen) === 'match' && matchId) {
    const routeKey = `match_${matchId}_${Date.now()}`;
    const params = {
      matchId,
      channel,       // <-- usa 'channel' (de scope si vino legacy)
      initialTab,
      routeKey,      // útil para forzar rerender si vienes de otra pantalla
      fromPush: true, 
    };

    // Si empezaste por push → stack = [Home, Match]
    if (getStartedFromPush()) {
      return resetToHomeThen('Match', params);
    }
    return safeNavigate('Match', params);
  }

  if (norm(screen) === 'team' && data.teamId) {
    const teamId = String(data.teamId);
    const routeKey = `team_${teamId}_${Date.now()}`;

    // Si la noti trae ymd/hhmm/gmt, armamos 'pre' para que el header muestre fecha/hora al instante
    let pre = null;
    const ymd  = (data.ymd || '').toString().replace(/-/g, '');
    const hhmm = (data.hhmm || '').toString().slice(0,5);
    const gmt  = (data.gmt != null) ? Number(data.gmt) : null;
    if (ymd && hhmm) {
      pre = {
        id: matchId,
        date: ymd,                        // YYYYMMDD
        scheduledStart: `${hhmm}:00`,     // HH:MM:SS
        gmt,
        teams: { homeTeamId:'', awayTeamId:'', homeTeamName:'', awayTeamName:'' }, // placeholders
      };
    }

    const params = {
      teamId,
      channel,
      routeKey,
      ...(pre ? { pre } : {}),
    };

    if (getStartedFromPush()) {
      return resetToHomeThen('TeamScreen', params);
    }
    return safeNavigate('TeamScreen', params);
  }

  // Si no coincide nada, no navegamos.
  return false;
}


// Intenta navegar si hay payload pendiente y navegación lista
function doNavigateIfPossible() {
  if (!navReady || !navRef || !navRef.current) return false;
  if (!pendingRouteData) return false;

  const ok = handleRoute(pendingRouteData);
  if (ok) {
  pendingRouteData = null;
  hasTriedInitialNav = true;
  setStartedFromPush(false);
  return true;
}
  return false;
}

// =====================
// Instalación del router
// =====================
// Opcional: puedes pasar { onForegroundMessage } para mostrar banner in-app, etc.
export function installNotificationRouter(navigationRef, opts = {}) {
  navRef = navigationRef;

  // 1) App en foreground (mensaje recibido mientras estás usando la app)
  messaging().onMessage(async (remote) => {
    console.log('[NOTIF][fg]', remote?.notification, remote?.data); // 👈 log
    if (typeof opts.onForegroundMessage === 'function') {
      opts.onForegroundMessage(remote);
    }
    // No navegamos automáticamente en foreground.
  });

  // 2) App en background: usuario toca la notificación
  messaging().onNotificationOpenedApp((remote) => {
    console.log('[NOTIF][openBG]', remote?.notification, remote?.data); // 👈 log
    // ✅ NUEVO: analytics push open (background)
    logA('push_open', {
      state: 'background',
      screen: String(remote?.data?.screen || ''),
      match_id: String(remote?.data?.matchId || ''),
      team_id: String(remote?.data?.teamId || ''),
      topic: String(remote?.data?.topic || ''), // si algún día lo mandas
    });

    pendingRouteData = remote?.data || null;
    hasTriedInitialNav = false;
    setStartedFromPush(!!pendingRouteData);
    // ✅ Bloquea interstitial al entrar desde push + da gracia al App Open
    setPushGrace(15_000);
    setOpenAdGrace(15_000);

    // Intentos escalonados para cubrir la animación de montaje
    doNavigateIfPossible();
    setTimeout(doNavigateIfPossible, 0);
    setTimeout(doNavigateIfPossible, 250);
    setTimeout(doNavigateIfPossible, 800);
    InteractionManager.runAfterInteractions(() => doNavigateIfPossible());
  });

  // 3) App en cold start (quit): entró por la notificación
  messaging().getInitialNotification().then((remote) => {
    console.log('[NOTIF][initial]', remote?.notification, remote?.data); // 👈 log
    // ✅ NUEVO: analytics push open (cold start)
    logA('push_open', {
      state: 'cold_start',
      screen: String(remote?.data?.screen || ''),
      match_id: String(remote?.data?.matchId || ''),
      team_id: String(remote?.data?.teamId || ''),
      topic: String(remote?.data?.topic || ''),
    });

    pendingRouteData = remote?.data || null;
    hasTriedInitialNav = false;
    setStartedFromPush(!!pendingRouteData);
    // ✅ Bloquea interstitial al entrar desde push + da gracia al App Open
    setPushGrace(15_000);
    setOpenAdGrace(15_000);

    // onNavigationReady() se encargará de completar la navegación.
  });
}


// Llama esto en NavigationContainer onReady
export function onNavigationReady(navigationRef) {
  navRef = navigationRef;
  navReady = true;

  if (!hasTriedInitialNav) {
    doNavigateIfPossible();
    setTimeout(doNavigateIfPossible, 0);
    setTimeout(doNavigateIfPossible, 250);
    setTimeout(doNavigateIfPossible, 800);
    InteractionManager.runAfterInteractions(() => doNavigateIfPossible());
  }
}

// =====================
// Utilidad para pruebas
// =====================
// Simula que recibiste un push data y fuerza navegación
export function __dev_forceRoute(data) {
  pendingRouteData = data || null;
  setStartedFromPush(!!pendingRouteData);
  doNavigateIfPossible();
}
