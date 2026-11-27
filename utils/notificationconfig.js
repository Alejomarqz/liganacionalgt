// utils/notificationconfig.js
// Configuración PRO de notificaciones - Liga Nacional GT

export const NOTIFICATION_LEVELS = {
  GENERAL: 'general',
  MATCH: 'match',
  TEAM: 'team',
};

// ── EVENTOS ──
export const EVENT_TYPES = {
  // GENERAL
  JORNADA_PREVIEW: 'jornada_preview',
  STANDINGS_UPDATE: 'standings_update',
  VOTE_OPEN: 'vote_open',

  // MATCH
  MATCH_START: 'match_start',
  MATCH_END: 'match_end',
  HALFTIME: 'halftime',
  GOAL: 'goal',

  // TEAM
  NEXT_MATCH: 'next_match',
  LINEUP: 'lineup',
  SUMMARY: 'summary',
};

// ── QUÉ EVENTOS PERMITE CADA TIPO ──
export const LEVEL_PERMISSIONS = {
  [NOTIFICATION_LEVELS.GENERAL]: {
    [EVENT_TYPES.JORNADA_PREVIEW]: true,
    [EVENT_TYPES.STANDINGS_UPDATE]: true,
    [EVENT_TYPES.VOTE_OPEN]: true,
  },

  [NOTIFICATION_LEVELS.MATCH]: {
    [EVENT_TYPES.MATCH_START]: true,
    [EVENT_TYPES.GOAL]: true,
    [EVENT_TYPES.HALFTIME]: true,
    [EVENT_TYPES.MATCH_END]: true,
  },

  [NOTIFICATION_LEVELS.TEAM]: {
    [EVENT_TYPES.NEXT_MATCH]: true,
    [EVENT_TYPES.LINEUP]: true,
    [EVENT_TYPES.MATCH_START]: true,
    [EVENT_TYPES.GOAL]: true,
    [EVENT_TYPES.HALFTIME]: true,
    [EVENT_TYPES.MATCH_END]: true,
    [EVENT_TYPES.SUMMARY]: true,
  },
};

// ── PRIORIDAD ──
export const EVENT_PRIORITY = {
  [EVENT_TYPES.GOAL]: 'high',
  [EVENT_TYPES.MATCH_START]: 'medium',
  [EVENT_TYPES.MATCH_END]: 'medium',
  [EVENT_TYPES.HALFTIME]: 'medium',
  [EVENT_TYPES.LINEUP]: 'medium',
  [EVENT_TYPES.NEXT_MATCH]: 'medium',
  [EVENT_TYPES.SUMMARY]: 'low',

  [EVENT_TYPES.JORNADA_PREVIEW]: 'low',
  [EVENT_TYPES.STANDINGS_UPDATE]: 'low',
  [EVENT_TYPES.VOTE_OPEN]: 'medium',
};

// ── DURACIÓN ──
export const BANNER_DURATION = {
  high: 6000,
  medium: 4000,
  low: 3000,
};

// ── ICONOS ──
export const EVENT_ICONS = {
  [EVENT_TYPES.GOAL]: '⚽',
  [EVENT_TYPES.MATCH_START]: '🏟️',
  [EVENT_TYPES.MATCH_END]: '🏁',
  [EVENT_TYPES.HALFTIME]: '⏸️',
  [EVENT_TYPES.LINEUP]: '📋',
  [EVENT_TYPES.NEXT_MATCH]: '📅',
  [EVENT_TYPES.SUMMARY]: '📊',

  [EVENT_TYPES.JORNADA_PREVIEW]: '📅',
  [EVENT_TYPES.STANDINGS_UPDATE]: '📊',
  [EVENT_TYPES.VOTE_OPEN]: '🗳️',
};

// ── COLORES ──
export const EVENT_COLORS = {
  [EVENT_TYPES.GOAL]: '#2ECC71',
  [EVENT_TYPES.MATCH_START]: '#3498DB',
  [EVENT_TYPES.MATCH_END]: '#95A5A6',
  [EVENT_TYPES.HALFTIME]: '#9B59B6',
  [EVENT_TYPES.LINEUP]: '#1ABC9C',
  [EVENT_TYPES.NEXT_MATCH]: '#3498DB',
  [EVENT_TYPES.SUMMARY]: '#2ECC71',

  [EVENT_TYPES.JORNADA_PREVIEW]: '#3498DB',
  [EVENT_TYPES.STANDINGS_UPDATE]: '#2ECC71',
  [EVENT_TYPES.VOTE_OPEN]: '#F39C12',
};