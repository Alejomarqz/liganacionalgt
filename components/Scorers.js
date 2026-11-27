// components/Scorers.js
// Liga Nacional GT
//
// Goleadores conectados exclusivamente al Núcleo propio.
//
// Fuente:
// /sistema/api/scorers.php
//
// Diseño:
// - Top 6
// - Fotos cuadradas desde player.photo
// - Solo goles
// - Mismo card para todos
// - #1 destacado únicamente por color/rango

import React, {
  Component,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SoccerBall,
  Trophy,
  CaretDown,
} from 'phosphor-react-native';

import Header from './Header';
import FooterTabs from './FooterTabs';
import AdFooter from '../ads/AdFooter';

import {
  getScorers,
} from '../services/ligaNacionalApi';

import {
  withTheme,
} from '../utils/ThemeContext';

import {
  BRAND,
} from '../utils/theme';


/* =========================================================
   CONSTANTES
========================================================= */

const GOLD = '#FFC83D';

const MAX_SCORERS = 6;

const FOOTER_HEIGHT = 60;


/* =========================================================
   HELPERS
========================================================= */

function normKey(value = '') {
  return String(value)
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


function fixTeamName(value = '') {
  const raw =
    String(
      value || '',
    ).trim();


  const key =
    normKey(raw);


  if (
    key ===
    'suchitepequez'
  ) {
    return 'Suchitepéquez';
  }


  return raw;
}


function initials(value = '') {
  return String(value)
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


function numberValue(
  ...values
) {
  const value =
    Number(
      firstValue(
        ...values,
      ),
    );


  return Number.isFinite(
    value,
  )
    ? value
    : 0;
}


/* =========================================================
   NORMALIZAR
========================================================= */

function normalizeScorer(
  row,
  index,
) {
  const player =
    row?.player &&
    typeof row.player ===
      'object'
      ? row.player
      : {};


  const team =
    row?.team &&
    typeof row.team ===
      'object'
      ? row.team
      : {};


  return {
    position:
      numberValue(
        row?.position,
        index + 1,
      ) ||
      index + 1,

    goals:
      numberValue(
        row?.goals,
        row?.goles,
      ),

    player: {
      id:
        numberValue(
          player?.id,
          row?.player_id,
          row?.playerId,
        ),

      name:
        String(
          firstValue(
            player?.name,
            row?.player_name,
            row?.playerName,
            'Jugador',
          ),
        ),

      slug:
        String(
          firstValue(
            player?.slug,
            '',
          ) || '',
        ),

      photo:
        firstValue(
          player?.photo,
          player?.photo_url,
          player?.photoUrl,
          row?.photo,
          null,
        ),

      role:
        String(
          firstValue(
            player?.role,
            '',
          ) || '',
        ),

      shirtNumber:
        firstValue(
          player?.shirtNumber,
          player?.shirt_number,
          null,
        ),
    },

    team: {
      id:
        numberValue(
          team?.id,
          row?.team_id,
          row?.teamId,
        ),

      name:
        fixTeamName(
          firstValue(
            team?.name,
            row?.team_name,
            row?.teamName,
            '',
          ),
        ),

      short:
        String(
          firstValue(
            team?.short,
            team?.short_name,
            '',
          ) || '',
        ),

      slug:
        String(
          firstValue(
            team?.slug,
            '',
          ) || '',
        ),

      logo:
        firstValue(
          team?.logo,
          team?.logo_url,
          team?.logoUrl,
          null,
        ),
    },
  };
}


function normalizeScorers(
  payload,
) {
  const source =
    Array.isArray(
      payload?.scorers,
    )
      ? payload.scorers
      : Array.isArray(
          payload?.data,
        )
        ? payload.data
        : Array.isArray(
            payload,
          )
          ? payload
          : [];


  return source
    .map(
      normalizeScorer,
    )
    .sort(
      (
        a,
        b,
      ) => {
        if (
          a.goals !==
          b.goals
        ) {
          return (
            b.goals -
            a.goals
          );
        }


        return (
          a.position -
          b.position
        );
      },
    )
    .slice(
      0,
      MAX_SCORERS,
    )
    .map(
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
   FOTO JUGADOR
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
    React.useState(false);


  React.useEffect(
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

        style={
          styles.playerPhoto
        }

        resizeMode="cover"

        onError={
          () =>
            setFailed(true)
        }
      />
    );
  }


  return (
    <View
      style={[
        styles.playerPhoto,
        styles.playerFallback,

        {
          backgroundColor:
            colors.cardBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.playerFallbackText,

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
   LOGO EQUIPO
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
    React.useState(false);


  React.useEffect(
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

        style={
          styles.teamLogo
        }

        resizeMode="contain"

        onError={
          () =>
            setFailed(true)
        }
      />
    );
  }


  return (
    <View
      style={[
        styles.teamLogo,
        styles.teamLogoFallback,

        {
          borderColor:
            colors.cardBorder,
        },
      ]}
    >
      <Text
        style={[
          styles.teamLogoFallbackText,

          {
            color:
              colors.textMuted,
          },
        ]}
      >
        {initials(name)
          .slice(
            0,
            1,
          ) ||
          '?'}
      </Text>
    </View>
  );
}


/* =========================================================
   RANK
========================================================= */

function RankBadge({
  position,
  isDark,
}) {
  const first =
    position === 1;


  return (
    <View
      style={[
        styles.rankBadge,

        {
          backgroundColor:
            first
              ? GOLD
              : isDark
                ? 'rgba(255,255,255,0.06)'
                : '#EEF4FC',
        },
      ]}
    >
      <Text
        style={[
          styles.rankText,

          {
            color:
              first
                ? '#17214F'
                : '#15245F',
          },
        ]}
      >
        {position}
      </Text>
    </View>
  );
}


/* =========================================================
   FILA GOLEADOR
========================================================= */

function ScorerRow({
  item,
  navigation,
  colors,
  isDark,
}) {
  const position =
    Number(
      item?.position ||
      0,
    );


  const goals =
    Number(
      item?.goals ||
      0,
    );


  const player =
    item?.player ||
    {};


  const team =
    item?.team ||
    {};


  const first =
    position === 1;


  const openPlayer =
    () => {
      const playerId =
        Number(
          player?.id ||
          0,
        );


      if (!playerId) {
        return;
      }


      navigation?.navigate?.(
        'Player',
        {
          playerId,

          teamId:
            Number(
              team?.id ||
              0,
            ),

          scope:
            'guatemala',

          playerName:
            player?.name ||
            '',

          player: {
            id:
              playerId,

            name:
              player?.name ||
              '',

            photo:
              player?.photo ||
              null,

            role:
              player?.role ||
              '',

            shirtNumber:
              player?.shirtNumber ??
              null,
          },

          team: {
            id:
              Number(
                team?.id ||
                0,
              ),

            name:
              team?.name ||
              '',

            short:
              team?.short ||
              '',

            logo:
              team?.logo ||
              null,
          },
        },
      );
    };


  return (
    <TouchableOpacity
      activeOpacity={
        0.78
      }

      onPress={
        openPlayer
      }

      style={[
        styles.scorerCard,

        {
          backgroundColor:
            first
              ? isDark
                ? 'rgba(255,200,61,0.07)'
                : '#FFFDF8'
              : colors.cardBg,

          borderColor:
            first
              ? isDark
                ? 'rgba(255,200,61,0.22)'
                : '#F3E5B4'
              : colors.cardBorder,

          shadowColor:
            isDark
              ? '#000000'
              : '#213467',
        },
      ]}
    >

      {/* POSICIÓN */}

      <RankBadge
        position={
          position
        }

        isDark={
          isDark
        }
      />


      {/* FOTO */}

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


      {/* INFO */}

      <View
        style={
          styles.playerInfo
        }
      >

        <Text
          numberOfLines={2}

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
            styles.teamRow
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
            numberOfLines={1}

            style={[
              styles.teamName,

              {
                color:
                  colors.text,
              },
            ]}
          >
            {team?.name ||
              'Equipo'}
          </Text>

        </View>

      </View>


      {/* GOLES */}

      <View
        style={
          styles.goalsColumn
        }
      >

        <Text
          style={[
            styles.goalsNumber,

            {
              color:
                colors.text,
            },
          ]}
        >
          {goals}
        </Text>


        <Text
          style={[
            styles.goalsText,

            {
              color:
                colors.textMuted,
            },
          ]}
        >
          {goals === 1
            ? 'gol'
            : 'goles'}
        </Text>

      </View>

    </TouchableOpacity>
  );
}


/* =========================================================
   HEADER DE CONTENIDO
========================================================= */

function ScreenIntro({
  colors,
  isDark,
}) {
  return (
    <View
      style={
        styles.intro
      }
    >

      <View
        style={
          styles.introTitleSide
        }
      >

        <View
          style={[
            styles.ballIconWrap,

            {
              backgroundColor:
                isDark
                  ? 'rgba(24,190,85,0.13)'
                  : '#FFFFFF',

              borderColor:
                isDark
                  ? 'rgba(255,255,255,0.08)'
                  : '#EDF1F7',
            },
          ]}
        >
          <SoccerBall
            size={28}
            weight="fill"
            color="#17B956"
          />
        </View>


        <View
          style={
            styles.introText
          }
        >
          <Text
            style={[
              styles.screenTitle,

              {
                color:
                  colors.text,
              },
            ]}
          >
            Goleadores
          </Text>


          <Text
            style={[
              styles.screenSubtitle,

              {
                color:
                  colors.textMuted,
              },
            ]}
          >
            Top 6 del torneo
          </Text>
        </View>

      </View>


      <View
        style={
          styles.filters
        }
      >

        <View
          style={[
            styles.filterPill,

            {
              backgroundColor:
                colors.cardBg,

              borderColor:
                colors.cardBorder,
            },
          ]}
        >
          <Trophy
            size={14}
            weight="fill"
            color={BRAND.primary}
          />

          <Text
            numberOfLines={1}

            style={
              styles.filterText
            }
          >
            Liga Nacional GT
          </Text>

          <CaretDown
            size={11}
            weight="bold"
            color={BRAND.primary}
          />
        </View>


        <View
          style={[
            styles.tournamentPill,

            {
              backgroundColor:
                colors.cardBg,

              borderColor:
                colors.cardBorder,
            },
          ]}
        >
          <Text
            numberOfLines={1}

            style={
              styles.filterText
            }
          >
            Apertura
          </Text>

          <CaretDown
            size={11}
            weight="bold"
            color={BRAND.primary}
          />
        </View>

      </View>

    </View>
  );
}


/* =========================================================
   SCREEN
========================================================= */

class Scorers extends Component {

  state = {
    scorers: [],

    loading:
      true,

    refreshing:
      false,

    error:
      '',
  };


  mounted =
    false;


  componentDidMount() {
    this.mounted =
      true;

    this.load();
  }


  componentWillUnmount() {
    this.mounted =
      false;
  }


  /* =======================================================
     LOAD
  ======================================================= */

  load =
    async ({
      refresh =
        false,
    } = {}) => {

      if (refresh) {
        this.setState({
          refreshing:
            true,

          error:
            '',
        });

      } else {
        this.setState({
          loading:
            true,

          error:
            '',
        });
      }


      try {
        const payload =
          await getScorers();


        const scorers =
          normalizeScorers(
            payload,
          );


        if (
          !this.mounted
        ) {
          return;
        }


        this.setState({
          scorers,

          error:
            '',
        });


      } catch (
        error
      ) {
        console.warn(
          '[Scorers]',
          error?.message ||
          error,
        );


        if (
          this.mounted
        ) {
          this.setState({
            error:
              'No se pudieron cargar los goleadores.',
          });
        }


      } finally {
        if (
          this.mounted
        ) {
          this.setState({
            loading:
              false,

            refreshing:
              false,
          });
        }
      }
    };


  refresh =
    () => {
      this.load({
        refresh:
          true,
      });
    };


  /* =======================================================
     RENDER ITEM
  ======================================================= */

  renderItem =
    ({
      item,
    }) => {
      const {
        navigation,
        theme,
      } =
        this.props;


      return (
        <ScorerRow
          item={
            item
          }

          navigation={
            navigation
          }

          colors={
            theme.colors
          }

          isDark={
            theme.mode ===
            'dark'
          }
        />
      );
    };


  keyExtractor =
    (
      item,
      index,
    ) =>
      String(
        item?.player?.id ||
        `scorer-${index}`,
      );


  /* =======================================================
     RENDER
  ======================================================= */

  render() {
    const {
      scorers,
      loading,
      refreshing,
      error,
    } =
      this.state;


    const {
      navigation,
      theme,
    } =
      this.props;


    const colors =
      theme.colors;


    const isDark =
      theme.mode ===
      'dark';


    return (
      <SafeAreaView
        style={[
          styles.screen,

          {
            backgroundColor:
              colors.screenBg,
          },
        ]}
      >

        {/* HEADER GENERAL */}

        <Header
          navigation={
            navigation
          }

          showLogo

          logoName="Liga Nacional GT"

          logoSource={
            require(
              '../resources/logos/app-logo.png',
            )
          }

          logoSize={32}

          showSearch

          onSearchPress={
            () =>
              navigation?.navigate?.(
                'Teams',
              )
          }

          showSettings

          onSettingsPress={
            () =>
              navigation?.navigate?.(
                'Settings',
              )
          }

          disableBack
        />


        {/* CONTENIDO */}

        {loading ? (

          <View
            style={
              styles.center
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
              Cargando goleadores…
            </Text>
          </View>

        ) : error &&
          !scorers.length ? (

          <View
            style={
              styles.center
            }
          >
            <SoccerBall
              size={34}
              color={
                BRAND.primary
              }
              weight="duotone"
            />

            <Text
              style={[
                styles.errorTitle,

                {
                  color:
                    colors.text,
                },
              ]}
            >
              No se pudo cargar
            </Text>

            <Text
              style={[
                styles.errorText,

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

              onPress={
                () =>
                  this.load()
              }

              style={[
                styles.retryButton,

                {
                  backgroundColor:
                    BRAND.primary,
                },
              ]}
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

        ) : (

          <FlatList
            data={
              scorers
            }

            keyExtractor={
              this.keyExtractor
            }

            renderItem={
              this.renderItem
            }

            showsVerticalScrollIndicator={
              false
            }

            ListHeaderComponent={
              <ScreenIntro
                colors={
                  colors
                }

                isDark={
                  isDark
                }
              />
            }

            contentContainerStyle={
              styles.listContent
            }

            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }

                onRefresh={
                  this.refresh
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

            ListEmptyComponent={
              <View
                style={
                  styles.empty
                }
              >
                <SoccerBall
                  size={34}
                  weight="duotone"
                  color={
                    BRAND.primary
                  }
                />

                <Text
                  style={[
                    styles.emptyTitle,

                    {
                      color:
                        colors.text,
                    },
                  ]}
                >
                  Todavía no hay goleadores
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
                  Los goles registrados aparecerán aquí automáticamente.
                </Text>
              </View>
            }

            ListFooterComponent={
              <View
                style={
                  styles.adWrap
                }
              >
                <AdFooter />
              </View>
            }
          />
        )}


        {/* BOTTOM MENU */}

        <View
          style={[
            styles.footerFixed,

            {
              backgroundColor:
                colors.cardBg,

              borderTopColor:
                colors.cardBorder,
            },
          ]}
        >
          <FooterTabs
            navigation={
              navigation
            }

            routeName="Scorers"
          />
        </View>

      </SafeAreaView>
    );
  }
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


    listContent: {
      paddingHorizontal:
        12,

      paddingBottom:
        FOOTER_HEIGHT +
        70,
    },


    /* =====================================================
       INTRO
    ===================================================== */

    intro: {
      paddingTop:
        14,

      paddingBottom:
        14,
    },


    introTitleSide: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginBottom:
        12,
    },


    ballIconWrap: {
      width:
        50,

      height:
        50,

      borderRadius:
        15,

      borderWidth:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        10,
    },


    introText: {
      flex:
        1,
    },


    screenTitle: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        24,

      lineHeight:
        29,

      includeFontPadding:
        false,
    },


    screenSubtitle: {
      marginTop:
        1,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        13,

      lineHeight:
        18,

      includeFontPadding:
        false,
    },


    filters: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,
    },


    filterPill: {
      flex:
        1,

      height:
        40,

      borderRadius:
        16,

      borderWidth:
        1,

      paddingHorizontal:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,
    },


    tournamentPill: {
      width:
        102,

      height:
        40,

      borderRadius:
        16,

      borderWidth:
        1,

      paddingHorizontal:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,
    },


    filterText: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10,

      includeFontPadding:
        false,
    },


    /* =====================================================
       CARDS
    ===================================================== */

    scorerCard: {
      minHeight:
        102,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius:
        18,

      borderWidth:
        1,

      paddingHorizontal:
        13,

      paddingVertical:
        10,

      marginBottom:
        10,

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


    /* Rank */

    rankBadge: {
      width:
        42,

      height:
        42,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        11,
    },


    rankText: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        17,

      includeFontPadding:
        false,
    },


    /* Foto */

    playerPhoto: {
      width:
        76,

      height:
        76,

      borderRadius:
        15,

      marginRight:
        14,
    },


    playerFallback: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },


    playerFallbackText: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        16,

      includeFontPadding:
        false,
    },


    /* Info */

    playerInfo: {
      flex:
        1,

      minWidth:
        0,

      paddingRight:
        8,
    },


    playerName: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        15,

      lineHeight:
        19,

      includeFontPadding:
        false,
    },


    teamRow: {
      marginTop:
        6,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    teamLogo: {
      width:
        27,

      height:
        27,

      marginRight:
        7,
    },


    teamLogoFallback: {
      borderWidth:
        1,

      borderRadius:
        7,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    teamLogoFallbackText: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        8,
    },


    teamName: {
      flex:
        1,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        11.5,

      lineHeight:
        16,

      includeFontPadding:
        false,
    },


    /* Goles */

    goalsColumn: {
      width:
        55,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    goalsNumber: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        27,

      lineHeight:
        31,

      includeFontPadding:
        false,
    },


    goalsText: {
      marginTop:
        1,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10,

      lineHeight:
        13,

      includeFontPadding:
        false,
    },


    /* =====================================================
       ESTADOS
    ===================================================== */

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
        FOOTER_HEIGHT,
    },


    loadingText: {
      marginTop:
        8,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        11,
    },


    errorTitle: {
      marginTop:
        8,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        14,
    },


    errorText: {
      marginTop:
        3,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10,

      textAlign:
        'center',
    },


    retryButton: {
      marginTop:
        14,

      borderRadius:
        999,

      paddingHorizontal:
        20,

      paddingVertical:
        9,
    },


    retryButtonText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        11,
    },


    empty: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingVertical:
        60,

      paddingHorizontal:
        25,
    },


    emptyTitle: {
      marginTop:
        8,

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
        10,

      lineHeight:
        15,

      textAlign:
        'center',
    },


    /* =====================================================
       ADS
    ===================================================== */

    adWrap: {
      marginTop:
        4,

      marginBottom:
        8,
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

      borderTopWidth:
        StyleSheet.hairlineWidth,
    },

  });


export default withTheme(
  Scorers,
);