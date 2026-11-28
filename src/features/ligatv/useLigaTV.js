// src/features/ligatv/useLigaTV.js
// Estado de "Liga TV" controlado en tiempo real desde Firestore.
// Para salir en vivo NO hay que publicar otra versión de la app:
// basta con editar el documento  app_config/liga_tv  en la consola de Firebase.
//
// app_config/liga_tv = {
//   active:    true,                         // muestra el reproductor
//   hlsUrl:    'https://.../live/index.m3u8',
//   title:     'La Previa · Jornada 22',
//   subtitle:  'Analizamos el clásico con invitados',
//   poster:    'https://.../poster.jpg',
//   startsAt:  Timestamp,                    // próxima transmisión (cuenta regresiva)
//   hosts:     ['Alejo Márquez', 'Invitado'],
//   chatEnabled: true,
// }

import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';

const DOC = ['app_config', 'liga_tv'];

const toDate = (v) => {
  if (!v) return null;
  if (typeof v.toDate === 'function') return v.toDate();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function parseLigaTV(raw) {
  if (!raw) return { active: false };
  return {
    active: Boolean(raw.active && raw.hlsUrl),
    hlsUrl: raw.hlsUrl || null,
    title: raw.title || 'Liga TV',
    subtitle: raw.subtitle || '',
    poster: raw.poster || null,
    startsAt: toDate(raw.startsAt),
    hosts: Array.isArray(raw.hosts) ? raw.hosts : [],
    chatEnabled: raw.chatEnabled !== false,
    pinned: raw.pinned || '',
    admins: Array.isArray(raw.admins) ? raw.admins : [],
  };
}

export function useLigaTV() {
  const [state, setState] = useState({ loading: true, tv: { active: false } });
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = firestore()
        .collection(DOC[0])
        .doc(DOC[1])
        .onSnapshot(
          (snap) => setState({ loading: false, tv: parseLigaTV(snap?.data?.()) }),
          () => setState((s) => ({ ...s, loading: false })),
        );
    } catch {
      setState({ loading: false, tv: { active: false } });
    }
    return () => unsub();
  }, []);
  return state;
}

/* ─────────── Programación y episodios ───────────
   liga_tv_shows/{id} = {
     title, description, poster, startsAt (timestamp), hosts: [],
     vodUrl: 'https://.../episodio.m3u8'   // opcional: para volver a verlo
   } */
export function parseShow(id, raw) {
  return {
    id,
    title: raw.title || 'Liga TV',
    description: raw.description || '',
    poster: raw.poster || null,
    startsAt: toDate(raw.startsAt),
    hosts: Array.isArray(raw.hosts) ? raw.hosts : [],
    vodUrl: raw.vodUrl || null,
  };
}

export function useLigaTVShows() {
  const [state, setState] = useState({ loading: true, upcoming: [], past: [] });
  useEffect(() => {
    let unsub = () => {};
    try {
      unsub = firestore()
        .collection('liga_tv_shows')
        .orderBy('startsAt', 'desc')
        .limit(40)
        .onSnapshot(
          (snap) => {
            const now = Date.now();
            const all = (snap?.docs || []).map((d) => parseShow(d.id, d.data())).filter((x) => x.startsAt);
            setState({
              loading: false,
              upcoming: all.filter((x) => x.startsAt.getTime() > now).sort((a, b) => a.startsAt - b.startsAt),
              past: all.filter((x) => x.startsAt.getTime() <= now && x.vodUrl),
            });
          },
          () => setState((s) => ({ ...s, loading: false })),
        );
    } catch {
      setState({ loading: false, upcoming: [], past: [] });
    }
    return () => unsub();
  }, []);
  return state;
}
