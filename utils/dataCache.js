// utils/dataCache.js
// Cache en memoria para evitar refetch al cambiar de tab
// Los datos se mantienen mientras la app esté abierta

const _cache = {};
const _timestamps = {};

/**
 * Obtener datos cacheados
 * @param {string} key
 * @param {number} maxAgeMs - máximo de antigüedad en ms (default: 5 minutos)
 * @returns {any|null}
 */
export function getCached(key, maxAgeMs = 5 * 60 * 1000) {
  const ts = _timestamps[key];
  if (!ts) return null;
  if (Date.now() - ts > maxAgeMs) {
    delete _cache[key];
    delete _timestamps[key];
    return null;
  }
  return _cache[key] ?? null;
}

/**
 * Guardar datos en cache
 * @param {string} key
 * @param {any} data
 */
export function setCached(key, data) {
  _cache[key] = data;
  _timestamps[key] = Date.now();
}

/**
 * Limpiar una key específica
 */
export function clearCached(key) {
  delete _cache[key];
  delete _timestamps[key];
}

/**
 * Limpiar todo el cache
 */
export function clearAllCache() {
  Object.keys(_cache).forEach(k => {
    delete _cache[k];
    delete _timestamps[k];
  });
}