// services/notifications.js
// Push routing + topics + permisos + analytics
// Liga Nacional GT - Sistema PRO sin Notifee

import { Platform, PermissionsAndroid, InteractionManager, Vibration } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import analytics from '@react-native-firebase/analytics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { evaluateNotification } from './notificationlevels';
import {
  addFollowedTeam,
  removeFollowedTeam,
  addFollowedMatch,
  removeFollowedMatch,
} from './notificationlevels';

let navRef = null;
let navReady = false;
let pendingRouteData = null;
let hasTriedInitialNav = false;
let startedFromPush = false;
let _showInAppBanner = null;

const GLOBAL_TOPIC = 'liganacionalgt';

const KS = {
  FOLLOW_MATCH: (id) => `lgt_follow_match_${id}`,
  FOLLOW_TEAM: (id) => `lgt_follow_team_${id}`,
  GLOBAL_TOPIC: `lgt_global_topic_${GLOBAL_TOPIC}_v1`,
};

export function registerInAppBanner(fn) {
  _showInAppBanner = fn;
}

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
  resumen: 'Resumen',
};

function mapInitialTab(raw) {
  if (!raw) return null;
  return TAB_ALIAS[norm(raw)] || raw;
}

async function logA(eventName, params = {}) {
  try {
    await analytics().logEvent(eventName, params);
  } catch {}
}

async function prepareMessaging() {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    }

    await messaging().requestPermission().catch(() => {});
    await messaging().registerDeviceForRemoteMessages().catch(() => {});

    const token = await messaging().getToken().catch(() => null);

    if (__DEV__) {
      console.log('[FCM] ready token:', token);
    }

    return token;
  } catch (e) {
    if (__DEV__) console.log('[FCM] prepareMessaging error:', e?.message || e);
    return null;
  }
}

export async function requestUserPermissionIfNeeded() {
  try {
    if (Platform.OS === 'android' && Platform.Version >= 33) {
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
      );
    }

    const authStatus = await messaging().requestPermission();
    return authStatus;
  } catch {
    return null;
  }
}

export function setStartedFromPush(v) {
  startedFromPush = !!v;
}

export function getStartedFromPush() {
  return startedFromPush;
}

// PARTIDO
export async function followMatch(matchId) {
  const id = String(matchId || '').trim();
  if (!id) return false;

  try {
    await prepareMessaging();

    const topic = `match_${id}`;
    console.log('[FCM] intentando suscribir partido:', topic);

    await messaging().subscribeToTopic(topic);

    console.log('[FCM] SUSCRITO OK partido:', topic);

    await AsyncStorage.setItem(KS.FOLLOW_MATCH(id), '1');
    await addFollowedMatch(id);
    await logA('follow_match', { match_id: id, topic });

    return true;
  } catch (e) {
    console.log('[FCM] ERROR suscribiendo partido:', e?.message || e);
    return false;
  }
}

export async function unfollowMatch(matchId) {
  const id = String(matchId || '').trim();
  if (!id) return false;

  try {
    const topic = `match_${id}`;
    console.log('[FCM] intentando desuscribir partido:', topic);

    await messaging().unsubscribeFromTopic(topic);

    console.log('[FCM] DESUSCRITO OK partido:', topic);

    await AsyncStorage.removeItem(KS.FOLLOW_MATCH(id));
    await removeFollowedMatch(id);
    await logA('unfollow_match', { match_id: id, topic });

    return true;
  } catch (e) {
    console.log('[FCM] ERROR desuscribiendo partido:', e?.message || e);
    return false;
  }
}

export async function isFollowingMatch(matchId) {
  const id = String(matchId || '').trim();
  if (!id) return false;

  const v = await AsyncStorage.getItem(KS.FOLLOW_MATCH(id));
  return v === '1';
}

// EQUIPO
export async function followTeam(teamId) {
  const id = String(teamId || '').trim();
  if (!id) return false;

  try {
    await prepareMessaging();

    const topic = `team_${id}`;
    console.log('[FCM] intentando suscribir equipo:', topic);

    await messaging().subscribeToTopic(topic);

    console.log('[FCM] SUSCRITO OK equipo:', topic);

    await AsyncStorage.setItem(KS.FOLLOW_TEAM(id), '1');
    await addFollowedTeam(id);
    await logA('follow_team', { team_id: id, topic });

    return true;
  } catch (e) {
    console.log('[FCM] ERROR suscribiendo equipo:', e?.message || e);
    return false;
  }
}

