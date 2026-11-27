// components/PositionsBlock.js
// Liga Nacional GT
//
// Tabla reutilizable para TeamScreen y Match.
//
// Columnas:
// # | Equipo | PTS | J | G | E | P | Últ. 3
//
// Fuentes del Núcleo propio:
// - standings.php
// - aggregate.php
// - matches.php?team_id=ID
//
// IMPORTANTE:
// Match.js actualmente llama este componente únicamente con:
// <PositionsBlock data={data} navigation={...} />
// Por eso este archivo carga standings.php automáticamente cuando
// no recibe standings desde el padre.

import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';

import {
  useNavigation,
  useRoute,
} from '@react-navigation/native';

import {
  useTheme,
} from '../utils/ThemeContext';

import {
  BRAND,
} from '../utils/theme';

import {
  getStandings,
  getAggregate,
} from '../services/ligaNacionalApi';


/* =========================================================
   CONFIG
========================================================= */

const API_BASE =
  'https://liganacionalgt.com/sistema/api';

const COL = {
  RANK: 28,
  PTS: 30,
  NUM: 22,
  STREAK: 62,
};

const STREAK_COUNT = 3;
const STREAK_SIZE = 17;
const STREAK_GAP = 3;

const FINISHED_STATUSES =
  new Set([
    'finished',
    'final',
    'ft',
    'fulltime',
    'full_time',
    'ended',
  ]);


/* =========================================================
   HELPERS
========================================================= */

function firstValue(
  ...values
) {
  for (
    const value
    of values
  ) {
    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      return value;
    }
  }

  return null;
}


function numberValue(
  ...values
) {
  for (
    const value
    of values
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      continue;
    }

    const number =
      Number(value);

    if (
      Number.isFinite(
        number,
      )
    ) {
      return number;
    }
  }

  return 0;
}


function nullableNumber(
  ...values
) {
  for (
    const value
    of values
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      continue;
    }

    const number =
      Number(value);

    if (
      Number.isFinite(
        number,
      )
    ) {
      return number;
    }
  }

  return null;
}


function normKey(
  value = '',
) {
  return String(
    value || '',
  )
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(
      /[^a-z0-9]/g,
      '',
    );
}


function fixTeamName(
  value = '',
) {
  const raw =
    String(
      value || '',
    ).trim();

  if (
    normKey(
      raw,
    ) ===
    'suchitepequez'
  ) {
    return 'Suchitepéquez';
  }

  return raw;
}


function initials(
  value = '',
) {
  return String(
    value || '',
  )
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      word =>
        word
          .charAt(0)
          .toUpperCase(),
    )
    .join('');
}


/* =========================================================
   TABLA
========================================================= */

function extractRows(
  payload,
) {
  if (
    Array.isArray(
      payload,
    )
  ) {
    return payload;
  }

  const candidates = [
    payload?.standings,
    payload?.aggregate,
    payload?.table,
    payload?.rows,

    payload?.data?.standings,
    payload?.data?.aggregate,
    payload?.data?.table,
    payload?.data?.rows,

    payload?.data,
  ];

  for (
    const source
    of candidates
  ) {
    if (
      Array.isArray(
        source,
      )
    ) {
      return source;
    }
  }

  return [];
}


function normalizeRows(
  payload,
) {
  const source =
    extractRows(
      payload,
    );

  const rows =
    source.map(
      (
        row,
        index,
      ) => {
        const rawTeam =
          row?.team &&
          typeof row.team ===
            'object'
            ? row.team
            : {};

        const teamId =
          numberValue(
            rawTeam?.id,
            row?.team_id,
            row?.teamId,
            row?.id,
          );

        return {
          position:
            numberValue(
              row?.position,
              row?.rank,
              row?.pos,
              index + 1,
            ),

          team: {
            id:
              teamId,

            name:
              fixTeamName(
                firstValue(
                  rawTeam?.name,
                  row?.team_name,
                  row?.teamName,
                  row?.name,
                  'Equipo',
                ),
              ),

            logo:
              firstValue(
                rawTeam?.logo,
                rawTeam?.logo_url,
                rawTeam?.logoUrl,

                row?.logo,
                row?.logo_url,
                row?.logoUrl,

                null,
              ),
          },

          played:
            numberValue(
              row?.played,
              row?.matches_played,
              row?.pj,
              row?.j,
            ),

          won:
            numberValue(
              row?.won,
              row?.wins,
              row?.pg,
              row?.g,
            ),

          drawn:
            numberValue(
              row?.drawn,
              row?.draws,
              row?.pe,
              row?.e,
            ),

          lost:
            numberValue(
              row?.lost,
              row?.losses,
              row?.pp,
              row?.p,
            ),

          gd:
            numberValue(
              row?.gd,
              row?.goal_difference,
              row?.goalDifference,
              row?.dg,
              row?.dif,
            ),

          points:
            numberValue(
              row?.points,
              row?.pts,
              row?.puntos,
            ),

          streak:
            Array.isArray(
              row?.streak,
            )
              ? row.streak
              : [],
        };
      },
    );

  rows.sort(
    (
      a,
      b,
    ) => {
      if (
        a.position > 0 &&
        b.position > 0 &&
        a.position !==
          b.position
      ) {
        return (
          a.position -
          b.position
        );
      }

      if (
        b.points !==
        a.points
      ) {
        return (
          b.points -
          a.points
        );
      }

      if (
        b.gd !==
        a.gd
      ) {
        return (
          b.gd -
          a.gd
        );
      }

      return (
        b.won -
        a.won
      );
    },
  );

  return rows.map(
    (
      row,
      index,
    ) => ({
      ...row,

      position:
        index + 1,
    }),
  );
}


