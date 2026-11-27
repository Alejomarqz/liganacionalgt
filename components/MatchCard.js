// components/MatchCard.js
// Liga Nacional GT
// Cabecera del partido alimentada exclusivamente por match-center.php

import React, {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { useTheme } from '../utils/ThemeContext';
import { BRAND } from '../utils/theme';


const LOGO_SIZE = 46;


/* =========================================================
   ESTADOS
========================================================= */

const LIVE_STATUSES = new Set([
  'first_half',
  'second_half',
  'extra_first',
  'extra_second',
  'penalties',
]);

const BREAK_STATUSES = new Set([
  'halftime',
  'end_90',
  'extra_break',
  'end_extra',
]);

const NO_SCORE_STATUSES = new Set([
  'scheduled',
  'postponed',
  'cancelled',
]);


function getStatus(match) {
  return String(
    match?.status || '',
  )
    .trim()
    .toLowerCase();
}


function isLive(match) {
  const status =
    getStatus(match);

  /*
   * Un descanso nunca debe pintarse como "en juego"
   * aunque isLive llegara true.
   */
  if (
    BREAK_STATUSES.has(status) ||
    status === 'halftime'
  ) {
    return false;
  }

  return (
    match?.isLive === true ||
    LIVE_STATUSES.has(status)
  );
}


function isBreak(match) {
  return BREAK_STATUSES.has(
    getStatus(match),
  );
}


function statusText(match) {
  const status =
    getStatus(match);

  switch (status) {
    case 'scheduled':
      return 'Programado';

    case 'first_half':
      return 'Primer tiempo';

    case 'halftime':
      return 'Medio tiempo';

    case 'second_half':
      return 'Segundo tiempo';

    case 'end_90':
      return 'Fin de los 90′';

    case 'extra_first':
      return 'Primer tiempo extra';

    case 'extra_break':
      return 'Descanso TE';

    case 'extra_second':
      return 'Segundo tiempo extra';

    case 'end_extra':
      return 'Fin del tiempo extra';

    case 'penalties':
      return 'Penales';

    case 'finished':
      return 'Final';

    case 'suspended':
      return 'Suspendido';

    case 'postponed':
      return 'Postergado';

    case 'cancelled':
      return 'Cancelado';

    default:
      return (
        match?.statusLabel ||
        match?.statusCompact ||
        '—'
      );
  }
}


/* =========================================================
   NOMBRES
========================================================= */

function fixTeamName(value = '') {
  const raw =
    String(value || '').trim();

  const plain =
    raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z]/g, '')
      .toLowerCase();

  if (
    plain === 'suchitepquez' ||
    plain === 'suchitepequez' ||
    (
      plain.startsWith('suchitep') &&
      plain.endsWith('quez')
    )
  ) {
    return 'Suchitepéquez';
  }

  return raw;
}


/* =========================================================
   FECHA / HORA
========================================================= */

function kickoffInfo(match = {}) {
  const kickoff =
    String(
      match?.kickoff || '',
    );

  const result =
    kickoff.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
    );

  if (!result) {
    return {
      date:
        match?.date || '',

      time:
        '',
    };
  }

  return {
    date:
      `${result[3]}/${result[2]}/${result[1]}`,

    time:
      `${result[4]}:${result[5]}`,
  };
}


/* =========================================================
   ESCUDOS
========================================================= */

function initials(name = '') {
  return String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      part =>
        part
          .charAt(0)
          .toUpperCase(),
    )
    .join('');
}


function TeamLogo({
  uri,
  name,
  short,
  colors,
}) {
  const [
    failed,
    setFailed,
  ] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

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
          setFailed(true)
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
              colors.text,
          },
        ]}
      >
        {short ||
          initials(name) ||
          '?'}
      </Text>
    </View>
  );
}


/* =========================================================
   RELOJ
========================================================= */

function currentSeconds(clock) {
  const base =
    Number(
      clock?.currentSeconds ??
      clock?.baseSeconds ??
      0,
    ) || 0;

  if (
    !clock?.running ||
    !clock?.serverNow
  ) {
    return base;
  }

  const serverNow =
    Date.parse(
      clock.serverNow,
    );

  if (
    !Number.isFinite(
      serverNow,
    )
  ) {
    return base;
  }

  const elapsed =
    Math.max(
      0,
      Math.floor(
        (
          Date.now() -
          serverNow
        ) / 1000,
      ),
    );

  return base + elapsed;
}