export async function unfollowTeam(teamId) {
  const id = String(teamId || '').trim();
  if (!id) return false;

  try {
    const topic = `team_${id}`;
    console.log('[FCM] intentando desuscribir equipo:', topic);

    await messaging().unsubscribeFromTopic(topic);

    console.log('[FCM] DESUSCRITO OK equipo:', topic);

    await AsyncStorage.removeItem(KS.FOLLOW_TEAM(id));
    await removeFollowedTeam(id);
    await logA('unfollow_team', { team_id: id, topic });

    return true;
  } catch (e) {
    console.log('[FCM] ERROR desuscribiendo equipo:', e?.message || e);
    return false;
  }
}

export async function isFollowingTeam(teamId) {
  const id = String(teamId || '').trim();
  if (!id) return false;

  const v = await AsyncStorage.getItem(KS.FOLLOW_TEAM(id));
  return v === '1';
}

// GLOBAL
export async function subscribeGlobalTopic() {
  try {
    await prepareMessaging();

    console.log('[FCM] intentando suscribir global:', GLOBAL_TOPIC);

    await messaging().subscribeToTopic(GLOBAL_TOPIC);

    console.log('[FCM] SUSCRITO OK global:', GLOBAL_TOPIC);

    await AsyncStorage.setItem(KS.GLOBAL_TOPIC, '1');
    await logA('global_topic_subscribe', { topic: GLOBAL_TOPIC });

    return true;
  } catch (e) {
    console.log('[FCM] ERROR suscribiendo global:', e?.message || e);
    return false;
  }
}

export async function unsubscribeGlobalTopic() {
  try {
    console.log('[FCM] intentando desuscribir global:', GLOBAL_TOPIC);

    await messaging().unsubscribeFromTopic(GLOBAL_TOPIC);

    console.log('[FCM] DESUSCRITO OK global:', GLOBAL_TOPIC);

    await AsyncStorage.removeItem(KS.GLOBAL_TOPIC);
    await logA('global_topic_unsubscribe', { topic: GLOBAL_TOPIC });

    return true;
  } catch (e) {
    console.log('[FCM] ERROR desuscribiendo global:', e?.message || e);
    return false;
  }
}

export async function isSubscribedGlobalTopic() {
  const v = await AsyncStorage.getItem(KS.GLOBAL_TOPIC);
  return v === '1';
}

export async function ensureGlobalTopicOnce() {
  const v = await AsyncStorage.getItem(KS.GLOBAL_TOPIC);

  if (v === '1') {
    console.log('[FCM] global ya marcado en storage:', GLOBAL_TOPIC);
    return true;
  }

  return subscribeGlobalTopic();
}

// NAVEGACIÓN
function safeNavigate(screen, params) {
  try {
    navRef?.current?.navigate(screen, params);
    return true;
  } catch (e) {
    console.log('[NOTIF] navigation error:', e?.message || e);
    return false;
  }
}

function handleRoute(data = {}) {
  if (!data.screen && data.matchId) {
    data.screen = 'Match';
  }

  if (!data.screen && data.teamId) {
    data.screen = 'Team';
  }

  const screen = String(data.screen || '');
  const matchId = data.matchId ? String(data.matchId) : '';
  const teamId = data.teamId ? String(data.teamId) : '';
  const channel = String(data.channel || data.scope || 'guatemala');
  const initialTab = mapInitialTab(data.initialTab || data.tab || '');

  if (norm(screen) === 'match' && matchId) {
    return safeNavigate('Match', {
      matchId,
      channel,
      initialTab,
      routeKey: `match_${matchId}_${Date.now()}`,
      fromPush: true,
    });
  }

  if ((norm(screen) === 'team' || norm(screen) === 'teamscreen') && teamId) {
    return safeNavigate('TeamScreen', {
      teamId,
      channel,
      routeKey: `team_${teamId}_${Date.now()}`,
      fromPush: true,
    });
  }

  if (norm(screen) === 'positions') {
    return safeNavigate('Positions', { fromPush: true });
  }

  if (norm(screen) === 'calendar') {
    return safeNavigate('Calendar', { fromPush: true });
  }

  if (norm(screen) === 'home') {
    return safeNavigate('Home', { fromPush: true });
  }

  return false;
}

