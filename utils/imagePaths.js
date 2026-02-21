// utils/imagePaths.js
import {
  API_PLAYER_IMG_BASE,
  API_PLAYER_IMG_EXT,
  API_LOGO_IMG_BASE,
  API_LOGO_IMG_EXT,
  API_STADIUM_IMG_BASE,
  API_STADIUM_IMG_EXT,
} from '@env';

const trimEndSlash = (s = '') => String(s).replace(/\/+$/, '');
const withDot = (ext, def) => (ext || def).startsWith('.') ? (ext || def) : `.${ext || def}`;
const slugify = (s='') =>
  String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')  // sin acentos
    .replace(/[^a-zA-Z0-9]+/g, '-')                    // espacios -> guiones
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const padLeft = (v, len=3) => String(v).padStart(len, '0');

// ⚠️ Si cambiaste archivos en CDN y quieres forzar refresh, sube el "BUST" (e.g. '2')
const BUST = ''; // '1' | '2' | '' (vacío = sin bust)
const withBust = (url) => !BUST ? url : `${url}${url.includes('?') ? '&' : '?'}v=${BUST}`;

const PBASE = trimEndSlash(API_PLAYER_IMG_BASE || 'https://futbolchapin.net/edit/jugadores');
const LBASE = trimEndSlash(API_LOGO_IMG_BASE   || 'https://futbolchapin.net/edit/logos');
const SBASE = trimEndSlash(API_STADIUM_IMG_BASE|| 'https://futbolchapin.net/edit/estadios');

const PEXT = withDot(API_PLAYER_IMG_EXT,  '.webp');
const LEXT = withDot(API_LOGO_IMG_EXT,    '.webp');
const SEXT = withDot(API_STADIUM_IMG_EXT, '.webp');

// URLs directas
export const playerImgById  = (id) => (PBASE && id) ? withBust(`${PBASE}/${id}${PEXT}`) : null;
export const teamLogoById   = (id) => (LBASE && id) ? withBust(`${LBASE}/${id}${LEXT}`) : null;
export const stadiumImgById = (id) => (SBASE && id) ? withBust(`${SBASE}/${id}${SEXT}`) : null;

// Defaults en CDN (WebP)
export const defaultPlayer  = () => (PBASE ? withBust(`${PBASE}/default${PEXT}`) : null);
export const defaultLogo    = () => (LBASE ? withBust(`${LBASE}/default${LEXT}`) : null);
export const defaultStadium = () => (SBASE ? withBust(`${SBASE}/default${SEXT}`) : null);

export const logoUriCandidates = (id) => {
  console.log('Logo Uri Candidates - ID recibido:', id);  // Agregado para depuración
  const ids = [];
  const raw = String(id || '').trim();  // Asegúrate de que el id esté en formato correcto
  console.log('teamId procesado:', raw); // Asegúrate de que se haya procesado correctamente

  if (!raw) return [];

  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();
  const slug  = slugify(raw);  // Convierte el id a un formato slug

  // Si el id es numérico, prueba con padding 3 y 4
  const isNum = /^\d+$/.test(raw);
  const p3 = isNum ? padLeft(raw, 3) : null;
  const p4 = isNum ? padLeft(raw, 4) : null;

  // Orden de prueba para generar las URLs
  [raw, lower, upper, slug, p3, p4]
    .filter(Boolean)
    .forEach(v => {
      const url = withBust(`${LBASE}/${v}${LEXT}`);
      ids.push(url);
    });

  // Default CDN al final
  const def = defaultLogo();
  if (def) ids.push(def);

  // Imprime las URLs generadas para depuración
  console.log('URLs generadas para el logo del equipo con ID:', id);
  console.log(ids);  // Verifica las URLs generadas en el console

  return ids;
};

export const stadiumUriCandidates = (id) => {
  const ids = [];
  const raw = String(id || '').trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();
  const slug  = slugify(raw);
  const isNum = /^\d+$/.test(raw);
  const p3 = isNum ? padLeft(raw, 3) : null;
  const p4 = isNum ? padLeft(raw, 4) : null;

  [raw, lower, upper, slug, p3, p4]
    .filter(Boolean)
    .forEach(v => ids.push(withBust(`${SBASE}/${v}${SEXT}`)));

  const def = defaultStadium();
  if (def) ids.push(def);

  return ids;
};

export const playerUriCandidates = (id) => {
  const ids = [];
  const raw = String(id || '').trim();
  if (!raw) return [];
  const lower = raw.toLowerCase();
  const upper = raw.toUpperCase();
  const slug  = slugify(raw);
  const isNum = /^\d+$/.test(raw);
  const p3 = isNum ? padLeft(raw, 3) : null;
  const p4 = isNum ? padLeft(raw, 4) : null;

  [raw, lower, upper, slug, p3, p4]
    .filter(Boolean)
    .forEach(v => ids.push(withBust(`${PBASE}/${v}${PEXT}`)));

  const def = defaultPlayer();
  if (def) ids.push(def);

  return ids;
};
