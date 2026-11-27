// src/design/tokens.js
// ─────────────────────────────────────────────────────────────
//  LIGA NACIONAL GT · Design System v3
//  Una sola fuente de verdad para color, tipo, espacio y motion.
//  Regla: ninguna pantalla nueva usa colores "a mano".
// ─────────────────────────────────────────────────────────────

import { Platform } from 'react-native';

/* ── Paleta base (no usar directo en pantallas: usar `colors`) ── */
export const palette = {
  // Azul Liga (escudo)
  blue50: '#EEF3FF',
  blue100: '#DCE6FF',
  blue200: '#B6C9FF',
  blue400: '#6F93FF',
  blue500: '#4F7CFF', // eléctrico (acento en dark)
  blue600: '#3B5BDB', // azul royal oficial
  blue700: '#2C45B0',
  blue900: '#14214F',

  // Tinta (fondos oscuros)
  ink950: '#05070F',
  ink900: '#090D1A',
  ink850: '#0E1424',
  ink800: '#131B2F',
  ink700: '#1B2540',
  ink600: '#27324F',
  ink500: '#3A4566',

  // Neutros claros
  gray25: '#FBFCFE',
  gray50: '#F3F5FA',
  gray100: '#E8EBF3',
  gray200: '#D5DAE6',
  gray400: '#9AA1B8',
  gray500: '#6B7290',
  gray700: '#363C55',
  gray900: '#0D1126',

  // Semánticos
  live: '#FF3355',
  liveSoft: 'rgba(255,51,85,0.14)',
  gold: '#FFC24B',
  goldSoft: 'rgba(255,194,75,0.16)',
  green: '#1FD39A',
  greenSoft: 'rgba(31,211,154,0.14)',
  amber: '#FFB020',
  red: '#F04461',

  white: '#FFFFFF',
  black: '#000000',
};

/* ── Temas ── */
const dark = {
  mode: 'dark',
  bg: palette.ink950,
  bgElevated: palette.ink900,
  surface: palette.ink850,
  surfaceAlt: palette.ink800,
  surfaceHigh: palette.ink700,
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',
  divider: 'rgba(255,255,255,0.06)',

  text: '#F5F7FF',
  textSecondary: '#A7AFC9',
  textMuted: '#6C7594',
  textInverse: palette.gray900,

  primary: palette.blue500,
  primaryStrong: palette.blue600,
  primarySoft: 'rgba(79,124,255,0.16)',
  onPrimary: palette.white,

  live: palette.live,
  liveSoft: palette.liveSoft,
  gold: palette.gold,
  goldSoft: palette.goldSoft,
  success: palette.green,
  successSoft: palette.greenSoft,
  warning: palette.amber,
  danger: palette.red,

  // Zonas de la tabla
  zoneChampion: palette.gold,
  zoneQualify: palette.blue500,
  zoneRelegation: palette.red,

  skeleton: 'rgba(255,255,255,0.06)',
  skeletonHighlight: 'rgba(255,255,255,0.12)',
  overlay: 'rgba(3,5,12,0.72)',

  heroGradient: ['#1A2C7A', '#0E1638', palette.ink950],
  liveGradient: ['#3A0A1A', '#140814', palette.ink950],
  goldGradient: ['#FFD978', '#FFB020'],
  primaryGradient: ['#5B86FF', '#3B5BDB'],

  statusBar: 'light-content',
};

const light = {
  mode: 'light',
  bg: palette.gray50,
  bgElevated: palette.white,
  surface: palette.white,
  surfaceAlt: palette.gray25,
  surfaceHigh: palette.gray100,
  border: 'rgba(13,17,38,0.07)',
  borderStrong: 'rgba(13,17,38,0.14)',
  divider: 'rgba(13,17,38,0.06)',

  text: palette.gray900,
  textSecondary: palette.gray700,
  textMuted: palette.gray500,
  textInverse: palette.white,

  primary: palette.blue600,
  primaryStrong: palette.blue700,
  primarySoft: 'rgba(59,91,219,0.10)',
  onPrimary: palette.white,

  live: palette.live,
  liveSoft: 'rgba(255,51,85,0.10)',
  gold: '#E8A100',
  goldSoft: 'rgba(232,161,0,0.12)',
  success: '#0FA878',
  successSoft: 'rgba(15,168,120,0.10)',
  warning: palette.amber,
  danger: palette.red,

  zoneChampion: '#E8A100',
  zoneQualify: palette.blue600,
  zoneRelegation: palette.red,

  skeleton: 'rgba(13,17,38,0.06)',
  skeletonHighlight: 'rgba(13,17,38,0.11)',
  overlay: 'rgba(5,8,20,0.55)',

  heroGradient: ['#3B5BDB', '#2C45B0', '#14214F'],
  liveGradient: ['#C21C3D', '#5E0F24', '#1A0A14'],
  goldGradient: ['#FFD978', '#FFB020'],
  primaryGradient: ['#5B86FF', '#3B5BDB'],

  statusBar: 'dark-content',
};

export const themes = { dark, light };

/* ── Espaciado (base 4) ── */
export const space = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
};

/* ── Tipografía (Poppins ya está instalada en android/ios) ── */
const F = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semibold: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
  extrabold: 'Poppins-ExtraBold',
  black: 'Poppins-Black',
};

export const fonts = F;

// Las variantes incluyen lineHeight fijo para un ritmo vertical consistente.
export const type = {
  display: { fontFamily: F.black, fontSize: 34, lineHeight: 40, letterSpacing: -0.8 },
  h1: { fontFamily: F.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  h2: { fontFamily: F.bold, fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  h3: { fontFamily: F.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: F.regular, fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontFamily: F.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: F.medium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: F.bold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  // Números: marcadores, puntos, minutos. Tabulares para que no "bailen".
  score: {
    fontFamily: F.black,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  scoreSm: {
    fontFamily: F.extrabold,
    fontSize: 18,
    lineHeight: 22,
    fontVariant: ['tabular-nums'],
  },
  number: {
    fontFamily: F.semibold,
    fontSize: 13,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
};

/* ── Elevación ── */
export const shadow = (mode, level = 1) => {
  if (mode === 'dark') {
    // En dark la profundidad la da el color de superficie, no la sombra.
    return Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.35 * level,
        shadowRadius: 10 * level,
        shadowOffset: { width: 0, height: 4 * level },
      },
      android: { elevation: 0 },
    });
  }
  return Platform.select({
    ios: {
      shadowColor: '#1A2350',
      shadowOpacity: 0.06 + 0.03 * level,
      shadowRadius: 8 * level,
      shadowOffset: { width: 0, height: 3 * level },
    },
    android: { elevation: 1 + level },
  });
};

/* ── Motion ── */
export const motion = {
  fast: 140,
  base: 220,
  slow: 380,
  spring: { damping: 18, stiffness: 220, mass: 0.9 },
  pressScale: 0.97,
};

export const hitSlop = { top: 10, bottom: 10, left: 10, right: 10 };
