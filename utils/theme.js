// utils/theme.js
import { StyleSheet, Platform } from 'react-native';

// ─────────────────────────────────────────────
//  LIGA NACIONAL GT — Sistema de Diseño 2025
//  Fuente: Poppins (configurar en tu app)
//  Paleta: Azul Royal (logo escudo)
// ─────────────────────────────────────────────

// Brand tokens — úsalos donde quieras acceder
// directamente al color sin pasar por el tema
export const BRAND = {
  primary:     '#3B5BDB',   // Azul Royal — color del escudo
  primaryDark: '#2A4AC9',   // Azul más oscuro (hover / pressed)
  primaryLight:'#4A6CF7',   // Azul más claro (gradientes / dark mode)
  gold:        '#F59E0B',   // Dorado
  goldLight:   '#FCD34D',   // Dorado claro
  accent:      '#00C48C',   // Verde acento (en vivo / activo)
  red:         '#E8304A',   // Rojo (en vivo / error / descenso)
  redLight:    '#FF6B80',
};

// ─── LIGHT COLORS ───────────────────────────
export const lightColors = {
  // Fondos
  appBg:           '#F4F6FB',
  screenBg:        '#F4F6FB',
  headerBg:        '#FFFFFF',
  cardBg:          '#FFFFFF',
  cardBgAlt:       '#F8F9FE',
  statusBarBg:     '#FFFFFF',

  // Tabs
  tabBarBg:        '#FFFFFF',
  tabBarBorder:    'rgba(59,91,219,0.10)',

  // Bordes
  cardBorder:      'rgba(59,91,219,0.10)',

  // Textos
  headerText:      '#0F1235',
  text:            '#0F1235',
  textSecondary:   '#5A5E78',
  textMuted:       '#9496A8',

  // Iconos
  iconBg:          '#EEF0FB',
  iconColor:       '#5A5E78',

  // Acento principal
  accent:          BRAND.primary,

  // Input / Segmentos
  segmentBg:       '#EEF0FB',
  segmentBorder:   'rgba(59,91,219,0.18)',
  segmentText:     '#5A5E78',
  segmentTextActive:'#FFFFFF',
  inputBg:         '#EEF0FB',

  // Filas
  rowBg:           '#FFFFFF',
  rowBgAlt:        '#F8F9FE',
  rowBgHighlight:  'rgba(59,91,219,0.04)',

  // Chips / Misc
  chipNumberBg:    '#EEF0FB',
  chipNumberBorder:'rgba(59,91,219,0.18)',
  trackBg:         '#EEF0FB',
  bot:             '#EEF0FB',

  // EN VIVO
  liveText:        '#FFFFFF',
  liveBg:          BRAND.red,
  liveBorder:      BRAND.red,

  // Pills / Tags
  pillActiveBg:    BRAND.primary,
  pillActiveText:  '#FFFFFF',
  pillActiveBorder:BRAND.primary,

  // Nav activo
  navActive:       BRAND.primary,
  navInactive:     '#9496A8',
};

// ─── DARK COLORS ────────────────────────────
export const darkColors = {
  // Fondos
  appBg:           '#0E1120',
  screenBg:        '#0E1120',
  headerBg:        '#161929',
  cardBg:          '#1C2035',
  cardBgAlt:       '#222640',
  statusBarBg:     '#161929',

  // Tabs
  tabBarBg:        '#161929',
  tabBarBorder:    'rgba(74,108,247,0.12)',

  // Bordes
  cardBorder:      'rgba(74,108,247,0.12)',

  // Textos
  headerText:      '#F1F2F6',
  text:            '#F1F2F6',
  textSecondary:   '#9496A8',
  textMuted:       '#5A5C72',

  // Iconos
  iconBg:          '#222640',
  iconColor:       '#C8CAD8',

  // Acento principal — azul brillante para contraste en dark
  accent:          BRAND.primaryLight,   // #4A6CF7 — visible sobre fondos oscuros

  // Input / Segmentos
  segmentBg:       '#1C2035',
  segmentBorder:   'rgba(74,108,247,0.18)',
  segmentText:     '#9496A8',
  segmentTextActive:'#FFFFFF',
  inputBg:         '#1C2035',

  // Filas
  rowBg:           '#1C2035',
  rowBgAlt:        '#222640',
  rowBgHighlight:  'rgba(74,108,247,0.08)',

  // Chips / Misc
  chipNumberBg:    '#222640',
  chipNumberBorder:'rgba(74,108,247,0.20)',
  trackBg:         '#222640',
  bot:             '#FFFFFF',

  // EN VIVO
  liveText:        '#FFFFFF',
  liveBg:          BRAND.red,
  liveBorder:      BRAND.red,

  // Pills / Tags
  pillActiveBg:    BRAND.primaryLight,
  pillActiveText:  '#FFFFFF',
  pillActiveBorder:BRAND.primaryLight,

  // Nav activo — blanco suave en dark (nunca azul oscuro invisible)
  navActive:       '#F1F2F6',
  navInactive:     '#4A4D62',
};

