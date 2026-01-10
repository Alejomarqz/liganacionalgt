// utils/theme.js
import { StyleSheet, Platform } from 'react-native';

/** Paletas completas light / dark */
export const lightColors = {
  appBg: '#f7f7f7',       // fondo general
  headerBg: '#ffffff',    // header superior
  headerText: '#111827',
  screenBg: '#f7f7f7',
  cardBg: '#ffffff',
  cardBorder: '#E5E7EB',
  text: '#111827',
  textMuted: '#111827',
  accent: '#d32f2f',      // rojo Fútbol Chapín
  tabBarBg: '#ffffff',
  tabBarBorder: '#E5E7EB',
  statusBarBg: '#ffffff',
  rowBg: '#ffffff',
  rowBgAlt: '#f8fafc',        // filas de suplentes / DT
  segmentBg: '#e5e7eb',       // fondo del switch Local/Visitante
  segmentBorder: '#cbd5f5',
  segmentText: '#0f172a',
  segmentTextActive: '#ffffff',
  chipNumberBg: '#e5e7eb',
  chipNumberBorder: '#d1d5db',
  trackBg: '#EEF2F7',
  bot: '#EEF2F7',
  liveText: '#ffffff',
  liveBg: '#d32f2f', 
  liveBorder: '#d32f2f',
};

export const darkColors = {
  appBg: '#020617',        // fondo general
  screenBg: '#020617',     // detrás de las cards
  headerBg: '#0b1220',     // 👈 un pelito más CLARO que el fondo
  headerText: '#ebe5e5ff',
  cardBg: '#0b1220',
  cardBorder: '#1f2937',
  text: '#E5E7EB',
  textMuted: '#E5E7EB',
  accent: '#d32f2f',
  tabBarBg: '#0b1220',
  tabBarBorder: '#1f2937',
  statusBarBg: '#0b1220',  // que combine con el header
  rowBg: '#020617',
  rowBgAlt: '#111827',        // filas un poquito más claras que el fondo
  segmentBg: '#020617',
  segmentBorder: '#1f2937',
  segmentText: '#cbd5f5',
  segmentTextActive: '#ffffff',
  chipNumberBg: '#020b1f',
  chipNumberBorder: '#1f2937',
  trackBg: '#020617',
  bot: '#ffffff',
  liveText: '#ffffff',
  liveBg: '#d32f2f', 
  liveBorder: '#d32f2f',
};


/** Temas para NavigationContainer */
export const LIGHT_NAV_THEME = {
  dark: false,
  colors: {
    primary: lightColors.accent,
    background: lightColors.appBg,
    card: lightColors.headerBg,
    text: lightColors.text,
    border: '#E5E7EB',
    notification: lightColors.accent,
  },
};

export const DARK_NAV_THEME = {
  dark: true,
  colors: {
    primary: darkColors.accent,
    background: darkColors.appBg,
    card: darkColors.headerBg,
    text: darkColors.text,
    border: '#1f2937',
    notification: darkColors.accent,
  },
};

export const lightTheme = {
  mode: 'light',
  colors: lightColors,
  navigation: LIGHT_NAV_THEME,
  statusBarStyle: 'dark-content',   // ✅ iconos NEGROS en modo claro
};

export const darkTheme = {
  mode: 'dark',
  colors: darkColors,
  navigation: DARK_NAV_THEME,
  statusBarStyle: 'light-content',  // ✅ iconos BLANCOS en modo oscuro
};


/** Paleta base (mantengo tu API por compatibilidad) */
export const palette = {
  background: '#ffffff',
  primary: '#0f1235',
  onPrimary: '#ffffff',
  text: '#0B1220',
  border: '#E6E8EE',
};

/** Estilos base (por si los usas en algún lado) */
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
  segmentedOn: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  segmentedOff: {
    backgroundColor: palette.background,
    borderColor: palette.primary,
  },
  segmentedTextOn: {
    color: palette.onPrimary,
    fontWeight: 'bold',
    fontSize: 12,
  },
  segmentedTextOff: {
    color: palette.primary,
    fontWeight: 'bold',
    fontSize: 12,
  },
});

/** Colores de UI para tarjetas/listas (LIGHT por defecto) */
export const COLORS = {
  
  bg: lightColors.screenBg,
  text: lightColors.text,
  textMuted: lightColors.textMuted,
  divider: '#E5E7EB',

  cardBg: lightColors.cardBg,
  cardBorder: lightColors.cardBorder,

  liveBg: '#FEE2E2',
  liveBorder: '#FECACA',
  liveText: '#DC2626',

  cardLiveBg: '#FEF2F2',
  cardLiveBorder: '#FECACA',
};

/** Modo visual para badges de estado (igual que tenías) */
export const THEME = {
  mode: 'minimal', // o 'subtle'
};

/** Estados */
export const STATUS_MAP = {
  0: 'Sin iniciar',
  1: 'Primer Tiempo',
  2: 'Finalizado',
  3: 'Suspendido',
  4: 'Postergado',
  5: 'Medio Tiempo', // 👈 importante
  6: 'Segundo Tiempo',
  7: 'Fin de Tiempo Reglamentario',
  8: 'Alargue 1',
  9: 'Fin alargue 1',
  10: 'Alargue 2',
  11: 'Fin alargue 2',
  12: 'Penales',
};

export const LIVE_IDS = [1, 6, 8, 10, 12];
export const HALFTIME_ID = 5;

/** Acentos por estado para modo 'subtle' */
export const STATUS_ACCENTS = {
  live: { bar: '#EF4444', text: '#DC2626' }, // rojo
  pre: { bar: '#DCE8FF', text: '#2563EB' }, // azul MUY tenue
  finished: { bar: '#ECECEC', text: '#9CA3AF' }, // gris
  suspended: { bar: '#FFE8D6', text: '#EA580C' }, // ámbar tenue
  postponed: { bar: '#F0F0F0', text: '#6B7280' }, // gris medio
  default: { bar: '#EAEAEA', text: '#374151' }, // fallback
};

/** Helpers de estado/acentos */
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

/** Devuelve {bar, text} según THEME.mode y statusId */
export function getAccent(statusId) {
  const s = Number(statusId);

  // minimal: solo EN VIVO en rojo; resto gris neutro
  if (THEME.mode === 'minimal') {
    if (isLiveNow(s) && !isHalftime(s)) return STATUS_ACCENTS.live;
    return { bar: COLORS.cardBorder, text: COLORS.textMuted };
  }

  // subtle: acentos tenues por estado
  if (isLiveNow(s) && !isHalftime(s)) return STATUS_ACCENTS.live;
  if ([2, 7, 9, 11].includes(s)) return STATUS_ACCENTS.finished;
  if (s === 3) return STATUS_ACCENTS.suspended;
  if (s === 4) return STATUS_ACCENTS.postponed;
  if (s === 0) return STATUS_ACCENTS.pre;
  return STATUS_ACCENTS.default;
}