function minuteFromSeconds(
  status,
  seconds,
) {
  const safe =
    Math.max(
      0,
      Number(seconds) || 0,
    );

  let regulation = null;

  switch (status) {
    case 'first_half':
    case 'halftime':
      regulation =
        45 * 60;
      break;

    case 'second_half':
    case 'end_90':
      regulation =
        90 * 60;
      break;

    case 'extra_first':
    case 'extra_break':
      regulation =
        105 * 60;
      break;

    case 'extra_second':
    case 'end_extra':
      regulation =
        120 * 60;
      break;

    default:
      regulation =
        null;
  }

  if (
    regulation !== null &&
    safe > regulation
  ) {
    return {
      minute:
        Math.floor(
          regulation / 60,
        ),

      stoppage:
        Math.floor(
          (
            safe -
            regulation
          ) / 60,
        ),
    };
  }

  return {
    minute:
      Math.floor(
        safe / 60,
      ),

    stoppage: 0,
  };
}


function buildClockLabel(
  match,
  clock,
) {
  const status =
    getStatus(match);

  if (
    status === 'penalties'
  ) {
    return 'PEN';
  }

  const {
    minute,
    stoppage,
  } =
    minuteFromSeconds(
      status,
      currentSeconds(clock),
    );

  if (
    stoppage > 0
  ) {
    return `${minute}+${stoppage}′`;
  }

  if (
    minute > 0
  ) {
    return `${minute}′`;
  }

  switch (status) {
    case 'first_half':
      return '1′';

    case 'second_half':
      return '46′';

    case 'extra_first':
      return '91′';

    case 'extra_second':
      return '106′';

    default:
      return '•';
  }
}


function useClockLabel(
  match,
  clock,
) {
  const [
    label,
    setLabel,
  ] = useState(
    () =>
      buildClockLabel(
        match,
        clock,
      ),
  );

  useEffect(() => {
    const update = () => {
      setLabel(
        buildClockLabel(
          match,
          clock,
        ),
      );
    };

    update();

    if (
      !isLive(match) ||
      !clock?.running
    ) {
      return undefined;
    }

    const timer =
      setInterval(
        update,
        1000,
      );

    return () =>
      clearInterval(timer);

  }, [
    match?.status,
    match?.revision,
    match?.isLive,
    clock?.running,
    clock?.currentSeconds,
    clock?.baseSeconds,
    clock?.serverNow,
  ]);

  return label;
}


/* =========================================================
   GOLEADORES
========================================================= */

const GOAL_TYPES = new Set([
  'goal',
  'penalty_goal',
  'own_goal',
]);


function eventMinute(event = {}) {
  const minute =
    Number(
      event?.minute,
    );

  const stoppage =
    Number(
      event?.stoppage || 0,
    );

  if (
    !Number.isFinite(minute)
  ) {
    return '';
  }

  return stoppage > 0
    ? `${minute}+${stoppage}′`
    : `${minute}′`;
}


function buildScorers(
  events,
  homeId,
  awayId,
) {
  const home = [];
  const away = [];

  (
    Array.isArray(events)
      ? events
      : []
  ).forEach(event => {
    const type =
      String(
        event?.event_type || '',
      );

    if (
      !GOAL_TYPES.has(type)
    ) {
      return;
    }

    const suffix =
      type === 'penalty_goal'
        ? ' (P)'
        : type === 'own_goal'
          ? ' (AG)'
          : '';

    const name =
      String(
        event?.player_name ||
        'Gol',
      );

    const minute =
      eventMinute(event);

    const label =
      `${name}${minute ? ` ${minute}` : ''}${suffix}`;

    const teamId =
      Number(
        event?.team_id || 0,
      );

    if (
      teamId ===
      Number(homeId)
    ) {
      home.push(label);

    } else if (
      teamId ===
      Number(awayId)
    ) {
      away.push(label);
    }
  });

  return {
    home,
    away,
  };
}


/* =========================================================
   EQUIPO
========================================================= */

