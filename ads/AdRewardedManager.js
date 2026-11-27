// ads/AdRewardedManager.js
// ─── Rewarded Ad: usuario elige ver un anuncio para desbloquear contenido ───
//
// Uso:
//   import { initRewarded, showRewarded } from '../ads/AdRewardedManager';
//
//   // En App.js o al iniciar:
//   initRewarded();
//
//   // Cuando el usuario toca "Ver alineación probable" o similar:
//   const rewarded = await showRewarded();
//   if (rewarded) { /* desbloquear contenido */ }
//
import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import AD_UNITS from './AdConfig';

const UNIT_ID = AD_UNITS.REWARDED;

let rewardedAd = null;
let isLoaded = false;
let resolveReward = null;

/**
 * Inicializa y precarga el rewarded ad.
 * Llamar una vez al iniciar la app.
 */
export function initRewarded() {
  if (rewardedAd) return;
  loadAd();
}

function loadAd() {
  rewardedAd = RewardedAd.createForAdRequest(UNIT_ID, {
    requestNonPersonalizedAdsOnly: false,
  });

  rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
    isLoaded = true;
  });

  rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
    // El usuario completó el video
    if (resolveReward) {
      resolveReward(true);
      resolveReward = null;
    }
  });

  rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
    // Si cerró sin completar, resolve false
    if (resolveReward) {
      resolveReward(false);
      resolveReward = null;
    }
    isLoaded = false;
    // Precargar el siguiente
    setTimeout(() => loadAd(), 1000);
  });

  rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
    isLoaded = false;
    if (resolveReward) {
      resolveReward(false);
      resolveReward = null;
    }
    // Retry después de 30s
    setTimeout(() => loadAd(), 30_000);
  });

  rewardedAd.load();
}

/**
 * @returns {boolean} true si hay un rewarded listo para mostrar
 */
export function isRewardedReady() {
  return isLoaded;
}

/**
 * Muestra el rewarded ad.
 * @returns {Promise<boolean>} true si el usuario completó el video
 */
export function showRewarded() {
  return new Promise((resolve) => {
    if (!isLoaded || !rewardedAd) {
      resolve(false);
      return;
    }

    resolveReward = resolve;

    try {
      rewardedAd.show();
    } catch (err) {
      console.warn('[Rewarded] Error showing ad:', err);
      resolveReward = null;
      resolve(false);
    }
  });
}