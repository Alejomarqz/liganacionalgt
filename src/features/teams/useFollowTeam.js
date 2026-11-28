// src/features/teams/useFollowTeam.js
// Seguir equipo = contador de seguidores en Firestore + tema FCM team_{id}
// (para recibir goles y alertas de ese equipo). Reutiliza los servicios existentes.
import { useCallback, useEffect, useState } from 'react';
import { getFollowState, toggleFollowTeam, listenFollowersCount } from '../../../services/firestore';
import { followTeam, unfollowTeam } from '../../../services/notifications';

export function useFollowTeam(teamId) {
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!teamId) return undefined;
    let alive = true;
    getFollowState(teamId)
      .then((v) => alive && setFollowing(Boolean(v)))
      .catch(() => {});
    let unsub = () => {};
    try {
      unsub = listenFollowersCount(teamId, (c) => alive && setCount(c)) || (() => {});
    } catch {}
    return () => {
      alive = false;
      unsub();
    };
  }, [teamId]);

  const toggle = useCallback(async () => {
    if (!teamId || busy) return;
    setBusy(true);
    const optimistic = !following;
    setFollowing(optimistic);
    try {
      const res = await toggleFollowTeam(teamId);
      const now = res?.following ?? optimistic;
      setFollowing(Boolean(now));
      if (now) await followTeam(String(teamId));
      else await unfollowTeam(String(teamId));
    } catch {
      setFollowing(!optimistic);
    } finally {
      setBusy(false);
    }
  }, [teamId, following, busy]);

  return { following, count, busy, toggle };
}
