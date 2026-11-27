// components/LineupsTeamBlock.js
// Liga Nacional GT
//
// Alineaciones del partido.
// - Solo titulares.
// - Sin suplentes.
// - Sin inferir posiciones.
// - Mantiene navegación al perfil del jugador.
// - Diseño integrado al nuevo centro de partido.

import React, {
  memo,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Image,
} from 'react-native';

import {
  CheckCircle,
  Users,
} from 'phosphor-react-native';

import {
  useTheme,
} from '../utils/ThemeContext';

import {
  BRAND,
} from '../utils/theme';


/* =========================================================
   HELPERS
========================================================= */

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


function buildTeam(
  data,
  side,
) {
  const team =
    data?.teams?.[side] ||
    {};

  const raw =
    Array.isArray(
      data?.lineups?.[side]
        ?.starters,
    )
      ? data.lineups[side]
          .starters
      : [];

  return {
    id:
      Number(
        team?.id ||
        0,
      ),

    name:
      String(
        team?.name ||
        (
          side === 'home'
            ? 'Local'
            : 'Visitante'
        ),
      ),

    short:
      String(
        team?.short ||
        '',
      ),

    logo:
      team?.logo ||
      team?.logo_url ||
      null,

    formation:
      String(
        data?.formations?.[
          side
        ] ||
        '',
      ),

    confirmed:
      data?.lineupConfirmed?.[
        side
      ] === true,

    starters:
      raw
        .slice(
          0,
          11,
        )
        .map(
          player => ({
            id:
              Number(
                player?.id ||
                0,
              ),

            name:
              String(
                player?.name ||
                'Jugador',
              ),

            shirtNumber:
              player?.shirtNumber ??
              player?.shirt_number ??
              player?.number ??
              null,
          }),
        ),
  };
}


/* =========================================================
   LOGO
========================================================= */

function TeamLogo({
  uri,
  name,
  size = 42,
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
        resizeMode="contain"
        onError={
          () =>
            setFailed(
              true,
            )
        }
        style={{
          width:
            size,

          height:
            size,
        }}
      />
    );
  }

  return (
    <View
      style={[
        styles.logoFallback,
        {
          width:
            size,

          height:
            size,

          borderRadius:
            12,
        },
      ]}
    >
      <Text
        style={
          styles.logoFallbackText
        }
      >
        {initials(
          name,
        ) || '?'}
      </Text>
    </View>
  );
}


/* =========================================================
   SELECTOR DE EQUIPO
========================================================= */

function TeamSelector({
  active,
  setActive,
  home,
  away,
}) {
  const anim =
    useRef(
      new Animated.Value(
        active === 'home'
          ? 0
          : 1,
      ),
    ).current;

  const change =
    key => {
      Animated.spring(
        anim,
        {
          toValue:
            key === 'home'
              ? 0
              : 1,

          useNativeDriver:
            false,

          speed:
            22,

          bounciness:
            3,
        },
      ).start();

      setActive(
        key,
      );
    };

  return (
    <View
      style={
        styles.selectorOuter
      }
    >
      <View
        style={
          styles.selector
        }
      >
        <Animated.View
          style={[
            styles.selectorThumb,
            {
              left:
                anim.interpolate({
                  inputRange: [
                    0,
                    1,
                  ],

                  outputRange: [
                    '1%',
                    '50%',
                  ],
                }),
            },
          ]}
        />

        <Pressable
          onPress={
            () =>
              change(
                'home',
              )
          }
          style={
            styles.selectorTab
          }
        >
          <View
            style={
              styles.selectorTeam
            }
          >
            <TeamLogo
              uri={
                home.logo
              }
              name={
                home.name
              }
              size={27}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.selectorText,

                active ===
                  'home' &&
                styles.selectorTextActive,
              ]}
            >
              {home.name}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={
            () =>
              change(
                'away',
              )
          }
          style={
            styles.selectorTab
          }
        >
          <View
            style={
              styles.selectorTeam
            }
          >
            <TeamLogo
              uri={
                away.logo
              }
              name={
                away.name
              }
              size={27}
            />

            <Text
              numberOfLines={1}
              style={[
                styles.selectorText,

                active ===
                  'away' &&
                styles.selectorTextActive,
              ]}
            >
              {away.name}
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}