/* =========================================================
   PARTIDOS / RACHA
========================================================= */

async function fetchTeamMatches(
  teamId,
) {
  const url =
    `${API_BASE}/matches.php?team_id=${encodeURIComponent(
      String(
        teamId,
      ),
    )}&_=${Date.now()}`;

  const response =
    await fetch(
      url,
      {
        headers: {
          Accept:
            'application/json',

          'Cache-Control':
            'no-cache',

          Pragma:
            'no-cache',
        },
      },
    );

  let json = null;

  try {
    json =
      await response.json();
  } catch {}

  if (
    !response.ok
  ) {
    throw new Error(
      json?.error ||
      json?.message ||
      `HTTP ${response.status}`,
    );
  }

  return json || {};
}


function extractMatches(
  payload,
) {
  if (
    Array.isArray(
      payload?.matches,
    )
  ) {
    return payload.matches;
  }

  if (
    Array.isArray(
      payload?.data?.matches,
    )
  ) {
    return payload.data.matches;
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
      payload,
    )
  ) {
    return payload;
  }

  return [];
}


function statusCode(
  match,
) {
  const status =
    match?.status &&
    typeof match.status ===
      'object'
      ? firstValue(
          match.status?.code,
          match.status?.slug,
          match.status?.key,
          match.status?.value,
          match.status?.name,
          '',
        )
      : firstValue(
          match?.status,
          match?.status_code,
          match?.statusCode,
          '',
        );

  return String(
    status || '',
  )
    .trim()
    .toLowerCase();
}


function getTeamId(
  side,
  match,
  type,
) {
  if (
    type ===
    'home'
  ) {
    return numberValue(
      side?.id,
      side?.team_id,
      side?.teamId,

      match?.home_team_id,
      match?.homeTeamId,
    );
  }

  return numberValue(
    side?.id,
    side?.team_id,
    side?.teamId,

    match?.away_team_id,
    match?.awayTeamId,
  );
}


function getScore(
  match,
) {
  const home =
    match?.home &&
    typeof match.home ===
      'object'
      ? match.home
      : (
          match?.teams?.home &&
          typeof match.teams.home ===
            'object'
            ? match.teams.home
            : (
                match?.homeTeam &&
                typeof match.homeTeam ===
                  'object'
                  ? match.homeTeam
                  : {}
              )
        );

  const away =
    match?.away &&
    typeof match.away ===
      'object'
      ? match.away
      : (
          match?.teams?.away &&
          typeof match.teams.away ===
            'object'
            ? match.teams.away
            : (
                match?.awayTeam &&
                typeof match.awayTeam ===
                  'object'
                  ? match.awayTeam
                  : {}
              )
        );

  const score =
    match?.score &&
    typeof match.score ===
      'object'
      ? match.score
      : {};

  const result =
    match?.result &&
    typeof match.result ===
      'object'
      ? match.result
      : {};

  const fullTime =
    score?.fullTime &&
    typeof score.fullTime ===
      'object'
      ? score.fullTime
      : (
          score?.full_time &&
          typeof score.full_time ===
            'object'
            ? score.full_time
            : {}
        );

  return {
    home:
      nullableNumber(
        home?.score,
        home?.goals,

        score?.home,
        score?.homeScore,
        score?.home_score,

        fullTime?.home,
        fullTime?.homeScore,
        fullTime?.home_score,

        result?.home,
        result?.homeScore,
        result?.home_score,

        match?.home_score,
        match?.homeScore,
        match?.score_home,
      ),

    away:
      nullableNumber(
        away?.score,
        away?.goals,

        score?.away,
        score?.awayScore,
        score?.away_score,

        fullTime?.away,
        fullTime?.awayScore,
        fullTime?.away_score,

        result?.away,
        result?.awayScore,
        result?.away_score,

        match?.away_score,
        match?.awayScore,
        match?.score_away,
      ),
  };
}


