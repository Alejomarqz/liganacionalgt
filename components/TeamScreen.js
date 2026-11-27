// components/TeamScreen.js
// Liga Nacional GT
//
// Perfil completo del equipo desde nuestro Núcleo.
//
// Fuentes:
// team.php?id=ID
// teams.php
// standings.php
// matches.php?team_id=ID

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
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  Platform,
  Animated,
  Image,
  ActivityIndicator,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useFocusEffect,
} from '@react-navigation/native';

import {
  Heart,
} from 'phosphor-react-native';

import Header from './Header';
import AdFooter from '../ads/AdFooter';
import FooterTabs from './FooterTabs';
import TeamMatches from './TeamMatches';
import PositionsBlock from './PositionsBlock';
import TeamSquad from './TeamSquad';
import TeamSearchModal from './TeamSearchModal';

import {
  showInterstitialIfReady,
} from '../ads/AdManager';

import {
  followTeam,
  unfollowTeam,
} from '../services/notifications';

import {
  getFollowState,
  toggleFollowTeam as toggleFollowTeamFS,
  listenFollowersCount,
} from '../services/firestore';

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

const {
  width: SCREEN_W,
} =
  Dimensions.get(
    'window',
  );

const BANNER_H = 60;

const FOOTER_LIFT =
  Platform.OS === 'android'
    ? 48
    : 10;

const TAB_H = 58;

const TABS = [
  'Resumen',
  'Partidos',
  'Clasificación',
  'Plantilla',
  'Estadísticas',
];


/* =========================================================
   API
========================================================= */

