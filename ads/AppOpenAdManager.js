// ads/AppOpenAdManager.js
import { Platform } from 'react-native';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import AD_UNITS from './AdConfig';

// ── Usa el ad unit de App Open ──
const UNIT_ID = AD_UNITS.APP_OPEN;

// Control interno
let interstitial = null;
let isLoaded = false;
let lastShownAt = 0;
let shownCount = 0;

// Límites
const COOLDOWN_MS = 120_000; // 2 minutos entre anuncios
const MAX_PER_SESSION = 4;   // máximo por sesión

// Gracia para que AppOpen no interfiera con interstitials
let openAdGraceUntil = 0;
export function setOpenAdGrace(ms = 30_000) {
  openAdGraceUntil = Date.now() + (Number(ms) || 30_000);
}
export function isOpenAdBlocked() {
  return Date.now() < openAdGraceUntil;
}

// Inicializa y carga el interstitial
export function initInterstitial() {
  if (interstitial) return;

  interstitial = InterstitialAd.createForAdRequest(UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });

  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded = false;
    interstitial?.load();
  });

  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
  });

  interstitial.load();
}

// Valida si puede mostrarse
function canShowInterstitial() {
  const now = Date.now();
  if (!isLoaded) return false;
  if (isOpenAdBlocked()) return false;
  if (shownCount >= MAX_PER_SESSION) return false;
  if (now - lastShownAt < COOLDOWN_MS) return false;
  return true;
}

// Intenta mostrarlo
export async function tryShowInterstitial() {
  if (!canShowInterstitial()) return false;
  try {
    await interstitial?.show();
    lastShownAt = Date.now();
    shownCount += 1;
    return true;
  } catch (err) {
    console.warn('Error mostrando interstitial:', err);
    return false;
  }
}