function matchTimestamp(
  match,
) {
  const raw =
    firstValue(
      match?.kickoff,
      match?.scheduled_at,
      match?.scheduledStart,
      match?.scheduled_start,
      match?.datetime,
      match?.date,
      null,
    );

  if (raw) {
    const timestamp =
      Date.parse(
        String(
          raw,
        ),
      );

    if (
      Number.isFinite(
        timestamp,
      )
    ) {
      return timestamp;
    }
  }

  return numberValue(
    match?.id,
    match?.match_id,
    match?.matchId,
  );
}


function buildTeamStreak(
  payload,
  teamId,
) {
  const numericTeamId =
    Number(
      teamId,
    );

  const matches =
    extractMatches(
      payload,
    );

  const finished =
    matches
      .map(
        match => {
          const home =
            match?.home ||
            match?.teams?.home ||
            match?.homeTeam ||
            {};

          const away =
            match?.away ||
            match?.teams?.away ||
            match?.awayTeam ||
            {};

          const score =
            getScore(
              match,
            );

          return {
            match,

            homeId:
              getTeamId(
                home,
                match,
                'home',
              ),

            awayId:
              getTeamId(
                away,
                match,
                'away',
              ),

            homeScore:
              score.home,

            awayScore:
              score.away,

            status:
              statusCode(
                match,
              ),

            timestamp:
              matchTimestamp(
                match,
              ),
          };
        },
      )
      .filter(
        item => {
          const belongs =
            item.homeId ===
              numericTeamId ||
            item.awayId ===
              numericTeamId;

          if (
            !belongs
          ) {
            return false;
          }

          if (
            !FINISHED_STATUSES.has(
              item.status,
            )
          ) {
            return false;
          }

          if (
            item.homeScore ===
              null ||
            item.awayScore ===
              null
          ) {
            return false;
          }

          return true;
        },
      )
      .sort(
        (
          a,
          b,
        ) => {
          if (
            b.timestamp !==
            a.timestamp
          ) {
            return (
              b.timestamp -
              a.timestamp
            );
          }

          return (
            numberValue(
              b.match?.id,
              b.match?.match_id,
              b.match?.matchId,
            ) -
            numberValue(
              a.match?.id,
              a.match?.match_id,
              a.match?.matchId,
            )
          );
        },
      )
      .slice(
        0,
        STREAK_COUNT,
      );

  return finished
    .reverse()
    .map(
      item => {
        const isHome =
          item.homeId ===
          numericTeamId;

        const goalsFor =
          isHome
            ? item.homeScore
            : item.awayScore;

        const goalsAgainst =
          isHome
            ? item.awayScore
            : item.homeScore;

        if (
          goalsFor >
          goalsAgainst
        ) {
          return 'W';
        }

        if (
          goalsFor <
          goalsAgainst
        ) {
          return 'L';
        }

        return 'D';
      },
    );
}


async function loadStreakMap(
  rows,
) {
  const ids =
    Array.from(
      new Set(
        rows
          .map(
            row =>
              Number(
                row?.team?.id ||
                0,
              ),
          )
          .filter(
            Boolean,
          ),
      ),
    );

  const entries =
    await Promise.all(
      ids.map(
        async teamId => {
          try {
            const payload =
              await fetchTeamMatches(
                teamId,
              );

            const streak =
              buildTeamStreak(
                payload,
                teamId,
              );

            return [
              teamId,
              streak,
            ];

          } catch (
            error
          ) {
            console.warn(
              `[PositionsBlock] racha ${teamId}:`,
              error?.message ||
              error,
            );

            return [
              teamId,
              [],
            ];
          }
        },
      ),
    );

  return new Map(
    entries,
  );
}


/* =========================================================
   LOGO
========================================================= */