async function apiGet(
  endpoint,
  params = {},
) {
  const query =
    Object.entries(params)
      .filter(
        ([, value]) =>
          value !== null &&
          value !== undefined &&
          value !== '',
      )
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(
            String(value),
          )}`,
      )
      .join('&');


  const url =
    `${API_BASE}/${endpoint}` +
    (
      query
        ? `?${query}`
        : ''
    );


  const response =
    await fetch(
      url,
      {
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
      },
    );


  let json = null;


  try {
    json =
      await response.json();
  } catch {}


  if (!response.ok) {
    throw new Error(
      json?.error ||
      json?.message ||
      `HTTP ${response.status}`,
    );
  }


  return json || {};
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


function numberOrNull(
  ...values
) {
  for (
    const value of values
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
    normKey(raw) ===
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


function formatCount(
  value,
) {
  const number =
    Number(
      value || 0,
    );


  if (
    number < 1000
  ) {
    return String(number);
  }


  if (
    number >= 1000000
  ) {
    const result =
      number / 1000000;

    return (
      `${result
        .toFixed(
          result < 10
            ? 1
            : 0,
        )
        .replace(
          '.0',
          '',
        )}M`
    );
  }


  const result =
    number / 1000;


  return (
    `${result
      .toFixed(
        result < 10
          ? 1
          : 0,
      )
      .replace(
        '.0',
        '',
      )}K`
  );
}


/* =========================================================
   EQUIPOS
========================================================= */

function extractTeams(
  payload,
) {
  const source =
    Array.isArray(
      payload?.teams,
    )
      ? payload.teams
      : Array.isArray(
          payload?.data?.teams,
        )
        ? payload.data.teams
        : Array.isArray(
            payload?.data,
          )
          ? payload.data
          : Array.isArray(
              payload,
            )
            ? payload
            : [];


  const map =
    new Map();


  source.forEach(
    raw => {
      const id =
        Number(
          firstValue(
            raw?.id,
            raw?.team_id,
            raw?.teamId,
            0,
          ),
        ) || 0;


      if (!id) {
        return;
      }


      map.set(
        id,
        {
          id,

          name:
            fixTeamName(
              firstValue(
                raw?.name,
                raw?.team_name,
                '',
              ),
            ),

          logo:
            firstValue(
              raw?.logo,
              raw?.logo_url,
              raw?.logoUrl,
              null,
            ),

          short:
            String(
              firstValue(
                raw?.short,
                raw?.short_name,
                '',
              ) || '',
            ),
        },
      );
    },
  );


  return map;
}


/* =========================================================
   PERFIL DEL EQUIPO
========================================================= */

function normalizeTeam(
  payload,
  fallbackId,
  fallbackName,
  directoryTeam,
) {
  let raw =
    payload?.team ||
    payload?.data?.team ||
    payload?.data ||
    payload ||
    {};


  if (
    Array.isArray(raw)
  ) {
    raw =
      raw[0] || {};
  }


  return {
    id:
      Number(
        firstValue(
          raw?.id,
          raw?.team_id,
          fallbackId,
          directoryTeam?.id,
          0,
        ),
      ) || 0,

    name:
      fixTeamName(
        firstValue(
          raw?.name,
          raw?.team_name,
          fallbackName,
          directoryTeam?.name,
          'Equipo',
        ),
      ),

    short:
      String(
        firstValue(
          raw?.short,
          raw?.short_name,
          directoryTeam?.short,
          '',
        ) || '',
      ),

    logo:
      firstValue(
        raw?.logo,
        raw?.logo_url,
        raw?.logoUrl,
        directoryTeam?.logo,
        null,
      ),

    city:
      String(
        firstValue(
          raw?.city,
          raw?.location,
          '',
        ) || '',
      ),

    stadium:
      String(
        firstValue(
          raw?.stadium?.name,
          raw?.stadium_name,
          raw?.stadiumName,
          typeof raw?.stadium ===
            'string'
            ? raw.stadium
            : null,
          '',
        ) || '',
      ),

    raw,
  };
}


/* =========================================================
   TABLA
========================================================= */

function extractStandings(
  payload,
  teamDirectory,
) {
  const source =
    Array.isArray(
      payload?.standings,
    )
      ? payload.standings
      : Array.isArray(
          payload?.data?.standings,
        )
        ? payload.data.standings
        : Array.isArray(
            payload?.data,
          )
          ? payload.data
          : Array.isArray(
              payload,
            )
            ? payload
            : [];


  return source.map(
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


      const id =
        Number(
          firstValue(
            rawTeam?.id,
            row?.team_id,
            row?.teamId,
            0,
          ),
        ) || 0;


      const directory =
        teamDirectory?.get(
          id,
        );


      return {
        position:
          Number(
            firstValue(
              row?.position,
              row?.rank,
              index + 1,
            ),
          ) ||
          index + 1,

        team: {
          id,

          name:
            fixTeamName(
              firstValue(
                rawTeam?.name,
                row?.name,
                row?.team_name,
                directory?.name,
                '',
              ),
            ),

          logo:
            firstValue(
              rawTeam?.logo,
              rawTeam?.logo_url,
              row?.logo,
              row?.logo_url,
              directory?.logo,
              null,
            ),
        },

        played:
          Number(
            firstValue(
              row?.played,
              row?.pj,
              0,
            ),
          ) || 0,

        won:
          Number(
            firstValue(
              row?.won,
              row?.pg,
              0,
            ),
          ) || 0,

        drawn:
          Number(
            firstValue(
              row?.drawn,
              row?.draw,
              row?.pe,
              0,
            ),
          ) || 0,

        lost:
          Number(
            firstValue(
              row?.lost,
              row?.pp,
              0,
            ),
          ) || 0,

        gf:
          Number(
            firstValue(
              row?.gf,
              0,
            ),
          ) || 0,

        ga:
          Number(
            firstValue(
              row?.ga,
              row?.gc,
              0,
            ),
          ) || 0,

        gd:
          Number(
            firstValue(
              row?.gd,
              row?.dg,
              0,
            ),
          ) || 0,

        points:
          Number(
            firstValue(
              row?.points,
              row?.pts,
              0,
            ),
          ) || 0,
      };
    },
  );
}


/* =========================================================
   PARTIDOS
========================================================= */

function extractMatches(
  payload,
) {
  return (
    Array.isArray(
      payload?.matches,
    )
      ? payload.matches
      : Array.isArray(
          payload?.data?.matches,
        )
        ? payload.data.matches
        : Array.isArray(
            payload?.data,
          )
          ? payload.data
          : Array.isArray(
              payload,
            )
            ? payload
            : []
  );
}


function normalizeMiniMatch(
  raw,
) {
  if (
    !raw ||
    typeof raw !==
      'object'
  ) {
    return null;
  }


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
      ) || 0,

    status:
      String(
        firstValue(
          raw?.status,
          raw?.status_code,
          'scheduled',
        ),
      )
        .toLowerCase()
        .trim(),

    home: {
      id:
        Number(
          firstValue(
            homeRaw?.id,
            raw?.home_team_id,
            0,
          ),
        ) || 0,

      name:
        fixTeamName(
          firstValue(
            homeRaw?.name,
            raw?.home_team_name,
            '',
          ),
        ),

      logo:
        firstValue(
          homeRaw?.logo,
          homeRaw?.logo_url,
          null,
        ),
    },

    away: {
      id:
        Number(
          firstValue(
            awayRaw?.id,
            raw?.away_team_id,
            0,
          ),
        ) || 0,

      name:
        fixTeamName(
          firstValue(
            awayRaw?.name,
            raw?.away_team_name,
            '',
          ),
        ),

      logo:
        firstValue(
          awayRaw?.logo,
          awayRaw?.logo_url,
          null,
        ),
    },

    score: {
      home:
        numberOrNull(
          scoreRaw?.home,
          raw?.home_score,
          raw?.homeScore,
        ),

      away:
        numberOrNull(
          scoreRaw?.away,
          raw?.away_score,
          raw?.awayScore,
        ),
    },

    kickoff:
      firstValue(
        raw?.kickoff,
        raw?.scheduled_at,
        null,
      ),

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
  };
}


function matchKey(
  match,
) {
  return (
    `${String(
      match?.date || '',
    )}` +
    `${String(
      match?.kickoff || '',
    )}` +
    `${String(
      match?.id || '',
    ).padStart(
      8,
      '0',
    )}`
  );
}


function lastFiveResults(
  matches,
  teamId,
) {
  const finished =
    matches
      .filter(
        match =>
          match?.status ===
            'finished' &&
          match?.score?.home !==
            null &&
          match?.score?.away !==
            null,
      )
      .sort(
        (
          a,
          b,
        ) =>
          matchKey(b)
            .localeCompare(
              matchKey(a),
            ),
      )
      .slice(
        0,
        5,
      )
      .reverse();


  return finished.map(
    match => {
      const home =
        Number(
          match?.home?.id,
        ) ===
        Number(
          teamId,
        );


      const gf =
        home
          ? match.score.home
          : match.score.away;


      const ga =
        home
          ? match.score.away
          : match.score.home;


      return {
        match,

        result:
          gf > ga
            ? 'G'
            : gf === ga
              ? 'E'
              : 'P',
      };
    },
  );
}


function getNextMatch(
  matches,
) {
  return (
    matches
      .filter(
        match =>
          ![
            'finished',
            'cancelled',
          ].includes(
            match?.status,
          ),
      )
      .sort(
        (
          a,
          b,
        ) =>
          matchKey(a)
            .localeCompare(
              matchKey(b),
            ),
      )[0] ||
    null
  );
}


function kickoffText(
  match,
) {
  const kickoff =
    String(
      match?.kickoff ||
      '',
    );


  const result =
    kickoff.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
    );


  if (
    result
  ) {
    return (
      `${result[3]}/${result[2]} · ` +
      `${result[4]}:${result[5]}`
    );
  }


  return '';
}


/* =========================================================
   LOGO
========================================================= */

function TeamLogo({
  uri,
  name,
  size = 30,
  colors,
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
    [uri],
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
        style={{
          width:
            size,

          height:
            size,
        }}
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
        S.logoFallback,

        {
          width:
            size,

          height:
            size,

          borderRadius:
            Math.max(
              6,
              size * 0.25,
            ),

          backgroundColor:
            colors.screenBg,

          borderColor:
            colors.cardBorder,
        },
      ]}
    >
      <Text
        style={[
          S.logoFallbackText,

          {
            color:
              colors.text,

            fontSize:
              Math.max(
                7,
                size * 0.22,
              ),
          },
        ]}
      >
        {initials(name) ||
          '?'}
      </Text>
    </View>
  );
}


/* =========================================================
   FOLLOW
========================================================= */

function FollowButton({
  following,
  busy,
  onPress,
  isDark,
}) {
  const scale =
    useRef(
      new Animated.Value(
        1,
      ),
    ).current;


  const activeColor =
    isDark
      ? '#FFFFFF'
      : BRAND.primary;


  const handlePress =
    () => {
      Animated.sequence([
        Animated.spring(
          scale,
          {
            toValue:
              0.9,

            useNativeDriver:
              true,

            speed:
              40,

            bounciness:
              0,
          },
        ),

        Animated.spring(
          scale,
          {
            toValue:
              1,

            useNativeDriver:
              true,

            speed:
              20,

            bounciness:
              5,
          },
        ),
      ]).start();


      onPress?.();
    };


  return (
    <Animated.View
      style={{
        transform: [
          {
            scale,
          },
        ],
      }}
    >
      <TouchableOpacity
        activeOpacity={
          0.8
        }
        disabled={
          busy
        }
        onPress={
          handlePress
        }
        style={[
          S.followButton,

          following
            ? {
                backgroundColor:
                  'transparent',

                borderColor:
                  activeColor,
              }
            : {
                backgroundColor:
                  BRAND.primary,

                borderColor:
                  BRAND.primary,
              },
        ]}
      >
        <Heart
          size={13}
          weight={
            following
              ? 'fill'
              : 'regular'
          }
          color={
            following
              ? activeColor
              : '#FFFFFF'
          }
        />

        <Text
          style={[
            S.followButtonText,
            {
              color:
                following
                  ? activeColor
                  : '#FFFFFF',
            },
          ]}
        >
          {busy
            ? '...'
            : following
              ? 'Siguiendo'
              : 'Seguir'}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}


/* =========================================================
   HERO
========================================================= */

function TeamHero({
  team,
  standing,
  followersCount,
  isFollowing,
  followBusy,
  onFollow,
  colors,
  isDark,
}) {
  return (
    <View
      style={[
        S.hero,
        {
          backgroundColor:
            colors.cardBg,

          borderBottomColor:
            colors.cardBorder,
        },
      ]}
    >
      <View
        style={[
          S.logoShell,
          {
            backgroundColor:
              isDark
                ? 'rgba(255,255,255,0.045)'
                : '#F8FAFD',

            borderColor:
              colors.cardBorder,
          },
        ]}
      >
        <TeamLogo
          uri={
            team?.logo
          }
          name={
            team?.name
          }
          size={52}
          colors={
            colors
          }
        />
      </View>


      <View
        style={
          S.heroInfo
        }
      >
        <View
          style={
            S.heroTitleRow
          }
        >
          <View
            style={
              S.heroTitleBox
            }
          >
            <Text
              numberOfLines={1}
              style={[
                S.teamName,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {team?.name ||
                'Equipo'}
            </Text>

            <Text
              style={[
                S.teamLeague,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              Liga Nacional de Guatemala
            </Text>
          </View>


          {!!standing?.position && (
            <View
              style={[
                S.positionBadge,
                {
                  backgroundColor:
                    isDark
                      ? 'rgba(49,93,228,0.14)'
                      : '#EEF3FF',
                },
              ]}
            >
              <Text
                style={
                  S.positionBadgeNumber
                }
              >
                #{standing.position}
              </Text>

              <Text
                style={
                  S.positionBadgeLabel
                }
              >
                posición
              </Text>
            </View>
          )}
        </View>


        <View
          style={
            S.heroBottom
          }
        >
          <View
            style={
              S.followersRow
            }
          >
            <Text
              style={[
                S.followersNumber,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {formatCount(
                followersCount,
              )}
            </Text>

            <Text
              style={[
                S.followersLabel,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              seguidores
            </Text>
          </View>


          <FollowButton
            following={
              isFollowing
            }
            busy={
              followBusy
            }
            onPress={
              onFollow
            }
            isDark={
              isDark
            }
          />
        </View>
      </View>
    </View>
  );
}


/* =========================================================
   TABS
========================================================= */

function Tabs({
  value,
  onChange,
}) {
  const {
    theme,
  } =
    useTheme();


  const colors =
    theme.colors;


  const scrollRef =
    useRef(null);


  const metaRef =
    useRef({});


  const center =
    index => {
      const meta =
        metaRef.current[
          index
        ];


      if (
        !meta ||
        !scrollRef.current
          ?.scrollTo
      ) {
        return;
      }


      scrollRef.current
        .scrollTo({
          x:
            Math.max(
              0,
              meta.x -
              (
                SCREEN_W /
                2 -
                meta.width /
                2
              ),
            ),

          y:
            0,

          animated:
            true,
        });
    };


  return (
    <View
      style={[
        S.tabsWrap,
        {
          backgroundColor:
            colors.cardBg,

          borderBottomColor:
            colors.cardBorder,
        },
      ]}
    >
      <ScrollView
        ref={
          scrollRef
        }
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          S.tabsContent
        }
      >
        {TABS.map(
          (
            tab,
            index,
          ) => {
            const active =
              tab === value;


            return (
              <TouchableOpacity
                key={
                  tab
                }
                activeOpacity={0.75}
                onLayout={
                  event => {
                    metaRef.current[
                      index
                    ] = {
                      x:
                        event
                          .nativeEvent
                          .layout
                          .x,

                      width:
                        event
                          .nativeEvent
                          .layout
                          .width,
                    };
                  }
                }
                onPress={() => {
                  onChange(tab);

                  requestAnimationFrame(
                    () =>
                      center(index),
                  );
                }}
                style={[
                  S.tabButton,

                  active && {
                    borderBottomColor:
                      BRAND.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    S.tabText,
                    {
                      color:
                        active
                          ? BRAND.primary
                          : colors.textMuted,

                      fontFamily:
                        active
                          ? 'Poppins-SemiBold'
                          : 'Poppins-Regular',
                    },
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          },
        )}
      </ScrollView>
    </View>
  );
}


/* =========================================================
   SECTION TITLE
========================================================= */

function SectionTitle({
  title,
  right,
  colors,
}) {
  return (
    <View
      style={
        S.sectionHead
      }
    >
      <Text
        style={[
          S.sectionTitle,
          {
            color:
              colors.text,
          },
        ]}
      >
        {title}
      </Text>

      {!!right && (
        <Text
          style={[
            S.sectionRight,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {right}
        </Text>
      )}
    </View>
  );
}


/* =========================================================
   LAST FIVE
========================================================= */

function LastFiveCard({
  team,
  matches,
  colors,
  isDark,
}) {
  const results =
    lastFiveResults(
      matches,
      team?.id,
    );


  if (
    !results.length
  ) {
    return null;
  }


  const wins =
    results.filter(
      item =>
        item.result ===
        'G',
    ).length;


  const draws =
    results.filter(
      item =>
        item.result ===
        'E',
    ).length;


  const losses =
    results.filter(
      item =>
        item.result ===
        'P',
    ).length;


  const streakWins =
    (() => {
      let count = 0;

      for (
        let i =
          results.length -
          1;
        i >= 0;
        i--
      ) {
        if (
          results[i]
            .result === 'G'
        ) {
          count += 1;
        } else {
          break;
        }
      }

      return count;
    })();


  return (
    <View
      style={[
        S.lastFiveCard,
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
          S.lastFiveHeader
        }
      >
        <Text
          style={[
            S.lastFiveTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Últimos 5 resultados
        </Text>

        <Text
          style={[
            S.lastFiveHint,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          Solo finalizados
        </Text>
      </View>


      <View
        style={
          S.lastFiveMain
        }
      >
        <View
          style={
            S.lastFiveClub
          }
        >
          <TeamLogo
            uri={
              team?.logo
            }
            name={
              team?.name
            }
            size={30}
            colors={
              colors
            }
          />

          <Text
            numberOfLines={1}
            style={[
              S.lastFiveTeam,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {team?.name}
          </Text>
        </View>


        <View
          style={
            S.lastFiveBadges
          }
        >
          {results.map(
            (
              item,
              index,
            ) => {
              const bg =
                item.result ===
                'G'
                  ? '#159A69'
                  : item.result ===
                    'E'
                    ? '#9CA3AF'
                    : '#DE4F68';


              return (
                <View
                  key={
                    `${item.match?.id}-${index}`
                  }
                  style={[
                    S.resultBadge,
                    {
                      backgroundColor:
                        bg,
                    },
                  ]}
                >
                  <Text
                    style={
                      S.resultBadgeText
                    }
                  >
                    {item.result}
                  </Text>
                </View>
              );
            },
          )}
        </View>
      </View>


      <View
        style={[
          S.lastFiveFooter,
          {
            borderTopColor:
              colors.cardBorder,
          },
        ]}
      >
        <Text
          style={[
            S.lastFiveSummary,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {wins} victorias · {draws} empates · {losses} derrotas
        </Text>

        {streakWins > 1 && (
          <Text
            style={
              S.lastFiveStreak
            }
          >
            {streakWins} victorias seguidas
          </Text>
        )}
      </View>
    </View>
  );
}


/* =========================================================
   RESUMEN
========================================================= */

function SummaryTab({
  team,
  standing,
  matches,
  navigation,
  colors,
  isDark,
  onOpenMatches,
}) {
  const nextMatch =
    getNextMatch(
      matches,
    );


  const opponent =
    nextMatch
      ? (
          Number(
            nextMatch?.home?.id,
          ) ===
          Number(
            team?.id,
          )
            ? nextMatch.away
            : nextMatch.home
        )
      : null;


  return (
    <View>
      {!!standing && (
        <>
          <SectionTitle
            title="Temporada"
            right="Apertura 2026"
            colors={
              colors
            }
          />

          <View
            style={
              S.summaryStats
            }
          >
            <View
              style={[
                S.summaryStat,
                {
                  backgroundColor:
                    colors.cardBg,

                  borderColor:
                    colors.cardBorder,
                },
              ]}
            >
              <Text
                style={
                  S.summaryStatMain
                }
              >
                #{standing.position}
              </Text>

              <Text
                style={[
                  S.summaryStatLabel,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                posición
              </Text>
            </View>


            <View
              style={[
                S.summaryStat,
                {
                  backgroundColor:
                    colors.cardBg,

                  borderColor:
                    colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  S.summaryStatMain,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {standing.points}
              </Text>

              <Text
                style={[
                  S.summaryStatLabel,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                puntos
              </Text>
            </View>


            <View
              style={[
                S.summaryStat,
                {
                  backgroundColor:
                    colors.cardBg,

                  borderColor:
                    colors.cardBorder,
                },
              ]}
            >
              <Text
                style={[
                  S.summaryStatMain,
                  {
                    color:
                      standing.gd >=
                      0
                        ? '#159A69'
                        : '#DE4F68',
                  },
                ]}
              >
                {standing.gd > 0
                  ? `+${standing.gd}`
                  : standing.gd}
              </Text>

              <Text
                style={[
                  S.summaryStatLabel,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                diferencia
              </Text>
            </View>
          </View>
        </>
      )}


      {!!nextMatch && (
        <>
          <View
            style={
              S.sectionHead
            }
          >
            <Text
              style={[
                S.sectionTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Próximo partido
            </Text>

            <TouchableOpacity
              onPress={
                onOpenMatches
              }
            >
              <Text
                style={
                  S.sectionLink
                }
              >
                Ver partidos
              </Text>
            </TouchableOpacity>
          </View>


          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (
                nextMatch?.id
              ) {
                navigation?.push?.(
                  'Match',
                  {
                    matchId:
                      Number(
                        nextMatch.id,
                      ),

                    source:
                      'liga-core',

                    channel:
                      'guatemala',
                  },
                );
              }
            }}
            style={[
              S.nextMatchCard,
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
                S.nextMatchText
              }
            >
              <Text
                style={[
                  S.nextKickoff,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                {kickoffText(
                  nextMatch,
                ) ||
                  'Fecha por definir'}
              </Text>

              <Text
                style={[
                  S.nextOpponent,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                vs.{' '}
                {opponent?.name ||
                  'Por definir'}
              </Text>

              <Text
                style={[
                  S.nextCompetition,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                Liga Nacional de Guatemala
              </Text>
            </View>


            <View
              style={[
                S.nextLogo,
                {
                  backgroundColor:
                    isDark
                      ? 'rgba(255,255,255,0.04)'
                      : '#F8FAFD',

                  borderColor:
                    colors.cardBorder,
                },
              ]}
            >
              <TeamLogo
                uri={
                  opponent?.logo
                }
                name={
                  opponent?.name
                }
                size={37}
                colors={
                  colors
                }
              />
            </View>
          </TouchableOpacity>
        </>
      )}


      <View
        style={{
          marginTop: 9,
        }}
      >
        <LastFiveCard
          team={
            team
          }
          matches={
            matches
          }
          colors={
            colors
          }
          isDark={
            isDark
          }
        />
      </View>


      {(team?.city ||
        team?.stadium) && (
        <>
          <SectionTitle
            title="Datos del club"
            colors={
              colors
            }
          />

          <View
            style={[
              S.clubDataCard,
              {
                backgroundColor:
                  colors.cardBg,

                borderColor:
                  colors.cardBorder,
              },
            ]}
          >
            {!!team?.city && (
              <View
                style={
                  S.clubDataRow
                }
              >
                <Text
                  style={[
                    S.clubDataLabel,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  Ciudad
                </Text>

                <Text
                  style={[
                    S.clubDataValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {team.city}
                </Text>
              </View>
            )}


            {!!team?.stadium && (
              <View
                style={
                  S.clubDataRow
                }
              >
                <Text
                  style={[
                    S.clubDataLabel,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  Estadio
                </Text>

                <Text
                  numberOfLines={2}
                  style={[
                    S.clubDataValue,
                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  {team.stadium}
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}


/* =========================================================
   CLASIFICACIÓN
========================================================= */

function StandingsTab({
  standings,
  teamId,
  colors,
  isDark,
}) {
  if (
    !standings.length
  ) {
    return (
      <View
        style={
          S.emptyState
        }
      >
        <Text
          style={
            S.emptyIcon
          }
        >
          🏆
        </Text>

        <Text
          style={[
            S.emptyTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Tabla no disponible
        </Text>

        <Text
          style={[
            S.emptyText,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          Todavía no hay clasificación disponible.
        </Text>
      </View>
    );
  }


  return (
    <View
      style={[
        S.tableCard,
        {
          backgroundColor:
            colors.cardBg,

          borderColor:
            colors.cardBorder,
        },
      ]}
    >
      <View
        style={[
          S.tableHeader,
          {
            borderBottomColor:
              colors.cardBorder,
          },
        ]}
      >
        <Text
          style={[
            S.tableHeaderTeam,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          EQUIPO
        </Text>

        <Text
          style={[
            S.tableHeaderStat,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          PJ
        </Text>

        <Text
          style={[
            S.tableHeaderStat,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          DG
        </Text>

        <Text
          style={
            S.tableHeaderPoints
          }
        >
          PTS
        </Text>
      </View>


      {standings.map(
        (
          row,
          index,
        ) => {
          const active =
            Number(
              row?.team?.id,
            ) ===
            Number(
              teamId,
            );


          return (
            <View
              key={
                String(
                  row?.team?.id ||
                  index,
                )
              }
              style={[
                S.tableRow,
                {
                  borderBottomColor:
                    colors.cardBorder,

                  backgroundColor:
                    active
                      ? (
                          isDark
                            ? 'rgba(49,93,228,0.10)'
                            : '#F2F6FF'
                        )
                      : 'transparent',
                },
              ]}
            >
              <View
                style={[
                  S.positionCircle,
                  {
                    backgroundColor:
                      active
                        ? BRAND.primary
                        : (
                            isDark
                              ? 'rgba(255,255,255,0.06)'
                              : '#F1F4F8'
                          ),
                  },
                ]}
              >
                <Text
                  style={[
                    S.positionCircleText,
                    {
                      color:
                        active
                          ? '#FFFFFF'
                          : colors.textMuted,
                    },
                  ]}
                >
                  {row.position}
                </Text>
              </View>


              <View
                style={
                  S.tableTeam
                }
              >
                <TeamLogo
                  uri={
                    row?.team?.logo
                  }
                  name={
                    row?.team?.name
                  }
                  size={19}
                  colors={
                    colors
                  }
                />

                <Text
                  numberOfLines={1}
                  style={[
                    S.tableTeamName,
                    {
                      color:
                        colors.text,

                      fontFamily:
                        active
                          ? 'Poppins-SemiBold'
                          : 'Poppins-Regular',
                    },
                  ]}
                >
                  {row?.team?.name ||
                    'Equipo'}
                </Text>
              </View>


              <Text
                style={[
                  S.tableStat,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                {row.played}
              </Text>


              <Text
                style={[
                  S.tableStat,
                  {
                    color:
                      row.gd > 0
                        ? '#159A69'
                        : row.gd < 0
                          ? '#DE4F68'
                          : colors.textMuted,
                  },
                ]}
              >
                {row.gd > 0
                  ? `+${row.gd}`
                  : row.gd}
              </Text>


              <Text
                style={[
                  S.tablePoints,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {row.points}
              </Text>
            </View>
          );
        },
      )}
    </View>
  );
}


/* =========================================================
   ESTADÍSTICAS
========================================================= */

function StatsTab({
  standing,
  team,
  matches,
  colors,
  isDark,
}) {
  if (
    !standing
  ) {
    return (
      <View
        style={
          S.emptyState
        }
      >
        <Text
          style={
            S.emptyIcon
          }
        >
          📊
        </Text>

        <Text
          style={[
            S.emptyTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Sin estadísticas
        </Text>
      </View>
    );
  }


  const played =
    Math.max(
      0,
      standing.played,
    );


  const possiblePoints =
    played * 3;


  const pointsPct =
    possiblePoints > 0
      ? Math.min(
          100,
          Math.round(
            (
              standing.points /
              possiblePoints
            ) * 100,
          ),
        )
      : 0;


  const goalsForAvg =
    played
      ? (
          standing.gf /
          played
        ).toFixed(1)
      : '0.0';


  const goalsAgainstAvg =
    played
      ? (
          standing.ga /
          played
        ).toFixed(1)
      : '0.0';


  return (
    <View>
      {/* HERO ESTADÍSTICO */}

      <View
        style={[
          S.performanceHero,
          {
            backgroundColor:
              isDark
                ? 'rgba(49,93,228,0.12)'
                : '#F4F7FF',

            borderColor:
              isDark
                ? 'rgba(49,93,228,0.24)'
                : '#DDE6FF',
          },
        ]}
      >
        <View
          style={
            S.performanceTop
          }
        >
          <View>
            <Text
              style={[
                S.performanceEyebrow,
                {
                  color:
                    BRAND.primary,
                },
              ]}
            >
              RENDIMIENTO
            </Text>

            <Text
              style={[
                S.performanceTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Apertura 2026
            </Text>
          </View>


          <View
            style={
              S.performancePosition
            }
          >
            <Text
              style={
                S.performancePositionNumber
              }
            >
              #{standing.position}
            </Text>

            <Text
              style={
                S.performancePositionLabel
              }
            >
              posición
            </Text>
          </View>
        </View>


        <View
          style={
            S.performancePointsRow
          }
        >
          <Text
            style={[
              S.performancePoints,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {standing.points}
          </Text>

          <Text
            style={[
              S.performancePointsText,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            de {possiblePoints} puntos posibles
          </Text>
        </View>


        <View
          style={[
            S.progressTrack,
            {
              backgroundColor:
                isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#DFE6F4',
            },
          ]}
        >
          <View
            style={[
              S.progressFill,
              {
                width:
                  `${pointsPct}%`,
              },
            ]}
          />
        </View>


        <Text
          style={[
            S.progressCaption,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {pointsPct}% de los puntos disputados
        </Text>
      </View>


      {/* G / E / P */}

      <View
        style={
          S.resultsTriple
        }
      >
        <View
          style={[
            S.resultStatCard,
            {
              backgroundColor:
                colors.cardBg,

              borderColor:
                colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              S.resultStatIcon,
              {
                backgroundColor:
                  '#E7F7F0',
              },
            ]}
          >
            <Text
              style={[
                S.resultStatLetter,
                {
                  color:
                    '#159A69',
                },
              ]}
            >
              G
            </Text>
          </View>

          <Text
            style={[
              S.resultStatNumber,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {standing.won}
          </Text>

          <Text
            style={[
              S.resultStatLabel,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            Ganados
          </Text>
        </View>


        <View
          style={[
            S.resultStatCard,
            {
              backgroundColor:
                colors.cardBg,

              borderColor:
                colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              S.resultStatIcon,
              {
                backgroundColor:
                  '#FFF5DD',
              },
            ]}
          >
            <Text
              style={[
                S.resultStatLetter,
                {
                  color:
                    '#D99500',
                },
              ]}
            >
              E
            </Text>
          </View>

          <Text
            style={[
              S.resultStatNumber,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {standing.drawn}
          </Text>

          <Text
            style={[
              S.resultStatLabel,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            Empatados
          </Text>
        </View>


        <View
          style={[
            S.resultStatCard,
            {
              backgroundColor:
                colors.cardBg,

              borderColor:
                colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              S.resultStatIcon,
              {
                backgroundColor:
                  '#FCECEF',
              },
            ]}
          >
            <Text
              style={[
                S.resultStatLetter,
                {
                  color:
                    '#DE4F68',
                },
              ]}
            >
              P
            </Text>
          </View>

          <Text
            style={[
              S.resultStatNumber,
              {
                color:
                  colors.text,
              },
            ]}
          >
            {standing.lost}
          </Text>

          <Text
            style={[
              S.resultStatLabel,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            Perdidos
          </Text>
        </View>
      </View>


      {/* GOLES */}

      <SectionTitle
        title="Balance de goles"
        colors={
          colors
        }
      />


      <View
        style={[
          S.goalsCard,
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
            S.goalMainRow
          }
        >
          <View
            style={
              S.goalMainItem
            }
          >
            <Text
              style={
                S.goalFor
              }
            >
              {standing.gf}
            </Text>

            <Text
              style={[
                S.goalLabel,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              a favor
            </Text>
          </View>


          <View
            style={[
              S.goalDifference,
              {
                backgroundColor:
                  standing.gd >= 0
                    ? '#E8F8F0'
                    : '#FCECEF',
              },
            ]}
          >
            <Text
              style={[
                S.goalDifferenceValue,
                {
                  color:
                    standing.gd >= 0
                      ? '#159A69'
                      : '#DE4F68',
                },
              ]}
            >
              {standing.gd > 0
                ? `+${standing.gd}`
                : standing.gd}
            </Text>

            <Text
              style={[
                S.goalDifferenceLabel,
                {
                  color:
                    standing.gd >= 0
                      ? '#159A69'
                      : '#DE4F68',
                },
              ]}
            >
              diferencia
            </Text>
          </View>


          <View
            style={
              S.goalMainItem
            }
          >
            <Text
              style={
                S.goalAgainst
              }
            >
              {standing.ga}
            </Text>

            <Text
              style={[
                S.goalLabel,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              en contra
            </Text>
          </View>
        </View>


        <View
          style={[
            S.goalDivider,
            {
              backgroundColor:
                colors.cardBorder,
            },
          ]}
        />


        <View
          style={
            S.goalAverages
          }
        >
          <View>
            <Text
              style={[
                S.averageValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {goalsForAvg}
            </Text>

            <Text
              style={[
                S.averageLabel,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              goles por partido
            </Text>
          </View>


          <View
            style={
              S.averageRight
            }
          >
            <Text
              style={[
                S.averageValue,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {goalsAgainstAvg}
            </Text>

            <Text
              style={[
                S.averageLabel,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              recibidos por partido
            </Text>
          </View>
        </View>
      </View>


      {/* ÚLTIMOS 5 */}

      <View
        style={{
          marginTop: 13,
        }}
      >
        <LastFiveCard
          team={
            team
          }
          matches={
            matches
          }
          colors={
            colors
          }
          isDark={
            isDark
          }
        />
      </View>
    </View>
  );
}


/* =========================================================
   SCREEN
========================================================= */

export default function TeamScreen({
  route,
  navigation,
}) {
  const insets =
    useSafeAreaInsets();


  const {
    theme,
  } =
    useTheme();


  const colors =
    theme.colors;


  const isDark =
    theme.mode ===
    'dark';


  const routeTeam =
    route?.params?.team ||
    {};


  const teamId =
    Number(
      firstValue(
        routeTeam?.id,
        routeTeam?.teamId,
        route?.params?.teamId,
        0,
      ),
    ) || 0;


  const fallbackName =
    fixTeamName(
      firstValue(
        routeTeam?.name,
        routeTeam?.teamName,
        route?.params?.teamName,
        'Equipo',
      ),
    );


  const bottomPadding =
    BANNER_H +
    TAB_H +
    FOOTER_LIFT +
    Math.max(
      insets.bottom,
      0,
    ) +
    20;


  const [
    team,
    setTeam,
  ] =
    useState({
      id: teamId,
      name: fallbackName,
      logo:
        firstValue(
          routeTeam?.logo,
          routeTeam?.logo_url,
          null,
        ),
    });


  const [
    standings,
    setStandings,
  ] =
    useState([]);


  const [
    matches,
    setMatches,
  ] =
    useState([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    error,
    setError,
  ] =
    useState('');


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    tab,
    setTab,
  ] =
    useState(
      'Resumen',
    );


  const [
    partidosSubTab,
    setPartidosSubTab,
  ] =
    useState(
      'future',
    );


  const [
    isFollowing,
    setIsFollowing,
  ] =
    useState(false);


  const [
    followersCount,
    setFollowersCount,
  ] =
    useState(0);


  const [
    followBusy,
    setFollowBusy,
  ] =
    useState(false);


  const [
    showTeamSearch,
    setShowTeamSearch,
  ] =
    useState(false);


  const standing =
    useMemo(
      () =>
        standings.find(
          row =>
            Number(
              row?.team?.id,
            ) ===
            Number(
              teamId,
            ),
        ) ||
        null,
      [
        standings,
        teamId,
      ],
    );


  useFocusEffect(
    useCallback(
      () => {
        const unsubscribe =
          navigation.addListener(
            'beforeRemove',
            () => {
              showInterstitialIfReady(
                'exit_team',
              );
            },
          );


        return () =>
          unsubscribe?.();
      },
      [
        navigation,
      ],
    ),
  );


  /* =======================================================
     LOAD
  ======================================================= */

  const load =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!teamId) {
          setError(
            'Equipo no válido.',
          );

          setLoading(false);
          return;
        }


        if (!silent) {
          setLoading(true);
        }


        setError('');


        try {
          const teamPayload =
            await apiGet(
              'team.php',
              {
                id:
                  teamId,
              },
            );


          const [
            standingsPayload,
            teamsPayload,
            matchesPayload,
          ] =
            await Promise.all([
              apiGet(
                'standings.php',
              ).catch(
                () => ({}),
              ),

              apiGet(
                'teams.php',
              ).catch(
                () => ({}),
              ),

              apiGet(
                'matches.php',
                {
                  team_id:
                    teamId,
                },
              ).catch(
                () => ({}),
              ),
            ]);


          const directory =
            extractTeams(
              teamsPayload,
            );


          const selectedDirectory =
            directory.get(
              teamId,
            );


          setTeam(
            normalizeTeam(
              teamPayload,
              teamId,
              fallbackName,
              selectedDirectory,
            ),
          );


          setStandings(
            extractStandings(
              standingsPayload,
              directory,
            ),
          );


          setMatches(
            extractMatches(
              matchesPayload,
            )
              .map(
                normalizeMiniMatch,
              )
              .filter(Boolean),
          );


        } catch (
          loadError
        ) {
          console.warn(
            '[TeamScreen]',
            loadError?.message ||
            loadError,
          );


          setError(
            loadError?.message ||
            'No se pudo cargar el equipo.',
          );


        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      [
        teamId,
        fallbackName,
      ],
    );


  useEffect(
    () => {
      setTab(
        'Resumen',
      );

      load();
    },
    [
      load,
    ],
  );


  /* =======================================================
     FOLLOW
  ======================================================= */

  useEffect(
    () => {
      let dead = false;
      let unsubscribe = null;


      (
        async () => {
          try {
            if (!teamId) {
              return;
            }


            const state =
              await getFollowState(
                teamId,
              );


            if (!dead) {
              setIsFollowing(
                !!state,
              );
            }


            unsubscribe =
              listenFollowersCount(
                teamId,
                value => {
                  if (!dead) {
                    setFollowersCount(
                      Number(
                        value || 0,
                      ),
                    );
                  }
                },
              );


          } catch {}
        }
      )();


      return () => {
        dead = true;

        try {
          unsubscribe?.();
        } catch {}
      };
    },
    [
      teamId,
    ],
  );


  const toggleFollow =
    useCallback(
      async () => {
        if (
          !teamId ||
          followBusy
        ) {
          return;
        }


        setFollowBusy(true);


        try {
          const result =
            await toggleFollowTeamFS(
              teamId,
            );


          const following =
            !!result?.following;


          setIsFollowing(
            following,
          );


          if (
            typeof result
              ?.followersCount ===
            'number'
          ) {
            setFollowersCount(
              result.followersCount,
            );
          }


          if (following) {
            await followTeam(
              String(teamId),
            );
          } else {
            await unfollowTeam(
              String(teamId),
            );
          }


        } catch {}


        setFollowBusy(false);
      },
      [
        teamId,
        followBusy,
      ],
    );


  /* =======================================================
     REFRESH
  ======================================================= */

  const onRefresh =
    useCallback(
      async () => {
        setRefreshing(true);

        try {
          await load({
            silent: true,
          });
        } finally {
          setRefreshing(false);
        }
      },
      [
        load,
      ],
    );


  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <SafeAreaView
      edges={[
        'bottom',
      ]}
      style={[
        S.container,
        {
          backgroundColor:
            colors.screenBg,
        },
      ]}
    >
      <Header
        navigation={
          navigation
        }
        title="Equipo"
        showSearch
        showBell
        bellProps={{
          on:
            isFollowing,

          onPress:
            toggleFollow,

          size:
            22,
        }}
        onSearchPress={() =>
          setShowTeamSearch(
            true,
          )
        }
      />


      <TeamHero
        team={
          team
        }
        standing={
          standing
        }
        followersCount={
          followersCount
        }
        isFollowing={
          isFollowing
        }
        followBusy={
          followBusy
        }
        onFollow={
          toggleFollow
        }
        colors={
          colors
        }
        isDark={
          isDark
        }
      />


      <Tabs
        value={
          tab
        }
        onChange={
          setTab
        }
      />


      <View
        style={
          S.body
        }
      >
        {loading ? (

          <View
            style={
              S.loadingState
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
                S.loadingText,
                {
                  color:
                    colors.textMuted,
                },
              ]}
            >
              Cargando equipo…
            </Text>
          </View>

        ) : tab === 'Partidos' ? (

          <TeamMatches
            teamId={
              teamId
            }
            navigation={
              navigation
            }
            initialTab={
              partidosSubTab
            }
            onTabChange={
              setPartidosSubTab
            }
            bottomPadding={
              bottomPadding
            }
          />

        ) : tab === 'Plantilla' ? (

          <TeamSquad
            teamId={
              teamId
            }
            navigation={
              navigation
            }
            bottomPadding={
              bottomPadding
            }
          />

        ) : (

          <ScrollView
            style={[
              S.scroll,
              {
                backgroundColor:
                  colors.screenBg,
              },
            ]}
            contentContainerStyle={[
              S.scrollContent,
              {
                paddingBottom:
                  bottomPadding,
              },
            ]}
            showsVerticalScrollIndicator={
              false
            }
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
            {!!error && (
              <View
                style={[
                  S.errorCard,
                  {
                    backgroundColor:
                      colors.cardBg,

                    borderColor:
                      colors.cardBorder,
                  },
                ]}
              >
                <Text
                  style={[
                    S.errorText,
                    {
                      color:
                        colors.textMuted,
                    },
                  ]}
                >
                  {error}
                </Text>
              </View>
            )}


            {tab === 'Resumen' && (
              <SummaryTab
                team={
                  team
                }
                standing={
                  standing
                }
                matches={
                  matches
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
                onOpenMatches={() => {
                  setPartidosSubTab(
                    'future',
                  );

                  setTab(
                    'Partidos',
                  );
                }}
              />
            )}


            {tab === 'Clasificación' && (
              <PositionsBlock
                standings={
                  standings
                }
                teamId={
                  teamId
                }
                navigation={
                  navigation
                }
                scope="guatemala"
                mode="current"
                showHeader={true}
                title=""
              />
            )}


            {tab === 'Estadísticas' && (
              <StatsTab
                standing={
                  standing
                }
                team={
                  team
                }
                matches={
                  matches
                }
                colors={
                  colors
                }
                isDark={
                  isDark
                }
              />
            )}
          </ScrollView>

        )}
      </View>


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
          selected => {
            setShowTeamSearch(
              false,
            );


            navigation.replace(
              'TeamScreen',
              {
                teamId:
                  selected.id,

                teamName:
                  selected.name,

                scope:
                  'guatemala',
              },
            );
          }
        }
      />


      <View
        pointerEvents="box-none"
        style={[
          S.footerFixed,
          {
            bottom:
              FOOTER_LIFT,
          },
        ]}
      >
        <AdFooter />
      </View>


      <FooterTabs
        navigation={
          navigation
        }
      />
    </SafeAreaView>
  );
}


/* =========================================================
   STYLES
========================================================= */

const S =
  StyleSheet.create({

    container: {
      flex: 1,
    },

    body: {
      flex: 1,
    },


    /* HERO */

    hero: {
      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 16,
      paddingVertical: 14,

      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    logoShell: {
      width: 72,
      height: 72,

      borderRadius: 20,
      borderWidth: 1,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 13,
    },

    logoFallback: {
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },

    logoFallbackText: {
      fontFamily:
        'Poppins-Bold',
    },

    heroInfo: {
      flex: 1,
      minWidth: 0,
    },

    heroTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    heroTitleBox: {
      flex: 1,
      minWidth: 0,
      paddingRight: 8,
    },

    teamName: {
      fontFamily:
        'Poppins-Bold',

      fontSize: 17,
      lineHeight: 23,
    },

    teamLeague: {
      marginTop: 1,

      fontFamily:
        'Poppins-Regular',

      fontSize: 10,
      lineHeight: 14,
    },

    positionBadge: {
      minWidth: 45,

      borderRadius: 11,

      alignItems: 'center',

      paddingHorizontal: 7,
      paddingVertical: 4,
    },

    positionBadgeNumber: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize: 11,
    },

    positionBadgeLabel: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Regular',

      fontSize: 6.5,
    },

    heroBottom: {
      marginTop: 9,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    followersRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },

    followersNumber: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 12,
    },

    followersLabel: {
      marginLeft: 4,

      fontFamily:
        'Poppins-Regular',

      fontSize: 9,
    },

    followButton: {
      minHeight: 32,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 4,

      borderWidth: 1.2,
      borderRadius: 999,

      paddingHorizontal: 13,

      justifyContent: 'center',
    },

    followButtonText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 10,
    },


    /* TABS */

    tabsWrap: {
      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    tabsContent: {
      paddingHorizontal: 6,
    },

    tabButton: {
      minHeight: 43,

      paddingHorizontal: 13,

      alignItems: 'center',
      justifyContent: 'center',

      borderBottomWidth: 2,
      borderBottomColor:
        'transparent',
    },

    tabText: {
      fontSize: 11,
      lineHeight: 15,
    },


    /* BODY */

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 12,
      paddingTop: 10,
    },

    loadingState: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',
    },

    loadingText: {
      marginTop: 7,

      fontFamily:
        'Poppins-Regular',

      fontSize: 10,
    },

    errorCard: {
      borderWidth: 1,
      borderRadius: 12,

      padding: 12,
      marginBottom: 10,
    },

    errorText: {
      fontFamily:
        'Poppins-Regular',

      fontSize: 10,
      textAlign: 'center',
    },


    /* TITLES */

    sectionHead: {
      marginTop: 9,
      marginBottom: 7,

      paddingHorizontal: 2,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    sectionTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 12.5,
    },

    sectionRight: {
      fontFamily:
        'Poppins-Regular',

      fontSize: 8.5,
    },

    sectionLink: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-SemiBold',

      fontSize: 9,
    },


    /* SUMMARY */

    summaryStats: {
      flexDirection: 'row',
      gap: 7,
    },

    summaryStat: {
      flex: 1,

      minHeight: 65,

      borderWidth: 1,
      borderRadius: 13,

      alignItems: 'center',
      justifyContent: 'center',
    },

    summaryStatMain: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize: 17,
    },

    summaryStatLabel: {
      marginTop: 1,

      fontFamily:
        'Poppins-Regular',

      fontSize: 8,
    },


    /* NEXT MATCH */

    nextMatchCard: {
      minHeight: 88,

      borderWidth: 1,
      borderRadius: 15,

      padding: 12,

      flexDirection: 'row',
      alignItems: 'center',
    },

    nextMatchText: {
      flex: 1,
      minWidth: 0,
    },

    nextKickoff: {
      fontFamily:
        'Poppins-Regular',

      fontSize: 9,
    },

    nextOpponent: {
      marginTop: 4,

      fontFamily:
        'Poppins-SemiBold',

      fontSize: 13.5,
    },

    nextCompetition: {
      marginTop: 2,

      fontFamily:
        'Poppins-Regular',

      fontSize: 8,
    },

    nextLogo: {
      width: 57,
      height: 57,

      borderRadius: 15,
      borderWidth: 1,

      alignItems: 'center',
      justifyContent: 'center',

      marginLeft: 10,
    },


    /* LAST FIVE */

    lastFiveCard: {
      borderWidth: 1,
      borderRadius: 14,

      paddingHorizontal: 12,
      paddingVertical: 10,
    },

    lastFiveHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',

      marginBottom: 11,
    },

    lastFiveTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 11.5,
    },

    lastFiveHint: {
      fontFamily:
        'Poppins-Regular',

      fontSize: 7.5,
    },

    lastFiveMain: {
      flexDirection: 'row',
      alignItems: 'center',

      justifyContent:
        'space-between',
    },

    lastFiveClub: {
      flex: 1,

      minWidth: 0,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 8,
    },

    lastFiveTeam: {
      flex: 1,

      fontFamily:
        'Poppins-SemiBold',

      fontSize: 10.5,
    },

    lastFiveBadges: {
      flexDirection: 'row',
      gap: 5,

      marginLeft: 8,
    },

    resultBadge: {
      width: 25,
      height: 25,

      borderRadius: 7,

      alignItems: 'center',
      justifyContent: 'center',
    },

    resultBadgeText: {
      color: '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize: 9,
    },

    lastFiveFooter: {
      marginTop: 10,
      paddingTop: 8,

      borderTopWidth:
        StyleSheet.hairlineWidth,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent:
        'space-between',
    },

    lastFiveSummary: {
      fontFamily:
        'Poppins-Regular',

      fontSize: 8,
    },

    lastFiveStreak: {
      color: '#159A69',

      fontFamily:
        'Poppins-SemiBold',

      fontSize: 8,
    },


    /* CLUB DATA */

    clubDataCard: {
      borderWidth: 1,
      borderRadius: 14,

      paddingHorizontal: 12,
    },

    clubDataRow: {
      minHeight: 45,

      flexDirection: 'row',
      alignItems: 'center',
      justifyContent:
        'space-between',

      gap: 15,
    },

    clubDataLabel: {
      fontFamily:
        'Poppins-Regular',

      fontSize: 9,
    },

    clubDataValue: {
      flex: 1,

      textAlign: 'right',

      fontFamily:
        'Poppins-SemiBold',

      fontSize: 9.5,
    },


    /* CLASSIFICATION */

    tableCard: {
      borderWidth: 1,
      borderRadius: 14,

      overflow: 'hidden',
    },

    tableHeader: {
      minHeight: 34,

      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 9,

      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    tableHeaderTeam: {
      flex: 1,

      marginLeft: 36,

      fontFamily:
        'Poppins-Medium',

      fontSize: 7.5,
    },

    tableHeaderStat: {
      width: 32,

      textAlign: 'center',

      fontFamily:
        'Poppins-Medium',

      fontSize: 7.5,
    },

    tableHeaderPoints: {
      width: 37,

      color:
        BRAND.primary,

      textAlign: 'center',

      fontFamily:
        'Poppins-SemiBold',

      fontSize: 7.5,
    },

    tableRow: {
      minHeight: 46,

      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 9,

      borderBottomWidth:
        StyleSheet.hairlineWidth,
    },

    positionCircle: {
      width: 25,
      height: 25,

      borderRadius: 13,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 7,
    },

    positionCircleText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 7.5,
    },

    tableTeam: {
      flex: 1,
      minWidth: 0,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 7,
    },

    tableTeamName: {
      flex: 1,

      fontSize: 9,
      lineHeight: 13,
    },

    tableStat: {
      width: 32,

      textAlign: 'center',

      fontFamily:
        'Poppins-Regular',

      fontSize: 8.5,
    },

    tablePoints: {
      width: 37,

      textAlign: 'center',

      fontFamily:
        'Poppins-Bold',

      fontSize: 9.5,
    },


    /* STATISTICS */

    performanceHero: {
      borderWidth: 1,
      borderRadius: 16,

      padding: 14,
    },

    performanceTop: {
      flexDirection: 'row',

      alignItems: 'flex-start',
      justifyContent:
        'space-between',
    },

    performanceEyebrow: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 7.5,

      letterSpacing: 0.8,
    },

    performanceTitle: {
      marginTop: 2,

      fontFamily:
        'Poppins-Bold',

      fontSize: 15,
    },

    performancePosition: {
      minWidth: 52,

      alignItems: 'center',

      backgroundColor:
        '#FFFFFF',

      borderRadius: 11,

      paddingHorizontal: 9,
      paddingVertical: 5,
    },

    performancePositionNumber: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize: 12,
    },

    performancePositionLabel: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Regular',

      fontSize: 6.5,
    },

    performancePointsRow: {
      marginTop: 15,

      flexDirection: 'row',
      alignItems: 'baseline',
    },

    performancePoints: {
      fontFamily:
        'Poppins-Bold',

      fontSize: 26,
      lineHeight: 30,
    },

    performancePointsText: {
      marginLeft: 6,

      fontFamily:
        'Poppins-Regular',

      fontSize: 9,
    },

    progressTrack: {
      height: 6,

      borderRadius: 999,

      overflow: 'hidden',

      marginTop: 7,
    },

    progressFill: {
      height: 6,

      borderRadius: 999,

      backgroundColor:
        BRAND.primary,
    },

    progressCaption: {
      marginTop: 5,

      fontFamily:
        'Poppins-Regular',

      fontSize: 7.5,
    },

    resultsTriple: {
      flexDirection: 'row',

      gap: 7,

      marginTop: 10,
    },

    resultStatCard: {
      flex: 1,

      minHeight: 92,

      borderWidth: 1,
      borderRadius: 14,

      alignItems: 'center',
      justifyContent: 'center',
    },

    resultStatIcon: {
      width: 26,
      height: 26,

      borderRadius: 8,

      alignItems: 'center',
      justifyContent: 'center',

      marginBottom: 4,
    },

    resultStatLetter: {
      fontFamily:
        'Poppins-Bold',

      fontSize: 9,
    },

    resultStatNumber: {
      fontFamily:
        'Poppins-Bold',

      fontSize: 17,
    },

    resultStatLabel: {
      marginTop: 1,

      fontFamily:
        'Poppins-Regular',

      fontSize: 7.5,
    },

    goalsCard: {
      borderWidth: 1,
      borderRadius: 15,

      padding: 13,
    },

    goalMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    goalMainItem: {
      flex: 1,
      alignItems: 'center',
    },

    goalFor: {
      color: '#159A69',

      fontFamily:
        'Poppins-Bold',

      fontSize: 24,
    },

    goalAgainst: {
      color: '#DE4F68',

      fontFamily:
        'Poppins-Bold',

      fontSize: 24,
    },

    goalLabel: {
      fontFamily:
        'Poppins-Regular',

      fontSize: 8,
    },

    goalDifference: {
      minWidth: 75,

      borderRadius: 13,

      alignItems: 'center',

      paddingVertical: 8,
    },

    goalDifferenceValue: {
      fontFamily:
        'Poppins-Bold',

      fontSize: 15,
    },

    goalDifferenceLabel: {
      fontFamily:
        'Poppins-Regular',

      fontSize: 6.5,
    },

    goalDivider: {
      height:
        StyleSheet.hairlineWidth,

      marginVertical: 12,
    },

    goalAverages: {
      flexDirection: 'row',
      justifyContent:
        'space-between',
    },

    averageRight: {
      alignItems: 'flex-end',
    },

    averageValue: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 12,
    },

    averageLabel: {
      marginTop: 1,

      fontFamily:
        'Poppins-Regular',

      fontSize: 7.5,
    },


    /* EMPTY */

    emptyState: {
      alignItems: 'center',

      paddingVertical: 55,
      paddingHorizontal: 25,
    },

    emptyIcon: {
      fontSize: 28,
      marginBottom: 8,
    },

    emptyTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 13,
    },

    emptyText: {
      maxWidth: 270,

      marginTop: 4,

      fontFamily:
        'Poppins-Regular',

      fontSize: 9.5,
      lineHeight: 15,

      textAlign: 'center',
    },


    footerFixed: {
      position: 'absolute',

      left: 0,
      right: 0,

      alignItems: 'center',
    },

  });