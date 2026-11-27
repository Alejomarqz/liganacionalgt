// services/teams.js
// Índice de equipos para búsqueda — ahora 100% desde la API Liga Nacional GT (teams.php).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from '../src/api/client';
import { registerTeam } from '../src/api/logoRegistry';

const CACHE_KEY = '@lngt:v3:teams:index';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

const normalize = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function toIndex(json) {
  const list = (json?.teams || []).map((t) => {
    registerTeam(t);
    return {
      id: t.id,
      name: t.name,
      shortName: t.short || '',
      nick: '',
      slug: t.slug,
      crest: t.logo || null,
      logo: t.logo || null,
      city: t.city || '',
      coach: t.coach || '',
      scope: 'guatemala',
      q: normalize(`${t.name} ${t.short || ''} ${t.city || ''}`),
    };
  });
  list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return list;
}

async function readCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function loadTeams(force = false) {
  const cached = await readCache();
  if (!force && cached?.data?.length && Date.now() - cached.ts < TTL_MS) return cached.data;
  try {
    const list = toIndex(await request('teams.php'));
    AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: list })).catch(() => {});
    return list;
  } catch {
    return cached?.data || [];
  }
}

export function searchTeams(list, text) {
  const q = normalize(text);
  // Sin texto: mostramos todos (12 equipos, cabe perfecto)
  if (!q) return list;
  return list
    .map((t) => {
      const starts = t.q.startsWith(q) ? 1 : 0;
      const incl = t.q.includes(q) ? 1 : 0;
      return { ...t, score: starts * 2 + incl };
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'))
    .slice(0, 40);
}