// ─── NAVIGATION THEMES ──────────────────────
export const LIGHT_NAV_THEME = {
  dark: false,
  colors: {
    primary:      BRAND.primary,
    background:   lightColors.appBg,
    card:         lightColors.headerBg,
    text:         lightColors.text,
    border:       lightColors.cardBorder,
    notification: BRAND.red,
  },
};

export const DARK_NAV_THEME = {
  dark: true,
  colors: {
    primary:      BRAND.primaryLight,
    background:   darkColors.appBg,
    card:         darkColors.headerBg,
    text:         darkColors.text,
    border:       darkColors.cardBorder,
    notification: BRAND.red,
  },
};

// ─── TEMA COMPLETO ──────────────────────────
export const lightTheme = {
  mode:           'light',
  colors:         lightColors,
  navigation:     LIGHT_NAV_THEME,
  statusBarStyle: 'dark-content',
};

export const darkTheme = {
  mode:           'dark',
  colors:         darkColors,
  navigation:     DARK_NAV_THEME,
  statusBarStyle: 'light-content',
};

// ─── TIPOGRAFÍA — Poppins ────────────────────
export const TYPOGRAPHY = {
  h1:      { fontFamily: 'Poppins-Bold',       fontSize: 28, lineHeight: 34 },
  h2:      { fontFamily: 'Poppins-Bold',       fontSize: 22, lineHeight: 28 },
  h3:      { fontFamily: 'Poppins-SemiBold',   fontSize: 18, lineHeight: 24 },
  h4:      { fontFamily: 'Poppins-SemiBold',   fontSize: 16, lineHeight: 22 },
  h5:      { fontFamily: 'Poppins-SemiBold',   fontSize: 14, lineHeight: 20 },
  body:    { fontFamily: 'Poppins-Regular',    fontSize: 14, lineHeight: 20 },
  bodyMd:  { fontFamily: 'Poppins-Medium',     fontSize: 14, lineHeight: 20 },
  small:   { fontFamily: 'Poppins-Regular',    fontSize: 12, lineHeight: 17 },
  smallMd: { fontFamily: 'Poppins-Medium',     fontSize: 12, lineHeight: 17 },
  smallBd: { fontFamily: 'Poppins-SemiBold',   fontSize: 12, lineHeight: 17 },
  tiny:    { fontFamily: 'Poppins-Medium',     fontSize: 10, lineHeight: 14 },
  tinyBd:  { fontFamily: 'Poppins-SemiBold',  fontSize: 10, lineHeight: 14 },
  score:   { fontFamily: 'Poppins-ExtraBold',  fontSize: 32, lineHeight: 36 },
  label:   { fontFamily: 'Poppins-Bold',       fontSize: 10, lineHeight: 14, letterSpacing: 0.8 },
};

// ─── ESPACIADO ───────────────────────────────
export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};

// ─── RADIOS ──────────────────────────────────
export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  24,
  full: 999,
};

// ─── SOMBRAS ─────────────────────────────────
export const SHADOWS = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardDark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  hero: {
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
};

// ─── COLORES DE ESTADO DE PARTIDO ────────────
export const STATUS_COLORS = {
  live:      { bg: 'rgba(232,48,74,0.12)',  text: BRAND.red,          dot: BRAND.red          },
  halftime:  { bg: 'rgba(245,158,11,0.12)', text: BRAND.gold,         dot: BRAND.gold         },
  finished:  { bg: 'rgba(148,150,168,0.1)', text: '#9496A8',          dot: '#9496A8'          },
  upcoming:  { bg: 'rgba(59,91,219,0.10)',  text: BRAND.primary,      dot: BRAND.primary      },
  suspended: { bg: 'rgba(245,158,11,0.12)', text: '#E07B00',          dot: '#E07B00'          },
  postponed: { bg: 'rgba(148,150,168,0.1)', text: '#9496A8',          dot: '#9496A8'          },
  default:   { bg: 'rgba(148,150,168,0.1)', text: '#9496A8',          dot: '#9496A8'          },
};

