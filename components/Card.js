// components/Card.js
// Liga Nacional GT
//
// Card de partidos.
// La variante homeCompact corresponde al diseño principal del Home.

import React, {
  memo,
  useEffect,
  useState,
} from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Image,
} from 'react-native';

import {
  useTheme,
} from '../utils/ThemeContext';

import {
  BRAND,
} from '../utils/theme';


/* =========================================================
   CONFIG
========================================================= */

const LOGO_SIZE = 30;
const FEATURED_LOGO = 52;
const HOME_LOGO = 36;


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
      value !== undefined &&
      value !== null &&
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
    const value of values
  ) {
    if (
      value === undefined ||
      value === null ||
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


function statusCode(
  match,
) {
  const status =
    match?.status;

  if (
    status &&
    typeof status ===
      'object'
  ) {
    return String(
      status?.code ||
      status?.slug ||
      status?.key ||
      status?.value ||
      status?.name ||
      '',
    )
      .trim()
      .toLowerCase();
  }

  return String(
    status ||
    match?.status_code ||
    match?.statusCode ||
    '',
  )
    .trim()
    .toLowerCase();
}


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
    'live',
  ]);


const FINISHED_STATUSES =
  new Set([
    'finished',
    'final',
    'ft',
    'fulltime',
    'full_time',
    'ended',
  ]);


function isLiveStatus(
  match,
) {
  return LIVE_STATUSES.has(
    statusCode(match),
  );
}


function isFinishedStatus(
  match,
) {
  return FINISHED_STATUSES.has(
    statusCode(match),
  );
}


/* =========================================================
   TEAM
========================================================= */

