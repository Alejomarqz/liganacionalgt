import { Platform } from 'react-native';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

// ✅ ID del anuncio (test o real)
const UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === 'ios'
    ? 'ca-app-pub-3710973902746391/7881605041'   // 🔁 reemplaza con tu ID real de iOS
    : 'ca-app-pub-3710973902746391/2280373125';  // 🔁 reemplaza con tu ID real de Android

// 🔧 Control interno
let interstitial = null;
let isLoaded = false;
let lastShownAt = 0;
let shownCount = 0;

// Configura límites
const COOLDOWN_MS = 120_000; // 2 minutos entre anuncios
const MAX_PER_SESSION = 4;   // máximo por sesión

// 🔹 Inicializa y carga el interstitial
export function initInterstitial() {
  if (interstitial) return;

  interstitial = InterstitialAd.createForAdRequest(UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });

  interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });

  interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    // recargar después de cerrar
    isLoaded = false;
    interstitial?.load();
  });

  interstitial.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
  });

  interstitial.load();
}

// 🔹 Valida si puede mostrarse
function canShowInterstitial() {
  const now = Date.now();
  if (!isLoaded) return false;
  if (shownCount >= MAX_PER_SESSION) return false;
  if (now - lastShownAt < COOLDOWN_MS) return false;
  return true;
}

// 🔹 Intenta mostrarlo (seguro)
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
