// ads/AppOpenAdManager.js
import { AppState, Platform } from 'react-native';
import { AppOpenAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

/* =========================
 * CONFIG
 * ========================= */
const UNIT_ID = __DEV__
  ? TestIds.APP_OPEN
  : Platform.OS === 'ios'
    ? 'ca-app-pub-3710973902746391/5550213644' // 👈 TU APP OPEN iOS (cuando lo crees)
    : 'ca-app-pub-3710973902746391/2731660370'; // ✅ TU APP OPEN Android

// Para no ser invasivo
const COOLDOWN_MS = 90_000;      // 90s
const MAX_PER_SESSION = 6;

// “Gracia” (ej: si venimos desde push, o recién abrió la app)
let graceUntil = 0;

/* =========================
 * STATE
 * ========================= */
let appOpen = null;
let isLoaded = false;
let isShowing = false;

let lastShownAt = 0;
let shownCount = 0;

let currentAppState = AppState.currentState;

/* =========================
 * HELPERS
 * ========================= */
function canShowNow() {
  const now = Date.now();
  if (!appOpen) return false;
  if (!isLoaded) return false;
  if (isShowing) return false;
  if (shownCount >= MAX_PER_SESSION) return false;
  if (now < graceUntil) return false;
  if (now - lastShownAt < COOLDOWN_MS) return false;
  return true;
}

/* =========================
 * API
 * ========================= */

// Llama esto cuando vienes desde push (o cuando quieras dar tiempo antes de mostrar)
export function setOpenAdGrace(ms = 10_000) {
  graceUntil = Date.now() + Math.max(0, ms);
}

export function resetOpenAdSession() {
  shownCount = 0;
  lastShownAt = 0;
}

export function initAppOpenAd() {
  if (appOpen) return;

  appOpen = AppOpenAd.createForAdRequest(UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });

  appOpen.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });

  appOpen.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
  });

  appOpen.addAdEventListener(AdEventType.OPENED, () => {
    isShowing = true;
  });

  appOpen.addAdEventListener(AdEventType.CLOSED, () => {
    isShowing = false;
    isLoaded = false;

    lastShownAt = Date.now();
    shownCount += 1;

    // preload siguiente
    appOpen?.load();
  });

  // preload inicial
  appOpen.load();

  // mostrar al volver a foreground
  AppState.addEventListener('change', handleAppStateChange);
}

export async function showAppOpenAdIfReady(reason = '') {
  if (!canShowNow()) return false;

  try {
    await appOpen?.show();
    return true;
  } catch (e) {
    isShowing = false;
    return false;
  }
}

/* =========================
 * APPSTATE
 * ========================= */
async function handleAppStateChange(nextState) {
  if (
    (currentAppState === 'background' || currentAppState === 'inactive') &&
    nextState === 'active'
  ) {
    if (!isLoaded) appOpen?.load();
    await showAppOpenAdIfReady('foreground');
  }

  currentAppState = nextState;
}
