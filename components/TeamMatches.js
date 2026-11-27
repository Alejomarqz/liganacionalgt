// components/TeamMatches.js
// Liga Nacional GT
//
// Partidos de un equipo desde:
// /sistema/api/matches.php?team_id=ID

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  AppState,
} from 'react-native';

import analytics from '@react-native-firebase/analytics';

import Card from './Card';

import {
  useTheme,
} from '../utils/ThemeContext';

import {
  BRAND,
} from '../utils/theme';


/* =========================================================
   CONFIG
========================================================= */

const API_BASE =
  'https://liganacionalgt.com/sistema/api';

const POLL_MS =
  20000;

const LIVE_STATUSES =
  new Set([
    'first_half',
    'halftime',
    'second_half',
    'end_90',
    'extra_first',
    'extra_break',
    'extra_second',
    'end_extra',
    'penalties',
  ]);

const RESULT_STATUSES =
  new Set([
    'finished',
    'cancelled',
  ]);

const WEEKDAYS = [
  'Dom',
  'Lun',
  'Mar',
  'Mié',
  'Jue',
  'Vie',
  'Sáb',
];

const MONTHS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];


/* =========================================================
   API
========================================================= */

async function getTeamMatches(
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
        },
      },
    );


  let json =
    null;


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


  return (
    json ||
    {}
  );
}


/* =========================================================
   HELPERS
========================================================= */

function firstValue(
  ...values
) {
  for (
    const value of values
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


function extractMatches(
  payload,
) {
  const source =
    Array.isArray(
      payload?.matches,
    )
      ? payload.matches
      : Array.isArray(
          payload?.data
            ?.matches,
        )
        ? payload
            .data
            .matches
        : Array.isArray(
            payload?.data,
          )
          ? payload.data
          : Array.isArray(
              payload,
            )
            ? payload
            : [];


  return source;
}


function normalizeMatch(
  raw,
) {
  const homeRaw =
    raw?.home ||
    raw?.teams?.home ||
    {};


  const awayRaw =
    raw?.away ||
    raw?.teams?.away ||
    {};


  const scoreRaw =
    raw?.score &&
    typeof raw.score ===
      'object'
      ? raw.score
      : {};


  return {
    ...raw,

    id:
      Number(
        firstValue(
          raw?.id,
          raw?.match_id,
          raw?.matchId,
          0,
        ),
      ) ||
      0,

    status:
      String(
        firstValue(
          raw?.status,
          raw?.status_code,
          raw?.statusCode,
          'scheduled',
        ),
      )
        .trim()
        .toLowerCase(),

    isLive:
      raw?.isLive ===
      true,

    home: {
      ...homeRaw,

      id:
        Number(
          firstValue(
            homeRaw?.id,
            raw?.home_team_id,
            raw?.homeTeamId,
            0,
          ),
        ) ||
        0,

      name:
        fixTeamName(
          firstValue(
            homeRaw?.name,
            raw?.home_team_name,
            raw?.homeTeamName,
            '',
          ),
        ),

      logo:
        firstValue(
          homeRaw?.logo,
          homeRaw?.logo_url,
          raw?.home_logo,
          null,
        ),
    },

    away: {
      ...awayRaw,

      id:
        Number(
          firstValue(
            awayRaw?.id,
            raw?.away_team_id,
            raw?.awayTeamId,
            0,
          ),
        ) ||
        0,

      name:
        fixTeamName(
          firstValue(
            awayRaw?.name,
            raw?.away_team_name,
            raw?.awayTeamName,
            '',
          ),
        ),

      logo:
        firstValue(
          awayRaw?.logo,
          awayRaw?.logo_url,
          raw?.away_logo,
          null,
        ),
    },

    score: {
      ...scoreRaw,

      home:
        Number(
          firstValue(
            scoreRaw?.home,
            raw?.home_score,
            0,
          ),
        ) ||
        0,

      away:
        Number(
          firstValue(
            scoreRaw?.away,
            raw?.away_score,
            0,
          ),
        ) ||
        0,
    },

    date:
      String(
        firstValue(
          raw?.date,
          String(
            raw?.kickoff ||
            '',
          ).slice(
            0,
            10,
          ),
          '',
        ),
      ),

    kickoff:
      firstValue(
        raw?.kickoff,
        raw?.scheduled_at,
        null,
      ),
  };
}


function getStatus(
  match,
) {
  return String(
    match?.status ||
    '',
  )
    .toLowerCase()
    .trim();
}


function isLive(
  match,
) {
  return (
    match?.isLive ===
      true ||
    LIVE_STATUSES.has(
      getStatus(
        match,
      ),
    )
  );
}


function isResult(
  match,
) {
  return RESULT_STATUSES.has(
    getStatus(
      match,
    ),
  );
}


function isScheduled(
  match,
) {
  return (
    getStatus(
      match,
    ) ===
    'scheduled'
  );
}


function dateOf(
  match,
) {
  const date =
    String(
      match?.date ||
      '',
    )
      .slice(
        0,
        10,
      );


  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      date,
    )
  ) {
    return date;
  }


  const kickoff =
    String(
      match?.kickoff ||
      '',
    );


  const result =
    kickoff.match(
      /^(\d{4}-\d{2}-\d{2})/,
    );


  return result
    ? result[1]
    : '';
}


