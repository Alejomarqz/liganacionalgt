// components/NewsCarousel.js
// Liga Nacional GT
//
// Bloque compacto para Home:
// Últimas noticias + Tabla de posiciones
//
// Mantiene el nombre NewsCarousel para no crear
// archivos adicionales ni tocar imports innecesariamente.

import React, {
  useCallback,
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
  ChartBar,
} from 'phosphor-react-native';

import {
  useTheme,
} from '../utils/ThemeContext';

import {
  getCached,
  setCached,
} from '../utils/dataCache';

import {
  getStandings,
} from '../services/ligaNacionalApi';


/* =========================================================
   CONFIG
========================================================= */

const WP_API =
  'https://liganacionalgt.com/wp-json/wp/v2/posts?per_page=4&_embed';

const NEWS_CACHE =
  'home_compact_news';

const STANDINGS_CACHE =
  'home_compact_standings';


/* =========================================================
   HELPERS
========================================================= */

function decodeHtml(html) {
  return String(
    html || '',
  )
    .replace(
      /&#8217;/g,
      "'",
    )
    .replace(
      /&#8216;/g,
      "'",
    )
    .replace(
      /&#8220;/g,
      '"',
    )
    .replace(
      /&#8221;/g,
      '"',
    )
    .replace(
      /&#8211;/g,
      '–',
    )
    .replace(
      /&#8212;/g,
      '—',
    )
    .replace(
      /&#8230;/g,
      '…',
    )
    .replace(
      /&#038;/g,
      '&',
    )
    .replace(
      /&amp;/g,
      '&',
    )
    .replace(
      /&lt;/g,
      '<',
    )
    .replace(
      /&gt;/g,
      '>',
    )
    .replace(
      /&quot;/g,
      '"',
    )
    .replace(
      /&#039;/g,
      "'",
    )
    .replace(
      /<[^>]*>/g,
      '',
    )
    .trim();
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

  return 0;
}


function getImageUrl(post) {
  try {
    const media =
      post?._embedded
        ?.[
          'wp:featuredmedia'
        ]?.[0];

    return (
      media
        ?.media_details
        ?.sizes
        ?.large
        ?.source_url ||

      media
        ?.media_details
        ?.sizes
        ?.medium_large
        ?.source_url ||

      media
        ?.media_details
        ?.sizes
        ?.medium
        ?.source_url ||

      media
        ?.source_url ||

      null
    );

  } catch {
    return null;
  }
}


function fixTeamName(
  value = '',
) {
  const raw =
    String(
      value || '',
    ).trim();

  const normalized =
    raw
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

  if (
    normalized ===
    'suchitepequez'
  ) {
    return 'Suchitepéquez';
  }

  return raw;
}


function normalizeStandings(
  payload,
) {
  let source = [];


  if (
    Array.isArray(payload)
  ) {
    source =
      payload;

  } else {
    const candidates = [
      payload?.standings,
      payload?.table,
      payload?.rows,
      payload?.data?.standings,
      payload?.data?.table,
      payload?.data?.rows,
      payload?.data,
    ];


    for (
      const candidate of candidates
    ) {
      if (
        Array.isArray(
          candidate,
        )
      ) {
        source =
          candidate;

        break;
      }
    }
  }


  const normalized =
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


        return {
          position:
            numberValue(
              row?.position,
              row?.rank,
              row?.pos,
              index + 1,
            ),

          points:
            numberValue(
              row?.points,
              row?.pts,
              row?.puntos,
            ),

          team: {
            id:
              numberValue(
                rawTeam?.id,
                row?.team_id,
                row?.teamId,
                row?.id,
              ),

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
        };
      },
    );


  normalized.sort(
    (
      a,
      b,
    ) => {
      if (
        a.position !==
        b.position
      ) {
        return (
          a.position -
          b.position
        );
      }

      return (
        b.points -
        a.points
      );
    },
  );


  return normalized
    .slice(
      0,
      3,
    );
}


/* =========================================================
   TEAM LOGO
========================================================= */

function TeamLogo({
  team,
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
    [
      team?.logo,
    ],
  );


  if (
    team?.logo &&
    !failed
  ) {
    return (
      <Image
        source={{
          uri:
            team.logo,
        }}

        resizeMode="contain"

        style={
          styles.teamLogo
        }

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
        styles.teamLogoFallback,
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
          styles.teamLogoFallbackText,
          {
            color:
              colors.textMuted,
          },
        ]}
      >
        {String(
          team?.name ||
          '?',
        )
          .charAt(0)
          .toUpperCase()}
      </Text>
    </View>
  );
}


