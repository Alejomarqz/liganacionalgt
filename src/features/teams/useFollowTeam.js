// src/features/teams/useFollowTeam.js
// Seguir equipo = contador de seguidores en Firestore + tema FCM team_{id}
// (para recibir goles y alertas de ese equipo). Reutiliza los servicios existentes.
//
// Seguidores de la app anterior: se guardaron con el ID viejo del equipo
// (ver legacyIds.js). Aquí se SUMAN ambos contadores y, si esta persona ya
// seguía al equipo en la versión anterior, aparece como "Siguiendo".
import { useCallback, useEffect, useState } from 'react';
import { getFollowState, toggleFollowTeam, listenFollowersCount } from '../../../services/firestore';
import { followTeam, unfollowTeam } from '../../../services/notifications';
import { legacyIdOf } from './legacyIds';

export function useFollowTeam(teamId) {
  const legacyId = legacyIdOf(teamId);
  const [via, setVia] = useState({ current: false, legacy: false }); // dónde está guardado el "sigo"
  const [counts, setCounts] = useState({ current: null, legacy: 0 });
  const [busy, setBusy] = useState(false);
  const following = via.current || via.legacy;

  useEffect(() => {
    if (!teamId) return undefined;
    let alive = true;
    Promise.all([getFollowState(teamId).catch(() => false), legacyId ? getFollowState(legacyId).catch(() => false) : false]).then(([cur, leg]) => {
      if (!alive) return;
      setVia({ current: Boolean(cur), legacy: Boolean(leg) });
      // Quien seguía desde la app anterior: lo suscribimos a las alertas del equipo con el ID nuevo
      if (leg && !cur) followTeam(String(teamId)).catch(() => {});
    });
    const unsubs = [];
    try {
      unsubs.push(listenFollowersCount(teamId, (c) => alive && setCounts((s) => ({ ...s, current: c }))) || (() => {}));
      if (legacyId) unsubs.push(listenFollowersCount(legacyId, (c) => alive && setCounts((s) => ({ ...s, legacy: c }))) || (() => {}));
    } catch {}
    return () => {
      alive = false;
      unsubs.forEach((u) => u());
    };
  }, [teamId, legacyId]);

  const toggle = useCallback(async () => {
    if (!teamId || busy) return;
    setBusy(true);
    const prev = via;
    try {
      if (!following) {
        setVia({ ...prev, current: true });
        const res = await toggleFollowTeam(teamId);
        setVia((v) => ({ ...v, current: Boolean(res?.following ?? true) }));
        await followTeam(String(teamId));
      } else {
        setVia({ current: false, legacy: false });
        // Quitamos el "sigo" de donde esté guardado (nuevo y/o de la app anterior)
        if (prev.current) await toggleFollowTeam(teamId);
        if (prev.legacy && legacyId) {
          await toggleFollowTeam(legacyId);
          await unfollowTeam(String(legacyId)).catch(() => {});
        }
        await unfollowTeam(String(teamId));
      }
    } catch {
      setVia(prev);
    } finally {
      setBusy(false);
    }
  }, [teamId, legacyId, following, via, busy]);

  const count = counts.current == null ? null : counts.current + (counts.legacy || 0);
  return { following, count, busy, toggle };
}
