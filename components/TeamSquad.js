// components/TeamSquad.js
// Liga Nacional GT
//
// Plantilla exclusivamente desde:
// /sistema/api/players.php?team_id=ID

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
  SectionList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
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

const API_BASE =
  'https://liganacionalgt.com/sistema/api';


const ROLE_LABELS = {
  POR: 'Portero',
  GK: 'Portero',

  LD: 'Lateral derecho',
  DFC: 'Defensa central',
  LI: 'Lateral izquierdo',
  DEF: 'Defensa',
  DF: 'Defensa',

  MCD: 'Mediocentro defensivo',
  MC: 'Mediocampista',
  MCO: 'Mediocentro ofensivo',
  MED: 'Mediocampista',
  MF: 'Mediocampista',

  ED: 'Extremo derecho',
  EI: 'Extremo izquierdo',
  DC: 'Delantero',
  DEL: 'Delantero',
  FW: 'Delantero',
};


const SECTION_ORDER = [
  'Porteros',
  'Defensas',
  'Mediocampistas',
  'Delanteros',
  'Otros',
];


/* =========================================================
   API
========================================================= */

async function fetchPlayers(
  teamId,
) {
  const url =
    `${API_BASE}/players.php?team_id=${encodeURIComponent(
      String(teamId),
    )}&_=${Date.now()}`;


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


function normalizeRole(
  value,
) {
  return String(
    value || '',
  )
    .trim()
    .toUpperCase();
}


function roleLabel(
  value,
) {
  const code =
    normalizeRole(
      value,
    );


  return (
    ROLE_LABELS[code] ||
    String(
      value ||
      'Jugador',
    )
  );
}


function sectionForRole(
  value,
) {
  const code =
    normalizeRole(
      value,
    );


  if (
    [
      'POR',
      'GK',
    ].includes(code)
  ) {
    return 'Porteros';
  }


  if (
    [
      'LD',
      'DFC',
      'LI',
      'DEF',
      'DF',
    ].includes(code)
  ) {
    return 'Defensas';
  }


  if (
    [
      'MCD',
      'MC',
      'MCO',
      'MED',
      'MF',
    ].includes(code)
  ) {
    return 'Mediocampistas';
  }


  if (
    [
      'ED',
      'EI',
      'DC',
      'DEL',
      'FW',
    ].includes(code)
  ) {
    return 'Delanteros';
  }


  const text =
    code.toLowerCase();


  if (
    text.includes(
      'port',
    )
  ) {
    return 'Porteros';
  }


  if (
    text.includes(
      'def',
    ) ||
    text.includes(
      'lateral',
    )
  ) {
    return 'Defensas';
  }


  if (
    text.includes(
      'medio',
    )
  ) {
    return 'Mediocampistas';
  }


  if (
    text.includes(
      'del',
    ) ||
    text.includes(
      'extremo',
    )
  ) {
    return 'Delanteros';
  }


  return 'Otros';
}


/* =========================================================
   DATA
========================================================= */

function extractPlayers(
  payload,
) {
  const candidates = [
    payload?.players,
    payload?.squad,
    payload?.roster,
    payload?.plantilla,
    payload?.team?.players,
    payload?.data?.players,
    payload?.data,
    payload,
  ];


  for (
    const source of candidates
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


function normalizePlayer(
  row,
  index,
) {
  const player =
    row?.player &&
    typeof row.player ===
      'object'
      ? row.player
      : row || {};


  const id =
    Number(
      firstValue(
        player?.id,
        row?.player_id,
        row?.playerId,
        0,
      ),
    ) || 0;


  const name =
    String(
      firstValue(
        player?.name,
        row?.name,
        row?.player_name,
        'Jugador',
      ),
    );


  const role =
    firstValue(
      row?.role_code,
      row?.roleCode,
      row?.position,
      player?.role,
      player?.role_code,
      player?.primary_position,
      player?.primaryPosition,
      '',
    );


  const shirtNumber =
    firstValue(
      row?.shirtNumber,
      row?.shirt_number,
      row?.number,
      row?.dorsal,
      player?.shirtNumber,
      player?.shirt_number,
      null,
    );


  const number =
    shirtNumber !== null &&
    shirtNumber !== ''
      ? Number(shirtNumber)
      : null;


  return {
    id,

    name,

    photo:
      firstValue(
        player?.photo,
        player?.photo_url,
        player?.photoUrl,
        row?.photo,
        row?.photo_url,
        null,
      ),

    shirtNumber:
      Number.isFinite(number)
        ? number
        : null,

    role:
      String(
        role || '',
      ),

    nationality:
      String(
        firstValue(
          player?.nationality,
          row?.nationality,
          '',
        ) || '',
      ),

    order:
      index,
  };
}


/* =========================================================
   PHOTO
========================================================= */

function PlayerPhoto({
  uri,
  name,
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
        style={
          styles.photo
        }
        resizeMode="cover"
        onError={() =>
          setFailed(true)
        }
      />
    );
  }


  return (
    <View
      style={[
        styles.photo,
        styles.photoFallback,
        {
          backgroundColor:
            colors.cardBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.photoInitials,
          {
            color:
              colors.textMuted,
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
   ROW
========================================================= */

function PlayerRow({
  player,
  teamId,
  navigation,
  colors,
  isDark,
}) {
  const hasNumber =
    Number.isFinite(
      player?.shirtNumber,
    );


  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => {
        if (!player?.id) {
          return;
        }


        navigation
          ?.navigate?.(
            'Player',
            {
              playerId:
                Number(
                  player.id,
                ),

              teamId:
                Number(
                  teamId,
                ),

              scope:
                'guatemala',

              player: {
                id:
                  Number(
                    player.id,
                  ),

                name:
                  player.name,

                photo:
                  player.photo,

                shirtNumber:
                  player.shirtNumber,

                role:
                  player.role,

                nationality:
                  player.nationality,
              },
            },
          );
      }}
      style={[
        styles.playerCard,
        {
          backgroundColor:
            colors.cardBg,

          borderColor:
            colors.cardBorder,
        },
      ]}
    >
      <PlayerPhoto
        uri={
          player?.photo
        }
        name={
          player?.name
        }
        colors={
          colors
        }
      />


      {/* DORSAL PEQUEÑO */}

      <View
        style={[
          styles.numberBox,
          {
            backgroundColor:
              isDark
                ? 'rgba(49,93,228,0.12)'
                : '#EEF3FF',
          },
        ]}
      >
        <Text
          style={
            styles.number
          }
        >
          {hasNumber
            ? player.shirtNumber
            : '—'}
        </Text>
      </View>


      <View
        style={
          styles.playerInfo
        }
      >
        <Text
          numberOfLines={1}
          style={[
            styles.playerName,
            {
              color:
                colors.text,
            },
          ]}
        >
          {player?.name ||
            'Jugador'}
        </Text>


        <View
          style={
            styles.playerMeta
          }
        >
          <Text
            numberOfLines={1}
            style={[
              styles.playerRole,
              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            {roleLabel(
              player?.role,
            )}
          </Text>


          {!!player?.nationality && (
            <>
              <View
                style={[
                  styles.metaDot,
                  {
                    backgroundColor:
                      colors.textMuted,
                  },
                ]}
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.playerNationality,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                {player.nationality}
              </Text>
            </>
          )}
        </View>
      </View>


      <Text
        style={[
          styles.chevron,
          {
            color:
              colors.textMuted,
          },
        ]}
      >
        ›
      </Text>
    </TouchableOpacity>
  );
}


/* =========================================================
   COMPONENT
========================================================= */

export default function TeamSquad({
  teamId,
  navigation,
  bottomPadding = 150,
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


  const mounted =
    useRef(true);


  const [
    players,
    setPlayers,
  ] =
    useState([]);


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


  const load =
    useCallback(
      async ({
        silent = false,
      } = {}) => {
        if (!teamId) {
          return;
        }


        if (!silent) {
          setLoading(true);
        }


        setError('');


        try {
          const payload =
            await fetchPlayers(
              teamId,
            );


          const normalized =
            extractPlayers(
              payload,
            )
              .map(
                normalizePlayer,
              )
              .filter(
                player =>
                  !!player.id,
              );


          if (mounted.current) {
            setPlayers(
              normalized,
            );
          }


        } catch (
          loadError
        ) {
          console.warn(
            '[TeamSquad]',
            loadError?.message ||
            loadError,
          );


          if (mounted.current) {
            setError(
              loadError?.message ||
              'No se pudo cargar la plantilla.',
            );
          }


        } finally {
          if (
            mounted.current &&
            !silent
          ) {
            setLoading(false);
          }
        }
      },
      [
        teamId,
      ],
    );


  useEffect(
    () => {
      mounted.current = true;

      load();


      return () => {
        mounted.current = false;
      };
    },
    [
      load,
    ],
  );


  const sections =
    useMemo(
      () => {
        const map =
          new Map(
            SECTION_ORDER.map(
              section => [
                section,
                [],
              ],
            ),
          );


        players.forEach(
          player => {
            const section =
              sectionForRole(
                player?.role,
              );


            map
              .get(section)
              ?.push(player);
          },
        );


        for (
          const list of map.values()
        ) {
          list.sort(
            (
              a,
              b,
            ) => {
              const numberA =
                Number(
                  a?.shirtNumber,
                );


              const numberB =
                Number(
                  b?.shirtNumber,
                );


              const validA =
                Number.isFinite(
                  numberA,
                );


              const validB =
                Number.isFinite(
                  numberB,
                );


              if (
                validA &&
                validB &&
                numberA !==
                  numberB
              ) {
                return (
                  numberA -
                  numberB
                );
              }


              if (
                validA &&
                !validB
              ) {
                return -1;
              }


              if (
                !validA &&
                validB
              ) {
                return 1;
              }


              return String(
                a?.name ||
                '',
              ).localeCompare(
                String(
                  b?.name ||
                  '',
                ),
                'es',
              );
            },
          );
        }


        return SECTION_ORDER
          .map(
            title => ({
              title,

              data:
                map.get(title) ||
                [],
            }),
          )
          .filter(
            section =>
              section.data.length >
              0,
          );
      },
      [
        players,
      ],
    );


  const refresh =
    useCallback(
      async () => {
        setRefreshing(true);

        try {
          await load({
            silent: true,
          });
        } finally {
          if (mounted.current) {
            setRefreshing(false);
          }
        }
      },
      [
        load,
      ],
    );


  if (loading) {
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
          Cargando plantilla…
        </Text>
      </View>
    );
  }


  if (
    error &&
    !players.length
  ) {
    return (
      <View
        style={
          styles.center
        }
      >
        <Text
          style={
            styles.stateIcon
          }
        >
          👥
        </Text>

        <Text
          style={[
            styles.stateTitle,
            {
              color:
                colors.text,
            },
          ]}
        >
          Plantilla no disponible
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
          activeOpacity={0.8}
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


  return (
    <SectionList
      sections={
        sections
      }
      keyExtractor={
        item =>
          String(
            item?.id,
          )
      }
      style={[
        styles.list,
        {
          backgroundColor:
            colors.screenBg,
        },
      ]}
      contentContainerStyle={{
        paddingHorizontal: 10,
        paddingTop: 7,
        paddingBottom:
          bottomPadding,
      }}
      showsVerticalScrollIndicator={
        false
      }
      stickySectionHeadersEnabled={
        false
      }
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
      renderSectionHeader={
        ({
          section,
        }) => (
          <View
            style={
              styles.sectionHeader
            }
          >
            <Text
              style={[
                styles.sectionTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              {section.title}
            </Text>


            <View
              style={[
                styles.sectionCount,
                {
                  backgroundColor:
                    isDark
                      ? 'rgba(49,93,228,0.12)'
                      : '#EEF3FF',
                },
              ]}
            >
              <Text
                style={
                  styles.sectionCountText
                }
              >
                {section.data.length}
              </Text>
            </View>


            <View
              style={[
                styles.sectionLine,
                {
                  backgroundColor:
                    colors.cardBorder,
                },
              ]}
            />
          </View>
        )
      }
      renderItem={
        ({
          item,
        }) => (
          <PlayerRow
            player={
              item
            }
            teamId={
              teamId
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
          />
        )
      }
      ItemSeparatorComponent={() => (
        <View
          style={{
            height: 6,
          }}
        />
      )}
      SectionSeparatorComponent={() => (
        <View
          style={{
            height: 4,
          }}
        />
      )}
    />
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    list: {
      flex: 1,
    },


    sectionHeader: {
      minHeight: 36,

      flexDirection: 'row',
      alignItems: 'center',

      paddingHorizontal: 3,
      paddingTop: 6,

      gap: 7,
    },

    sectionTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 10.5,
    },

    sectionCount: {
      minWidth: 20,
      height: 20,

      borderRadius: 10,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 5,
    },

    sectionCountText: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize: 7.5,
    },

    sectionLine: {
      flex: 1,

      height:
        StyleSheet.hairlineWidth,
    },


    /* PLAYER */

    playerCard: {
      minHeight: 58,

      flexDirection: 'row',
      alignItems: 'center',

      borderWidth: 1,
      borderRadius: 13,

      paddingHorizontal: 9,
      paddingVertical: 6,
    },

    photo: {
      width: 42,
      height: 42,

      borderRadius: 21,

      marginRight: 8,
    },

    photoFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },

    photoInitials: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 9,
    },


    /* DORSAL MÁS PEQUEÑO */

    numberBox: {
      width: 24,
      height: 24,

      borderRadius: 7,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 8,
    },

    number: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize: 8.5,

      includeFontPadding: false,
    },


    playerInfo: {
      flex: 1,
      minWidth: 0,
    },

    playerName: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 11.5,
      lineHeight: 16,
    },

    playerMeta: {
      flexDirection: 'row',
      alignItems: 'center',

      marginTop: 1,
    },

    playerRole: {
      maxWidth: '68%',

      fontFamily:
        'Poppins-Regular',

      fontSize: 8,
    },

    metaDot: {
      width: 3,
      height: 3,

      borderRadius: 2,

      marginHorizontal: 5,

      opacity: 0.5,
    },

    playerNationality: {
      flex: 1,

      fontFamily:
        'Poppins-Regular',

      fontSize: 8,
    },

    chevron: {
      marginLeft: 6,

      fontFamily:
        'Poppins-Regular',

      fontSize: 18,
    },


    /* STATES */

    center: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      paddingHorizontal: 28,
      paddingBottom: 100,
    },

    stateIcon: {
      fontSize: 29,
      marginBottom: 8,
    },

    stateTitle: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize: 13,
    },

    stateText: {
      maxWidth: 280,

      marginTop: 5,

      fontFamily:
        'Poppins-Regular',

      fontSize: 9.5,
      lineHeight: 15,

      textAlign: 'center',
    },

    retryButton: {
      marginTop: 13,

      backgroundColor:
        BRAND.primary,

      borderRadius: 999,

      paddingHorizontal: 18,
      paddingVertical: 8,
    },

    retryText: {
      color: '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize: 10,
    },

  });