/* =========================================================
   COMPONENT
========================================================= */

export default function NewsCarousel({
  navigation,
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


  const [
    posts,
    setPosts,
  ] =
    useState([]);


  const [
    standings,
    setStandings,
  ] =
    useState([]);


  const [
    loadingNews,
    setLoadingNews,
  ] =
    useState(true);


  const [
    loadingStandings,
    setLoadingStandings,
  ] =
    useState(true);


  /* =======================================================
     NEWS
  ======================================================= */

  const loadNews =
    useCallback(
      async () => {
        const cached =
          getCached(
            NEWS_CACHE,
            10 *
            60 *
            1000,
          );


        if (
          cached &&
          Array.isArray(
            cached,
          )
        ) {
          setPosts(
            cached,
          );

          setLoadingNews(
            false,
          );
        }


        try {
          const response =
            await fetch(
              WP_API,
              {
                headers: {
                  'Cache-Control':
                    'no-cache',
                },
              },
            );


          if (
            !response.ok
          ) {
            throw new Error(
              `HTTP ${response.status}`,
            );
          }


          const data =
            await response.json();


          if (
            Array.isArray(data)
          ) {
            setPosts(
              data,
            );

            setCached(
              NEWS_CACHE,
              data,
            );
          }


        } catch (error) {
          console.warn(
            '[HomeBottom] news:',
            error?.message ||
            error,
          );


        } finally {
          setLoadingNews(
            false,
          );
        }
      },
      [],
    );


  /* =======================================================
     STANDINGS
  ======================================================= */

  const loadStandings =
    useCallback(
      async () => {
        const cached =
          getCached(
            STANDINGS_CACHE,
            5 *
            60 *
            1000,
          );


        if (
          cached &&
          Array.isArray(
            cached,
          )
        ) {
          setStandings(
            cached,
          );

          setLoadingStandings(
            false,
          );
        }


        try {
          const payload =
            await getStandings();


          const rows =
            normalizeStandings(
              payload,
            );


          setStandings(
            rows,
          );


          setCached(
            STANDINGS_CACHE,
            rows,
          );


        } catch (error) {
          console.warn(
            '[HomeBottom] standings:',
            error?.message ||
            error,
          );


        } finally {
          setLoadingStandings(
            false,
          );
        }
      },
      [],
    );


  useEffect(
    () => {
      loadNews();

      loadStandings();
    },
    [
      loadNews,
      loadStandings,
    ],
  );


  /* =======================================================
     CURRENT NEWS
  ======================================================= */

  const currentPost =
    useMemo(
      () =>
        posts?.[0] ||
        null,
      [
        posts,
      ],
    );


  const newsImage =
    getImageUrl(
      currentPost,
    );


  const newsTitle =
    decodeHtml(
      currentPost
        ?.title
        ?.rendered ||
      '',
    );


  /* =======================================================
     ACTIONS
  ======================================================= */

  const openNews =
    useCallback(
      () => {
        const url =
          currentPost?.link;


        if (!url) {
          return;
        }


        navigation
          ?.navigate?.(
            'Webview',
            {
              url,

              title:
                newsTitle ||
                'Noticia',
            },
          );
      },
      [
        navigation,
        currentPost,
        newsTitle,
      ],
    );


  const openPositions =
    useCallback(
      () => {
        navigation
          ?.navigate?.(
            'Positions',
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
        styles.wrapper,
        style,
      ]}
    >

      {/* ===================================================
          NOTICIA
      =================================================== */}

      <TouchableOpacity
        activeOpacity={
          0.92
        }

        onPress={
          openNews
        }

        disabled={
          !currentPost
        }

        style={[
          styles.newsCard,
          {
            backgroundColor:
              isDark
                ? '#131824'
                : '#0E2347',

            borderColor:
              colors.cardBorder,
          },
        ]}
      >

        {loadingNews ? (
          <View
            style={
              styles.loading
            }
          >
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          </View>

        ) : newsImage ? (
          <Image
            source={{
              uri:
                newsImage,
            }}

            resizeMode="cover"

            style={
              StyleSheet.absoluteFillObject
            }
          />

        ) : (
          <View
            style={
              styles.newsFallback
            }
          >
            <Text
              style={
                styles.newsFallbackLetter
              }
            >
              L
            </Text>
          </View>
        )}


        <View
          style={
            styles.newsDarkOverlay
          }
        />


        <Text
          style={
            styles.newsHeader
          }
        >
          Últimas noticias
        </Text>


        <View
          style={
            styles.newsBottom
          }
        >
          <Text
            numberOfLines={2}

            style={
              styles.newsTitle
            }
          >
            {newsTitle ||
              'Lo último de la Liga Nacional'}
          </Text>


          <View
            style={
              styles.newsArrowButton
            }
          >
            <Text
              style={
                styles.newsArrow
              }
            >
              ›
            </Text>
          </View>
        </View>

      </TouchableOpacity>


      {/* ===================================================
          POSICIONES
      =================================================== */}

      <View
        style={[
          styles.tableCard,
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
            styles.tableHeaderRow
          }
        >
          <View
            style={
              styles.tableHeaderLeft
            }
          >
            <View
              style={[
                styles.chartIcon,
                {
                  backgroundColor:
                    isDark
                      ? 'rgba(49,93,228,0.18)'
                      : '#EEF3FF',
                },
              ]}
            >
              <ChartBar
                size={16}
                weight="fill"
                color="#315DE4"
              />
            </View>


            <Text
              numberOfLines={1}

              style={[
                styles.tableTitle,
                {
                  color:
                    colors.text,
                },
              ]}
            >
              Tabla de posiciones
            </Text>
          </View>


          <TouchableOpacity
            activeOpacity={
              0.78
            }

            onPress={
              openPositions
            }

            style={[
              styles.moreButton,
              {
                borderColor:
                  '#BFD1FF',

                backgroundColor:
                  isDark
                    ? 'rgba(49,93,228,0.10)'
                    : '#F8FAFF',
              },
            ]}
          >
            <Text
              style={
                styles.moreButtonText
              }
            >
              Ver más
            </Text>
          </TouchableOpacity>
        </View>


        {loadingStandings &&
        !standings.length ? (
          <View
            style={
              styles.tableLoading
            }
          >
            <ActivityIndicator
              size="small"
              color="#315DE4"
            />
          </View>

        ) : (
          <View
            style={
              styles.rows
            }
          >
            {standings
              .slice(
                0,
                3,
              )
              .map(
                (
                  row,
                  index,
                ) => (
                  <TouchableOpacity
                    key={
                      row?.team?.id
                        ? `standing-${row.team.id}`
                        : `standing-${index}`
                    }

                    activeOpacity={
                      0.72
                    }

                    onPress={
                      () => {
                        if (
                          !row
                            ?.team
                            ?.id
                        ) {
                          return;
                        }


                        navigation
                          ?.navigate?.(
                            'TeamScreen',
                            {
                              teamId:
                                row.team.id,

                              teamName:
                                row.team.name,

                              scope:
                                'guatemala',
                            },
                          );
                      }
                    }

                    style={
                      styles.tableRow
                    }
                  >

                    <View
                      style={[
                        styles.rankCircle,
                        {
                          backgroundColor:
                            index === 0
                              ? '#EEF3FF'
                              : 'transparent',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.rankText,
                          {
                            color:
                              colors.text,
                          },
                        ]}
                      >
                        {row.position ||
                          index + 1}
                      </Text>
                    </View>


                    <TeamLogo
                      team={
                        row.team
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
                      {row
                        ?.team
                        ?.name ||
                        'Equipo'}
                    </Text>


                    <Text
                      style={[
                        styles.points,
                        {
                          color:
                            colors.text,
                        },
                      ]}
                    >
                      {row.points}
                    </Text>

                  </TouchableOpacity>
                ),
              )}
          </View>
        )}


        <TouchableOpacity
          activeOpacity={
            0.78
          }

          onPress={
            openPositions
          }

          style={
            styles.tableArrow
          }
        >
          <Text
            style={
              styles.tableArrowText
            }
          >
            ›
          </Text>
        </TouchableOpacity>

      </View>

    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    wrapper: {
      flexDirection:
        'row',

      alignItems:
        'stretch',

      marginHorizontal:
        12,

      marginTop:
        8,

      marginBottom:
        12,

      gap:
        8,

      height:
        150,
    },


    /* =====================================================
       NEWS
    ===================================================== */

    newsCard: {
      flex:
        1.04,

      height:
        '100%',

      borderWidth:
        1,

      borderRadius:
        15,

      overflow:
        'hidden',

      position:
        'relative',

      shadowColor:
        '#0F172A',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.08,

      shadowRadius:
        6,

      elevation:
        2,
    },


    loading: {
      ...StyleSheet.absoluteFillObject,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    newsFallback: {
      ...StyleSheet.absoluteFillObject,

      backgroundColor:
        '#163665',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    newsFallbackLetter: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        34,

      opacity:
        0.35,
    },


    newsDarkOverlay: {
      ...StyleSheet.absoluteFillObject,

      backgroundColor:
        'rgba(2,12,32,0.24)',
    },


    newsHeader: {
      position:
        'absolute',

      left:
        11,

      right:
        10,

      top:
        9,

      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        14,

      lineHeight:
        18,

      textShadowColor:
        'rgba(0,0,0,0.50)',

      textShadowOffset: {
        width:
          0,

        height:
          1,
      },

      textShadowRadius:
        3,
    },


    newsBottom: {
      position:
        'absolute',

      left:
        11,

      right:
        9,

      bottom:
        9,

      flexDirection:
        'row',

      alignItems:
        'flex-end',
    },


    newsTitle: {
      flex:
        1,

      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        11,

      lineHeight:
        15,

      paddingRight:
        6,

      textShadowColor:
        'rgba(0,0,0,0.60)',

      textShadowOffset: {
        width:
          0,

        height:
          1,
      },

      textShadowRadius:
        3,
    },


    newsArrowButton: {
      width:
        30,

      height:
        30,

      borderRadius:
        15,

      backgroundColor:
        'rgba(24,42,77,0.85)',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    newsArrow: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        20,

      lineHeight:
        22,

      marginTop:
        -2,
    },


    /* =====================================================
       TABLE
    ===================================================== */

    tableCard: {
      flex:
        1,

      height:
        '100%',

      borderWidth:
        1,

      borderRadius:
        15,

      paddingHorizontal:
        9,

      paddingTop:
        8,

      paddingBottom:
        7,

      position:
        'relative',

      overflow:
        'hidden',

      shadowColor:
        '#0F172A',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        6,

      elevation:
        2,
    },


    tableHeaderRow: {
      minHeight:
        31,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      marginBottom:
        4,
    },


    tableHeaderLeft: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    chartIcon: {
      width:
        28,

      height:
        28,

      borderRadius:
        9,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        6,
    },


    tableTitle: {
      flex:
        1,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10.5,

      lineHeight:
        14,

      includeFontPadding:
        false,
    },


    moreButton: {
      height:
        24,

      paddingHorizontal:
        7,

      borderWidth:
        1,

      borderRadius:
        999,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginLeft:
        4,
    },


    moreButtonText: {
      color:
        '#315DE4',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        7.5,

      includeFontPadding:
        false,
    },


    tableLoading: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    rows: {
      flex:
        1,

      justifyContent:
        'center',
    },


    tableRow: {
      minHeight:
        28,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    rankCircle: {
      width:
        22,

      height:
        22,

      borderRadius:
        11,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        3,
    },


    rankText: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8,
    },


    teamLogo: {
      width:
        19,

      height:
        19,

      marginRight:
        5,
    },


    teamLogoFallback: {
      width:
        19,

      height:
        19,

      marginRight:
        5,

      borderWidth:
        StyleSheet.hairlineWidth,

      borderRadius:
        5,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    teamLogoFallbackText: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        6,
    },


    teamName: {
      flex:
        1,

      minWidth:
        0,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        8.5,

      lineHeight:
        12,

      includeFontPadding:
        false,
    },


    points: {
      minWidth:
        22,

      marginLeft:
        4,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9,

      textAlign:
        'right',

      includeFontPadding:
        false,
    },


    tableArrow: {
      position:
        'absolute',

      width:
        28,

      height:
        28,

      borderRadius:
        14,

      right:
        7,

      bottom:
        7,

      backgroundColor:
        '#EEF3FF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    tableArrowText: {
      color:
        '#315DE4',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        18,

      lineHeight:
        20,

      marginTop:
        -2,
    },

  });