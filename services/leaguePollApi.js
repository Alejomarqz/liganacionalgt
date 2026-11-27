// services/leaguePollApi.js

import AsyncStorage from '@react-native-async-storage/async-storage';


const API_BASE =
  'https://liganacionalgt.com/sistema/api';

const VOTER_TOKEN_KEY =
  'lngt_voter_token_v1';

const REQUEST_TIMEOUT =
  12000;


/* =========================================================
   REQUEST
========================================================= */

async function request(
  path,
  options = {},
) {
  const controller =
    typeof AbortController !==
    'undefined'
      ? new AbortController()
      : null;


  const timer =
    controller
      ? setTimeout(
          () =>
            controller.abort(),
          REQUEST_TIMEOUT,
        )
      : null;


  try {
    const response =
      await fetch(
        `${API_BASE}${path}`,
        {
          ...options,

          signal:
            controller
              ?.signal,

          headers: {
            Accept:
              'application/json',

            ...(
              options.headers ||
              {}
            ),
          },
        },
      );


    let data =
      null;


    try {
      data =
        await response.json();

    } catch {
      data =
        null;
    }


    if (
      !response.ok ||
      data?.error
    ) {
      throw new Error(
        data?.error ||
        `Error HTTP ${response.status}`,
      );
    }


    return data;

  } finally {
    if (timer) {
      clearTimeout(
        timer,
      );
    }
  }
}


/* =========================================================
   VOTER
========================================================= */

export async function getStoredVoterToken() {
  try {
    return (
      await AsyncStorage
        .getItem(
          VOTER_TOKEN_KEY,
        )
    ) || '';

  } catch {
    return '';
  }
}


export async function ensureVoter() {
  const currentToken =
    await getStoredVoterToken();


  const data =
    await request(
      '/voter.php',
      {
        method:
          'POST',

        headers: {
          'X-LNGT-Client':
            'app',

          ...(
            currentToken
              ? {
                  'X-LNGT-Voter-Token':
                    currentToken,
                }
              : {}
          ),
        },
      },
    );


  const token =
    String(
      data?.voterToken ||
      '',
    );


  if (!token) {
    throw new Error(
      'No se pudo crear la identidad de votación.',
    );
  }


  try {
    await AsyncStorage
      .setItem(
        VOTER_TOKEN_KEY,
        token,
      );

  } catch {}


  return {
    token,

    voterUid:
      data?.voterUid ||
      null,

    expiresAt:
      data?.expiresAt ||
      null,
  };
}


/* =========================================================
   POLLS
========================================================= */

export async function getPolls(
  matchId,
  voterToken = '',
) {
  if (!matchId) {
    return [];
  }


  const token =
    voterToken ||
    await getStoredVoterToken();


  const data =
    await request(
      `/polls.php?match_id=${encodeURIComponent(
        matchId,
      )}&_=${Date.now()}`,
      {
        headers: {
          'X-LNGT-Client':
            'app',

          ...(
            token
              ? {
                  'X-LNGT-Voter-Token':
                    token,
                }
              : {}
          ),
        },
      },
    );


  return Array.isArray(
    data?.polls,
  )
    ? data.polls
    : [];
}


/* =========================================================
   VOTE
========================================================= */

export async function votePoll(
  pollId,
  optionId,
  voterToken = '',
) {
  if (
    !pollId ||
    !optionId
  ) {
    throw new Error(
      'Votación inválida.',
    );
  }


  let token =
    voterToken ||
    await getStoredVoterToken();


  if (!token) {
    token =
      (
        await ensureVoter()
      ).token;
  }


  const body = [
    `poll_id=${encodeURIComponent(
      pollId,
    )}`,

    `option_id=${encodeURIComponent(
      optionId,
    )}`,
  ].join('&');


  try {
    return await request(
      '/vote.php',
      {
        method:
          'POST',

        headers: {
          'X-LNGT-Client':
            'app',

          'X-LNGT-Vote':
            '1',

          'X-LNGT-Voter-Token':
            token,

          'Content-Type':
            'application/x-www-form-urlencoded;charset=UTF-8',
        },

        body,
      },
    );

  } catch (error) {
    if (
      /identidad.*inválida|identidad.*vencida/i.test(
        String(
          error?.message ||
          '',
        ),
      )
    ) {
      token =
        (
          await ensureVoter()
        ).token;


      return request(
        '/vote.php',
        {
          method:
            'POST',

          headers: {
            'X-LNGT-Client':
              'app',

            'X-LNGT-Vote':
              '1',

            'X-LNGT-Voter-Token':
              token,

            'Content-Type':
              'application/x-www-form-urlencoded;charset=UTF-8',
          },

          body,
        },
      );
    }


    throw error;
  }
}


/* =========================================================
   MATCHES
========================================================= */

async function getMatchesByStatus(
  status,
) {
  const data =
    await request(
      `/matches.php?status=${encodeURIComponent(
        status,
      )}&_=${Date.now()}`,
      {
        headers: {
          'X-LNGT-Client':
            'app',
        },
      },
    );


  return Array.isArray(
    data?.matches,
  )
    ? data.matches
    : [];
}


/* =========================================================
   KICKOFF
========================================================= */

