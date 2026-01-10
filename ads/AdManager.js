// ads/AdManager.js
import { AppState, Platform } from 'react-native';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import { setOpenAdGrace } from './AppOpenAdManager';

/* =========================
 * CONFIGURACIÓN
 * ========================= */

// IDs (test / prod)
const UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === 'ios'
    ? 'ca-app-pub-3710973902746391/7881605041'   // iOS
    : 'ca-app-pub-3710973902746391/2280373125';  // Android

// Cooldown por plataforma
const COOLDOWN_IOS_MS = 45_000;      // 45s
const COOLDOWN_ANDROID_MS = 60_000;  // 60s

// Máximo por sesión
const MAX_PER_SESSION = 8;

// ✅ Tiempo de gracia SOLO para aperturas desde notificación (push)
const PUSH_GRACE_MS = 10_000; // 10s

/* =========================
 * ESTADO INTERNO
 * ========================= */
let interstitial = null;
let isLoaded = false;

let lastShownAt = 0;   // timestamp del último anuncio mostrado
let shownCount = 0;    // cuántos interstitials en ESTA sesión

let currentAppState = AppState.currentState;

// ✅ si > now, bloquea interstitials (solo cuando vienes de push)
let pushGraceUntil = 0;

/* =========================
 * HELPERS
 * ========================= */
function cooldownMs() {
  return Platform.OS === 'ios' ? COOLDOWN_IOS_MS : COOLDOWN_ANDROID_MS;
}

function canShow() {
  const now = Date.now();

  if (!isLoaded) return false;

  // ✅ Bloqueo temporal SOLO cuando vienes de notificación
  if (now < pushGraceUntil) return false;

  // límites por sesión
  if (shownCount >= MAX_PER_SESSION) return false;

  // cooldown entre interstitials
  if (now - lastShownAt < cooldownMs()) return false;

  return true;
}

/* =========================
 * API PÚBLICA: PUSH GRACE
 * ========================= */
/**
 * Llama esto cuando detectes que la app se abrió desde notificación (push)
 * Ej: en App.js al detectar getStartedFromPush() === true
 */
export function setPushGrace(ms = PUSH_GRACE_MS) {
  pushGraceUntil = Date.now() + (Number(ms) || PUSH_GRACE_MS);
}

/* =========================
 * INICIALIZACIÓN
 * ========================= */
export function initAdManager() {
  if (interstitial) return;

  interstitial = InterstitialAd.createForAdRequest(UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });

  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    interstitial?.load(); // preload siguiente
  });

  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
  });

  interstitial.load();

  // Detectar (re)entrada a foreground
  AppState.addEventListener('change', handleAppStateChange);
}

function handleAppStateChange(nextState) {
  const wasBg = (currentAppState === 'background' || currentAppState === 'inactive');
  const nowActive = (nextState === 'active');

  if (wasBg && nowActive) {
    // Nueva sesión lógica al volver a foreground
    resetSession();

    // Nota: NO tocamos pushGraceUntil aquí
    // porque el "push grace" se activa explícitamente con setPushGrace()
  }

  currentAppState = nextState;
}

/* =========================
 * SESIÓN
 * ========================= */
export function resetSession() {
  shownCount = 0;

  // ⚠️ NO reiniciamos lastShownAt para evitar spam inmediato
  // cuando el usuario alterna apps / vuelve del background.
}

/* =========================
 * MOSTRAR INTERSTITIAL
 * ========================= */
/**
 * reason (opcional): 'enter_match' | 'exit_match' | 'enter_team' | 'exit_team' | 'nav'
 */
export async function showInterstitialIfReady(reason = '') {
  if (!canShow()) return false;

  try {
    // ✅ Bloquea AppOpen por 30s para que no salga al cerrar este interstitial
    setOpenAdGrace(30_000);

    await interstitial?.show();
    lastShownAt = Date.now();
    shownCount += 1;
    return true;
  } catch {
    return false;
  }
}

