// ads/AdConfig.js
// ─── Centralized Ad Unit IDs ────────────────────────────────────────
// All ad unit IDs in one place so you can track eCPM per placement.
// ─────────────────────────────────────────────────────────────────────

import { Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

const IS_DEV = __DEV__;
const ios = Platform.OS === 'ios';

const AD_UNITS = {
  // ── Banner: footer fijo en la mayoría de pantallas ──
  BANNER_FOOTER: IS_DEV
    ? TestIds.BANNER
    : ios
      ? 'ca-app-pub-5408077761010566/9891088729'    // iOS — banner_footer
      : 'ca-app-pub-5408077761010566/3778912498',   // Android — banner_footer

  // ── Banner: inline dentro de listas (posiciones, partidos) ──
  BANNER_INLINE: IS_DEV
    ? TestIds.BANNER
    : ios
      ? 'ca-app-pub-5408077761010566/9891088729'    // iOS — TODO: crear banner_inline en iOS
      : 'ca-app-pub-5408077761010566/6466349969',   // Android — banner_inline

  // ── Interstitial: navegación general (enter/exit match, team) ──
  INTERSTITIAL_GENERAL: IS_DEV
    ? TestIds.INTERSTITIAL
    : ios
      ? 'ca-app-pub-5408077761010566/7616279177'    // iOS — interstitial_general
      : 'ca-app-pub-5408077761010566/9845627398',   // Android — interstitial_general

  // ── Interstitial: posiciones / transiciones de jornada ──
  INTERSTITIAL_POSITIONS: IS_DEV
    ? TestIds.INTERSTITIAL
    : ios
      ? 'ca-app-pub-5408077761010566/7616279177'    // iOS — TODO: crear interstitial separado
      : 'ca-app-pub-5408077761010566/8818947497',   // Android — banner_inline_positions (intersticial)

  // ── App Open: al volver del background ──
  APP_OPEN: IS_DEV
    ? TestIds.APP_OPEN
    : ios
      ? 'ca-app-pub-5408077761010566/7616279177'    // iOS — TODO: crear app_open en iOS
      : 'ca-app-pub-5408077761010566/5999446102',   // Android — app_open_foreground

  // ── App Open: al iniciar la app ──
  APP_OPEN_START: IS_DEV
    ? TestIds.APP_OPEN
    : ios
      ? 'ca-app-pub-5408077761010566/7616279177'    // iOS — TODO: crear appopen_start en iOS
      : 'ca-app-pub-5408077761010566/5171885210',   // Android — appopen_start

  // ── Native: inline en listas ──
  NATIVE_INLINE: IS_DEV
    ? (TestIds.NATIVE || TestIds.NATIVE_ADVANCED)
    : ios
      ? 'ca-app-pub-5408077761010566/6231045311'    // iOS — native_inline
      : 'ca-app-pub-5408077761010566/9133496749',   // Android — native_inline

  // ── Rewarded: contenido premium opcional ──
  REWARDED: IS_DEV
    ? TestIds.REWARDED
    : ios
      ? 'ca-app-pub-5408077761010566/XXXXXXXXXX'    // iOS — TODO: crear en iOS
      : 'ca-app-pub-5408077761010566/8625609443',   // Android — rewarded_premium_content
};

export default AD_UNITS;