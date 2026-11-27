// src/api/store.js
// Caché "stale-while-revalidate" persistente:
//  1) La pantalla abre al instante con lo último guardado (memoria o disco)
//  2) En paralelo se refresca contra la API
//  3) Sin internet, la app sigue mostrando datos (con aviso)
// Sin dependencias nuevas: sólo AsyncStorage (ya instalado).

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@lngt:v3:q:';
const entries = new Map(); // key -> { data, error, updatedAt, fetching, hydrated }
const listeners = new Map(); // key -> Set<fn>

const EMPTY = Object.freeze({ data: undefined, error: null, updatedAt: 0, fetching: false, hydrated: false });

function get(key) {
  return entries.get(key) || EMPTY;
}

function set(key, patch) {
  entries.set(key, { ...get(key), ...patch });
  listeners.get(key)?.forEach((fn) => fn());
}

function subscribe(key, fn) {
  if (!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(fn);
  return () => listeners.get(key)?.delete(fn);
}

async function hydrate(key) {
  const e = get(key);
  if (e.hydrated || e.data !== undefined) {
    if (!e.hydrated) set(key, { hydrated: true });
    return;
  }
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    if (raw) {
      const { data, updatedAt } = JSON.parse(raw);
      // Sólo usamos disco si la red no ganó la carrera
      if (get(key).data === undefined) set(key, { data, updatedAt, hydrated: true, fromDisk: true });
      return;
    }
  } catch {}
  set(key, { hydrated: true });
}

export async function fetchQuery(key, fetcher, { persist = true } = {}) {
  const e = get(key);
  if (e.fetching && e.promise) return e.promise;
  const promise = (async () => {
    try {
      const data = await fetcher();
      const updatedAt = Date.now();
      set(key, { data, error: null, updatedAt, fetching: false, fromDisk: false, promise: null });
      if (persist) AsyncStorage.setItem(PREFIX + key, JSON.stringify({ data, updatedAt })).catch(() => {});
      return data;
    } catch (error) {
      set(key, { error, fetching: false, promise: null });
      throw error;
    }
  })();
  set(key, { fetching: true, promise });
  return promise;
}

export function setQueryData(key, updater) {
  const prev = get(key).data;
  set(key, { data: typeof updater === 'function' ? updater(prev) : updater, updatedAt: Date.now() });
}

export function invalidate(prefix = '') {
  for (const k of entries.keys()) if (k.startsWith(prefix)) set(k, { updatedAt: 0 });
}

/**
 * const { data, error, loading, refreshing, refresh, isStale } = useQuery('home', getHome, {
 *   staleTime: 30_000,
 *   refetchInterval: (data) => (data?.live ? 15_000 : 0),
 * })
 */
export function useQuery(key, fetcher, { staleTime = 30000, refetchInterval = 0, enabled = true, persist = true } = {}) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const snap = useSyncExternalStore(
    useCallback((fn) => subscribe(key, fn), [key]),
    () => get(key),
  );

  const run = useCallback(
    () => fetchQuery(key, () => fetcherRef.current(), { persist }).catch(() => {}),
    [key, persist],
  );

  // Hidratar + primer fetch
  useEffect(() => {
    if (!enabled || !key) return;
    hydrate(key);
    if (Date.now() - get(key).updatedAt > staleTime) run();
  }, [key, enabled, staleTime, run]);

  // Polling adaptativo (p. ej. 15 s si hay partido en vivo); se pausa en background
  const interval = typeof refetchInterval === 'function' ? refetchInterval(snap.data) : refetchInterval;
  useEffect(() => {
    if (!enabled || !interval) return undefined;
    let timer = null;
    const start = () => {
      if (!timer) timer = setInterval(run, interval);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    start();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        run();
        start();
      } else stop();
    });
    return () => {
      stop();
      sub.remove();
    };
  }, [enabled, interval, run]);

  // Al volver a la app, refrescar si está viejo
  useEffect(() => {
    if (!enabled) return undefined;
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && Date.now() - get(key).updatedAt > staleTime) run();
    });
    return () => sub.remove();
  }, [enabled, key, staleTime, run]);

  const [refreshing, setRefreshing] = useRefState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    await run();
    setRefreshing(false);
  }, [run, setRefreshing]);

  return {
    data: snap.data,
    error: snap.data === undefined ? snap.error : null,
    staleError: snap.data !== undefined ? snap.error : null, // hay datos viejos + falló la red
    loading: snap.data === undefined && (snap.fetching || !snap.hydrated),
    fetching: snap.fetching,
    refreshing,
    offline: Boolean(snap.error && snap.data !== undefined && snap.error.code === 'OFFLINE'),
    updatedAt: snap.updatedAt,
    refresh,
  };
}

// useState que ignora updates si el componente ya se desmontó
function useRefState(initial) {
  const [v, setV] = useState(initial);
  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);
  const safeSet = useCallback((x) => mounted.current && setV(x), []);
  return [v, safeSet];
}
