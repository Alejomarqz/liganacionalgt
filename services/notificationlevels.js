// services/notificationlevels.js
// ══════════════════════════════════════════════════════════
// Sistema inteligente de niveles de notificación
// Decide QUÉ recibe QUIÉN según su nivel de interés
// ══════════════════════════════════════════════════════════

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NOTIFICATION_LEVELS,
  LEVEL_PERMISSIONS,
  EVENT_PRIORITY,
  BANNER_DURATION,
} from '../utils/notificationconfig';

// ─── Claves de almacenamiento ─────────────────────────────
const KEYS = {
  FOLLOWED_TEAMS:   'fc_followed_teams',
  FOLLOWED_MATCHES: 'fc_followed_matches',
  QUIET_HOURS:      'fc_quiet_hours',
  DND_ENABLED:      'fc_dnd_enabled',
};

// ══════════════════════════════════════════════════════════
// NIVEL DE INTERÉS DEL USUARIO
// ══════════════════════════════════════════════════════════

export async function getUserLevelForMatch(matchId, homeTeamId, awayTeamId) {
  try {
    const [teams, matches] = await Promise.all([
      getFollowedTeams(),
      getFollowedMatches(),
    ]);

    if (teams.includes(homeTeamId) || teams.includes(awayTeamId)) {
      return NOTIFICATION_LEVELS.DETAILED;
    }

    if (matches.includes(matchId)) {
      return NOTIFICATION_LEVELS.MODERATE;
    }

    return NOTIFICATION_LEVELS.MINIMAL;
  } catch {
    return NOTIFICATION_LEVELS.MINIMAL;
  }
}

export function shouldNotify(eventType, level) {
  const permissions = LEVEL_PERMISSIONS[level];
  if (!permissions) return false;
  return permissions[eventType] === true;
}

export async function evaluateNotification(event) {
  const { type, matchId, homeTeamId, awayTeamId } = event;

  const isDND = await isInQuietHours();
  if (isDND) {
    const priority = EVENT_PRIORITY[type] || 'low';
    if (priority !== 'high') return null;
  }

  const level = await getUserLevelForMatch(matchId, homeTeamId, awayTeamId);

  if (!shouldNotify(type, level)) return null;

  const priority = EVENT_PRIORITY[type] || 'low';
  const duration = BANNER_DURATION[priority] || 3000;

  return {
    ...event,
    level,
    priority,
    duration,
    shouldVibrate: priority === 'high',
    shouldSound:   priority === 'high',
  };
}

// ══════════════════════════════════════════════════════════
// GESTIÓN DE EQUIPOS Y PARTIDOS SEGUIDOS
// ══════════════════════════════════════════════════════════

export async function getFollowedTeams() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FOLLOWED_TEAMS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function getFollowedMatches() {
  try {
    const raw = await AsyncStorage.getItem(KEYS.FOLLOWED_MATCHES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function addFollowedTeam(teamId) {
  const teams = await getFollowedTeams();
  if (!teams.includes(teamId)) {
    teams.push(teamId);
    await AsyncStorage.setItem(KEYS.FOLLOWED_TEAMS, JSON.stringify(teams));
  }
  return teams;
}

export async function removeFollowedTeam(teamId) {
  let teams = await getFollowedTeams();
  teams = teams.filter(id => id !== teamId);
  await AsyncStorage.setItem(KEYS.FOLLOWED_TEAMS, JSON.stringify(teams));
  return teams;
}

export async function addFollowedMatch(matchId) {
  const matches = await getFollowedMatches();
  if (!matches.includes(matchId)) {
    matches.push(matchId);
    await AsyncStorage.setItem(KEYS.FOLLOWED_MATCHES, JSON.stringify(matches));
  }
  return matches;
}

export async function removeFollowedMatch(matchId) {
  let matches = await getFollowedMatches();
  matches = matches.filter(id => id !== matchId);
  await AsyncStorage.setItem(KEYS.FOLLOWED_MATCHES, JSON.stringify(matches));
  return matches;
}

export async function cleanupOldMatches(activeMatchIds = []) {
  const matches = await getFollowedMatches();
  const cleaned = matches.filter(id => activeMatchIds.includes(id));
  if (cleaned.length !== matches.length) {
    await AsyncStorage.setItem(KEYS.FOLLOWED_MATCHES, JSON.stringify(cleaned));
  }
  return cleaned;
}

// ══════════════════════════════════════════════════════════
// HORARIO SILENCIOSO (Do Not Disturb)
// ══════════════════════════════════════════════════════════

export async function setQuietHours({ enabled, startHour, endHour }) {
  await AsyncStorage.setItem(KEYS.DND_ENABLED, enabled ? '1' : '0');
  if (startHour && endHour) {
    await AsyncStorage.setItem(KEYS.QUIET_HOURS, JSON.stringify({ startHour, endHour }));
  }
}

export async function isInQuietHours() {
  try {
    const enabled = await AsyncStorage.getItem(KEYS.DND_ENABLED);
    if (enabled !== '1') return false;

    const raw = await AsyncStorage.getItem(KEYS.QUIET_HOURS);
    if (!raw) return false;

    const { startHour, endHour } = JSON.parse(raw);
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [sh, sm] = startHour.split(':').map(Number);
    const [eh, em] = endHour.split(':').map(Number);
    const startMinutes = sh * 60 + sm;
    const endMinutes = eh * 60 + em;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return false;
  }
}