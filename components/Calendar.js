// components/Calendar.js
// Liga Nacional GT
//
// Calendario conectado exclusivamente al Núcleo propio.
// Fuente deportiva:
// services/ligaNacionalApi.js -> getMatches()
//
// Ya NO utiliza:
// - API_JORNADAS_URL
// - API_WEB_DEPORT_URL
// - statusId antiguos
// - agenda/event JSON antiguos
// - overlay del sistema anterior

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
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Easing,
  RefreshControl,
  AppState,
  Modal,
  Pressable,
} from 'react-native';

import Header from './Header';
import AdFooter from '../ads/AdFooter';
import Card from './Card';
import TeamSearchModal from './TeamSearchModal';
import FooterTabs from './FooterTabs';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import analytics from '@react-native-firebase/analytics';

import {
  useTheme,
} from '../utils/ThemeContext';

import {
  BRAND,
} from '../utils/theme';

import {
  getMatches,
  extractMatches,
} from '../services/ligaNacionalApi';


/* =========================================================
   CONSTANTES
========================================================= */

const POLL_MS = 20000;

const LIVE_STATUSES = new Set([
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

const FINISHED_STATUSES = new Set([
  'finished',
]);

const FINAL_ROUNDS = [
  'repechaje',
  'play-in',
  'play in',
  'cuartos de final',
  'cuartos',
  'semifinales',
  'semifinal',
  'final',
];

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


function getStatus(
  match,
) {
  return String(
    match?.status || '',
  )
    .trim()
    .toLowerCase();
}


function isLive(
  match,
) {
  return (
    match?.isLive === true ||
    LIVE_STATUSES.has(
      getStatus(
        match,
      ),
    )
  );
}


function isFinished(
  match,
) {
  return FINISHED_STATUSES.has(
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


/* =========================================================
   FECHA
========================================================= */

function getMatchDate(
  match,
) {
  const direct =
    String(
      match?.date || '',
    )
      .trim()
      .slice(
        0,
        10,
      );


  if (
    /^\d{4}-\d{2}-\d{2}$/.test(
      direct,
    )
  ) {
    return direct;
  }


  const kickoff =
    String(
      match?.kickoff || '',
    );


  const result =
    kickoff.match(
      /^(\d{4}-\d{2}-\d{2})/,
    );


  return result
    ? result[1]
    : '';
}


function getMatchTime(
  match,
) {
  const kickoff =
    String(
      match?.kickoff || '',
    );


  const result =
    kickoff.match(
      /T(\d{2}):(\d{2})/,
    );


  if (
    !result
  ) {
    return '';
  }


  return (
    `${result[1]}:${result[2]}`
  );
}


function todayGtYmd() {
  const now =
    new Date(
      Date.now() -
      6 *
      60 *
      60 *
      1000,
    );


  return (
    `${now.getUTCFullYear()}-` +
    `${String(
      now.getUTCMonth() +
      1,
    ).padStart(
      2,
      '0',
    )}-` +
    `${String(
      now.getUTCDate(),
    ).padStart(
      2,
      '0',
    )}`
  );
}


function shiftYmd(
  ymd,
  days,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(
        ymd || '',
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


  date.setUTCDate(
    date.getUTCDate() +
    days,
  );


  return (
    `${date.getUTCFullYear()}-` +
    `${String(
      date.getUTCMonth() +
      1,
    ).padStart(
      2,
      '0',
    )}-` +
    `${String(
      date.getUTCDate(),
    ).padStart(
      2,
      '0',
    )}`
  );
}


function formatDateLabel(
  ymd,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      String(
        ymd || '',
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


  const today =
    todayGtYmd();


  const tomorrow =
    shiftYmd(
      today,
      1,
    );


  const yesterday =
    shiftYmd(
      today,
      -1,
    );


  const normal =
    `${WEEKDAYS[
      date.getUTCDay()
    ]} ${day} ${
      MONTHS[
        month - 1
      ]
    }`;


  if (
    ymd === today
  ) {
    return `Hoy · ${normal}`;
  }


  if (
    ymd === tomorrow
  ) {
    return `Mañana · ${normal}`;
  }


  if (
    ymd === yesterday
  ) {
    return `Ayer · ${normal}`;
  }


  return normal;
}


/* =========================================================
   JORNADAS
========================================================= */

function getRoundLabel(
  match,
) {
  const round =
    match?.round;


  if (
    round &&
    typeof round ===
    'object'
  ) {
    const objectValue =
      firstValue(
        round?.name,
        round?.label,
        round?.title,
        round?.round,
        round?.number,
      );


    if (
      objectValue !== null
    ) {
      return normalizeRoundLabel(
        objectValue,
      );
    }
  }


  return normalizeRoundLabel(
    firstValue(
      round,
      match?.round_name,
      match?.roundName,
      match?.round_title,
      match?.roundTitle,
      match?.jornada,
      '',
    ),
  );
}


function normalizeRoundLabel(
  value,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return 'Sin jornada';
  }


  if (
    typeof value ===
    'number'
  ) {
    return `Jornada ${value}`;
  }


  const raw =
    String(
      value,
    )
      .trim()
      .replace(
        /\s+/g,
        ' ',
      );


  if (
    !raw
  ) {
    return 'Sin jornada';
  }


  if (
    /^\d+$/.test(
      raw,
    )
  ) {
    return (
      `Jornada ${Number(
        raw,
      )}`
    );
  }


  const jornada =
    raw.match(
      /^jornada\s*(\d+)$/i,
    );


  if (
    jornada
  ) {
    return (
      `Jornada ${Number(
        jornada[1],
      )}`
    );
  }


  return raw;
}


function getRoundNumber(
  label,
) {
  const result =
    String(
      label || '',
    ).match(
      /^Jornada\s+(\d+)$/i,
    );


  return result
    ? Number(
        result[1],
      )
    : null;
}


function sortRoundGroups(
  a,
  b,
) {
  const numberA =
    getRoundNumber(
      a.label,
    );


  const numberB =
    getRoundNumber(
      b.label,
    );


  if (
    numberA !== null &&
    numberB !== null
  ) {
    return (
      numberA -
      numberB
    );
  }


  if (
    numberA !== null
  ) {
    return -1;
  }


  if (
    numberB !== null
  ) {
    return 1;
  }


  const lowerA =
    String(
      a.label,
    ).toLowerCase();


  const lowerB =
    String(
      b.label,
    ).toLowerCase();


  const finalA =
    FINAL_ROUNDS.findIndex(
      value =>
        lowerA.includes(
          value,
        ),
    );


  const finalB =
    FINAL_ROUNDS.findIndex(
      value =>
        lowerB.includes(
          value,
        ),
    );


  if (
    finalA >= 0 &&
    finalB >= 0
  ) {
    return (
      finalA -
      finalB
    );
  }


  if (
    finalA >= 0
  ) {
    return 1;
  }


  if (
    finalB >= 0
  ) {
    return -1;
  }


  return a.label.localeCompare(
    b.label,
    'es',
  );
}


/* =========================================================
   PARTIDOS
========================================================= */

function matchSortKey(
  match,
) {
  return (
    `${getMatchDate(
      match,
    )}` +
    `${getMatchTime(
      match,
    )}` +
    `${String(
      match?.id || '',
    ).padStart(
      8,
      '0',
    )}`
  );
}


function sortMatches(
  a,
  b,
) {
  return matchSortKey(
    a,
  ).localeCompare(
    matchSortKey(
      b,
    ),
  );
}


function buildRoundGroups(
  matches,
) {
  const map =
    new Map();


  (
    Array.isArray(
      matches,
    )
      ? matches
      : []
  ).forEach(
    match => {
      const label =
        getRoundLabel(
          match,
        );


      if (
        !map.has(
          label,
        )
      ) {
        map.set(
          label,
          {
            key:
              label,

            label,

            matches:
              [],
          },
        );
      }


      map
        .get(
          label,
        )
        .matches
        .push(
          match,
        );
    },
  );


  const groups =
    Array.from(
      map.values(),
    );


  groups.forEach(
    group => {
      group.matches.sort(
        sortMatches,
      );
    },
  );


  return groups.sort(
    sortRoundGroups,
  );
}


/* =========================================================
   SELECCIONAR JORNADA ACTUAL
========================================================= */

function selectBestRound(
  rounds,
) {
  if (
    !rounds.length
  ) {
    return '';
  }


  /*
   * 1. Si existe una jornada con partido en vivo,
   *    esa es la prioritaria.
   */
  const liveRound =
    rounds.find(
      round =>
        round.matches.some(
          isLive,
        ),
    );


  if (
    liveRound
  ) {
    return liveRound.key;
  }


  const today =
    todayGtYmd();


  /*
   * 2. Jornada que tenga partidos hoy.
   */
  const todayRound =
    rounds.find(
      round =>
        round.matches.some(
          match =>
            getMatchDate(
              match,
            ) === today,
        ),
    );


  if (
    todayRound
  ) {
    return todayRound.key;
  }


  /*
   * 3. Jornada futura más cercana.
   */
  const futureRounds =
    rounds
      .map(
        round => {
          const futureDates =
            round.matches
              .map(
                getMatchDate,
              )
              .filter(
                date =>
                  date &&
                  date >=
                  today,
              )
              .sort();


          return {
            round,

            date:
              futureDates[0] ||
              null,
          };
        },
      )
      .filter(
        item =>
          !!item.date,
      )
      .sort(
        (
          a,
          b,
        ) =>
          a.date.localeCompare(
            b.date,
          ),
      );


  if (
    futureRounds.length
  ) {
    return (
      futureRounds[0]
        .round
        .key
    );
  }


  /*
   * 4. Última jornada disputada.
   */
  const pastRounds =
    rounds
      .map(
        round => {
          const dates =
            round.matches
              .map(
                getMatchDate,
              )
              .filter(
                Boolean,
              )
              .sort();


          return {
            round,

            date:
              dates.at(-1) ||
              '',
          };
        },
      )
      .sort(
        (
          a,
          b,
        ) =>
          b.date.localeCompare(
            a.date,
          ),
      );


  return (
    pastRounds[0]
      ?.round
      ?.key ||
    rounds[0].key
  );
}


/* =========================================================
   TEMPORAL
========================================================= */

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


  const kickoff =
    String(
      match?.kickoff || '',
    );


  if (
    !kickoff
  ) {
    return null;
  }


  const timestamp =
    Date.parse(
      kickoff,
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
    minutes !== null &&
    minutes <= 30 &&
    minutes >= -5
  );
}


/* =========================================================
   TEMPORADA
========================================================= */

function extractSeasonLabel(
  payload,
  matches,
) {
  const payloadSeason =
    payload?.season;


  if (
    typeof payloadSeason ===
    'string'
  ) {
    return payloadSeason;
  }


  const direct =
    firstValue(
      payloadSeason?.name,
      payloadSeason?.label,
      payload?.season_name,
      payload?.seasonName,
      payload?.meta?.season_name,
      payload?.meta?.seasonName,
    );


  if (
    direct
  ) {
    return String(
      direct,
    );
  }


  for (
    const match of matches
  ) {
    if (
      typeof match?.season ===
      'string'
    ) {
      return match.season;
    }


    const value =
      firstValue(
        match?.season?.name,
        match?.season?.label,
        match?.season_name,
        match?.seasonName,
      );


    if (
      value
    ) {
      return String(
        value,
      );
    }
  }


  return 'Liga Nacional';
}


/* =========================================================
   FILAS POR FECHA
========================================================= */

function groupMatchesByDate(
  matches,
) {
  const groups =
    [];


  let lastDate =
    null;


  matches.forEach(
    match => {
      const date =
        getMatchDate(
          match,
        );


      if (
        date !== lastDate
      ) {
        groups.push({
          type:
            'date',

          key:
            `date-${date}`,

          date,
        });


        lastDate =
          date;
      }


      groups.push({
        type:
          'match',

        key:
          `match-${match?.id}`,

        match,
      });
    },
  );


  return groups;
}


/* =========================================================
   DATE HEADER
========================================================= */

function DateHeader({
  date,
  colors,
}) {
  const label =
    formatDateLabel(
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
        styles.dateHeader
      }
    >
      <Text
        style={[
          styles.dateHeaderText,

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
          styles.dateHeaderLine,

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
   SELECTOR DE JORNADA
========================================================= */

function RoundSelector({
  round,
  season,
  stats,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
  onOpen,
  colors,
  isDark,
}) {
  if (
    !round
  ) {
    return null;
  }


  return (
    <View
      style={[
        styles.roundSelector,

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
          hasPrev
            ? 0.65
            : 1
        }
        disabled={
          !hasPrev
        }
        onPress={
          onPrev
        }
        style={[
          styles.roundArrow,

          {
            backgroundColor:
              isDark
                ? 'rgba(255,255,255,0.05)'
                : '#F4F6FA',

            opacity:
              hasPrev
                ? 1
                : 0.3,
          },
        ]}
      >
        <Text
          style={[
            styles.roundArrowText,

            {
              color:
                colors.text,
            },
          ]}
        >
          ‹
        </Text>
      </TouchableOpacity>


      <TouchableOpacity
        activeOpacity={
          0.7
        }
        onPress={
          onOpen
        }
        style={
          styles.roundCenter
        }
      >
        <Text
          numberOfLines={
            1
          }
          style={[
            styles.roundTitle,

            {
              color:
                colors.text,
            },
          ]}
        >
          {round.label}
        </Text>


        <Text
          numberOfLines={
            1
          }
          style={[
            styles.roundSubtitle,

            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {season} · {stats.total}{' '}
          {stats.total === 1
            ? 'partido'
            : 'partidos'}
        </Text>
      </TouchableOpacity>


      <TouchableOpacity
        activeOpacity={
          hasNext
            ? 0.65
            : 1
        }
        disabled={
          !hasNext
        }
        onPress={
          onNext
        }
        style={[
          styles.roundArrow,

          {
            backgroundColor:
              isDark
                ? 'rgba(255,255,255,0.05)'
                : '#F4F6FA',

            opacity:
              hasNext
                ? 1
                : 0.3,
          },
        ]}
      >
        <Text
          style={[
            styles.roundArrowText,

            {
              color:
                colors.text,
            },
          ]}
        >
          ›
        </Text>
      </TouchableOpacity>


      {(stats.live > 0 ||
        stats.finished > 0) && (
        <View
          style={
            styles.roundMeta
          }
        >
          {stats.live >
            0 && (
            <View
              style={
                styles.liveBadge
              }
            >
              <View
                style={
                  styles.liveDot
                }
              />

              <Text
                style={
                  styles.liveBadgeText
                }
              >
                {stats.live}{' '}
                {stats.live === 1
                  ? 'en vivo'
                  : 'en vivo'}
              </Text>
            </View>
          )}


          {stats.finished >
            0 && (
            <Text
              style={[
                styles.finishedText,

                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              {stats.finished}{' '}
              finalizados
            </Text>
          )}
        </View>
      )}

    </View>
  );
}


/* =========================================================
   MODAL DE JORNADAS
========================================================= */

function RoundPicker({
  visible,
  rounds,
  activeKey,
  onClose,
  onSelect,
  colors,
  isDark,
}) {
  return (
    <Modal
      visible={
        visible
      }
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={
        onClose
      }
    >
      <Pressable
        style={
          styles.modalBackdrop
        }
        onPress={
          onClose
        }
      >
        <Pressable
          onPress={() => {}}
          style={[
            styles.modalCard,

            {
              backgroundColor:
                colors.cardBg,

              borderColor:
                colors.cardBorder,
            },
          ]}
        >
          <View
            style={
              styles.modalHeader
            }
          >
            <View>
              <Text
                style={[
                  styles.modalTitle,

                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Seleccionar jornada
              </Text>

              <Text
                style={[
                  styles.modalSubtitle,

                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                Liga Nacional
              </Text>
            </View>


            <TouchableOpacity
              activeOpacity={
                0.7
              }
              onPress={
                onClose
              }
              style={[
                styles.modalClose,

                {
                  backgroundColor:
                    isDark
                      ? 'rgba(255,255,255,0.06)'
                      : '#F2F4F8',
                },
              ]}
            >
              <Text
                style={[
                  styles.modalCloseText,

                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                ×
              </Text>
            </TouchableOpacity>
          </View>


          <ScrollView
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.roundGrid
            }
          >
            {rounds.map(
              round => {
                const active =
                  round.key ===
                  activeKey;


                return (
                  <TouchableOpacity
                    key={
                      round.key
                    }
                    activeOpacity={
                      0.75
                    }
                    onPress={() =>
                      onSelect(
                        round.key,
                      )
                    }
                    style={[
                      styles.roundGridItem,

                      {
                        backgroundColor:
                          active
                            ? BRAND.primary
                            : (
                                isDark
                                  ? 'rgba(255,255,255,0.05)'
                                  : '#F6F8FC'
                              ),

                        borderColor:
                          active
                            ? BRAND.primary
                            : colors.cardBorder,
                      },
                    ]}
                  >
                    <Text
                      numberOfLines={
                        1
                      }
                      style={[
                        styles.roundGridText,

                        {
                          color:
                            active
                              ? '#FFFFFF'
                              : colors.text,
                        },
                      ]}
                    >
                      {round.label}
                    </Text>
                  </TouchableOpacity>
                );
              },
            )}
          </ScrollView>

        </Pressable>
      </Pressable>
    </Modal>
  );
}


/* =========================================================
   CALENDAR
========================================================= */

export default function Calendar({
  navigation,
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


  const insets =
    useSafeAreaInsets();


  const safeBottom =
    Math.max(
      insets?.bottom ||
      0,
      0,
    );


  const TAB_H =
    58;


  const AD_H =
    60;


  const padBottom =
    TAB_H +
    AD_H +
    safeBottom +
    24;


  const scrollRef =
    useRef(null);


  const appStateRef =
    useRef(
      AppState.currentState,
    );


  const [
    matches,
    setMatches,
  ] =
    useState([]);


  const [
    activeRound,
    setActiveRound,
  ] =
    useState('');


  const [
    seasonLabel,
    setSeasonLabel,
  ] =
    useState(
      'Liga Nacional',
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
    pickerVisible,
    setPickerVisible,
  ] =
    useState(false);


  const [
    showTeamSearch,
    setShowTeamSearch,
  ] =
    useState(false);


  const [
    livePulse,
  ] =
    useState(
      new Animated.Value(
        1,
      ),
    );


  /* =======================================================
     ANALYTICS
  ======================================================= */

  useEffect(() => {
    (
      async () => {
        try {
          await analytics()
            .logScreenView({
              screen_name:
                'Calendar',

              screen_class:
                'Calendar',
            });
        } catch {}
      }
    )();
  }, []);


  /* =======================================================
     PULSE
  ======================================================= */

  useEffect(() => {
    const loop =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            livePulse,
            {
              toValue:
                1.12,

              duration:
                650,

              easing:
                Easing.inOut(
                  Easing.quad,
                ),

              useNativeDriver:
                true,
            },
          ),

          Animated.timing(
            livePulse,
            {
              toValue:
                1,

              duration:
                650,

              easing:
                Easing.inOut(
                  Easing.quad,
                ),

              useNativeDriver:
                true,
            },
          ),
        ]),
      );


    loop.start();


    return () => {
      try {
        loop.stop();
      } catch {}
    };
  }, [
    livePulse,
  ]);


  /* =======================================================
     ROUNDS
  ======================================================= */

  const rounds =
    useMemo(
      () =>
        buildRoundGroups(
          matches,
        ),
      [
        matches,
      ],
    );


  const activeIndex =
    useMemo(
      () =>
        rounds.findIndex(
          round =>
            round.key ===
            activeRound,
        ),
      [
        rounds,
        activeRound,
      ],
    );


  const activeGroup =
    activeIndex >= 0
      ? rounds[
          activeIndex
        ]
      : null;


  const activeMatches =
    activeGroup
      ?.matches ||
    [];


  const groupedRows =
    useMemo(
      () =>
        groupMatchesByDate(
          activeMatches,
        ),
      [
        activeMatches,
      ],
    );


  const roundStats =
    useMemo(
      () => ({
        total:
          activeMatches.length,

        live:
          activeMatches.filter(
            isLive,
          ).length,

        finished:
          activeMatches.filter(
            isFinished,
          ).length,
      }),
      [
        activeMatches,
      ],
    );


  /* =======================================================
     LOAD
  ======================================================= */

  const loadData =
    useCallback(
      async ({
        silent =
          false,
      } = {}) => {
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
            await getMatches();


          const list =
            extractMatches(
              payload,
            );


          const safeList =
            Array.isArray(
              list,
            )
              ? [...list]
              : [];


          safeList.sort(
            sortMatches,
          );


          setMatches(
            safeList,
          );


          setSeasonLabel(
            extractSeasonLabel(
              payload,
              safeList,
            ),
          );


          const nextRounds =
            buildRoundGroups(
              safeList,
            );


          const preferred =
            selectBestRound(
              nextRounds,
            );


          setActiveRound(
            previous => {
              if (
                previous &&
                nextRounds.some(
                  round =>
                    round.key ===
                    previous,
                )
              ) {
                return previous;
              }


              return (
                preferred ||
                nextRounds[0]
                  ?.key ||
                ''
              );
            },
          );


        } catch (
          loadError
        ) {
          console.warn(
            '[Calendar]',
            loadError?.message ||
            loadError,
          );


          if (
            !silent
          ) {
            setError(
              loadError?.message ||
              'No se pudo cargar el calendario.',
            );
          }


        } finally {
          if (
            !silent
          ) {
            setLoading(
              false,
            );
          }
        }
      },
      [],
    );


  useEffect(() => {
    loadData();
  }, [
    loadData,
  ]);


  /* =======================================================
     REFRESH
  ======================================================= */

  const onRefresh =
    useCallback(
      async () => {
        setRefreshing(
          true,
        );


        try {
          await loadData({
            silent:
              true,
          });


        } finally {
          setRefreshing(
            false,
          );
        }
      },
      [
        loadData,
      ],
    );


  /* =======================================================
     POLLING
  ======================================================= */

  const shouldPoll =
    useMemo(
      () =>
        activeMatches.some(
          match =>
            isLive(
              match,
            ) ||
            isNearKickoff(
              match,
            ),
        ),
      [
        activeMatches,
      ],
    );


  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        state => {
          appStateRef.current =
            state;


          if (
            state ===
              'active' &&
            shouldPoll
          ) {
            loadData({
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
            appStateRef.current ===
            'active'
          ) {
            loadData({
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
  }, [
    shouldPoll,
    loadData,
  ]);


  /* =======================================================
     CAMBIAR JORNADA
  ======================================================= */

  const selectRound =
    useCallback(
      async key => {
        setActiveRound(
          key,
        );


        setPickerVisible(
          false,
        );


        requestAnimationFrame(
          () => {
            scrollRef.current
              ?.scrollTo?.({
                y:
                  0,

                animated:
                  true,
              });
          },
        );


        try {
          await analytics()
            .logEvent(
              'calendar_round_select',
              {
                round:
                  String(
                    key,
                  ),
              },
            );
        } catch {}
      },
      [],
    );


  const goPrevRound =
    () => {
      if (
        activeIndex <=
        0
      ) {
        return;
      }


      selectRound(
        rounds[
          activeIndex -
          1
        ].key,
      );
    };


  const goNextRound =
    () => {
      if (
        activeIndex <
          0 ||
        activeIndex >=
          rounds.length -
          1
      ) {
        return;
      }


      selectRound(
        rounds[
          activeIndex +
          1
        ].key,
      );
    };


  /* =======================================================
     ABRIR PARTIDO
  ======================================================= */

  const openMatch =
    useCallback(
      async match => {
        const matchId =
          Number(
            match?.id ||
            0,
          );


        if (
          !matchId
        ) {
          return;
        }


        try {
          await analytics()
            .logEvent(
              'open_match_from_calendar',
              {
                origin:
                  'calendar',

                match_id:
                  String(
                    matchId,
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


        navigation?.push?.(
          'Match',
          {
            matchId,

            slug:
              match?.slug ||
              null,

            source:
              'liga-core',

            channel:
              'guatemala',

            pre: {
              id:
                matchId,

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
     RENDER
  ======================================================= */

  return (
    <View
      style={[
        styles.screen,

        {
          backgroundColor:
            colors.screenBg,
        },
      ]}
    >
      <Header
        title="Calendario"
        navigation={
          navigation
        }
        showSearch
        onSearchPress={() =>
          setShowTeamSearch(
            true,
          )
        }
      />


      {/* SELECTOR COMPACTO */}

      {!loading &&
        !error &&
        !!activeGroup && (
        <View
          style={
            styles.selectorWrap
          }
        >
          <RoundSelector
            round={
              activeGroup
            }
            season={
              seasonLabel
            }
            stats={
              roundStats
            }
            hasPrev={
              activeIndex >
              0
            }
            hasNext={
              activeIndex >=
                0 &&
              activeIndex <
                rounds.length -
                1
            }
            onPrev={
              goPrevRound
            }
            onNext={
              goNextRound
            }
            onOpen={() =>
              setPickerVisible(
                true,
              )
            }
            colors={
              colors
            }
            isDark={
              isDark
            }
          />
        </View>
      )}


      {/* LOADING */}

      {loading ? (

        <View
          style={
            styles.centered
          }
        >
          <ActivityIndicator
            size="large"
            color={
              BRAND.primary
            }
          />

          <Text
            style={[
              styles.loadingText,

              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            Cargando calendario…
          </Text>
        </View>

      ) : error ? (

        <View
          style={
            styles.centered
          }
        >
          <Text
            style={
              styles.errorEmoji
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
            Sin conexión
          </Text>

          <Text
            style={[
              styles.errorSub,

              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            {error}
          </Text>

          <TouchableOpacity
            activeOpacity={
              0.8
            }
            style={[
              styles.retryButton,

              {
                backgroundColor:
                  BRAND.primary,
              },
            ]}
            onPress={() =>
              loadData()
            }
          >
            <Text
              style={
                styles.retryButtonText
              }
            >
              Reintentar
            </Text>
          </TouchableOpacity>
        </View>

      ) : !activeGroup ? (

        <View
          style={
            styles.centered
          }
        >
          <Text
            style={
              styles.emptyEmoji
            }
          >
            📅
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
            No hay jornadas
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
            No hay partidos cargados en el calendario.
          </Text>
        </View>

      ) : (

        <ScrollView
          ref={
            scrollRef
          }
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={{
            paddingBottom:
              padBottom,
          }}
          scrollIndicatorInsets={{
            bottom:
              padBottom,
          }}
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                onRefresh
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

          {groupedRows.length ===
          0 ? (

            <View
              style={
                styles.emptyRound
              }
            >
              <Text
                style={
                  styles.emptyEmoji
                }
              >
                📅
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
                Sin partidos
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
                No hay partidos programados en esta jornada.
              </Text>
            </View>

          ) : (

            groupedRows.map(
              row => {
                if (
                  row.type ===
                  'date'
                ) {
                  return (
                    <DateHeader
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
                      styles.matchWrap
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
                      livePulse={
                        livePulse
                      }
                    />
                  </View>
                );
              },
            )

          )}

        </ScrollView>

      )}


      {/* SELECTOR MODAL */}

      <RoundPicker
        visible={
          pickerVisible
        }
        rounds={
          rounds
        }
        activeKey={
          activeRound
        }
        onClose={() =>
          setPickerVisible(
            false,
          )
        }
        onSelect={
          selectRound
        }
        colors={
          colors
        }
        isDark={
          isDark
        }
      />


      {/* BUSCAR EQUIPO */}

      <TeamSearchModal
        visible={
          showTeamSearch
        }
        onClose={() =>
          setShowTeamSearch(
            false,
          )
        }
        onSelect={
          team => {
            navigation.navigate(
              'TeamScreen',
              {
                teamId:
                  team.id,

                scope:
                  'guatemala',

                teamName:
                  team.name,
              },
            );

            setShowTeamSearch(
              false,
            );
          }
        }
      />


      {/* FOOTER */}

      <View
        pointerEvents="box-none"
        style={[
          styles.footerFixed,

          {
            height:
              TAB_H +
              safeBottom,
          },
        ]}
      >
        <View
          style={[
            styles.footerAd,

            {
              bottom:
                TAB_H +
                safeBottom,
            },
          ]}
        >
          <AdFooter />
        </View>


        <View
          style={[
            styles.footerTabs,

            {
              height:
                TAB_H +
                safeBottom,
            },
          ]}
        >
          <FooterTabs
            navigation={
              navigation
            }
            routeName="Calendar"
          />
        </View>
      </View>

    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    screen: {
      flex:
        1,
    },


    /* =====================================================
       SELECTOR
    ===================================================== */

    selectorWrap: {
      paddingHorizontal:
        12,

      paddingTop:
        8,

      paddingBottom:
        5,
    },


    roundSelector: {
      position:
        'relative',

      minHeight:
        66,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderRadius:
        14,

      paddingHorizontal:
        7,

      paddingVertical:
        7,
    },


    roundArrow: {
      width:
        36,

      height:
        36,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    roundArrowText: {
      fontFamily:
        'Poppins-Regular',

      fontSize:
        27,

      lineHeight:
        30,

      includeFontPadding:
        false,
    },


    roundCenter: {
      flex:
        1,

      minWidth:
        0,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        8,
    },


    roundTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        14,

      lineHeight:
        19,
    },


    roundSubtitle: {
      marginTop:
        1,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        9.5,

      lineHeight:
        14,
    },


    roundMeta: {
      position:
        'absolute',

      bottom:
        -10,

      alignSelf:
        'center',

      left:
        44,

      right:
        44,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,
    },


    liveBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,

      borderRadius:
        999,

      paddingHorizontal:
        7,

      paddingVertical:
        2,

      backgroundColor:
        '#FDECEE',
    },


    liveDot: {
      width:
        5,

      height:
        5,

      borderRadius:
        3,

      backgroundColor:
        '#DC2626',
    },


    liveBadgeText: {
      color:
        '#DC2626',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8,
    },


    finishedText: {
      fontFamily:
        'Poppins-Regular',

      fontSize:
        8,
    },


    /* =====================================================
       FECHA
    ===================================================== */

    dateHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        16,

      marginTop:
        20,

      marginBottom:
        8,

      gap:
        10,
    },


    dateHeaderText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10,

      letterSpacing:
        0.15,
    },


    dateHeaderLine: {
      flex:
        1,

      height:
        StyleSheet.hairlineWidth,
    },


    /* =====================================================
       PARTIDOS
    ===================================================== */

    matchWrap: {
      paddingHorizontal:
        8,

      marginBottom:
        3,
    },


    /* =====================================================
       LOADING / ERROR / EMPTY
    ===================================================== */

    centered: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,

      paddingBottom:
        90,
    },


    loadingText: {
      marginTop:
        8,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        11,
    },


    errorEmoji: {
      fontSize:
        32,

      marginBottom:
        8,
    },


    errorTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        14,
    },


    errorSub: {
      marginTop:
        3,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10.5,

      textAlign:
        'center',
    },


    retryButton: {
      marginTop:
        14,

      paddingHorizontal:
        22,

      paddingVertical:
        9,

      borderRadius:
        999,
    },


    retryButtonText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        11,
    },


    emptyRound: {
      alignItems:
        'center',

      paddingHorizontal:
        24,

      paddingVertical:
        70,
    },


    emptyEmoji: {
      fontSize:
        30,

      marginBottom:
        8,
    },


    emptyTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        13,
    },


    emptyText: {
      maxWidth:
        270,

      marginTop:
        4,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10,

      lineHeight:
        15,

      textAlign:
        'center',
    },


    /* =====================================================
       MODAL
    ===================================================== */

    modalBackdrop: {
      flex:
        1,

      justifyContent:
        'flex-end',

      backgroundColor:
        'rgba(0,0,0,0.42)',
    },


    modalCard: {
      maxHeight:
        '72%',

      borderTopLeftRadius:
        22,

      borderTopRightRadius:
        22,

      borderWidth:
        1,

      paddingHorizontal:
        16,

      paddingTop:
        15,

      paddingBottom:
        24,
    },


    modalHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        14,
    },


    modalTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        15,

      lineHeight:
        21,
    },


    modalSubtitle: {
      marginTop:
        1,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        9.5,
    },


    modalClose: {
      width:
        34,

      height:
        34,

      borderRadius:
        17,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    modalCloseText: {
      fontFamily:
        'Poppins-Regular',

      fontSize:
        24,

      lineHeight:
        27,
    },


    roundGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        8,

      paddingBottom:
        12,
    },


    roundGridItem: {
      width:
        '31.5%',

      minHeight:
        42,

      borderWidth:
        1,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        6,

      paddingVertical:
        7,
    },


    roundGridText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9.5,

      textAlign:
        'center',
    },


    /* =====================================================
       FOOTER
    ===================================================== */

    footerFixed: {
      position:
        'absolute',

      left:
        0,

      right:
        0,

      bottom:
        0,
    },


    footerAd: {
      position:
        'absolute',

      left:
        0,

      right:
        0,

      zIndex:
        20,

      elevation:
        20,
    },


    footerTabs: {
      position:
        'absolute',

      left:
        0,

      right:
        0,

      bottom:
        0,

      zIndex:
        10,

      elevation:
        10,
    },

  });