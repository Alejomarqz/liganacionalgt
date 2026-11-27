// services/realtimenotifications.js
// ══════════════════════════════════════════════════════════
// Listener de Firestore para notificaciones IN-APP
// en tiempo real (cuando la app está abierta)
// ══════════════════════════════════════════════════════════

import firestore from '@react-native-firebase/firestore';
import { evaluateNotification } from './notificationlevels';

let _unsubscribe = null;
let _onNotification = null;

export function onRealtimeNotification(callback) {
  _onNotification = callback;
}

export function initRealtimeNotifications(opts = {}) {
  const channel = opts.channel || 'guatemala';

  if (_unsubscribe) {
    _unsubscribe();
    _unsubscribe = null;
  }

  _unsubscribe = firestore()
    .collection('live_events')
    .doc(channel)
    .collection('events')
    .orderBy('createdAt', 'desc')
    .limit(1)
    .onSnapshot(
      async (snapshot) => {
        if (!snapshot || snapshot.empty) return;

        snapshot.docChanges().forEach(async (change) => {
          if (change.type !== 'added') return;

          const data = change.doc.data();
          const event = {
            id:         change.doc.id,
            type:       data.type || 'news',
            matchId:    data.matchId || '',
            homeTeamId: data.homeTeamId || '',
            awayTeamId: data.awayTeamId || '',
            title:      data.title || '',
            body:       data.body || '',
            score:      data.score || null,
            playerName: data.playerName || '',
            minute:     data.minute || '',
            teamId:     data.teamId || '',
            createdAt:  data.createdAt,
            ...data,
          };

          const result = await evaluateNotification(event);

          if (result && _onNotification) {
            _onNotification(result);
          }
        });
      },
      (error) => {
        console.warn('[REALTIME] Error en listener:', error);
      },
    );

  return () => {
    if (_unsubscribe) {
      _unsubscribe();
      _unsubscribe = null;
    }
  };
}

export function listenToMatches(matchIds = []) {
  if (!matchIds.length) return () => {};

  const unsubscribers = matchIds.map((matchId) =>
    firestore()
      .collection('matches')
      .doc(matchId)
      .onSnapshot(async (doc) => {
        if (!doc.exists) return;

        const data = doc.data();
        const lastEvent = data.lastEvent;
        if (!lastEvent) return;

        const eventId = `${matchId}_${lastEvent.type}_${lastEvent.minute || Date.now()}`;

        const event = {
          id:         eventId,
          type:       lastEvent.type,
          matchId,
          homeTeamId: data.homeTeamId || '',
          awayTeamId: data.awayTeamId || '',
          title:      lastEvent.title || '',
          body:       lastEvent.body || '',
          score:      data.score || null,
          playerName: lastEvent.playerName || '',
          minute:     lastEvent.minute || '',
        };

        const result = await evaluateNotification(event);
        if (result && _onNotification) {
          _onNotification(result);
        }
      }),
  );

  return () => unsubscribers.forEach((unsub) => unsub());
}

export function listenToLiveMatches(channel = 'guatemala') {
  let matchUnsubscriber = null;

  const mainUnsub = firestore()
    .collection('matches')
    .where('channel', '==', channel)
    .where('status', '==', 'live')
    .onSnapshot((snapshot) => {
      if (!snapshot) return;

      if (matchUnsubscriber) matchUnsubscriber();

      const liveIds = snapshot.docs.map((doc) => doc.id);
      if (liveIds.length > 0) {
        matchUnsubscriber = listenToMatches(liveIds);
      }
    });

  return () => {
    mainUnsub();
    if (matchUnsubscriber) matchUnsubscriber();
  };
}