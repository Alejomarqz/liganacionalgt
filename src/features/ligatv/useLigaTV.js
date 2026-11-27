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