function doNavigateIfPossible() {
  if (!navReady || !navRef?.current || !pendingRouteData) return false;

  const ok = handleRoute(pendingRouteData);

  if (ok) {
    pendingRouteData = null;
    hasTriedInitialNav = true;
    setStartedFromPush(false);
    return true;
  }

  return false;
}

function scheduleNavigationRetries() {
  doNavigateIfPossible();
  setTimeout(doNavigateIfPossible, 0);
  setTimeout(doNavigateIfPossible, 250);
  setTimeout(doNavigateIfPossible, 800);
  InteractionManager.runAfterInteractions(() => doNavigateIfPossible());
}

async function handleForegroundPush(remote) {
  const data = remote?.data || {};

  const event = {
    type: data.type || data.eventType || 'news',
    matchId: data.matchId || '',
    homeTeamId: data.homeTeamId || '',
    awayTeamId: data.awayTeamId || '',
    teamId: data.teamId || '',
    title: remote?.notification?.title || data.title || '',
    body: remote?.notification?.body || data.body || '',
    screen: data.screen || '',
    channel: data.channel || data.scope || 'guatemala',
    initialTab: data.initialTab || data.tab || '',
    ...data,
  };

  const result = {
  title: event.title,
  body: event.body,
  type: event.type,
  priority: 'high',
  shouldVibrate: true,
  ...event,
};

  if (!result) {
    return;
  }

  if (result.shouldVibrate) {
    Vibration.vibrate([0, 200, 100, 200]);
  }

  if (_showInAppBanner) {
    _showInAppBanner(result);
  }
}

export function installNotificationRouter(navigationRef, opts = {}) {
  navRef = navigationRef;

  messaging().onMessage(async (remote) => {
    console.log('[NOTIF][fg]', remote?.notification, remote?.data);

    if (typeof opts.onForegroundMessage === 'function') {
      opts.onForegroundMessage(remote);
    }

    await handleForegroundPush(remote);
  });

  messaging().onNotificationOpenedApp((remote) => {
    console.log('[NOTIF][openBG]', remote?.data);

    logA('push_open', {
      state: 'background',
      screen: String(remote?.data?.screen || ''),
      match_id: String(remote?.data?.matchId || ''),
      team_id: String(remote?.data?.teamId || ''),
      type: String(remote?.data?.type || ''),
    });

    pendingRouteData = remote?.data || null;
    hasTriedInitialNav = false;
    setStartedFromPush(!!pendingRouteData);

    scheduleNavigationRetries();
  });

  messaging().getInitialNotification().then((remote) => {
    if (!remote) return;

    console.log('[NOTIF][initial]', remote?.data);

    logA('push_open', {
      state: 'cold_start',
      screen: String(remote?.data?.screen || ''),
      match_id: String(remote?.data?.matchId || ''),
      team_id: String(remote?.data?.teamId || ''),
      type: String(remote?.data?.type || ''),
    });

    pendingRouteData = remote?.data || null;
    hasTriedInitialNav = false;
    setStartedFromPush(!!pendingRouteData);
  });
}

export function onNavigationReady(navigationRef) {
  navRef = navigationRef;
  navReady = true;

  if (!hasTriedInitialNav) {
    scheduleNavigationRetries();
  }
}

export function __dev_forceRoute(data) {
  pendingRouteData = data || null;
  setStartedFromPush(!!pendingRouteData);
  scheduleNavigationRetries();
}

export async function __dev_simulatePush(eventData) {
  const fakeRemote = {
    notification: {
      title: eventData.title || 'Test notification',
      body: eventData.body || 'Test body',
    },
    data: eventData,
  };

  await handleForegroundPush(fakeRemote);
}