// ─── COMPATIBILIDAD (mantiene tu API anterior) ─
export const palette = {
  background: '#ffffff',
  primary:    BRAND.primary,
  onPrimary:  '#ffffff',
  text:       '#0F1235',
  border:     'rgba(59,91,219,0.10)',
};

export const COLORS = {
  bg:            lightColors.screenBg,
  text:          lightColors.text,
  textMuted:     lightColors.textMuted,
  divider:       lightColors.cardBorder,
  cardBg:        lightColors.cardBg,
  cardBorder:    lightColors.cardBorder,
  liveBg:        'rgba(232,48,74,0.1)',
  liveBorder:    BRAND.red,
  liveText:      BRAND.red,
  cardLiveBg:    'rgba(232,48,74,0.06)',
  cardLiveBorder:BRAND.red,
};

export const THEME = { mode: 'minimal' };

// ─── STATUS MAP ──────────────────────────────
export const STATUS_MAP = {
  0:  'Sin iniciar',
  1:  'Primer Tiempo',
  2:  'Finalizado',
  3:  'Suspendido',
  4:  'Postergado',
  5:  'Medio Tiempo',
  6:  'Segundo Tiempo',
  7:  'Fin Tiempo Reglamentario',
  8:  'Alargue 1',
  9:  'Fin Alargue 1',
  10: 'Alargue 2',
  11: 'Fin Alargue 2',
  12: 'Penales',
};

export const LIVE_IDS    = [1, 6, 8, 10, 12];
export const HALFTIME_ID = 5;

// ─── HELPERS ─────────────────────────────────
export function isHalftime(statusId) {
  return Number(statusId) === HALFTIME_ID;
}
export function isLiveNow(statusId) {
  return LIVE_IDS.includes(Number(statusId));
}
export function statusText(statusId) {
  return isLiveNow(statusId) && !isHalftime(statusId)
    ? 'En juego'
    : STATUS_MAP[Number(statusId)] ?? '—';
}

export const STATUS_ACCENTS = {
  live:      { bar: BRAND.red,          text: BRAND.red       },
  pre:       { bar: '#D8E0FF',          text: BRAND.primary   },
  finished:  { bar: '#ECECEC',          text: '#9CA3AF'       },
  suspended: { bar: '#FFE8D6',          text: '#EA580C'       },
  postponed: { bar: '#F0F0F0',          text: '#6B7280'       },
  default:   { bar: '#EAEAEA',          text: '#374151'       },
};

export function getAccent(statusId) {
  const s = Number(statusId);
  if (THEME.mode === 'minimal') {
    if (isLiveNow(s) && !isHalftime(s)) return STATUS_ACCENTS.live;
    return { bar: COLORS.cardBorder, text: COLORS.textMuted };
  }
  if (isLiveNow(s) && !isHalftime(s)) return STATUS_ACCENTS.live;
  if ([2, 7, 9, 11].includes(s))       return STATUS_ACCENTS.finished;
  if (s === 3)                          return STATUS_ACCENTS.suspended;
  if (s === 4)                          return STATUS_ACCENTS.postponed;
  if (s === 0)                          return STATUS_ACCENTS.pre;
  return STATUS_ACCENTS.default;
}

// ─── BASE STYLES (compatibilidad) ────────────
export const baseStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
  titleBar: {
    marginTop: 10,
    height: 40,
    backgroundColor: palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  titleBarText: {
    fontSize: 16,
    color: palette.onPrimary,
    fontWeight: 'bold',
  },
  sectionBar: {
    height: 28,
    backgroundColor: palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  sectionBarText: {
    fontSize: 12,
    color: palette.onPrimary,
    fontWeight: 'bold',
  },
  segmented: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  segmentedBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginHorizontal: 5,
    borderRadius: 10,
    paddingVertical: 6,
  },
  segmentedOn:  { backgroundColor: palette.primary, borderColor: palette.primary },
  segmentedOff: { backgroundColor: palette.background, borderColor: palette.primary },
  segmentedTextOn:  { color: palette.onPrimary, fontWeight: 'bold', fontSize: 12 },
  segmentedTextOff: { color: palette.primary,   fontWeight: 'bold', fontSize: 12 },
});