function timeOf(
  match,
) {
  const result =
    String(
      match?.kickoff ||
      '',
    ).match(
      /T(\d{2}):(\d{2})/,
    );


  return result
    ? `${result[1]}:${result[2]}`
    : '';
}


function sortAscending(
  a,
  b,
) {
  const keyA =
    `${dateOf(
      a,
    )}${timeOf(
      a,
    )}${String(
      a?.id ||
      '',
    ).padStart(
      8,
      '0',
    )}`;


  const keyB =
    `${dateOf(
      b,
    )}${timeOf(
      b,
    )}${String(
      b?.id ||
      '',
    ).padStart(
      8,
      '0',
    )}`;


  return keyA.localeCompare(
    keyB,
  );
}


function formatDate(
  ymd,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(
        ymd ||
        '',
      ),
    )
  ) {
    return '';
  }


  const [
    year,
    month,
    day,
  ] =
    ymd
      .split('-')
      .map(Number);


  const date =
    new Date(
      Date.UTC(
        year,
        month - 1,
        day,
      ),
    );


  return (
    `${WEEKDAYS[
      date.getUTCDay()
    ]} ${day} ${
      MONTHS[
        month - 1
      ]
    }`
  );
}


function minutesToKickoff(
  match,
) {
  if (
    !isScheduled(
      match,
    )
  ) {
    return null;
  }


  const timestamp =
    Date.parse(
      String(
        match?.kickoff ||
        '',
      ),
    );


  if (
    !Number.isFinite(
      timestamp,
    )
  ) {
    return null;
  }


  return Math.round(
    (
      timestamp -
      Date.now()
    ) /
    60000,
  );
}


function isNearKickoff(
  match,
) {
  const minutes =
    minutesToKickoff(
      match,
    );


  return (
    minutes !==
      null &&
    minutes <=
      30 &&
    minutes >=
      -5
  );
}


/* =========================================================
   DATE SEPARATOR
========================================================= */

function DateSeparator({
  date,
  colors,
}) {
  const label =
    formatDate(
      date,
    );


  if (
    !label
  ) {
    return null;
  }


  return (
    <View
      style={
        styles.dateRow
      }
    >
      <Text
        style={[
          styles.dateText,

          {
            color:
              colors.textMuted,
          },
        ]}
      >
        {label}
      </Text>


      <View
        style={[
          styles.dateLine,

          {
            backgroundColor:
              colors.cardBorder,
          },
        ]}
      />
    </View>
  );
}


/* =========================================================
   EMPTY
========================================================= */

function EmptyState({
  type,
  colors,
}) {
  return (
    <View
      style={
        styles.empty
      }
    >
      <Text
        style={
          styles.emptyIcon
        }
      >
        {type ===
        'future'
          ? '📅'
          : '⚽'}
      </Text>


      <Text
        style={[
          styles.emptyTitle,

          {
            color:
              colors.text,
          },
        ]}
      >
        {type ===
        'future'
          ? 'Sin próximos partidos'
          : 'Sin resultados'}
      </Text>


      <Text
        style={[
          styles.emptyText,

          {
            color:
              colors.textMuted,
          },
        ]}
      >
        {type ===
        'future'
          ? 'No hay próximos partidos programados para este equipo.'
          : 'Todavía no hay resultados disponibles.'}
      </Text>
    </View>
  );
}