function getKickoffTimestamp(
  match,
) {
  const kickoff =
    String(
      match?.kickoff ||
      '',
    );


  if (kickoff) {
    const parsed =
      Date.parse(
        kickoff,
      );


    if (
      Number.isFinite(
        parsed,
      )
    ) {
      return parsed;
    }
  }


  const date =
    String(
      match?.date ||
      '',
    );


  const time =
    String(
      match?.time ||
      match?.hour ||
      '00:00',
    );


  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      date,
    )
  ) {
    const parsed =
      Date.parse(
        `${date}T${time}:00-06:00`,
      );


    if (
      Number.isFinite(
        parsed,
      )
    ) {
      return parsed;
    }
  }


  return null;
}


/* =========================================================
   PARTIDO MÁS CERCANO
========================================================= */

function closestUpcoming(
  matches = [],
) {
  const now =
    Date.now();


  return (
    Array.isArray(matches)
      ? matches
      : []
  )
    .map(
      match => ({
        match,

        ts:
          getKickoffTimestamp(
            match,
          ),
      }),
    )
    .filter(
      item =>
        item.ts !== null &&
        item.ts >=
          now - 5 * 60 * 1000,
    )
    .sort(
      (
        a,
        b,
      ) =>
        a.ts -
        b.ts,
    )
    .map(
      item =>
        item.match,
    )[0] ||
    null;
}


/* =========================================================
   FEATURED FALLBACK
========================================================= */

export async function getFeaturedPredictionMatch() {
  /*
   * Primero cualquier partido realmente EN VIVO.
   */

  const liveStatuses = [
    'first_half',
    'halftime',
    'second_half',
    'extra_first',
    'extra_second',
    'penalties',
  ];


  for (
    const status of
    liveStatuses
  ) {
    try {
      const matches =
        await getMatchesByStatus(
          status,
        );


      if (
        matches.length
      ) {
        return (
          closestUpcoming(
            matches,
          ) ||
          matches[0]
        );
      }

    } catch {}
  }


  /*
   * Después el próximo partido programado,
   * ordenado por kickoff real.
   */

  const scheduled =
    await getMatchesByStatus(
      'scheduled',
    );


  return closestUpcoming(
    scheduled,
  );
}


/* =========================================================
   MAIN POLL
========================================================= */

export function findMainPredictionPoll(
  polls,
  match,
) {
  const list =
    Array.isArray(polls)
      ? polls
      : [];


  const homeId =
    Number(
      match?.home?.id ||
      0,
    );


  const awayId =
    Number(
      match?.away?.id ||
      0,
    );


  return (
    list.find(
      poll => {
        if (
          String(
            poll?.type ||
            '',
          ).toLowerCase() !==
          'single'
        ) {
          return false;
        }


        /*
         * Permitimos encontrar también la encuesta
         * si ya cerró, para mantener el partido
         * sincronizado con Home.
         */

        const pollStatus =
          String(
            poll?.status ||
            '',
          ).toLowerCase();


        if (
          pollStatus !==
            'open' &&
          pollStatus !==
            'closed'
        ) {
          return false;
        }


        const options =
          Array.isArray(
            poll?.options,
          )
            ? poll.options
            : [];


        const hasHome =
          options.some(
            option =>
              Number(
                option?.team_id ||
                option?.teamId ||
                0,
              ) ===
              homeId,
          );


        const hasAway =
          options.some(
            option =>
              Number(
                option?.team_id ||
                option?.teamId ||
                0,
              ) ===
              awayId,
          );


        const hasDraw =
          options.some(
            option =>
              !Number(
                option?.team_id ||
                option?.teamId ||
                0,
              ) &&
              /empate/i.test(
                String(
                  option?.label ||
                  '',
                ),
              ),
          );


        return (
          options.length >=
            3 &&
          hasHome &&
          hasAway &&
          hasDraw
        );
      },
    ) ||
    null
  );
}


/* =========================================================
   CARGAR UNA ENCUESTA PARA UN PARTIDO EXACTO
========================================================= */

export async function loadPredictionForMatch(
  match,
  voterToken = '',
) {
  if (!match?.id) {
    return {
      match:
        null,

      poll:
        null,

      voterToken:
        voterToken ||
        '',
    };
  }


  let token =
    voterToken ||
    await getStoredVoterToken();


  if (!token) {
    token =
      (
        await ensureVoter()
      ).token;
  }


  const polls =
    await getPolls(
      match.id,
      token,
    );


  const poll =
    findMainPredictionPoll(
      polls,
      match,
    );


  return {
    match,

    poll,

    voterToken:
      token,
  };
}


/* =========================================================
   LEGACY
========================================================= */

export async function loadFeaturedPrediction(
  forcedMatch = null,
) {
  /*
   * NUEVO:
   * Si Home nos manda un partido concreto,
   * usamos ESE partido.
   */

  if (
    forcedMatch?.id
  ) {
    return loadPredictionForMatch(
      forcedMatch,
    );
  }


  /*
   * Compatibilidad con otras pantallas.
   */

  const identity =
    await ensureVoter();


  const match =
    await getFeaturedPredictionMatch();


  if (!match) {
    return {
      match:
        null,

      poll:
        null,

      voterToken:
        identity.token,
    };
  }


  const polls =
    await getPolls(
      match.id,
      identity.token,
    );


  const poll =
    findMainPredictionPoll(
      polls,
      match,
    );


  return {
    match,

    poll,

    voterToken:
      identity.token,
  };
}


/* =========================================================
   REFRESH
========================================================= */

export async function refreshPrediction(
  match,
  voterToken = '',
) {
  if (!match?.id) {
    return null;
  }


  const polls =
    await getPolls(
      match.id,
      voterToken,
    );


  return findMainPredictionPoll(
    polls,
    match,
  );
}


export {
  API_BASE,
};