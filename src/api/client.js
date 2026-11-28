// src/api/client.js
// Cliente HTTP del Núcleo Liga Nacional GT.
// - Timeout + reintento con backoff para redes móviles inestables
// - Deduplicación: dos pantallas pidiendo lo mismo = 1 request
// - Errores tipados (TIMEOUT, OFFLINE, HTTP, API)

export const API_BASE = 'https://liganacionalgt.com/sistema/api';
const TIMEOUT_MS = 12000;
const RETRIES = 2;

const inflight = new Map();

export class ApiError extends Error {
  constructor(message, { code = 'API', status = 0, data = null } = {}) {
    super(message);
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

function buildUrl(path, params) {
  const clean = String(path).replace(/^\/+/, '');
  const qs = Object.entries(params || {})
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  return `${API_BASE}/${clean}${qs ? `?${qs}` : ''}`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function once(url, { method, headers, body }) {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timer = setTimeout(() => controller?.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      body,
      signal: controller?.signal,
      headers: { Accept: 'application/json', 'X-LNGT-Client': 'app-v3', ...headers },
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      throw new ApiError(data?.message || data?.error || `HTTP ${res.status}`, {
        code: 'HTTP',
        status: res.status,
        data,
      });
    }
    if (data && data.ok === false) {
      throw new ApiError(data.message || data.error || 'La API devolvió un error.', { data });
    }
    return data;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (e?.name === 'AbortError') throw new ApiError('La conexión tardó demasiado.', { code: 'TIMEOUT' });
    throw new ApiError('Sin conexión a internet.', { code: 'OFFLINE' });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * request('matches.php', { params: { round: 3 } })
 * Los GET se deduplican y reintentan; los POST no se reintentan.
 */
export async function request(path, { method = 'GET', params, headers, body, bust = true } = {}) {
  const url = buildUrl(path, bust && method === 'GET' ? { ...params, _: Math.floor(Date.now() / 5000) } : params);

  if (method !== 'GET') return once(url, { method, headers, body });

  if (inflight.has(url)) return inflight.get(url);

  const p = (async () => {
    let lastErr;
    for (let attempt = 0; attempt <= RETRIES; attempt += 1) {
      try {
        return await once(url, { method, headers, body });
      } catch (e) {
        lastErr = e;
        // No reintentar errores 4xx (son definitivos)
        if (e.code === 'HTTP' && e.status >= 400 && e.status < 500) break;
        if (attempt < RETRIES) await sleep(400 * 2 ** attempt);
      }
    }
    throw lastErr;
  })().finally(() => inflight.delete(url));

  inflight.set(url, p);
  return p;
}
