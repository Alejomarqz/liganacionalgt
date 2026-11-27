// src/notifications/reminders.js
// Notificaciones LOCALES programadas (cero costo, sin servidor):
//  - "Empieza en 15 min" para partidos que el usuario marca con la campana
//  - Recordatorio de transmisión de Liga TV
// Funcionan aunque no haya internet al momento de dispararse.
// Requiere: @notifee/react-native (gratis, open source, Apache-2.0)
//
// Convive con el push de Firebase (FCM) que ya existe: FCM sigue para goles en
// vivo enviados desde el servidor; esto cubre todo lo que se puede agendar.

import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidStyle,
  AuthorizationStatus,
  EventType,
  TriggerType,
} from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { followMatch, unfollowMatch, isFollowingMatch } from '../../services/notifications';

const CHANNEL_MATCH = 'lngt_match_reminders';
const CHANNEL_TV = 'lngt_ligatv';
const STORE = '@lngt:v3:reminders';
const LEAD_MIN = 15;

let channelsReady = false;
async function ensureChannels() {
  if (channelsReady || Platform.OS !== 'android') return;
  await notifee.createChannel({ id: CHANNEL_MATCH, name: 'Recordatorios de partidos', importance: AndroidImportance.HIGH, vibration: true });
  await notifee.createChannel({ id: CHANNEL_TV, name: 'Liga TV en vivo', importance: AndroidImportance.HIGH });
  channelsReady = true;
}

export async function ensurePermission() {
  const s = await notifee.requestPermission();
  return s?.authorizationStatus === AuthorizationStatus.AUTHORIZED || s?.authorizationStatus === AuthorizationStatus.PROVISIONAL;
}

// Alarma exacta sólo si Android lo permite (12+ requiere permiso del usuario).
// Si no, Notifee usa un trigger normal (puede llegar con 1–2 min de variación).
async function triggerAt(timestamp) {
  const t = { type: TriggerType.TIMESTAMP, timestamp };
  if (Platform.OS !== 'android') return t;
  try {
    const st = await notifee.getNotificationSettings();
    if (st?.android?.alarm === AndroidNotificationSetting.ENABLED) t.alarmManager = { allowWhileIdle: true };
  } catch {}
  return t;
}

async function readStore() {
  try {
    return JSON.parse((await AsyncStorage.getItem(STORE)) || '{}');
  } catch {
    return {};
  }
}
async function writeStore(obj) {
  await AsyncStorage.setItem(STORE, JSON.stringify(obj));
}

export async function getReminderIds() {
  return Object.keys(await readStore());
}

/** Programa aviso X minutos antes del partido. Devuelve false si ya pasó. */
export async function scheduleMatchReminder(match, leadMin = LEAD_MIN) {
  if (!match?.kickoff) return false;
  const when = match.kickoff.getTime() - leadMin * 60000;
  if (when <= Date.now() + 5000) return false;

  if (!(await ensurePermission())) return false;
  await ensureChannels();

  const id = `match-${match.id}`;
  const title = `⚽ ${match.home?.name} vs ${match.away?.name}`;
  const body = `Arranca en ${leadMin} minutos${match.stadium?.name ? ` · ${match.stadium.name}` : ''}. ¡No te lo pierdas!`;

  await notifee.createTriggerNotification(
    {
      id,
      title,
      body,
      data: { type: 'match', matchId: String(match.id), slug: match.slug || '' },
      android: {
        channelId: CHANNEL_MATCH,
        smallIcon: 'ic_notification',
        color: '#3B5BDB',
        pressAction: { id: 'default' },
        style: { type: AndroidStyle.BIGTEXT, text: body },
      },
      ios: { sound: 'default' },
    },
    await triggerAt(when),
  );

  const s = await readStore();
  s[id] = { when, matchId: match.id };
  await writeStore(s);
  return true;
}

export async function cancelReminder(id) {
  await notifee.cancelTriggerNotification(id);
  const s = await readStore();
  delete s[id];
  await writeStore(s);
}

export const matchReminderId = (matchId) => `match-${matchId}`;

/** Recordatorio de transmisión de Liga TV */
export async function scheduleLigaTVReminder(tv, leadMin = 5) {
  if (!tv?.startsAt) return false;
  const when = tv.startsAt.getTime() - leadMin * 60000;
  if (when <= Date.now() + 5000) return false;
  if (!(await ensurePermission())) return false;
  await ensureChannels();
  const id = `ligatv-${tv.startsAt.getTime()}`;
  await notifee.createTriggerNotification(
    {
      id,
      title: '🔴 Liga TV está por empezar',
      body: tv.title || 'Nuestra transmisión en vivo arranca en minutos.',
      data: { type: 'ligatv' },
      android: { channelId: CHANNEL_TV, smallIcon: 'ic_notification', color: '#FF3355', pressAction: { id: 'default' } },
      ios: { sound: 'default' },
    },
    await triggerAt(when),
  );
  const s = await readStore();
  s[id] = { when };
  await writeStore(s);
  return true;
}

/** Limpia recordatorios vencidos (llamar al abrir la app). */
export async function pruneReminders() {
  const s = await readStore();
  let changed = false;
  for (const [k, v] of Object.entries(s)) {
    if (v.when < Date.now() - 3600000) {
      delete s[k];
      changed = true;
    }
  }
  if (changed) await writeStore(s);
}

/**
 * Enruta toques en notificaciones locales. Llamar una vez con la ref de navegación.
 * Primer plano: onForegroundEvent. App cerrada: getInitialNotification.
 */
export function installLocalNotificationRouter(navigate) {
  const route = (data) => {
    if (data?.type === 'match' && data.matchId) navigate('Match', { matchId: Number(data.matchId), slug: data.slug });
    if (data?.type === 'ligatv') navigate('LigaTV');
  };
  notifee.getInitialNotification().then((n) => n && route(n.notification?.data));
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) route(detail.notification?.data);
  });
}

/**
 * Campana de un partido = 2 cosas a la vez:
 *  1) Push del servidor (FCM tema del partido): goles, inicio, final — ya existente
 *  2) Recordatorio LOCAL 15 min antes (si aún no empieza)
 */
export function useMatchReminder(match) {
  const id = match ? matchReminderId(match.id) : null;
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!id) return;
    let alive = true;
    Promise.all([readStore(), isFollowingMatch(String(match.id)).catch(() => false)]).then(([s, following]) => {
      if (alive) setOn(Boolean(s[id]) || Boolean(following));
    });
    return () => {
      alive = false;
    };
  }, [id, match?.id]);
  const toggle = useCallback(async () => {
    if (!match) return;
    if (on) {
      setOn(false);
      await Promise.all([cancelReminder(id), unfollowMatch(String(match.id)).catch(() => {})]);
    } else {
      setOn(true);
      const [local, push] = await Promise.all([
        match.isScheduled ? scheduleMatchReminder(match) : Promise.resolve(false),
        followMatch(String(match.id)).catch(() => false),
      ]);
      setOn(Boolean(local || push));
    }
  }, [on, id, match]);
  return { on, toggle };
}
