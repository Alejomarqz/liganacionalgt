// src/design/tokens.js
// ─────────────────────────────────────────────────────────────
//  LIGA NACIONAL GT · Design System v3
//  Una sola fuente de verdad para color, tipo, espacio y motion.
//  Regla: ninguna pantalla nueva usa colores "a mano".
// ─────────────────────────────────────────────────────────────

import { Platform } from 'react-native';

/* ── Paleta base · identidad "La Diagonal" (sale del escudo oficial) ── */
export const palette = {
  // Azul Liga (escudo: #3568FD → #36A0FF)
  blue: '#3568FD',
  sky: '#36A0FF',
  blueDeep: '#1E3FD8',
  blueNight: '#0A1440',

  // Azul noche (fondos)
  ink: '#060A17',
  ink2: '#0B1226',
  ink3: '#111A33',
  ink4: '#18223F',

  // Texto sobre oscuro
  txt: '#F4F6FC',
  sub: '#9AA3BF',
  mut: '#5E6888',

  // Claros
  paper: '#F3F5FA',
  white: '#FFFFFF',
  gray200: '#D9DEEA',
  gray500: '#68718F',
  gray700: '#323A55',
  gray900: '#0B1226',

  // Semánticos (con moderación: el azul manda)
  live: '#FF3B4E',
  win: '#2ED3A0',
  draw: '#5E6888',
  loss: '#FF3B4E',
  yellowCard: '#FFC93C',
  gold: '#FFC24B',
  black: '#000000',
};

/* ── Temas ── */
const dark = {
  mode: 'dark',
  bg: palette.ink,
  bgElevated: '#070C1C',
  surface: palette.ink2,
  surfaceAlt: palette.ink2,
  surfaceHigh: palette.ink3,
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.14)',
  divider: 'rgba(255,255,255,0.07)',

  text: palette.txt,
  textSecondary: palette.sub,
  textMuted: palette.mut,
  textInverse: palette.ink,

  primary: palette.sky, // acento sobre oscuro (links, indicadores)
  primaryStrong: palette.blue, // relleno de marca (chips activos, botones)
  primarySoft: 'rgba(53,104,253,0.14)',
  onPrimary: palette.white,

  live: palette.live,
  liveSoft: 'rgba(255,59,78,0.10)',
  gold: palette.gold,
  goldSoft: 'rgba(255,194,75,0.14)',
  success: palette.win,
  successSoft: 'rgba(46,211,160,0.12)',
  warning: palette.yellowCard,
  danger: '#FF6B7A',

  zoneChampion: palette.sky,
  zoneQualify: palette.sky,
  zoneRelegation: palette.live,

  formW: palette.win,
  formD: palette.draw,
  formL: palette.loss,

  band: 'rgba(255,255,255,0.025)',
  skeleton: 'rgba(255,255,255,0.05)',
  skeletonHighlight: 'rgba(255,255,255,0.09)',
  overlay: 'rgba(3,5,12,0.72)',

  // Duotono de fotos de estadio + degradado de marca
  photoTint: [palette.blueDeep, palette.blueNight],
  heroGradient: [palette.blueDeep, palette.blueNight, palette.ink],
  liveGradient: ['#4A0F1F', '#170812', palette.ink],
  goldGradient: ['#FFD978', '#FFB020'],
  primaryGradient: [palette.sky, palette.blue],

  statusBar: 'light-content',
};

const light = {
  mode: 'light',
  // Fondo azul grisáceo: las tarjetas blancas "flotan" y todo gana contraste
  bg: '#EBEFF8',
  bgElevated: palette.white,
  surface: palette.white,
  surfaceAlt: palette.white,
  surfaceHigh: '#E1E8F6',
  border: 'rgba(11,18,38,0.09)',
  borderStrong: 'rgba(11,18,38,0.18)',
  divider: 'rgba(11,18,38,0.07)',

  text: '#060A17',
  textSecondary: '#2A3350',
  textMuted: '#69728F',
  textInverse: palette.white,

  primary: '#2556F0',
  primaryStrong: palette.blue,
  primarySoft: 'rgba(53,104,253,0.10)',
  onPrimary: palette.white,

  live: '#E5283C',
  liveSoft: 'rgba(229,40,60,0.09)',
  gold: '#C98A00',
  goldSoft: 'rgba(201,138,0,0.12)',
  success: '#0E9F72',
  successSoft: 'rgba(14,159,114,0.10)',
  warning: palette.yellowCard,
  danger: '#E5283C',

  zoneChampion: palette.blue,
  zoneQualify: palette.blue,
  zoneRelegation: '#E5283C',

  formW: '#12B886',
  formD: '#A3ACC4',
  formL: '#E5283C',

  skeleton: 'rgba(11,18,38,0.05)',
  skeletonHighlight: 'rgba(11,18,38,0.09)',
  overlay: 'rgba(5,8,20,0.55)',

  // Bandas de cabecera (día de partidos, encabezado de tabla) con tinte azul
  band: 'rgba(53,104,253,0.07)',

  photoTint: [palette.blueDeep, palette.blueNight],
  heroGradient: [palette.blueDeep, palette.blueNight, palette.ink],
  liveGradient: ['#C21C3D', '#5E0F24', '#1A0A14'],
  goldGradient: ['#FFD978', '#FFB020'],
  primaryGradient: [palette.sky, palette.blue],

  statusBar: 'dark-content',
};

export const themes = { dark, light };

/* ── La diagonal: ángulo único de la marca (el de la barra del escudo) ── */
export const SLASH_SKEW = '-20deg';
export const CHIP_SKEW = '-14deg';

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
  xs: 4,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
};

/* ── Tipografía: Inter (texto) + Inter Display (titulares y números) ──
   Archivos en assets/fonts (Android: android/app/src/main/assets/fonts;
   iOS: correr `npx react-native-asset`). */
const F = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semibold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
  extrabold: 'Inter-ExtraBold',
  dBold: 'InterDisplay-Bold',
  dExtra: 'InterDisplay-ExtraBold',
  dBlack: 'InterDisplay-Black',
};

export const fonts = F;

export const type = {
  display: { fontFamily: F.dExtra, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  h1: { fontFamily: F.dExtra, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  h2: { fontFamily: F.dExtra, fontSize: 19, lineHeight: 24, letterSpacing: -0.4 },
  h3: { fontFamily: F.dBold, fontSize: 15, lineHeight: 20, letterSpacing: -0.2 },
  body: { fontFamily: F.medium, fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontFamily: F.semibold, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: F.medium, fontSize: 12, lineHeight: 16 },
  overline: {
    fontFamily: F.bold,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  score: { fontFamily: F.dExtra, fontSize: 58, lineHeight: 62, letterSpacing: -2, fontVariant: ['tabular-nums'] },
  scoreSm: { fontFamily: F.dExtra, fontSize: 20, lineHeight: 24, fontVariant: ['tabular-nums'] },
  time: { fontFamily: F.dBold, fontSize: 17, lineHeight: 20, fontVariant: ['tabular-nums'] },
  number: { fontFamily: F.semibold, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] },
  points: { fontFamily: F.dExtra, fontSize: 15, lineHeight: 18, fontVariant: ['tabular-nums'] },
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
      shadowColor: '#14214F',
      shadowOpacity: 0.08 + 0.03 * level,
      shadowRadius: 10 * level,
      shadowOffset: { width: 0, height: 4 * level },
    },
    android: { elevation: 2 + level },
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
