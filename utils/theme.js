// utils/theme.js
import { StyleSheet, Platform } from 'react-native';

// ─────────────────────────────────────────────
//  LIGA NACIONAL GT — Sistema de Diseño 2025
//  Fuente: Poppins (configurar en tu app)
//  Paleta: Azul Chapín + Dorado + Verde acento
// ─────────────────────────────────────────────

// Brand tokens — úsalos donde quieras acceder
// directamente al color sin pasar por el tema
export const BRAND = {
  primary:     '#003F8A',   // Azul chapín profundo
  primaryDark: '#002D6B',   // Azul más oscuro (hover / pressed)
  primaryLight:'#0057C2',   // Azul más claro (gradientes)
  gold:        '#F5A623',   // Dorado Guatemala
  goldLight:   '#FFCA56',   // Dorado claro
  accent:      '#00C48C',   // Verde acento (en vivo / activo)
  red:         '#E8304A',   // Rojo (en vivo / error / descenso)
  redLight:    '#FF6B80',
};

// ─── LIGHT COLORS ───────────────────────────
export const lightColors = {
  // Fondos
  appBg:           '#F0F2F7',
  screenBg:        '#F0F2F7',
  headerBg:        '#FFFFFF',
  cardBg:          '#FFFFFF',
  cardBgAlt:       '#F7F8FC',
  statusBarBg:     '#FFFFFF',

  // Tabs
  tabBarBg:        '#FFFFFF',
  tabBarBorder:    'rgba(0,0,0,0.07)',

  // Bordes
  cardBorder:      'rgba(0,0,0,0.07)',

  // Textos
  headerText:      '#0D0F1C',
  text:            '#0D0F1C',
  textSecondary:   '#5A5E78',
  textMuted:       '#9496A8',

  // Iconos (estilo Facebook)
  iconBg:          '#E4E6F0',
  iconColor:       '#5A5E78',

  // Acento principal (heredado)
  accent:          BRAND.primary,

  // Input / Segmentos
  segmentBg:       '#E6E9F2',
  segmentBorder:   '#CDD0E0',
  segmentText:     '#5A5E78',
  segmentTextActive:'#FFFFFF',
  inputBg:         '#E8EAF3',

  // Filas
  rowBg:           '#FFFFFF',
  rowBgAlt:        '#F4F5FA',
  rowBgHighlight:  'rgba(0,63,138,0.04)',

  // Chips / Misc
  chipNumberBg:    '#E4E6F0',
  chipNumberBorder:'#CDD0E0',
  trackBg:         '#E4E6F0',
  bot:             '#E4E6F0',

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
  appBg:           '#0F1117',
  screenBg:        '#0F1117',
  headerBg:        '#181B23',
  cardBg:          '#1C1F2A',
  cardBgAlt:       '#22263A',
  statusBarBg:     '#181B23',

  // Tabs
  tabBarBg:        '#181B23',
  tabBarBorder:    'rgba(255,255,255,0.07)',

  // Bordes
  cardBorder:      'rgba(255,255,255,0.07)',

  // Textos
  headerText:      '#F1F2F6',
  text:            '#F1F2F6',
  textSecondary:   '#9496A8',
  textMuted:       '#5A5C72',

  // Iconos (estilo Facebook — gris oscuro en dark)
  iconBg:          '#2A2D3E',
  iconColor:       '#C8CAD8',

  // Acento principal
  accent:          BRAND.primary,

  // Input / Segmentos
  segmentBg:       '#20232E',
  segmentBorder:   'rgba(255,255,255,0.08)',
  segmentText:     '#9496A8',
  segmentTextActive:'#FFFFFF',
  inputBg:         '#20232E',

  // Filas
  rowBg:           '#1C1F2A',
  rowBgAlt:        '#20232E',
  rowBgHighlight:  'rgba(0,63,138,0.08)',

  // Chips / Misc
  chipNumberBg:    '#20232E',
  chipNumberBorder:'rgba(255,255,255,0.08)',
  trackBg:         '#20232E',
  bot:             '#FFFFFF',

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
  navInactive:     '#5A5C72',
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
    primary:      BRAND.primary,
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
// Úsalo en cualquier Text como: ...TYPOGRAPHY.h1
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
  live:      { bg: 'rgba(232,48,74,0.12)',  text: BRAND.red,       dot: BRAND.red       },
  halftime:  { bg: 'rgba(245,166,35,0.12)', text: BRAND.gold,      dot: BRAND.gold      },
  finished:  { bg: 'rgba(148,150,168,0.1)', text: '#9496A8',       dot: '#9496A8'       },
  upcoming:  { bg: 'rgba(0,63,138,0.1)',    text: BRAND.primary,   dot: BRAND.primary   },
  suspended: { bg: 'rgba(245,166,35,0.12)', text: '#E07B00',       dot: '#E07B00'       },
  postponed: { bg: 'rgba(148,150,168,0.1)', text: '#9496A8',       dot: '#9496A8'       },
  default:   { bg: 'rgba(148,150,168,0.1)', text: '#9496A8',       dot: '#9496A8'       },
};

// ─── COMPATIBILIDAD (mantiene tu API anterior) ─
export const palette = {
  background: '#ffffff',
  primary:    BRAND.primary,
  onPrimary:  '#ffffff',
  text:       '#0D0F1C',
  border:     'rgba(0,0,0,0.07)',
};

export const COLORS = {
  bg:           lightColors.screenBg,
  text:         lightColors.text,
  textMuted:    lightColors.textMuted,
  divider:      lightColors.cardBorder,
  cardBg:       lightColors.cardBg,
  cardBorder:   lightColors.cardBorder,
  liveBg:       'rgba(232,48,74,0.1)',
  liveBorder:   BRAND.red,
  liveText:     BRAND.red,
  cardLiveBg:   'rgba(232,48,74,0.06)',
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
  live:      { bar: BRAND.red,     text: BRAND.red     },
  pre:       { bar: '#DCE8FF',     text: BRAND.primary },
  finished:  { bar: '#ECECEC',     text: '#9CA3AF'     },
  suspended: { bar: '#FFE8D6',     text: '#EA580C'     },
  postponed: { bar: '#F0F0F0',     text: '#6B7280'     },
  default:   { bar: '#EAEAEA',     text: '#374151'     },
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