function TeamLogo({
  uri,
  name,
  colors,
}) {
  const [
    failed,
    setFailed,
  ] =
    useState(
      false,
    );

  useEffect(
    () => {
      setFailed(
        false,
      );
    },
    [
      uri,
    ],
  );

  if (
    uri &&
    !failed
  ) {
    return (
      <Image
        source={{
          uri,
        }}
        style={
          styles.logo
        }
        resizeMode="contain"
        onError={() =>
          setFailed(
            true,
          )
        }
      />
    );
  }

  return (
    <View
      style={[
        styles.logo,
        styles.logoFallback,
        {
          backgroundColor:
            colors.screenBg,

          borderColor:
            colors.cardBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.logoFallbackText,
          {
            color:
              colors.textMuted,
          },
        ]}
      >
        {initials(
          name,
        ).slice(
          0,
          1,
        ) || '?'}
      </Text>
    </View>
  );
}


/* =========================================================
   RACHA UI
========================================================= */

const STREAK_COLORS = {
  W: {
    bg:
      '#16A36A',

    text:
      'G',
  },

  D: {
    bg:
      '#F59E0B',

    text:
      'E',
  },

  L: {
    bg:
      '#E3343F',

    text:
      'P',
  },
};


function StreakDots({
  streak = [],
  colors,
}) {
  const values =
    Array.isArray(
      streak,
    )
      ? streak.slice(
          -STREAK_COUNT,
        )
      : [];

  const padded = [
    ...values,
  ];

  while (
    padded.length <
    STREAK_COUNT
  ) {
    padded.unshift(
      null,
    );
  }

  return (
    <View
      style={
        styles.streakRow
      }
    >
      {padded.map(
        (
          result,
          index,
        ) => {
          const config =
            result
              ? STREAK_COLORS[
                  result
                ]
              : null;

          if (
            !config
          ) {
            return (
              <View
                key={
                  `empty-${index}`
                }
                style={[
                  styles.streakDot,
                  {
                    backgroundColor:
                      colors.cardBorder,
                  },
                ]}
              />
            );
          }

          return (
            <View
              key={
                `${result}-${index}`
              }
              style={[
                styles.streakDot,
                {
                  backgroundColor:
                    config.bg,
                },
              ]}
            >
              <Text
                style={
                  styles.streakText
                }
              >
                {config.text}
              </Text>
            </View>
          );
        },
      )}
    </View>
  );
}


/* =========================================================
   HEADER
========================================================= */

function TableHeader({
  colors,
}) {
  return (
    <View
      style={[
        styles.tableHeader,
        {
          backgroundColor:
            colors.cardBg,

          borderBottomColor:
            colors.cardBorder,
        },
      ]}
    >
      <View
        style={{
          width:
            COL.RANK,
        }}
      >
        <Text
          style={[
            styles.headerCenter,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          #
        </Text>
      </View>


      <View
        style={
          styles.headerTeam
        }
      >
        <Text
          style={[
            styles.headerLeft,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          Equipo
        </Text>
      </View>


      <Text
        style={[
          styles.headerPts,
          {
            width:
              COL.PTS,
          },
        ]}
      >
        PTS
      </Text>


      <Text
        style={[
          styles.headerCenter,
          {
            width:
              COL.NUM,

            color:
              colors.textMuted,
          },
        ]}
      >
        J
      </Text>


      <Text
        style={[
          styles.headerCenter,
          {
            width:
              COL.NUM,

            color:
              colors.textMuted,
          },
        ]}
      >
        G
      </Text>


      <Text
        style={[
          styles.headerCenter,
          {
            width:
              COL.NUM,

            color:
              colors.textMuted,
          },
        ]}
      >
        E
      </Text>


      <Text
        style={[
          styles.headerCenter,
          {
            width:
              COL.NUM,

            color:
              colors.textMuted,
          },
        ]}
      >
        P
      </Text>


      <Text
        style={[
          styles.headerCenter,
          {
            width:
              COL.STREAK,

            color:
              colors.textMuted,
          },
        ]}
      >
        Últ. 3
      </Text>
    </View>
  );
}


/* =========================================================
   FILA
========================================================= */

function TeamRow({
  row,
  index,
  total,
  highlightedIds,
  navigation,
  colors,
  isDark,
  scope,
}) {
  const team =
    row?.team ||
    {};

  const teamId =
    Number(
      team?.id ||
      0,
    );

  const position =
    Number(
      row?.position ||
      index + 1,
    );

  const highlighted =
    highlightedIds.has(
      String(
        teamId,
      ),
    );

  const top =
    position <=
    8;

  const danger =
    total >=
      10 &&
    position >
      total - 2;

  const sideColor =
    highlighted
      ? BRAND.primary
      : danger
        ? BRAND.red
        : top
          ? BRAND.primary
          : 'transparent';

  const rowBackground =
    highlighted
      ? (
          isDark
            ? 'rgba(49,93,228,0.14)'
            : '#F1F5FF'
        )
      : colors.cardBg;

  const rankBackground =
    highlighted
      ? BRAND.primary
      : (
          isDark
            ? 'rgba(255,255,255,0.07)'
            : '#F1F4F8'
        );

  const rankColor =
    highlighted
      ? '#FFFFFF'
      : danger
        ? BRAND.red
        : top
          ? BRAND.primary
          : colors.textMuted;

  return (
    <View
      style={[
        styles.teamRow,
        {
          backgroundColor:
            rowBackground,

          borderBottomColor:
            colors.cardBorder,
        },
      ]}
    >
      <View
        style={[
          styles.sideBar,
          {
            backgroundColor:
              sideColor,
          },
        ]}
      />


      <View
        style={
          styles.rankColumn
        }
      >
        <View
          style={[
            styles.rankBubble,
            {
              backgroundColor:
                rankBackground,
            },
          ]}
        >
          <Text
            style={[
              styles.rankText,
              {
                color:
                  rankColor,
              },
            ]}
          >
            {position}
          </Text>
        </View>
      </View>


      <TouchableOpacity
        activeOpacity={
          0.72
        }
        onPress={() => {
          if (
            !teamId ||
            highlighted
          ) {
            return;
          }

          navigation
            ?.push?.(
              'TeamScreen',
              {
                teamId,

                teamName:
                  team?.name ||
                  '',

                scope:
                  scope ||
                  'guatemala',
              },
            );
        }}
        style={
          styles.teamCell
        }
      >
        <TeamLogo
          uri={
            team?.logo
          }
          name={
            team?.name
          }
          colors={
            colors
          }
        />


        <Text
          numberOfLines={
            1
          }
          style={[
            styles.teamName,
            {
              color:
                colors.text,

              fontFamily:
                highlighted
                  ? 'Poppins-SemiBold'
                  : 'Poppins-Regular',
            },
          ]}
        >
          {fixTeamName(
            team?.name ||
            'Equipo',
          )}
        </Text>
      </TouchableOpacity>


      <Text
        style={[
          styles.pointsCell,
          {
            width:
              COL.PTS,

            color:
              colors.text,
          },
        ]}
      >
        {Number(
          row?.points ||
          0,
        )}
      </Text>


      <Text
        style={[
          styles.numberCell,
          {
            width:
              COL.NUM,

            color:
              colors.textMuted,
          },
        ]}
      >
        {Number(
          row?.played ||
          0,
        )}
      </Text>


      <Text
        style={[
          styles.numberCell,
          {
            width:
              COL.NUM,

            color:
              colors.text,
          },
        ]}
      >
        {Number(
          row?.won ||
          0,
        )}
      </Text>


      <Text
        style={[
          styles.numberCell,
          {
            width:
              COL.NUM,

            color:
              colors.text,
          },
        ]}
      >
        {Number(
          row?.drawn ||
          0,
        )}
      </Text>


      <Text
        style={[
          styles.numberCell,
          {
            width:
              COL.NUM,

            color:
              colors.text,
          },
        ]}
      >
        {Number(
          row?.lost ||
          0,
        )}
      </Text>


      <View
        style={{
          width:
            COL.STREAK,
        }}
      >
        <StreakDots
          streak={
            row?.streak
          }
          colors={
            colors
          }
        />
      </View>
    </View>
  );
}


/* =========================================================
   COMPONENTE
========================================================= */

export default function PositionsBlock({
  data = null,

  standings = null,
  standingsCum = null,

  mode = 'current',
  defaultView = 'current',

  teamId,
  highlightTeamId,
  selectedTeamId,

  scope = 'guatemala',

  title = '',
  showHeader = true,

  navigation:
    navigationProp,
}) {
  const {
    theme,
  } =
    useTheme();

  const colors =
    theme.colors;

  const isDark =
    theme.mode ===
    'dark';

  const hookNavigation =
    useNavigation();

  const route =
    useRoute();

  const navigation =
    navigationProp ||
    hookNavigation;

  const scopeLower =
    String(
      scope ||
      'guatemala',
    )
      .trim()
      .toLowerCase();

  const normalizedMode =
    String(
      mode ||
      'current',
    )
      .trim()
      .toLowerCase();

  const [
    view,
    setView,
  ] =
    useState(
      String(
        defaultView ||
        'current',
      )
        .trim()
        .toLowerCase() ===
        'aggregate'
        ? 'aggregate'
        : 'current',
    );


  /* =======================================================
     EQUIPOS A MARCAR
  ======================================================= */

  const activeTeamId =
    numberValue(
      selectedTeamId,
      highlightTeamId,
      teamId,
      route?.params
        ?.teamId,
      route?.params
        ?.team?.id,
    );

  const matchHomeId =
    numberValue(
      data?.teams
        ?.home?.id,
      data?.home?.id,
      data?.match
        ?.home?.id,
      data?.match
        ?.home_team_id,
      data?.match
        ?.homeTeamId,
    );

  const matchAwayId =
    numberValue(
      data?.teams
        ?.away?.id,
      data?.away?.id,
      data?.match
        ?.away?.id,
      data?.match
        ?.away_team_id,
      data?.match
        ?.awayTeamId,
    );

  const highlightedIds =
    useMemo(
      () => {
        const ids = [
          activeTeamId,
          matchHomeId,
          matchAwayId,
        ]
          .map(
            Number,
          )
          .filter(
            Boolean,
          )
          .map(
            String,
          );

        return new Set(
          ids,
        );
      },
      [
        activeTeamId,
        matchHomeId,
        matchAwayId,
      ],
    );


  /* =======================================================
     DATOS RECIBIDOS
  ======================================================= */

  const propCurrentRows =
    useMemo(
      () =>
        normalizeRows(
          standings,
        ),
      [
        standings,
      ],
    );

  const propAggregateRows =
    useMemo(
      () =>
        normalizeRows(
          standingsCum,
        ),
      [
        standingsCum,
      ],
    );


  /* =======================================================
     FALLBACK API

     Esto corrige Match.js, que pasa data pero no standings.
  ======================================================= */

  const [
    apiCurrentRows,
    setApiCurrentRows,
  ] =
    useState(
      [],
    );

  const [
    apiAggregateRows,
    setApiAggregateRows,
  ] =
    useState(
      [],
    );

  const [
    loadingTable,
    setLoadingTable,
  ] =
    useState(
      false,
    );

  const [
    tableError,
    setTableError,
  ] =
    useState(
      '',
    );

  const [
    reloadKey,
    setReloadKey,
  ] =
    useState(
      0,
    );

  const needsCurrentApi =
    scopeLower ===
      'guatemala' &&
    !propCurrentRows
      .length;

  const needsAggregateApi =
    scopeLower ===
      'guatemala' &&
    (
      normalizedMode ===
        'aggregate' ||
      normalizedMode ===
        'both'
    ) &&
    !propAggregateRows
      .length;


  useEffect(
    () => {
      let cancelled =
        false;

      if (
        !needsCurrentApi &&
        !needsAggregateApi
      ) {
        setLoadingTable(
          false,
        );

        setTableError(
          '',
        );

        return undefined;
      }

      const load =
        async () => {
          setLoadingTable(
            true,
          );

          setTableError(
            '',
          );

          try {
            const [
              currentPayload,
              aggregatePayload,
            ] =
              await Promise.all([
                needsCurrentApi
                  ? getStandings()
                  : Promise.resolve(
                      null,
                    ),

                needsAggregateApi
                  ? getAggregate()
                      .catch(
                        () => null,
                      )
                  : Promise.resolve(
                      null,
                    ),
              ]);

            if (
              cancelled
            ) {
              return;
            }

            if (
              currentPayload
            ) {
              setApiCurrentRows(
                normalizeRows(
                  currentPayload,
                ),
              );
            }

            if (
              aggregatePayload
            ) {
              setApiAggregateRows(
                normalizeRows(
                  aggregatePayload,
                ),
              );
            }

          } catch (
            error
          ) {
            if (
              cancelled
            ) {
              return;
            }

            console.warn(
              '[PositionsBlock] standings:',
              error?.message ||
              error,
            );

            setTableError(
              error?.message ||
              'No se pudo cargar la clasificación.',
            );

          } finally {
            if (
              !cancelled
            ) {
              setLoadingTable(
                false,
              );
            }
          }
        };

      load();

      return () => {
        cancelled =
          true;
      };
    },
    [
      needsCurrentApi,
      needsAggregateApi,
      reloadKey,
    ],
  );


  const currentBase =
    propCurrentRows
      .length
      ? propCurrentRows
      : apiCurrentRows;

  const aggregateBase =
    propAggregateRows
      .length
      ? propAggregateRows
      : apiAggregateRows;

  const effectiveView =
    normalizedMode ===
      'aggregate'
      ? 'aggregate'
      : normalizedMode ===
          'both'
        ? view
        : 'current';

  const baseRows =
    useMemo(
      () => {
        if (
          effectiveView ===
          'aggregate'
        ) {
          return aggregateBase
            .length
            ? aggregateBase
            : currentBase;
        }

        return currentBase;
      },
      [
        effectiveView,
        aggregateBase,
        currentBase,
      ],
    );


  /* =======================================================
     RACHA

     La dependencia es una firma estable de IDs.
     Así evitamos el loop de Maximum update depth exceeded.
  ======================================================= */

  const [
    streakMap,
    setStreakMap,
  ] =
    useState(
      new Map(),
    );

  const [
    loadingStreaks,
    setLoadingStreaks,
  ] =
    useState(
      false,
    );

  const streakSignature =
    useMemo(
      () =>
        currentBase
          .map(
            row =>
              Number(
                row?.team
                  ?.id ||
                0,
              ),
          )
          .filter(
            Boolean,
          )
          .join(
            ',',
          ),
      [
        currentBase,
      ],
    );


  useEffect(
    () => {
      let cancelled =
        false;

      if (
        scopeLower !==
        'guatemala'
      ) {
        return undefined;
      }

      if (
        !streakSignature
      ) {
        setStreakMap(
          previous =>
            previous.size
              ? new Map()
              : previous,
        );

        setLoadingStreaks(
          false,
        );

        return undefined;
      }

      const load =
        async () => {
          setLoadingStreaks(
            true,
          );

          try {
            const map =
              await loadStreakMap(
                currentBase,
              );

            if (
              !cancelled
            ) {
              setStreakMap(
                map,
              );
            }

          } catch (
            error
          ) {
            if (
              !cancelled
            ) {
              console.warn(
                '[PositionsBlock] streaks:',
                error?.message ||
                error,
              );
            }

          } finally {
            if (
              !cancelled
            ) {
              setLoadingStreaks(
                false,
              );
            }
          }
        };

      load();

      return () => {
        cancelled =
          true;
      };
    },
    [
      scopeLower,
      streakSignature,
    ],
  );


  const rows =
    useMemo(
      () =>
        baseRows.map(
          row => ({
            ...row,

            streak:
              streakMap.get(
                Number(
                  row?.team
                    ?.id ||
                  0,
                ),
              ) ||
              row?.streak ||
              [],
          }),
        ),
      [
        baseRows,
        streakMap,
      ],
    );

  const showSelector =
    normalizedMode ===
    'both';


  /* =======================================================
     ESTADOS
  ======================================================= */

  if (
    loadingTable &&
    !rows.length
  ) {
    return (
      <View
        style={
          styles.state
        }
      >
        <ActivityIndicator
          size="small"
          color={
            BRAND.primary
          }
        />

        <Text
          style={[
            styles.stateText,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          Cargando clasificación…
        </Text>
      </View>
    );
  }


  if (
    tableError &&
    !rows.length
  ) {
    return (
      <View
        style={
          styles.state
        }
      >
        <Text
          style={[
            styles.errorText,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          No se pudo cargar la clasificación.
        </Text>

        <TouchableOpacity
          activeOpacity={
            0.82
          }
          onPress={() =>
            setReloadKey(
              value =>
                value + 1,
            )
          }
          style={
            styles.retryButton
          }
        >
          <Text
            style={
              styles.retryText
            }
          >
            Reintentar
          </Text>
        </TouchableOpacity>
      </View>
    );
  }


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View
      style={
        styles.wrapper
      }
    >
      {!!title && (
        <Text
          style={[
            styles.title,
            {
              color:
                colors.text,
            },
          ]}
        >
          {title}
        </Text>
      )}


      {showSelector && (
        <View
          style={[
            styles.selector,
            {
              backgroundColor:
                isDark
                  ? 'rgba(255,255,255,0.055)'
                  : '#F2F5FB',

              borderColor:
                isDark
                  ? 'rgba(255,255,255,0.09)'
                  : '#E3E8F2',
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={
              0.88
            }
            onPress={() =>
              setView(
                'current',
              )
            }
            style={[
              styles.selectorButton,

              view ===
                'current'
                ? styles.selectorButtonActive
                : styles.selectorButtonInactive,
            ]}
          >
            <View
              style={
                styles.selectorButtonContent
              }
            >
              <View
                style={[
                  styles.selectorIndicator,
                  {
                    backgroundColor:
                      view ===
                        'current'
                        ? '#FFFFFF'
                        : (
                            isDark
                              ? 'rgba(255,255,255,0.22)'
                              : '#C7D0E1'
                          ),
                  },
                ]}
              />

              <Text
                style={[
                  styles.selectorText,
                  {
                    color:
                      view ===
                        'current'
                        ? '#FFFFFF'
                        : colors.textMuted,

                    fontFamily:
                      view ===
                        'current'
                        ? 'Poppins-SemiBold'
                        : 'Poppins-Medium',
                  },
                ]}
              >
                Actual
              </Text>
            </View>
          </TouchableOpacity>


          <TouchableOpacity
            activeOpacity={
              0.88
            }
            onPress={() =>
              setView(
                'aggregate',
              )
            }
            style={[
              styles.selectorButton,

              view ===
                'aggregate'
                ? styles.selectorButtonActive
                : styles.selectorButtonInactive,
            ]}
          >
            <View
              style={
                styles.selectorButtonContent
              }
            >
              <View
                style={[
                  styles.selectorIndicator,
                  {
                    backgroundColor:
                      view ===
                        'aggregate'
                        ? '#FFFFFF'
                        : (
                            isDark
                              ? 'rgba(255,255,255,0.22)'
                              : '#C7D0E1'
                          ),
                  },
                ]}
              />

              <Text
                style={[
                  styles.selectorText,
                  {
                    color:
                      view ===
                        'aggregate'
                        ? '#FFFFFF'
                        : colors.textMuted,

                    fontFamily:
                      view ===
                        'aggregate'
                        ? 'Poppins-SemiBold'
                        : 'Poppins-Medium',
                  },
                ]}
              >
                Acumulada
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}


      <View
        style={[
          styles.tableCard,
          {
            borderColor:
              colors.cardBorder,

            backgroundColor:
              colors.cardBg,
          },
        ]}
      >
        {showHeader && (
          <TableHeader
            colors={
              colors
            }
          />
        )}


        {!rows.length ? (
          <View
            style={
              styles.empty
            }
          >
            <Text
              style={[
                styles.emptyText,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              No hay datos de clasificación disponibles.
            </Text>
          </View>
        ) : (
          rows.map(
            (
              row,
              index,
            ) => (
              <TeamRow
                key={
                  row?.team?.id
                    ? `team-${row.team.id}`
                    : `team-${index}`
                }
                row={
                  row
                }
                index={
                  index
                }
                total={
                  rows.length
                }
                highlightedIds={
                  highlightedIds
                }
                navigation={
                  navigation
                }
                colors={
                  colors
                }
                isDark={
                  isDark
                }
                scope={
                  scopeLower
                }
              />
            ),
          )
        )}
      </View>


      {!!rows.length && (
        <View
          style={
            styles.bottomInfo
          }
        >
          <View
            style={
              styles.legend
            }
          >
            <View
              style={
                styles.legendItem
              }
            >
              <View
                style={[
                  styles.legendBar,
                  {
                    backgroundColor:
                      BRAND.primary,
                  },
                ]}
              />

              <Text
                style={[
                  styles.legendText,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                Clasificación
              </Text>
            </View>


            <View
              style={
                styles.legendItem
              }
            >
              <View
                style={[
                  styles.legendBar,
                  {
                    backgroundColor:
                      BRAND.red,
                  },
                ]}
              />

              <Text
                style={[
                  styles.legendText,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                Descenso
              </Text>
            </View>
          </View>


          {loadingStreaks && (
            <ActivityIndicator
              size="small"
              color={
                BRAND.primary
              }
            />
          )}
        </View>
      )}
    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    wrapper: {
      width:
        '100%',
    },


    /* TITLE */

    title: {
      marginBottom:
        7,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        12,

      includeFontPadding:
        false,
    },


    /* SELECTOR */

    selector: {
      height:
        48,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderRadius:
        16,

      padding:
        4,

      marginBottom:
        8,

      gap:
        4,
    },

    selectorButton: {
      flex:
        1,

      height:
        38,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    selectorButtonInactive: {
      backgroundColor:
        'transparent',
    },

    selectorButtonActive: {
      backgroundColor:
        BRAND.primary,

      elevation:
        3,

      shadowColor:
        BRAND.primary,

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.2,

      shadowRadius:
        7,
    },

    selectorButtonContent: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,
    },

    selectorIndicator: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,
    },

    selectorText: {
      fontSize:
        11,

      lineHeight:
        15,

      includeFontPadding:
        false,
    },


    /* TABLE */

    tableCard: {
      width:
        '100%',

      borderWidth:
        1,

      borderRadius:
        13,

      overflow:
        'hidden',
    },

    tableHeader: {
      minHeight:
        34,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        7,

      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    headerTeam: {
      flex:
        1,

      minWidth:
        0,
    },

    headerCenter: {
      fontFamily:
        'Poppins-Medium',

      fontSize:
        8.5,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },

    headerLeft: {
      fontFamily:
        'Poppins-Medium',

      fontSize:
        8.5,

      includeFontPadding:
        false,
    },

    headerPts: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8.5,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    /* ROW */

    teamRow: {
      minHeight:
        45,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        7,

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      position:
        'relative',
    },

    sideBar: {
      position:
        'absolute',

      left:
        0,

      top:
        0,

      bottom:
        0,

      width:
        3,
    },

    rankColumn: {
      width:
        COL.RANK,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    rankBubble: {
      width:
        23,

      height:
        23,

      borderRadius:
        12,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    rankText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8.5,

      includeFontPadding:
        false,
    },

    teamCell: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingRight:
        4,
    },

    logo: {
      width:
        19,

      height:
        19,

      marginRight:
        6,
    },

    logoFallback: {
      borderWidth:
        StyleSheet.hairlineWidth,

      borderRadius:
        6,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    logoFallbackText: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        6,
    },

    teamName: {
      flex:
        1,

      fontSize:
        9.5,

      lineHeight:
        14,

      includeFontPadding:
        false,
    },

    numberCell: {
      fontFamily:
        'Poppins-Regular',

      fontSize:
        9,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },

    pointsCell: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        9.5,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    /* STREAK */

    streakRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        STREAK_GAP,
    },

    streakDot: {
      width:
        STREAK_SIZE,

      height:
        STREAK_SIZE,

      borderRadius:
        STREAK_SIZE / 2,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    streakText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        7.5,

      lineHeight:
        STREAK_SIZE,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    /* STATES */

    state: {
      minHeight:
        105,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        18,
    },

    stateText: {
      marginTop:
        8,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10,
    },

    errorText: {
      fontFamily:
        'Poppins-Regular',

      fontSize:
        10,

      textAlign:
        'center',
    },

    retryButton: {
      marginTop:
        10,

      backgroundColor:
        BRAND.primary,

      borderRadius:
        999,

      paddingHorizontal:
        16,

      paddingVertical:
        7,
    },

    retryText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9,
    },


    /* EMPTY */

    empty: {
      minHeight:
        80,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        18,
    },

    emptyText: {
      fontFamily:
        'Poppins-Regular',

      fontSize:
        10,

      textAlign:
        'center',
    },


    /* BOTTOM */

    bottomInfo: {
      minHeight:
        39,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      paddingHorizontal:
        6,
    },

    legend: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        15,
    },

    legendItem: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,
    },

    legendBar: {
      width:
        3,

      height:
        13,

      borderRadius:
        2,
    },

    legendText: {
      fontFamily:
        'Poppins-Regular',

      fontSize:
        9,
    },
  });