/* =========================================================
   TEAM MATCHES
========================================================= */

export default function TeamMatches({
  teamId,
  navigation,
  initialTab = 'future',
  onTabChange,
  bottomPadding = 150,
}) {
  const {
    theme,
  } =
    useTheme();


  const colors =
    theme.colors;


  const appState =
    useRef(
      AppState.currentState,
    );


  const mounted =
    useRef(
      true,
    );


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    error,
    setError,
  ] =
    useState('');


  const [
    matches,
    setMatches,
  ] =
    useState([]);


  const [
    tab,
    setTab,
  ] =
    useState(
      initialTab ===
      'past'
        ? 'past'
        : 'future',
    );


  const setTabValue =
    useCallback(
      value => {
        const next =
          value ===
          'past'
            ? 'past'
            : 'future';


        setTab(
          next,
        );


        onTabChange?.(
          next,
        );
      },
      [
        onTabChange,
      ],
    );


  useEffect(
    () => {
      setTab(
        initialTab ===
        'past'
          ? 'past'
          : 'future',
      );
    },
    [
      initialTab,
    ],
  );


  /* =======================================================
     LOAD
  ======================================================= */

  const load =
    useCallback(
      async ({
        silent =
          false,
      } = {}) => {
        if (
          !teamId
        ) {
          return;
        }


        if (
          !silent
        ) {
          setLoading(
            true,
          );
        }


        setError(
          '',
        );


        try {
          const payload =
            await getTeamMatches(
              teamId,
            );


          const normalized =
            extractMatches(
              payload,
            )
              .map(
                normalizeMatch,
              )
              .filter(
                match =>
                  Number(
                    match?.home
                      ?.id,
                  ) ===
                    Number(
                      teamId,
                    ) ||
                  Number(
                    match?.away
                      ?.id,
                  ) ===
                    Number(
                      teamId,
                    ),
              );


          normalized.sort(
            sortAscending,
          );


          if (
            mounted.current
          ) {
            setMatches(
              normalized,
            );
          }


        } catch (
          loadError
        ) {
          console.warn(
            '[TeamMatches]',
            loadError?.message ||
            loadError,
          );


          if (
            mounted.current
          ) {
            setError(
              loadError?.message ||
              'No se pudieron cargar los partidos.',
            );
          }


        } finally {
          if (
            mounted.current &&
            !silent
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [
        teamId,
      ],
    );


  useEffect(
    () => {
      mounted.current =
        true;


      load();


      return () => {
        mounted.current =
          false;
      };
    },
    [
      load,
    ],
  );


  /* =======================================================
     LISTAS
  ======================================================= */

  const {
    future,
    past,
  } =
    useMemo(
      () => {
        const futureList =
          [];


        const pastList =
          [];


        matches.forEach(
          match => {
            if (
              isResult(
                match,
              )
            ) {
              pastList.push(
                match,
              );
            } else {
              futureList.push(
                match,
              );
            }
          },
        );


        futureList.sort(
          sortAscending,
        );


        pastList.sort(
          (
            a,
            b,
          ) =>
            sortAscending(
              b,
              a,
            ),
        );


        return {
          future:
            futureList,

          past:
            pastList,
        };
      },
      [
        matches,
      ],
    );


  const list =
    tab ===
    'future'
      ? future
      : past;


  /* =======================================================
     POLLING
  ======================================================= */

  const shouldPoll =
    useMemo(
      () =>
        matches.some(
          match =>
            isLive(
              match,
            ) ||
            isNearKickoff(
              match,
            ),
        ),
      [
        matches,
      ],
    );


  useEffect(
    () => {
      const subscription =
        AppState.addEventListener(
          'change',
          state => {
            appState.current =
              state;


            if (
              state ===
                'active' &&
              shouldPoll
            ) {
              load({
                silent:
                  true,
              });
            }
          },
        );


      if (
        !shouldPoll
      ) {
        return () => {
          subscription
            ?.remove?.();
        };
      }


      const interval =
        setInterval(
          () => {
            if (
              appState.current ===
              'active'
            ) {
              load({
                silent:
                  true,
              });
            }
          },
          POLL_MS,
        );


      return () => {
        clearInterval(
          interval,
        );


        subscription
          ?.remove?.();
      };
    },
    [
      shouldPoll,
      load,
    ],
  );


  /* =======================================================
     REFRESH
  ======================================================= */

  const refresh =
    useCallback(
      async () => {
        setRefreshing(
          true,
        );


        try {
          await load({
            silent:
              true,
          });
        } finally {
          if (
            mounted.current
          ) {
            setRefreshing(
              false,
            );
          }
        }
      },
      [
        load,
      ],
    );


  /* =======================================================
     OPEN MATCH
  ======================================================= */

  const openMatch =
    useCallback(
      async match => {
        if (
          !match?.id
        ) {
          return;
        }


        try {
          await analytics()
            .logEvent(
              'open_match_from_team',
              {
                origin:
                  'team',

                match_id:
                  String(
                    match.id,
                  ),

                home_team:
                  String(
                    match?.home
                      ?.name ||
                    '',
                  ),

                away_team:
                  String(
                    match?.away
                      ?.name ||
                    '',
                  ),

                source:
                  'liga_nacional_core',
              },
            );
        } catch {}


        navigation
          ?.push?.(
            'Match',
            {
              matchId:
                Number(
                  match.id,
                ),

              slug:
                match?.slug ||
                null,

              source:
                'liga-core',

              channel:
                'guatemala',

              pre: {
                id:
                  Number(
                    match.id,
                  ),

                teams: {
                  homeTeamId:
                    Number(
                      match?.home
                        ?.id ||
                      0,
                    ),

                  awayTeamId:
                    Number(
                      match?.away
                        ?.id ||
                      0,
                    ),

                  homeTeamName:
                    match?.home
                      ?.name ||
                    '',

                  awayTeamName:
                    match?.away
                      ?.name ||
                    '',

                  homeLogo:
                    match?.home
                      ?.logo ||
                    null,

                  awayLogo:
                    match?.away
                      ?.logo ||
                    null,
                },

                kickoff:
                  match?.kickoff ||
                  null,

                date:
                  match?.date ||
                  null,

                stadium:
                  match?.stadium ||
                  null,

                round:
                  match?.round ||
                  null,
              },
            },
          );
      },
      [
        navigation,
      ],
    );


  /* =======================================================
     ROWS WITH DATES
  ======================================================= */

  const rows =
    useMemo(
      () => {
        const result =
          [];


        let previousDate =
          null;


        list.forEach(
          match => {
            const date =
              dateOf(
                match,
              );


            if (
              date !==
              previousDate
            ) {
              result.push({
                type:
                  'date',

                date,

                key:
                  `date-${date}`,
              });


              previousDate =
                date;
            }


            result.push({
              type:
                'match',

              match,

              key:
                `match-${match.id}`,
            });
          },
        );


        return result;
      },
      [
        list,
      ],
    );


  /* =======================================================
     STATES
  ======================================================= */

  if (
    loading
  ) {
    return (
      <View
        style={
          styles.center
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
          Cargando partidos…
        </Text>
      </View>
    );
  }


  if (
    error &&
    !matches.length
  ) {
    return (
      <View
        style={
          styles.center
        }
      >
        <Text
          style={
            styles.errorIcon
          }
        >
          📡
        </Text>

        <Text
          style={[
            styles.errorTitle,

            {
              color:
                colors.text,
            },
          ]}
        >
          No se pudieron cargar
        </Text>

        <Text
          style={[
            styles.stateText,

            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {error}
        </Text>

        <TouchableOpacity
          onPress={() =>
            load()
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
    <ScrollView
      style={[
        styles.scroll,

        {
          backgroundColor:
            colors.screenBg,
        },
      ]}
      showsVerticalScrollIndicator={
        false
      }
      contentContainerStyle={[
        styles.content,

        {
          paddingBottom:
            bottomPadding,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={
            refreshing
          }
          onRefresh={
            refresh
          }
          colors={[
            BRAND.primary,
          ]}
          tintColor={
            BRAND.primary
          }
          progressBackgroundColor={
            colors.cardBg
          }
        />
      }
    >
      <View
        style={[
          styles.segment,

          {
            backgroundColor:
              colors.cardBg,

            borderColor:
              colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={
            0.8
          }
          onPress={() =>
            setTabValue(
              'future',
            )
          }
          style={[
            styles.segmentButton,

            tab ===
              'future' && {
              backgroundColor:
                BRAND.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.segmentText,

              {
                color:
                  tab ===
                  'future'
                    ? '#FFFFFF'
                    : colors
                        .textMuted,
              },
            ]}
          >
            Próximos
          </Text>

          <View
            style={[
              styles.countBadge,

              {
                backgroundColor:
                  tab ===
                  'future'
                    ? 'rgba(255,255,255,.16)'
                    : colors
                        .screenBg,
              },
            ]}
          >
            <Text
              style={[
                styles.countText,

                {
                  color:
                    tab ===
                    'future'
                      ? '#FFFFFF'
                      : colors
                          .textMuted,
                },
              ]}
            >
              {future.length}
            </Text>
          </View>
        </TouchableOpacity>


        <TouchableOpacity
          activeOpacity={
            0.8
          }
          onPress={() =>
            setTabValue(
              'past',
            )
          }
          style={[
            styles.segmentButton,

            tab ===
              'past' && {
              backgroundColor:
                BRAND.primary,
            },
          ]}
        >
          <Text
            style={[
              styles.segmentText,

              {
                color:
                  tab ===
                  'past'
                    ? '#FFFFFF'
                    : colors
                        .textMuted,
              },
            ]}
          >
            Resultados
          </Text>

          <View
            style={[
              styles.countBadge,

              {
                backgroundColor:
                  tab ===
                  'past'
                    ? 'rgba(255,255,255,.16)'
                    : colors
                        .screenBg,
              },
            ]}
          >
            <Text
              style={[
                styles.countText,

                {
                  color:
                    tab ===
                    'past'
                      ? '#FFFFFF'
                      : colors
                          .textMuted,
                },
              ]}
            >
              {past.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>


      {!rows.length ? (

        <EmptyState
          type={
            tab
          }
          colors={
            colors
          }
        />

      ) : (

        rows.map(
          row => {
            if (
              row.type ===
              'date'
            ) {
              return (
                <DateSeparator
                  key={
                    row.key
                  }
                  date={
                    row.date
                  }
                  colors={
                    colors
                  }
                />
              );
            }


            return (
              <View
                key={
                  row.key
                }
                style={
                  styles.cardWrap
                }
              >
                <Card
                  match={
                    row.match
                  }
                  onPress={() =>
                    openMatch(
                      row.match,
                    )
                  }
                  showTourneyBadge={
                    false
                  }
                />
              </View>
            );
          },
        )

      )}
    </ScrollView>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    scroll: {
      flex:
        1,

      width:
        '100%',
    },


    content: {
      paddingHorizontal:
        9,

      paddingTop:
        10,
    },


    /* SEGMENT */

    segment: {
      alignSelf:
        'center',

      flexDirection:
        'row',

      borderRadius:
        12,

      borderWidth:
        1,

      padding:
        3,

      marginBottom:
        8,
    },


    segmentButton: {
      minHeight:
        36,

      minWidth:
        118,

      borderRadius:
        9,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,
    },


    segmentText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10,
    },


    countBadge: {
      minWidth:
        21,

      height:
        21,

      borderRadius:
        11,

      paddingHorizontal:
        5,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    countText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8,
    },


    /* DATE */

    dateRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        10,

      marginHorizontal:
        7,

      marginTop:
        10,

      marginBottom:
        5,
    },


    dateText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9,
    },


    dateLine: {
      flex:
        1,

      height:
        StyleSheet.hairlineWidth,
    },


    cardWrap: {
      marginBottom:
        2,
    },


    /* STATES */

    center: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,

      paddingBottom:
        100,
    },


    stateText: {
      marginTop:
        6,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10,

      textAlign:
        'center',
    },


    errorIcon: {
      fontSize:
        28,

      marginBottom:
        7,
    },


    errorTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        13,
    },


    retryButton: {
      marginTop:
        13,

      backgroundColor:
        BRAND.primary,

      paddingHorizontal:
        18,

      paddingVertical:
        8,

      borderRadius:
        999,
    },


    retryText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10,
    },


    empty: {
      alignItems:
        'center',

      paddingVertical:
        52,

      paddingHorizontal:
        25,
    },


    emptyIcon: {
      fontSize:
        27,

      marginBottom:
        7,
    },


    emptyTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        13,
    },


    emptyText: {
      maxWidth:
        260,

      marginTop:
        4,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        9.5,

      lineHeight:
        15,

      textAlign:
        'center',
    },

  });