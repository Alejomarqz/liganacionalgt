// services/ligaNacionalApi.js
//
// API central de Liga Nacional GT.
// A partir de aquí, la app debe consumir nuestro propio Núcleo
// y dejar progresivamente las APIs antiguas.
//
// Base:
// https://liganacionalgt.com/sistema/api
//

import AsyncStorage from '@react-native-async-storage/async-storage';


/* =========================================================
   CONFIGURACIÓN
========================================================= */

export const LIGA_API_BASE =
  'https://liganacionalgt.com/sistema/api';

const REQUEST_TIMEOUT = 15000;

const VOTER_TOKEN_KEY =
  '@liga_gt:voter_token';

const VOTER_UID_KEY =
  '@liga_gt:voter_uid';

const VOTER_EXPIRES_KEY =
  '@liga_gt:voter_expires';


/* =========================================================
   HELPERS
========================================================= */

function cleanBaseUrl(url) {
  return String(url || '')
    .trim()
    .replace(/\/+$/, '');
}


function buildUrl(path, params = null) {
  const base =
    cleanBaseUrl(LIGA_API_BASE);

  const safePath =
    String(path || '')
      .replace(/^\/+/, '');

  let url =
    `${base}/${safePath}`;

  if (
    params &&
    typeof params === 'object'
  ) {
    const query = Object.entries(params)
      .filter(([, value]) =>
        value !== undefined &&
        value !== null &&
        value !== ''
      )
      .map(([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
      )
      .join('&');

    if (query) {
      url += `?${query}`;
    }
  }

  return url;
}


function createTimeoutController(
  timeoutMs = REQUEST_TIMEOUT,
) {
  if (
    typeof AbortController === 'undefined'
  ) {
    return {
      controller: null,
      cancel: () => {},
    };
  }

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => {
        try {
          controller.abort();
        } catch {}
      },
      timeoutMs,
    );

  return {
    controller,

    cancel: () => {
      clearTimeout(timer);
    },
  };
}


async function parseResponse(response) {
  const contentType =
    response.headers?.get?.(
      'content-type',
    ) || '';

  let data = null;

  try {
    if (
      contentType.includes(
        'application/json',
      )
    ) {
      data =
        await response.json();
    } else {
      const text =
        await response.text();

      try {
        data =
          JSON.parse(text);
      } catch {
        data = {
          raw: text,
        };
      }
    }
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `HTTP ${response.status}`;

    const error =
      new Error(message);

    error.status =
      response.status;

    error.data =
      data;

    throw error;
  }

  if (
    data &&
    data.ok === false
  ) {
    const message =
      data?.message ||
      data?.error ||
      'La API devolvió un error.';

    const error =
      new Error(message);

    error.data =
      data;

    throw error;
  }

  return data;
}


async function apiRequest(
  path,
  {
    method = 'GET',
    params = null,
    headers = {},
    body = null,
    timeout = REQUEST_TIMEOUT,
  } = {},
) {
  const url =
    buildUrl(
      path,
      params,
    );

  const {
    controller,
    cancel,
  } =
    createTimeoutController(
      timeout,
    );

  try {
    const response =
      await fetch(
        url,
        {
          method,

          headers: {
            Accept:
              'application/json',

            'X-LNGT-Client':
              'app',

            ...headers,
          },

          body,

          signal:
            controller?.signal,
        },
      );

    return await parseResponse(
      response,
    );

  } catch (error) {
    if (
      error?.name ===
      'AbortError'
    ) {
      const timeoutError =
        new Error(
          'La conexión con Liga Nacional GT tardó demasiado.',
        );

      timeoutError.code =
        'TIMEOUT';

      throw timeoutError;
    }

    throw error;

  } finally {
    cancel();
  }
}


/* =========================================================
   SALUD / INFORMACIÓN
========================================================= */

export async function getHealth() {
  return apiRequest(
    'health.php',
    {
      params: {
        _: Date.now(),
      },
    },
  );
}


export async function getMeta() {
  return apiRequest(
    'meta.php',
    {
      params: {
        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   HOME
========================================================= */

export async function getHome() {
  return apiRequest(
    'home.php',
    {
      params: {
        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   PARTIDOS
========================================================= */

export async function getMatches(
  filters = {},
) {
  return apiRequest(
    'matches.php',
    {
      params: {
        ...filters,
        _: Date.now(),
      },
    },
  );
}


export async function getMatch(
  matchId,
  {
    voterToken = '',
  } = {},
) {
  if (!matchId) {
    throw new Error(
      'Falta el ID del partido.',
    );
  }

  const headers = {};

  if (voterToken) {
    headers[
      'X-LNGT-Voter-Token'
    ] = voterToken;
  }

  return apiRequest(
    'match.php',
    {
      params: {
        id: matchId,
        _: Date.now(),
      },

      headers,
    },
  );
}


/*
 * Este será el endpoint principal
 * para components/Match.js.
 */
export async function getMatchCenter(
  matchId,
  {
    voterToken = '',
  } = {},
) {
  if (!matchId) {
    throw new Error(
      'Falta el ID del partido.',
    );
  }

  const headers = {};

  if (voterToken) {
    headers[
      'X-LNGT-Voter-Token'
    ] = voterToken;
  }

  return apiRequest(
    'match-center.php',
    {
      params: {
        id: matchId,
        _: Date.now(),
      },

      headers,
    },
  );
}


export async function getMatchCenterBySlug(
  slug,
  {
    voterToken = '',
  } = {},
) {
  if (!slug) {
    throw new Error(
      'Falta el slug del partido.',
    );
  }

  const headers = {};

  if (voterToken) {
    headers[
      'X-LNGT-Voter-Token'
    ] = voterToken;
  }

  return apiRequest(
    'match-center.php',
    {
      params: {
        slug,
        _: Date.now(),
      },

      headers,
    },
  );
}


/* =========================================================
   JORNADAS
========================================================= */

export async function getRounds() {
  return apiRequest(
    'rounds.php',
    {
      params: {
        _: Date.now(),
      },
    },
  );
}


export async function getRound(
  roundId,
) {
  if (!roundId) {
    throw new Error(
      'Falta el ID de la jornada.',
    );
  }

  return apiRequest(
    'round.php',
    {
      params: {
        id: roundId,
        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   TABLAS
========================================================= */

export async function getStandings(
  params = {},
) {
  return apiRequest(
    'standings.php',
    {
      params: {
        ...params,
        _: Date.now(),
      },
    },
  );
}


export async function getAggregate(
  params = {},
) {
  return apiRequest(
    'aggregate.php',
    {
      params: {
        ...params,
        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   GOLEADORES / TARJETAS
========================================================= */

export async function getScorers(
  params = {},
) {
  return apiRequest(
    'scorers.php',
    {
      params: {
        ...params,
        _: Date.now(),
      },
    },
  );
}


export async function getCards(
  params = {},
) {
  return apiRequest(
    'cards.php',
    {
      params: {
        ...params,
        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   EQUIPOS
========================================================= */

export async function getTeams() {
  return apiRequest(
    'teams.php',
    {
      params: {
        _: Date.now(),
      },
    },
  );
}


export async function getTeam(
  teamId,
) {
  if (!teamId) {
    throw new Error(
      'Falta el ID del equipo.',
    );
  }

  return apiRequest(
    'team.php',
    {
      params: {
        id: teamId,
        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   JUGADORES
========================================================= */

export async function getPlayers(
  {
    teamId = null,
    ...params
  } = {},
) {
  return apiRequest(
    'players.php',
    {
      params: {
        ...params,

        ...(teamId
          ? {
              team_id:
                teamId,
            }
          : {}),

        _: Date.now(),
      },
    },
  );
}


export async function getPlayer(
  playerId,
) {
  if (!playerId) {
    throw new Error(
      'Falta el ID del jugador.',
    );
  }

  return apiRequest(
    'player.php',
    {
      params: {
        id: playerId,
        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   INSIGHTS
========================================================= */

export async function getInsights(
  params = {},
) {
  return apiRequest(
    'insights.php',
    {
      params: {
        ...params,
        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   H2H
========================================================= */

export async function getH2H(
  teamA,
  teamB,
  {
    limit = 5,
    seasonId = null,
  } = {},
) {
  if (
    !teamA ||
    !teamB
  ) {
    throw new Error(
      'Faltan los equipos para H2H.',
    );
  }

  return apiRequest(
    'h2h.php',
    {
      params: {
        team_a:
          teamA,

        team_b:
          teamB,

        limit,

        ...(seasonId
          ? {
              season_id:
                seasonId,
            }
          : {}),

        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   BÚSQUEDA
========================================================= */

export async function searchLiga(
  query,
) {
  const q =
    String(
      query || '',
    ).trim();

  if (!q) {
    return {
      teams: [],
      players: [],
    };
  }

  return apiRequest(
    'search.php',
    {
      params: {
        q,
        _: Date.now(),
      },
    },
  );
}


/* =========================================================
   IDENTIDAD ANÓNIMA PARA VOTACIONES
========================================================= */

export async function getStoredVoterIdentity() {
  try {
    const [
      token,
      uid,
      expiresAt,
    ] =
      await Promise.all([
        AsyncStorage.getItem(
          VOTER_TOKEN_KEY,
        ),

        AsyncStorage.getItem(
          VOTER_UID_KEY,
        ),

        AsyncStorage.getItem(
          VOTER_EXPIRES_KEY,
        ),
      ]);

    return {
      token:
        token || '',

      uid:
        uid || '',

      expiresAt:
        expiresAt || '',
    };

  } catch {
    return {
      token: '',
      uid: '',
      expiresAt: '',
    };
  }
}


export async function clearVoterIdentity() {
  try {
    await AsyncStorage.multiRemove([
      VOTER_TOKEN_KEY,
      VOTER_UID_KEY,
      VOTER_EXPIRES_KEY,
    ]);
  } catch {}
}


export async function createVoterIdentity() {
  const data =
    await apiRequest(
      'voter.php',
      {
        method:
          'POST',
      },
    );

  const token =
    String(
      data?.voterToken ||
      '',
    );

  const uid =
    String(
      data?.voterUid ||
      '',
    );

  const expiresAt =
    String(
      data?.expiresAt ||
      '',
    );

  if (!token) {
    throw new Error(
      'El servidor no devolvió voterToken.',
    );
  }

  try {
    await AsyncStorage.multiSet([
      [
        VOTER_TOKEN_KEY,
        token,
      ],

      [
        VOTER_UID_KEY,
        uid,
      ],

      [
        VOTER_EXPIRES_KEY,
        expiresAt,
      ],
    ]);
  } catch {}

  return {
    token,
    uid,
    expiresAt,
  };
}


export async function ensureVoterIdentity() {
  const current =
    await getStoredVoterIdentity();

  if (current.token) {
    return current;
  }

  return createVoterIdentity();
}


/* =========================================================
   ENCUESTAS
========================================================= */

export async function getPolls(
  matchId,
  {
    voterToken = '',
  } = {},
) {
  if (!matchId) {
    throw new Error(
      'Falta el ID del partido.',
    );
  }

  let token =
    voterToken;

  if (!token) {
    const identity =
      await getStoredVoterIdentity();

    token =
      identity.token;
  }

  const headers = {};

  if (token) {
    headers[
      'X-LNGT-Voter-Token'
    ] = token;
  }

  return apiRequest(
    'polls.php',
    {
      params: {
        match_id:
          matchId,

        _: Date.now(),
      },

      headers,
    },
  );
}


/* =========================================================
   VOTAR 1X2 / JUGADOR DEL PARTIDO
========================================================= */

export async function votePoll({
  pollId,
  optionId,
}) {
  if (
    !pollId ||
    !optionId
  ) {
    throw new Error(
      'Falta pollId u optionId.',
    );
  }

  let identity =
    await ensureVoterIdentity();

  const body =
    new URLSearchParams({
      poll_id:
        String(
          pollId,
        ),

      option_id:
        String(
          optionId,
        ),
    }).toString();

  try {
    return await apiRequest(
      'vote.php',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded;charset=UTF-8',

          'X-LNGT-Vote':
            '1',

          'X-LNGT-Voter-Token':
            identity.token,
        },

        body,
      },
    );

  } catch (error) {
    /*
     * Si el token quedó inválido/vencido,
     * generamos uno nuevo una sola vez.
     */
    if (
      error?.status === 401 ||
      error?.status === 403
    ) {
      await clearVoterIdentity();

      identity =
        await createVoterIdentity();

      return apiRequest(
        'vote.php',
        {
          method:
            'POST',

          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded;charset=UTF-8',

            'X-LNGT-Vote':
              '1',

            'X-LNGT-Voter-Token':
              identity.token,
          },

          body,
        },
      );
    }

    throw error;
  }
}


/* =========================================================
   PRONÓSTICO DE MARCADOR EXACTO
========================================================= */

export async function voteExactScore({
  pollId,
  homeScore,
  awayScore,
}) {
  if (!pollId) {
    throw new Error(
      'Falta pollId.',
    );
  }

  const home =
    Number(
      homeScore,
    );

  const away =
    Number(
      awayScore,
    );

  if (
    !Number.isInteger(home) ||
    !Number.isInteger(away) ||
    home < 0 ||
    away < 0 ||
    home > 20 ||
    away > 20
  ) {
    throw new Error(
      'Marcador inválido.',
    );
  }

  const identity =
    await ensureVoterIdentity();

  const body =
    new URLSearchParams({
      poll_id:
        String(
          pollId,
        ),

      home_score:
        String(
          home,
        ),

      away_score:
        String(
          away,
        ),
    }).toString();

  return apiRequest(
    'vote.php',
    {
      method:
        'POST',

      headers: {
        'Content-Type':
          'application/x-www-form-urlencoded;charset=UTF-8',

        'X-LNGT-Vote':
          '1',

        'X-LNGT-Voter-Token':
          identity.token,
      },

      body,
    },
  );
}


/* =========================================================
   HELPERS DE COMPATIBILIDAD
========================================================= */

/*
 * Estas funciones nos ayudarán durante la migración
 * para aceptar respuestas aunque el endpoint use
 * {teams: []}, {data: []}, etc.
 */

export function extractArray(
  payload,
  keys = [],
) {
  if (
    Array.isArray(payload)
  ) {
    return payload;
  }

  for (
    const key of keys
  ) {
    if (
      Array.isArray(
        payload?.[key],
      )
    ) {
      return payload[key];
    }
  }

  if (
    Array.isArray(
      payload?.data,
    )
  ) {
    return payload.data;
  }

  if (
    Array.isArray(
      payload?.items,
    )
  ) {
    return payload.items;
  }

  return [];
}


export function extractTeams(
  payload,
) {
  return extractArray(
    payload,
    [
      'teams',
      'clubs',
    ],
  );
}


export function extractMatches(
  payload,
) {
  return extractArray(
    payload,
    [
      'matches',
      'matchs',
      'events',
    ],
  );
}


export function extractRounds(
  payload,
) {
  return extractArray(
    payload,
    [
      'rounds',
      'jornadas',
    ],
  );
}


export function extractStandings(
  payload,
) {
  return extractArray(
    payload,
    [
      'standings',
      'table',
      'positions',
      'rows',
    ],
  );
}


/* =========================================================
   EXPORT DEFAULT
========================================================= */

const LigaNacionalApi = {
  getHealth,
  getMeta,

  getHome,

  getMatches,
  getMatch,
  getMatchCenter,
  getMatchCenterBySlug,

  getRounds,
  getRound,

  getStandings,
  getAggregate,

  getScorers,
  getCards,

  getTeams,
  getTeam,

  getPlayers,
  getPlayer,

  getInsights,
  getH2H,
  searchLiga,

  getStoredVoterIdentity,
  ensureVoterIdentity,
  clearVoterIdentity,

  getPolls,
  votePoll,
  voteExactScore,

  extractArray,
  extractTeams,
  extractMatches,
  extractRounds,
  extractStandings,
};

export default LigaNacionalApi;