function TeamSide({
  team,
  colors,
  scale,
  nameOpacity,
  onPress,
}) {
  const name =
    fixTeamName(
      team?.name ||
      '',
    );

  return (
    <TouchableOpacity
      activeOpacity={0.72}
      onPress={onPress}
      style={
        styles.teamSide
      }
    >
      <Animated.View
        style={{
          transform: [
            {
              scale,
            },
          ],
        }}
      >
        <TeamLogo
          uri={
            team?.logo
          }
          name={
            name
          }
          short={
            team?.short
          }
          colors={
            colors
          }
        />
      </Animated.View>

      <Animated.Text
        numberOfLines={2}
        style={[
          styles.teamName,
          {
            color:
              colors.text,

            opacity:
              nameOpacity,
          },
        ]}
      >
        {name ||
          'Equipo'}
      </Animated.Text>
    </TouchableOpacity>
  );
}


/* =========================================================
   CENTRO DEL MARCADOR
========================================================= */

function ScoreCenter({
  match,
  score,
  clockLabel,
  colors,
  isDark,
  pulse,
}) {
  const status =
    getStatus(match);

  const live =
    isLive(match);

  const halftime =
    status === 'halftime';

  const finished =
    status === 'finished';

  const upcoming =
    status === 'scheduled';

  const {
    time,
  } =
    kickoffInfo(match);

  const penalties =
    score?.penalties || {};

  const hasPenalties =
    Number(
      penalties?.home || 0,
    ) > 0 ||
    Number(
      penalties?.away || 0,
    ) > 0;


  if (
    upcoming
  ) {
    return (
      <View
        style={
          styles.centerScore
        }
      >
        <Text
          style={[
            styles.kickoffTime,
            {
              color:
                colors.text,
            },
          ]}
        >
          {time || '--:--'}
        </Text>

        <Text
          style={[
            styles.smallStatus,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          Programado
        </Text>
      </View>
    );
  }


  return (
    <View
      style={
        styles.centerScore
      }
    >
      <View
        style={
          styles.scoreLine
        }
      >
        <Text
          style={[
            styles.bigScore,
            {
              color:
                colors.text,
            },
          ]}
        >
          {Number(
            score?.home ?? 0,
          )}
        </Text>

        <Text
          style={[
            styles.scoreDash,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          –
        </Text>

        <Text
          style={[
            styles.bigScore,
            {
              color:
                colors.text,
            },
          ]}
        >
          {Number(
            score?.away ?? 0,
          )}
        </Text>
      </View>


      {live ? (
        <View
          style={
            styles.liveMinuteRow
          }
        >
          <Animated.View
            style={[
              styles.liveMinuteDot,
              {
                transform: [
                  {
                    scale:
                      pulse,
                  },
                ],
              },
            ]}
          />

          <Text
            style={
              styles.liveMinuteText
            }
          >
            {clockLabel}
          </Text>
        </View>

      ) : halftime ? (
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                isDark
                  ? 'rgba(245,158,11,.13)'
                  : '#FFF7E6',
            },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              {
                color:
                  '#D97706',
              },
            ]}
          >
            Medio tiempo
          </Text>
        </View>

      ) : finished ? (
        <>
          <Text
            style={[
              styles.finalText,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            Final
          </Text>

          {hasPenalties && (
            <Text
              style={[
                styles.penaltyText,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              Pen. {Number(
                penalties?.home || 0,
              )}
              -
              {Number(
                penalties?.away || 0,
              )}
            </Text>
          )}
        </>

      ) : (
        <Text
          style={[
            styles.smallStatus,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {statusText(match)}
        </Text>
      )}
    </View>
  );
}


/* =========================================================
   MATCH CARD
========================================================= */

function MatchCard({
  data = null,

  topBarHeight,
  topBarOpacity,
  logoScale,
  namesOpacity,
  livePulse,

  onPressHomeTeam,
  onPressAwayTeam,
}) {
  const {
    theme,
  } = useTheme();

  const colors =
    theme.colors;

  const isDark =
    theme.mode === 'dark';


  const match =
    data?.match || {};

  const home =
    data?.teams?.home || {};

  const away =
    data?.teams?.away || {};

  const score =
    data?.score || {};

  const clock =
    data?.clock || {};

  const events =
    Array.isArray(
      data?.events,
    )
      ? data.events
      : [];


  const status =
    getStatus(match);

  const live =
    isLive(match);

  const upcoming =
    status === 'scheduled';


  const {
    date,
    time,
  } =
    kickoffInfo(match);


  const scorers =
    useMemo(
      () =>
        buildScorers(
          events,
          home?.id,
          away?.id,
        ),
      [
        events,
        home?.id,
        away?.id,
      ],
    );


  const hasScorers =
    scorers.home.length > 0 ||
    scorers.away.length > 0;


  const clockLabel =
    useClockLabel(
      match,
      clock,
    );


  /* Animaciones recibidas de Match.js */

  const internalTopHeight =
    useRef(
      new Animated.Value(32),
    ).current;

  const internalTopOpacity =
    useRef(
      new Animated.Value(1),
    ).current;

  const internalLogoScale =
    useRef(
      new Animated.Value(1),
    ).current;

  const internalNamesOpacity =
    useRef(
      new Animated.Value(1),
    ).current;

  const internalPulse =
    useRef(
      new Animated.Value(1),
    ).current;


  const _topH =
    topBarHeight ||
    internalTopHeight;

  const _topOp =
    topBarOpacity ||
    internalTopOpacity;

  const _scale =
    logoScale ||
    internalLogoScale;

  const _nameOp =
    namesOpacity ||
    internalNamesOpacity;

  const _pulse =
    livePulse ||
    internalPulse;


  return (
    <View
      style={[
        styles.root,
        {
          backgroundColor:
            colors.cardBg,

          borderBottomColor:
            colors.cardBorder,
        },
      ]}
    >
      {/* ─────────────────────────────────────────────
          META
      ───────────────────────────────────────────── */}

      <Animated.View
        style={[
          styles.metaTop,
          {
            height:
              _topH,

            opacity:
              _topOp,
          },
        ]}
      >
        <View
          style={
            styles.metaSide
          }
        >
          {live && (
            <Animated.View
              style={[
                styles.liveBadge,
                {
                  transform: [
                    {
                      scale:
                        _pulse,
                    },
                  ],
                },
              ]}
            >
              <View
                style={
                  styles.liveBadgeDot
                }
              />

              <Text
                style={
                  styles.liveBadgeText
                }
              >
                EN VIVO
              </Text>
            </Animated.View>
          )}
        </View>


        <View
          style={
            styles.metaCenter
          }
        >
          <Text
            numberOfLines={1}
            style={[
              styles.metaText,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            {date && time
              ? `${date} · ${time}`
              : date ||
                time ||
                statusText(match)}
          </Text>
        </View>


        <View
          style={
            styles.metaSide
          }
        />
      </Animated.View>


      {/* ─────────────────────────────────────────────
          MARCADOR PRINCIPAL
      ───────────────────────────────────────────── */}

      <View
        style={
          styles.scoreboard
        }
      >
        <TeamSide
          team={home}
          colors={colors}
          scale={_scale}
          nameOpacity={_nameOp}
          onPress={
            onPressHomeTeam
          }
        />

        <ScoreCenter
          match={match}
          score={score}
          clockLabel={
            clockLabel
          }
          colors={colors}
          isDark={isDark}
          pulse={_pulse}
        />

        <TeamSide
          team={away}
          colors={colors}
          scale={_scale}
          nameOpacity={_nameOp}
          onPress={
            onPressAwayTeam
          }
        />
      </View>


      {/* ─────────────────────────────────────────────
          GOLEADORES
      ───────────────────────────────────────────── */}

      {!upcoming &&
        hasScorers && (
        <View
          style={[
            styles.scorersBox,
            {
              borderTopColor:
                colors.cardBorder,

              backgroundColor:
                isDark
                  ? 'rgba(255,255,255,.025)'
                  : '#FAFBFC',
            },
          ]}
        >
          <View
            style={
              styles.scorerHome
            }
          >
            {scorers.home.map(
              (
                label,
                index,
              ) => (
                <Text
                  key={`home-${index}`}
                  numberOfLines={1}
                  style={[
                    styles.scorerText,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  {label}
                </Text>
              ),
            )}
          </View>

          <View
            style={
              styles.scorerDivider
            }
          />

          <View
            style={
              styles.scorerAway
            }
          >
            {scorers.away.map(
              (
                label,
                index,
              ) => (
                <Text
                  key={`away-${index}`}
                  numberOfLines={1}
                  style={[
                    styles.scorerText,
                    styles.scorerAwayText,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  {label}
                </Text>
              ),
            )}
          </View>
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

    root: {
      paddingTop: 5,
      paddingBottom: 10,

      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },


    /* Meta */

    metaTop: {
      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 12,

      overflow: 'hidden',
    },


    metaSide: {
      width: 80,
    },


    metaCenter: {
      flex: 1,
      alignItems: 'center',
    },


    metaText: {
      fontFamily: 'Poppins-Medium',
      fontSize: 9,
    },


    liveBadge: {
      alignSelf: 'flex-start',

      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 7,
      paddingVertical: 3,

      borderRadius: 50,

      backgroundColor:
        'rgba(220,38,38,.08)',

      borderWidth: 1,
      borderColor:
        'rgba(220,38,38,.18)',
    },


    liveBadgeDot: {
      width: 5,
      height: 5,

      borderRadius: 3,

      backgroundColor:
        BRAND.red,

      marginRight: 4,
    },


    liveBadgeText: {
      color: BRAND.red,

      fontFamily: 'Poppins-Bold',
      fontSize: 7,

      letterSpacing: 0.7,
    },


    /* Marcador */

    scoreboard: {
      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'space-between',

      paddingHorizontal: 12,
      paddingTop: 5,
      paddingBottom: 7,
    },


    teamSide: {
      flex: 1,

      minWidth: 0,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 3,
    },


    logo: {
      width: LOGO_SIZE,
      height: LOGO_SIZE,
    },


    logoFallback: {
      borderWidth:
        StyleSheet.hairlineWidth,

      borderRadius:
        LOGO_SIZE / 2,

      alignItems: 'center',
      justifyContent: 'center',
    },


    logoFallbackText: {
      fontFamily: 'Poppins-Bold',
      fontSize: 8,
    },


    teamName: {
      width: '100%',

      minHeight: 31,

      marginTop: 6,

      textAlign: 'center',

      fontFamily: 'Poppins-SemiBold',
      fontSize: 10.5,
      lineHeight: 14,
    },


    /* Centro */

    centerScore: {
      width: 104,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 4,
    },


    scoreLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },


    bigScore: {
      minWidth: 28,

      textAlign: 'center',

      fontFamily: 'Poppins-Bold',
      fontSize: 27,

      lineHeight: 34,

      includeFontPadding: false,
    },


    scoreDash: {
      marginHorizontal: 3,

      fontFamily: 'Poppins-Regular',
      fontSize: 17,
    },


    kickoffTime: {
      fontFamily: 'Poppins-Bold',
      fontSize: 21,

      includeFontPadding: false,
    },


    smallStatus: {
      marginTop: 3,

      fontFamily: 'Poppins-Medium',
      fontSize: 8,

      textAlign: 'center',
    },


    finalText: {
      marginTop: 1,

      fontFamily: 'Poppins-SemiBold',
      fontSize: 8.5,

      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },


    penaltyText: {
      marginTop: 2,

      fontFamily: 'Poppins-SemiBold',
      fontSize: 8,
    },


    /* Live */

    liveMinuteRow: {
      flexDirection: 'row',
      alignItems: 'center',

      marginTop: 1,
    },


    liveMinuteDot: {
      width: 6,
      height: 6,

      borderRadius: 3,

      marginRight: 5,

      backgroundColor:
        BRAND.red,
    },


    liveMinuteText: {
      color: BRAND.red,

      fontFamily: 'Poppins-Bold',
      fontSize: 11,
    },


    statusPill: {
      marginTop: 3,

      borderRadius: 50,

      paddingHorizontal: 9,
      paddingVertical: 3,
    },


    statusPillText: {
      fontFamily: 'Poppins-SemiBold',
      fontSize: 8,
    },


    /* Goleadores */

    scorersBox: {
      flexDirection: 'row',

      marginHorizontal: 12,

      paddingTop: 7,
      paddingBottom: 3,

      borderTopWidth:
        StyleSheet.hairlineWidth,
    },


    scorerHome: {
      flex: 1,
      paddingRight: 9,
    },


    scorerAway: {
      flex: 1,
      paddingLeft: 9,
    },


    scorerDivider: {
      width:
        StyleSheet.hairlineWidth,
    },


    scorerText: {
      fontFamily: 'Poppins-Regular',
      fontSize: 8.5,
      lineHeight: 13,
    },


    scorerAwayText: {
      textAlign: 'right',
    },

  });


export default memo(
  MatchCard,
);