/* =========================================================
   JUGADOR
========================================================= */

function PlayerRow({
  player,
  index,
  colors,
  onPress,
}) {
  const hasId =
    !!player?.id;

  return (
    <Pressable
      disabled={
        !hasId
      }
      onPress={
        onPress
      }
      android_ripple={{
        color:
          colors.cardBorder,
      }}
      style={[
        styles.playerRow,

        index > 0 && {
          borderTopWidth:
            StyleSheet.hairlineWidth,

          borderTopColor:
            colors.cardBorder,
        },
      ]}
    >
      <View
        style={
          styles.playerOrder
        }
      >
        <Text
          style={
            styles.playerOrderText
          }
        >
          {index + 1}
        </Text>
      </View>

      <View
        style={
          styles.shirtBox
        }
      >
        <Text
          style={
            styles.shirtNumber
          }
        >
          {player
            ?.shirtNumber ??
            '—'}
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
          {player.name}
        </Text>

        <Text
          style={[
            styles.playerMeta,
            {
              color:
                colors.textMuted,
            },
          ]}
        >
          Titular
        </Text>
      </View>

      {hasId && (
        <View
          style={
            styles.playerArrow
          }
        >
          <Text
            style={
              styles.playerArrowText
            }
          >
            ›
          </Text>
        </View>
      )}
    </Pressable>
  );
}


/* =========================================================
   MAIN
========================================================= */