function initialsFromName(
  name,
) {
  return String(
    name || '',
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


function TeamLogo({
  uri,
  name,
  style,
  textColor,
  borderColor,
}) {
  const [
    failed,
    setFailed,
  ] =
    useState(false);


  useEffect(
    () => {
      setFailed(false);
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
        style={style}
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
        style,
        styles.logoFallback,
        {
          borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.logoFallbackText,
          {
            color:
              textColor,
          },
        ]}
      >
        {initialsFromName(
          name,
        ) || '?'}
      </Text>
    </View>
  );
}


/* =========================================================
   TIME
========================================================= */

function kickoffParts(
  match,
) {
  const kickoff =
    String(
      match?.kickoff ||
      '',
    );


  let timeStr =
    '';

  let dateStr =
    '';


  const iso =
    kickoff.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
    );


  if (iso) {
    const [
      ,
      year,
      month,
      day,
      hour,
      minute,
    ] =
      iso;


    dateStr =
      `${day}/${month}/${year}`;

    timeStr =
      `${hour}:${minute}`;
  }


  if (
    !dateStr &&
    match?.date
  ) {
    const dateMatch =
      String(
        match.date,
      ).match(
        /^(\d{4})-(\d{2})-(\d{2})/,
      );


    if (dateMatch) {
      const [
        ,
        year,
        month,
        day,
      ] =
        dateMatch;


      dateStr =
        `${day}/${month}/${year}`;
    }
  }


  if (
    !timeStr
  ) {
    const rawTime =
      String(
        match?.time ||
        match?.hour ||
        '',
      );


    const found =
      rawTime.match(
        /(\d{1,2}):(\d{2})/,
      );


    if (found) {
      timeStr =
        `${String(
          found[1],
        ).padStart(
          2,
          '0',
        )}:${found[2]}`;
    }
  }


  return {
    date:
      dateStr,

    time:
      timeStr ||
      '--:--',
  };
}


/* =========================================================
   ROUND
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
    const value =
      firstValue(
        round?.name,
        round?.label,
        round?.title,
        round?.number,
        round?.round,
        round?.value,
      );


    if (
      value !== null
    ) {
      const text =
        String(
          value,
        ).trim();


      if (
        /^jornada/i.test(
          text,
        )
      ) {
        return text;
      }


      if (
        /^\d+$/.test(
          text,
        )
      ) {
        return (
          `Jornada ${text}`
        );
      }


      return text;
    }
  }


  const value =
    firstValue(
      round,
      match?.round_name,
      match?.jornada,
      match?.matchday,
    );


  if (
    value === null
  ) {
    return '';
  }


  const text =
    String(
      value,
    ).trim();


  if (
    /^jornada/i.test(
      text,
    )
  ) {
    return text;
  }


  if (
    /^\d+$/.test(
      text,
    )
  ) {
    return (
      `Jornada ${text}`
    );
  }


  return text;
}


/* =========================================================
   SCORE
========================================================= */

function getScore(
  match,
) {
  const home =
    match?.home &&
    typeof match.home ===
      'object'
      ? match.home
      : {};


  const away =
    match?.away &&
    typeof match.away ===
      'object'
      ? match.away
      : {};


  const score =
    match?.score &&
    typeof match.score ===
      'object'
      ? match.score
      : {};


  return {
    home:
      numberValue(
        home?.score,
        home?.goals,

        score?.home,
        score?.home_score,
        score?.homeScore,

        match?.home_score,
        match?.homeScore,
      ),

    away:
      numberValue(
        away?.score,
        away?.goals,

        score?.away,
        score?.away_score,
        score?.awayScore,

        match?.away_score,
        match?.awayScore,
      ),
  };
}


/* =========================================================
   CENTER
========================================================= */

function MatchCenter({
  match,
  colors,
  home = false,
}) {
  const {
    time,
  } =
    kickoffParts(
      match,
    );


  const score =
    getScore(
      match,
    );


  const live =
    isLiveStatus(
      match,
    );


  const finished =
    isFinishedStatus(
      match,
    );


  if (
    live ||
    finished
  ) {
    return (
      <View
        style={
          home
            ? styles.homeCenter
            : styles.center
        }
      >
        <Text
          style={[
            home
              ? styles.homeCompetition
              : styles.centerMeta,
            {
              color:
                live
                  ? BRAND.red
                  : BRAND.primary,
            },
          ]}
        >
          {live
            ? 'EN VIVO'
            : 'FINAL'}
        </Text>


        <Text
          style={[
            home
              ? styles.homeTime
              : styles.centerScore,
            {
              color:
                colors.text,
            },
          ]}
        >
          {score.home ?? 0}
          {' - '}
          {score.away ?? 0}
        </Text>


        {!!getRoundLabel(
          match,
        ) && (
          <Text
            numberOfLines={1}
            style={[
              home
                ? styles.homeRound
                : styles.centerMeta,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            {getRoundLabel(
              match,
            )}
          </Text>
        )}
      </View>
    );
  }


  return (
    <View
      style={
        home
          ? styles.homeCenter
          : styles.center
      }
    >
      {home && (
        <Text
          numberOfLines={1}
          style={
            styles.homeCompetition
          }
        >
          LIGA NACIONAL GT
        </Text>
      )}


      <Text
        style={[
          home
            ? styles.homeTime
            : styles.centerTime,
          {
            color:
              colors.text,
          },
        ]}
      >
        {time}
      </Text>


      {!!getRoundLabel(
        match,
      ) && (
        <Text
          numberOfLines={1}
          style={[
            home
              ? styles.homeRound
              : styles.centerMeta,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {getRoundLabel(
            match,
          )}
        </Text>
      )}
    </View>
  );
}


/* =========================================================
   HOME CARD
========================================================= */

function HomeCompactMatch({
  match,
  onPress,
  colors,
  isDark,
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        onPress
          ? 0.88
          : 1
      }
      onPress={
        onPress
      }
      style={[
        styles.homeCard,
        {
          backgroundColor:
            colors.cardBg,

          borderColor:
            isDark
              ? 'rgba(255,255,255,0.10)'
              : '#E4EAF3',

          shadowColor:
            isDark
              ? '#000000'
              : '#14264D',
        },
      ]}
    >

      {/* HOME */}

      <View
        style={
          styles.homeTeam
        }
      >
        <TeamLogo
          uri={
            match?.home?.logo
          }
          name={
            match?.home?.name
          }
          style={
            styles.homeLogo
          }
          textColor={
            colors.text
          }
          borderColor={
            colors.cardBorder
          }
        />


        <Text
          numberOfLines={1}
          style={[
            styles.homeTeamName,
            {
              color:
                colors.text,
            },
          ]}
        >
          {match?.home?.name ||
            'Local'}
        </Text>
      </View>


      {/* CENTER */}

      <MatchCenter
        match={
          match
        }
        colors={
          colors
        }
        home
      />


      {/* AWAY */}

      <View
        style={
          styles.homeTeam
        }
      >
        <TeamLogo
          uri={
            match?.away?.logo
          }
          name={
            match?.away?.name
          }
          style={
            styles.homeLogo
          }
          textColor={
            colors.text
          }
          borderColor={
            colors.cardBorder
          }
        />


        <Text
          numberOfLines={1}
          style={[
            styles.homeTeamName,
            {
              color:
                colors.text,
            },
          ]}
        >
          {match?.away?.name ||
            'Visitante'}
        </Text>
      </View>


      {/* ARROW */}

      <View
        style={[
          styles.homeArrowCircle,
          {
            backgroundColor:
              isDark
                ? 'rgba(49,93,228,0.16)'
                : '#F0F5FF',
          },
        ]}
      >
        <Text
          style={
            styles.homeArrow
          }
        >
          ›
        </Text>
      </View>

    </TouchableOpacity>
  );
}


/* =========================================================
   FEATURED LEGACY
========================================================= */

function FeaturedMatch({
  match,
  onPress,
  colors,
  isDark,
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        onPress
          ? 0.88
          : 1
      }
      onPress={
        onPress
      }
      style={[
        styles.featureCard,
        {
          backgroundColor:
            colors.cardBg,

          borderColor:
            colors.cardBorder,

          shadowColor:
            isDark
              ? '#000000'
              : '#0F172A',
        },
      ]}
    >
      <Text
        style={[
          styles.featureLabel,
          {
            color:
              colors.textMuted,
          },
        ]}
      >
        PARTIDO DESTACADO
      </Text>


      <View
        style={
          styles.featureTeams
        }
      >

        <View
          style={
            styles.featureTeam
          }
        >
          <TeamLogo
            uri={
              match?.home?.logo
            }
            name={
              match?.home?.name
            }
            style={
              styles.featureLogo
            }
            textColor={
              colors.text
            }
            borderColor={
              colors.cardBorder
            }
          />

          <Text
            numberOfLines={1}
            style={[
              styles.featureTeamName,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {match?.home?.name}
          </Text>
        </View>


        <MatchCenter
          match={
            match
          }
          colors={
            colors
          }
        />


        <View
          style={
            styles.featureTeam
          }
        >
          <TeamLogo
            uri={
              match?.away?.logo
            }
            name={
              match?.away?.name
            }
            style={
              styles.featureLogo
            }
            textColor={
              colors.text
            }
            borderColor={
              colors.cardBorder
            }
          />

          <Text
            numberOfLines={1}
            style={[
              styles.featureTeamName,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {match?.away?.name}
          </Text>
        </View>

      </View>
    </TouchableOpacity>
  );
}


/* =========================================================
   DEFAULT CARD
========================================================= */

function DefaultMatch({
  match,
  onPress,
  colors,
}) {
  return (
    <TouchableOpacity
      activeOpacity={
        onPress
          ? 0.85
          : 1
      }
      onPress={
        onPress
      }
      style={[
        styles.card,
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
          styles.defaultRow
        }
      >

        <View
          style={
            styles.defaultTeam
          }
        >
          <TeamLogo
            uri={
              match?.home?.logo
            }
            name={
              match?.home?.name
            }
            style={
              styles.defaultLogo
            }
            textColor={
              colors.text
            }
            borderColor={
              colors.cardBorder
            }
          />

          <Text
            numberOfLines={1}
            style={[
              styles.defaultName,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {match?.home?.name}
          </Text>
        </View>


        <MatchCenter
          match={
            match
          }
          colors={
            colors
          }
        />


        <View
          style={
            styles.defaultTeam
          }
        >
          <TeamLogo
            uri={
              match?.away?.logo
            }
            name={
              match?.away?.name
            }
            style={
              styles.defaultLogo
            }
            textColor={
              colors.text
            }
            borderColor={
              colors.cardBorder
            }
          />

          <Text
            numberOfLines={1}
            style={[
              styles.defaultName,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {match?.away?.name}
          </Text>
        </View>

      </View>
    </TouchableOpacity>
  );
}


/* =========================================================
   COMPONENT
========================================================= */

const Card =
  memo(
    function Card({
      match = {},
      onPress,
      variant = 'default',
      livePulse,
      style,
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


      if (
        variant ===
        'homeCompact'
      ) {
        return (
          <View
            style={
              style
            }
          >
            <HomeCompactMatch
              match={
                match
              }
              onPress={
                onPress
              }
              colors={
                colors
              }
              isDark={
                isDark
              }
              livePulse={
                livePulse
              }
            />
          </View>
        );
      }


      if (
        variant ===
        'featured'
      ) {
        return (
          <View
            style={
              style
            }
          >
            <FeaturedMatch
              match={
                match
              }
              onPress={
                onPress
              }
              colors={
                colors
              }
              isDark={
                isDark
              }
              livePulse={
                livePulse
              }
            />
          </View>
        );
      }


      return (
        <View
          style={
            style
          }
        >
          <DefaultMatch
            match={
              match
            }
            onPress={
              onPress
            }
            colors={
              colors
            }
          />
        </View>
      );
    },
  );


export default Card;


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    logoFallback: {
      borderWidth:
        1,

      borderRadius:
        999,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    logoFallbackText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8,
    },


    /* =====================================================
       HOME
    ===================================================== */

    homeCard: {
      marginHorizontal:
        12,

      marginBottom:
        8,

      height:
        80,

      borderRadius:
        18,

      borderWidth:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingLeft:
        10,

      paddingRight:
        8,

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.055,

      shadowRadius:
        8,

      elevation:
        2,
    },


    homeTeam: {
      flex:
        1,

      minWidth:
        0,

      height:
        66,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    homeLogo: {
      width:
        HOME_LOGO,

      height:
        HOME_LOGO,
    },


    homeTeamName: {
      width:
        '100%',

      marginTop:
        3,

      paddingHorizontal:
        2,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9.5,

      lineHeight:
        13,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },


    homeCenter: {
      width:
        105,

      height:
        65,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    homeCompetition: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Medium',

      fontSize:
        8,

      lineHeight:
        11,

      includeFontPadding:
        false,
    },


    homeTime: {
      marginTop:
        1,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        19,

      lineHeight:
        23,

      includeFontPadding:
        false,
    },


    homeRound: {
      marginTop:
        1,

      maxWidth:
        95,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        8.5,

      lineHeight:
        11,

      includeFontPadding:
        false,
    },


    homeArrowCircle: {
      width:
        31,

      height:
        31,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft:
        3,
    },


    homeArrow: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        21,

      lineHeight:
        22,

      marginTop:
        -2,
    },


    /* =====================================================
       FEATURED LEGACY
    ===================================================== */

    featureCard: {
      marginHorizontal:
        12,

      borderRadius:
        20,

      borderWidth:
        1,

      padding:
        14,

      marginBottom:
        10,

      shadowOffset: {
        width:
          0,

        height:
          4,
      },

      shadowOpacity:
        0.08,

      shadowRadius:
        10,

      elevation:
        3,
    },


    featureLabel: {
      textAlign:
        'center',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9,

      marginBottom:
        12,
    },


    featureTeams: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    featureTeam: {
      flex:
        1,

      alignItems:
        'center',

      minWidth:
        0,
    },


    featureLogo: {
      width:
        FEATURED_LOGO,

      height:
        FEATURED_LOGO,
    },


    featureTeamName: {
      marginTop:
        8,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        11,

      textAlign:
        'center',

      width:
        '100%',
    },


    /* =====================================================
       CENTER
    ===================================================== */

    center: {
      width:
        90,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    centerTime: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        17,
    },


    centerScore: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        17,
    },


    centerMeta: {
      marginTop:
        2,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        8,

      textAlign:
        'center',
    },


    /* =====================================================
       DEFAULT
    ===================================================== */

    card: {
      marginHorizontal:
        12,

      borderRadius:
        14,

      borderWidth:
        1,

      minHeight:
        70,

      paddingHorizontal:
        10,

      paddingVertical:
        10,

      marginBottom:
        8,
    },


    defaultRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    defaultTeam: {
      flex:
        1,

      alignItems:
        'center',

      minWidth:
        0,
    },


    defaultLogo: {
      width:
        LOGO_SIZE,

      height:
        LOGO_SIZE,
    },


    defaultName: {
      width:
        '100%',

      marginTop:
        5,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        9,

      textAlign:
        'center',
    },

  });