// src/api/logoRegistry.js
// Registro global teamId → logo oficial (liganacionalgt.com).
// Se llena solo cada vez que la app normaliza un equipo de la API,
// y se precarga desde teams.php. Reemplaza las URLs de logos externas anteriores.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { request } from './client';

const KEY = '@lngt:v3:logos';
const logos = new Map();
let loaded = false;
let saveTimer = null;

export function registerTeam(team) {
  if (!team?.id || !team.logo) return;
  const id = String(team.id);
  if (logos.get(id) === team.logo) return;
  logos.set(id, team.logo);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(Object.fromEntries(logos))).catch(() => {});
  }, 800);
}

export function getTeamLogo(teamId) {
  return teamId ? logos.get(String(teamId)) || null : null;
}

/** Llamar al iniciar la app: disco → memoria, luego refresca desde teams.php */
export async function primeLogos() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw))) logos.set(k, v);
  } catch {}
  try {
    const res = await request('teams.php');
    (res?.teams || []).forEach(registerTeam);
  } catch {}
}