function LineupsTeamBlock({
  data,
  navigation,
}) {
  const {
    theme,
  } =
    useTheme();

  const colors =
    theme.colors;

  const [
    active,
    setActive,
  ] =
    useState(
      'home',
    );

  const home =
    buildTeam(
      data,
      'home',
    );

  const away =
    buildTeam(
      data,
      'away',
    );

  const current =
    active === 'home'
      ? home
      : away;

  const openPlayer =
    player => {
      if (
        !player?.id ||
        !current?.id
      ) {
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
                current.id,
              ),
          },
        );
    };

  return (
    <View
      style={
        styles.screen
      }
    >
      {/* TÍTULO */}

      <View
        style={
          styles.pageHeader
        }
      >
        <View>
          <Text
            style={
              styles.pageTitle
            }
          >
            Alineaciones
          </Text>

          <Text
            style={
              styles.pageSubtitle
            }
          >
            Titulares registrados para el encuentro
          </Text>
        </View>

        <View
          style={
            styles.playersCountBadge
          }
        >
          <Users
            size={16}
            color={
              BRAND.primary
            }
            weight="fill"
          />

          <Text
            style={
              styles.playersCountText
            }
          >
            11
          </Text>
        </View>
      </View>

      {/* SELECTOR */}

      <TeamSelector
        active={
          active
        }
        setActive={
          setActive
        }
        home={
          home
        }
        away={
          away
        }
      />

      {/* CARD PRINCIPAL */}

      <View
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
            styles.teamHeader
          }
        >
          <View
            style={
              styles.teamIdentity
            }
          >
            <View
              style={
                styles.teamLogoShell
              }
            >
              <TeamLogo
                uri={
                  current.logo
                }
                name={
                  current.name
                }
                size={43}
              />
            </View>

            <View
              style={
                styles.teamTitleWrap
              }
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.teamName,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                {current.name}
              </Text>

              <Text
                style={[
                  styles.teamSubtitle,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                Equipo titular
              </Text>
            </View>
          </View>

          <View
            style={
              styles.teamBadges
            }
          >
            {!!current
              .formation && (
              <View
                style={
                  styles.formationBadge
                }
              >
                <Text
                  style={
                    styles.formationText
                  }
                >
                  {
                    current
                      .formation
                  }
                </Text>
              </View>
            )}

            {current
              .confirmed && (
              <View
                style={
                  styles.officialBadge
                }
              >
                <CheckCircle
                  size={13}
                  color="#14985A"
                  weight="fill"
                />

                <Text
                  style={
                    styles.officialText
                  }
                >
                  Oficial
                </Text>
              </View>
            )}
          </View>
        </View>

        {current
          .starters
          .length ? (
          <>
            <View
              style={
                styles.listHeader
              }
            >
              <Text
                style={
                  styles.listHeaderLeft
                }
              >
                TITULARES
              </Text>

              <Text
                style={
                  styles.listHeaderRight
                }
              >
                {
                  current
                    .starters
                    .length
                } jugadores
              </Text>
            </View>

            <View
              style={
                styles.playersList
              }
            >
              {current
                .starters
                .map(
                  (
                    player,
                    index,
                  ) => (
                    <PlayerRow
                      key={
                        player.id ||
                        `${active}-${index}`
                      }
                      player={
                        player
                      }
                      index={
                        index
                      }
                      colors={
                        colors
                      }
                      onPress={
                        () =>
                          openPlayer(
                            player,
                          )
                      }
                    />
                  ),
                )}
            </View>
          </>

        ) : (
          <View
            style={
              styles.empty
            }
          >
            <View
              style={
                styles.emptyIcon
              }
            >
              <Users
                size={27}
                color={
                  BRAND.primary
                }
                weight="duotone"
              />
            </View>

            <Text
              style={[
                styles.emptyTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Alineación pendiente
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
              Los titulares aparecerán cuando sean registrados oficialmente.
            </Text>
          </View>
        )}
      </View>

      {/* AVISO */}

      {!current
        .confirmed &&
      current
        .starters
        .length >
        0 && (
        <View
          style={
            styles.pendingNotice
          }
        >
          <Text
            style={
              styles.pendingNoticeTitle
            }
          >
            Alineación aún no confirmada
          </Text>

          <Text
            style={
              styles.pendingNoticeText
            }
          >
            La lista puede cambiar hasta que el equipo publique su alineación oficial.
          </Text>
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

    screen: {
      paddingBottom:
        28,
    },


    /* =====================================================
       HEADER
    ===================================================== */

    pageHeader: {
      minHeight:
        48,

      paddingHorizontal:
        2,

      marginBottom:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    pageTitle: {
      color:
        '#111A43',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        15,
    },


    pageSubtitle: {
      marginTop:
        1,

      color:
        '#7986A3',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        8.5,
    },


    playersCountBadge: {
      minWidth:
        52,

      height:
        32,

      paddingHorizontal:
        9,

      borderRadius:
        16,

      backgroundColor:
        '#EEF4FF',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,
    },


    playersCountText: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        9,
    },


    /* =====================================================
       SELECTOR
    ===================================================== */

    selectorOuter: {
      marginBottom:
        11,

      borderRadius:
        19,

      padding:
        5,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#E1E7F0',

      shadowColor:
        '#17294D',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.04,

      shadowRadius:
        8,

      elevation:
        2,
    },


    selector: {
      height:
        52,

      borderRadius:
        15,

      backgroundColor:
        '#F1F4F9',

      flexDirection:
        'row',

      alignItems:
        'center',

      position:
        'relative',

      overflow:
        'hidden',
    },


    selectorThumb: {
      position:
        'absolute',

      top:
        4,

      bottom:
        4,

      width:
        '49%',

      borderRadius:
        13,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#DCE4F0',

      shadowColor:
        '#10234C',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.08,

      shadowRadius:
        5,

      elevation:
        2,
    },


    selectorTab: {
      flex:
        1,

      height:
        '100%',

      zIndex:
        2,

      justifyContent:
        'center',

      paddingHorizontal:
        8,
    },


    selectorTeam: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,
    },


    selectorText: {
      flexShrink:
        1,

      color:
        '#74809D',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9.5,
    },


    selectorTextActive: {
      color:
        '#111A43',

      fontFamily:
        'Poppins-Bold',
    },


    /* =====================================================
       CARD
    ===================================================== */

    card: {
      borderWidth:
        1,

      borderRadius:
        20,

      overflow:
        'hidden',

      shadowColor:
        '#17294D',

      shadowOffset: {
        width:
          0,

        height:
          4,
      },

      shadowOpacity:
        0.045,

      shadowRadius:
        10,

      elevation:
        2,
    },


    teamHeader: {
      minHeight:
        82,

      paddingHorizontal:
        13,

      paddingVertical:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        '#E4E9F1',
    },


    teamIdentity: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    teamLogoShell: {
      width:
        54,

      height:
        54,

      borderRadius:
        16,

      backgroundColor:
        '#F5F8FC',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        10,
    },


    teamTitleWrap: {
      flex:
        1,

      minWidth:
        0,
    },


    teamName: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        13.5,
    },


    teamSubtitle: {
      marginTop:
        2,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        8,
    },


    teamBadges: {
      marginLeft:
        8,

      alignItems:
        'flex-end',

      gap:
        5,
    },


    formationBadge: {
      minWidth:
        54,

      height:
        27,

      paddingHorizontal:
        9,

      borderRadius:
        999,

      backgroundColor:
        '#EEF4FF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    formationText: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        8.5,
    },


    officialBadge: {
      minHeight:
        26,

      paddingHorizontal:
        8,

      borderRadius:
        999,

      backgroundColor:
        '#ECFDF4',

      borderWidth:
        1,

      borderColor:
        '#C6F0D8',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        4,
    },


    officialText: {
      color:
        '#158355',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        7.5,
    },


    /* =====================================================
       LIST
    ===================================================== */

    listHeader: {
      minHeight:
        37,

      paddingHorizontal:
        13,

      backgroundColor:
        '#F8FAFD',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        StyleSheet.hairlineWidth,

      borderBottomColor:
        '#E5EAF2',
    },


    listHeaderLeft: {
      color:
        '#697897',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        7,

      letterSpacing:
        0.7,
    },


    listHeaderRight: {
      color:
        '#8590A9',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        7.5,
    },


    playersList: {
      backgroundColor:
        '#FFFFFF',
    },


    playerRow: {
      minHeight:
        58,

      paddingHorizontal:
        12,

      paddingVertical:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    playerOrder: {
      width:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        5,
    },


    playerOrderText: {
      color:
        '#95A0B5',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        7.5,
    },


    shirtBox: {
      width:
        36,

      height:
        36,

      borderRadius:
        11,

      backgroundColor:
        '#EEF4FF',

      borderWidth:
        1,

      borderColor:
        '#DFE9FF',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        10,
    },


    shirtNumber: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        11,
    },


    playerInfo: {
      flex:
        1,

      minWidth:
        0,
    },


    playerName: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10.5,
    },


    playerMeta: {
      marginTop:
        1,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        7.5,
    },


    playerArrow: {
      width:
        30,

      height:
        30,

      borderRadius:
        15,

      backgroundColor:
        '#F5F7FA',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft:
        6,
    },


    playerArrowText: {
      marginTop:
        -2,

      color:
        '#7583A0',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        21,
    },


    /* =====================================================
       EMPTY
    ===================================================== */

    empty: {
      minHeight:
        230,

      paddingHorizontal:
        24,

      paddingVertical:
        35,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    emptyIcon: {
      width:
        64,

      height:
        64,

      borderRadius:
        32,

      backgroundColor:
        '#EEF4FF',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        13,
    },


    emptyTitle: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        13.5,
    },


    emptyText: {
      maxWidth:
        270,

      marginTop:
        4,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        9,

      lineHeight:
        15,

      textAlign:
        'center',
    },


    /* =====================================================
       NOTICE
    ===================================================== */

    pendingNotice: {
      marginTop:
        11,

      minHeight:
        68,

      borderRadius:
        16,

      borderWidth:
        1,

      borderColor:
        '#F2E1B4',

      backgroundColor:
        '#FFF9EA',

      paddingHorizontal:
        13,

      paddingVertical:
        10,
    },


    pendingNoticeTitle: {
      color:
        '#8C6500',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9.5,
    },


    pendingNoticeText: {
      marginTop:
        2,

      color:
        '#9A7B31',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        8,

      lineHeight:
        13,
    },


    /* =====================================================
       LOGO FALLBACK
    ===================================================== */

    logoFallback: {
      backgroundColor:
        '#EDF2F8',

      borderWidth:
        1,

      borderColor:
        '#DDE5F0',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    logoFallbackText: {
      color:
        '#637291',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        8,
    },

  });


export default memo(
  LineupsTeamBlock,
);