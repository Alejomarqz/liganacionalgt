// services/teams.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CALENDAR_URL = 'https://futbolchapin.net/edit/calendario.json';
const CACHE_KEY = 'fc:teams:index:v1';
const TTL_MS = 6 * 60 * 60 * 1000; // 6 horas
const LOGO_BASE = 'https://futbolchapin.net/edit/logos';
const LOGO_EXT  = '.webp';

const normalize = (s) =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// intenta múltiples nombres de campos por si el calendario cambia de formato
function pick(obj, keys, def = undefined) {
  for (const k of keys) {
    const v = k.split('.').reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return def;
}

function extractTeamsFromCalendar(json) {
  const set = new Map(); // key: `${scope}:${id}` -> team

  // el calendario puede venir como array de partidos o como objeto con grupos/fechas
  const items = Array.isArray(json)
    ? json
    : Array.isArray(json?.items)
    ? json.items
    : Array.isArray(json?.matches)
    ? json.matches
    : Array.isArray(json?.data)
    ? json.data
    : [];

  for (const m of items) {
    const scope = pick(m, ['scope', 'category', 'liga']) || 'guatemala';

    // local/home
    const homeId = String(
      pick(m, ['home.id', 'local.id', 'homeTeamId', 'localId', 'idLocal', 'equipoLocalId'])
    || ''
    );
    const homeName =
      pick(m, ['home.name', 'local.name', 'homeTeamName', 'localName', 'local']) || '';

    if (homeId) {
      const key = `${scope}:${homeId}`;
      if (!set.has(key)) {
        set.set(key, {
          id: homeId,
          name: homeName || `Equipo ${homeId}`,
          shortName: '',
          nick: '',
          crest: `${LOGO_BASE}/${homeId}${LOGO_EXT}`,
          scope,
          q: normalize(`${homeName}`),
        });
      }
    }

    // visitante/away
    const awayId = String(
      pick(m, ['away.id', 'visit.id', 'awayTeamId', 'visitorId', 'idVisitante', 'equipoVisitanteId'])
    || ''
    );
    const awayName =
      pick(m, ['away.name', 'visit.name', 'awayTeamName', 'visitorName', 'visit']) || '';

    if (awayId) {
      const key = `${scope}:${awayId}`;
      if (!set.has(key)) {
        set.set(key, {
          id: awayId,
          name: awayName || `Equipo ${awayId}`,
          shortName: '',
          nick: '',
          crest: `${LOGO_BASE}/${awayId}${LOGO_EXT}`,
          scope,
          q: normalize(`${awayName}`),
        });
      }
    }
  }

  // salida ordenada por nombre
  const list = Array.from(set.values());
  list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  return list;
}

export async function loadTeams(force = false) {
  // 1) cache
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const { ts, data } = JSON.parse(raw);
        if (data && Array.isArray(data) && ts && Date.now() - ts < TTL_MS) {
          return data;
        }
      }
    } catch {}
  }

  // 2) red
  try {
    const res = await fetch(CALENDAR_URL, { cache: 'no-store' });
    const json = await res.json();
    const list = extractTeamsFromCalendar(json);

    // 3) guarda cache
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: list }));
    } catch {}

    return list;
  } catch {
    // 4) si falla, devuelve cache viejo si había
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (raw) {
        const { data } = JSON.parse(raw);
        return data || [];
      }
    } catch {}
    return [];
  }
}

export function searchTeams(list, text) {
  const q = normalize(text);
  if (!q) return [];
  return list
    .map((t) => {
      const starts = t.q.startsWith(q) ? 1 : 0;
      const incl = t.q.includes(q) ? 1 : 0;
      const score = starts * 2 + incl;
      return { ...t, score };
    })
    .filter((t) => t.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'es'))
    .slice(0, 40);
}
