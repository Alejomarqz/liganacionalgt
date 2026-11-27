// components/Home.js
// Liga Nacional GT
//
// HOME 2026
// Orden:
// Header
// Votación
// Partido destacado
// Accesos
// Hoy (máximo 2 partidos)
// Noticias + Tabla
// Anuncio
// Tabs

import React, {
  Component,
} from 'react';

import {
  View,
  Text,
  Image,
  ImageBackground,
  StyleSheet,
  StatusBar,
  SectionList,
  Animated,
  Easing,
  AppState,
  Alert,
  TouchableOpacity,
} from 'react-native';

import Header from './Header';
import FooterTabs from './FooterTabs';
import NewsCarousel from './NewsCarousel';
import AdFooter from '../ads/AdFooter';
import Card from './Card';
import TeamSearchModal from './TeamSearchModal';
import QuickAccess from './QuickAccess';
import PollCard from './PollCard';

import {
  setStartedFromPush,
  isFollowingMatch,
} from '../services/notifications';

import {
  getMatches,
  extractMatches,
} from '../services/ligaNacionalApi';

import {
  getBellIcon,
} from '../utils/bell';

import {
  withSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  withTheme,
} from '../utils/ThemeContext';

import {
  BRAND,
} from '../utils/theme';

import analytics
  from '@react-native-firebase/analytics';

import {
  CopilotStep,
  walkthroughable,
  useCopilot,
} from 'react-native-copilot';

import {
  shouldShowGuide,
  markGuideDone,
} from '../utils/onboarding';


const WalkthroughableView =
  walkthroughable(View);

const SAFEImage =
  Image;

const GT_OFFSET =
  -6;


/* =========================================================
   STATUS
========================================================= */

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
    'cancelled',
  ]);


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
    status || '',
  )
    .trim()
    .toLowerCase();
}


function isLive(
  match,
) {
  return LIVE_STATUSES.has(
    statusCode(
      match,
    ),
  );
}


function isFinished(
  match,
) {
  return FINISHED_STATUSES.has(
    statusCode(
      match,
    ),
  );
}


/* =========================================================
   DATE
========================================================= */

function gtNow() {
  return new Date(
    Date.now() +
    GT_OFFSET *
    3600000,
  );
}


function ymdFromDate(
  date,
) {
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


function todayYmd() {
  return ymdFromDate(
    gtNow(),
  );
}


function matchYmd(
  match,
) {
  const raw =
    String(
      match?.date ||
      match?.kickoff ||
      '',
    );


  const found =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/,
    );


  if (!found) {
    return '';
  }


  return (
    `${found[1]}-` +
    `${found[2]}-` +
    `${found[3]}`
  );
}


function matchTime(
  match,
) {
  const kickoff =
    String(
      match?.kickoff ||
      '',
    );


  const found =
    kickoff.match(
      /T(\d{2}):(\d{2})/,
    );


  if (found) {
    return (
      `${found[1]}:${found[2]}`
    );
  }


  const raw =
    String(
      match?.time ||
      match?.hour ||
      '',
    );


  const fallback =
    raw.match(
      /(\d{1,2}):(\d{2})/,
    );


  if (fallback) {
    return (
      `${String(
        fallback[1],
      ).padStart(
        2,
        '0',
      )}:${fallback[2]}`
    );
  }


  return '--:--';
}


function formatTodayDate() {
  const date =
    gtNow();


  const day =
    date.getUTCDate();


  const month =
    date.toLocaleDateString(
      'es-GT',
      {
        month:
          'long',

        timeZone:
          'UTC',
      },
    );


  return (
    `${day} de ${month}`
  );
}


/* =========================================================
   ROUND
========================================================= */

function roundLabel(
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
      round?.name ||
      round?.label ||
      round?.title ||
      round?.number ||
      round?.round ||
      round?.value;


    if (
      value !== undefined &&
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


  const raw =
    String(
      round ||
      match?.jornada ||
      match?.round_name ||
      match?.matchday ||
      '',
    ).trim();


  if (
    /^\d+$/.test(
      raw,
    )
  ) {
    return (
      `Jornada ${raw}`
    );
  }


  return (
    raw ||
    'Liga Nacional'
  );
}


function tournamentLabel(
  match,
) {
  const competition =
    match?.competition;


  if (
    competition &&
    typeof competition ===
      'object'
  ) {
    return (
      competition?.name ||
      competition?.title ||
      'Torneo Apertura'
    );
  }


  return (
    match
      ?.competition_name ||
    match
      ?.tournament
      ?.name ||
    match
      ?.tournament_name ||
    'Torneo Apertura'
  );
}


/* =========================================================
   HOME DATA
========================================================= */

function getTodayMatches(
  matches,
) {
  const today =
    todayYmd();


  return (
    Array.isArray(matches)
      ? matches
      : []
  )
    .filter(
      match =>
        matchYmd(
          match,
        ) === today,
    )
    .sort(
      (
        a,
        b,
      ) =>
        matchTime(a)
          .localeCompare(
            matchTime(b),
          ),
    )
    .slice(
      0,
      2,
    );
}


function getFeaturedMatch(
  matches,
) {
  const all =
    Array.isArray(matches)
      ? matches
      : [];


  const live =
    all.find(
      item =>
        isLive(item),
    );


  if (live) {
    return live;
  }


  const today =
    all.find(
      item =>
        matchYmd(item) ===
          todayYmd() &&
        !isFinished(item),
    );


  if (today) {
    return today;
  }


  const future =
    all
      .filter(
        item =>
          matchYmd(item) >=
            todayYmd() &&
          !isFinished(item),
      )
      .sort(
        (
          a,
          b,
        ) =>
          `${
            matchYmd(a)
          } ${
            matchTime(a)
          }`
            .localeCompare(
              `${
                matchYmd(b)
              } ${
                matchTime(b)
              }`,
            ),
      );


  return (
    future[0] ||
    all[0] ||
    null
  );
}


/* =========================================================
   HOME
========================================================= */

class Home extends Component {

  state = {
    matchs: [],

    sections: [],

    refreshing:
      false,

    livePulse:
      new Animated.Value(
        1,
      ),

    showTeamSearch:
      false,

    followedById:
      {},
  };


  mounted =
    false;

  pollInterval =
    null;

  liveLoop =
    null;

  focusUnsub =
    null;

  blurUnsub =
    null;

  appStateSub =
    null;

  guideEligible =
    false;

  guideStarted =
    false;


  componentDidMount() {
    this.mounted =
      true;


    this.loadData();


    try {
      shouldShowGuide(
        'guide_home_v2',
      ).then(
        value => {
          this.guideEligible =
            !!value;
        },
      );
    } catch {}


    this.focusUnsub =
      this.props
        .navigation
        ?.addListener?.(
          'focus',
          () => {
            setStartedFromPush(
              false,
            );

            this.startPolling();
          },
        );


    this.blurUnsub =
      this.props
        .navigation
        ?.addListener?.(
          'blur',
          () => {
            this.stopPolling();
          },
        );


    this.appStateSub =
      AppState.addEventListener(
        'change',
        state => {
          if (
            state ===
            'active'
          ) {
            this.startPolling();

          } else {
            this.stopPolling();
          }
        },
      );


    this.liveLoop =
      Animated.loop(
        Animated.sequence([
          Animated.timing(
            this.state
              .livePulse,
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
            this.state
              .livePulse,
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


    this.liveLoop.start();
  }


  componentDidUpdate(
    prevProps,
    prevState,
  ) {
    const previous =
      prevState
        ?.sections
        ?.[0]
        ?.data
        ?.length ||
      0;


    const current =
      this.state
        ?.sections
        ?.[0]
        ?.data
        ?.length ||
      0;


    if (
      this.guideEligible &&
      !this.guideStarted &&
      previous === 0 &&
      current > 0
    ) {
      this.guideStarted =
        true;


      setTimeout(
        () => {
          try {
            this.props
              .start?.(
                'home-first-match',
              );


            markGuideDone(
              'guide_home_v2',
            );

          } catch {}
        },
        1200,
      );
    }
  }


  componentWillUnmount() {
    this.mounted =
      false;


    this.stopPolling();


    this.focusUnsub?.();

    this.blurUnsub?.();

    this.appStateSub
      ?.remove?.();


    try {
      this.liveLoop
        ?.stop?.();

    } catch {}
  }


  /* =======================================================
     SET DATA
  ======================================================= */

  setHomeData =
    matches => {
      const today =
        getTodayMatches(
          matches,
        );


      this.setState({
        matchs:
          matches,

        sections: [
          {
            title:
              'Hoy',

            subtitle:
              formatTodayDate(),

            data:
              today,
          },
        ],

        refreshing:
          false,
      });


      this.refreshFollowed(
        today,
      );
    };


  /* =======================================================
     LOAD
  ======================================================= */

  loadData =
    async () => {
      try {
        const payload =
          await getMatches();


        const matches =
          extractMatches(
            payload,
          );


        const sorted =
          (
            Array.isArray(
              matches,
            )
              ? matches
              : []
          )
            .slice()
            .sort(
              (
                a,
                b,
              ) =>
                `${
                  matchYmd(a)
                } ${
                  matchTime(a)
                }`
                  .localeCompare(
                    `${
                      matchYmd(b)
                    } ${
                      matchTime(b)
                    }`,
                  ),
            );


        if (
          !this.mounted
        ) {
          return;
        }


        this.setHomeData(
          sorted,
        );


      } catch (
        error
      ) {
        console.warn(
          '[Home] load:',
          error?.message ||
          error,
        );


        if (
          this.mounted
        ) {
          this.setState({
            matchs: [],

            sections: [
              {
                title:
                  'Hoy',

                subtitle:
                  formatTodayDate(),

                data: [],
              },
            ],

            refreshing:
              false,
          });
        }


        Alert.alert(
          'Error',
          'No se pudieron cargar los partidos.',
        );
      }
    };


  refresh =
    () => {
      this.setState({
        refreshing:
          true,
      });


      this.loadData();
    };


  /* =======================================================
     POLLING
  ======================================================= */

  startPolling =
    () => {
      if (
        this.pollInterval ||
        !this.mounted
      ) {
        return;
      }


      this.pollInterval =
        setInterval(
          this.pollScores,
          20000,
        );
    };


  stopPolling =
    () => {
      if (
        this.pollInterval
      ) {
        clearInterval(
          this.pollInterval,
        );

        this.pollInterval =
          null;
      }
    };


  pollScores =
    async () => {
      try {
        const payload =
          await getMatches();


        const matches =
          extractMatches(
            payload,
          );


        if (
          this.mounted
        ) {
          this.setHomeData(
            matches,
          );
        }


      } catch (
        error
      ) {
        console.warn(
          '[Home] polling:',
          error?.message ||
          error,
        );
      }
    };


  /* =======================================================
     FOLLOW
  ======================================================= */

  refreshFollowed =
    list => {
      const ids =
        (
          Array.isArray(list)
            ? list
            : []
        )
          .map(
            item =>
              String(
                item?.id ||
                '',
              ),
          )
          .filter(
            Boolean,
          );


      Promise.all(
        ids.map(
          async id => {
            try {
              const active =
                await isFollowingMatch(
                  id,
                );


              return [
                id,
                !!active,
              ];


            } catch {
              return [
                id,
                false,
              ];
            }
          },
        ),
      ).then(
        values => {
          const map = {};


          values.forEach(
            (
              [
                id,
                active,
              ],
            ) => {
              map[id] =
                active;
            },
          );


          if (
            this.mounted
          ) {
            this.setState({
              followedById:
                map,
            });
          }
        },
      );
    };


  /* =======================================================
     MATCH
  ======================================================= */

  goMatch =
    item => {
      if (
        !item?.id
      ) {
        return;
      }


      try {
        analytics()
          .logEvent(
            'open_match_from_home',
            {
              match_id:
                String(
                  item.id,
                ),

              source:
                'home',
            },
          );

      } catch {}


      this.props
        .navigation
        .push(
          'Match',
          {
            matchId:
              Number(
                item.id,
              ),

            slug:
              item?.slug ||
              null,

            source:
              'liga-core',

            channel:
              'guatemala',

            pre: {
              id:
                Number(
                  item.id,
                ),

              teams: {
                homeTeamId:
                  Number(
                    item?.home
                      ?.id ||
                    0,
                  ),

                awayTeamId:
                  Number(
                    item?.away
                      ?.id ||
                    0,
                  ),

                homeTeamName:
                  item?.home
                    ?.name ||
                  '',

                awayTeamName:
                  item?.away
                    ?.name ||
                  '',

                homeLogo:
                  item?.home
                    ?.logo ||
                  null,

                awayLogo:
                  item?.away
                    ?.logo ||
                  null,
              },

              kickoff:
                item?.kickoff ||
                null,

              date:
                item?.date ||
                null,

              stadium:
                item?.stadium ||
                null,

              round:
                item?.round ||
                null,
            },
          },
        );
    };


  /* =======================================================
     HERO
  ======================================================= */

  renderFeaturedMatch =
    () => {
      const match =
        getFeaturedMatch(
          this.state
            .matchs,
        );


      if (!match) {
        return null;
      }


      const home =
        match?.home ||
        {};


      const away =
        match?.away ||
        {};


      return (
        <TouchableOpacity
          activeOpacity={
            0.94
          }
          onPress={
            () =>
              this.goMatch(
                match,
              )
          }
          style={
            styles.featuredWrap
          }
        >
          <ImageBackground
            source={
              require(
                '../resources/home/featured-match-bg.png',
              )
            }
            resizeMode="cover"
            style={
              styles.featuredBackground
            }
            imageStyle={
              styles.featuredImage
            }
          >

            <View
              style={
                styles.featuredOverlay
              }
            />


            <View
              style={
                styles.featuredContent
              }
            >

              <View
                style={
                  styles.featuredBadge
                }
              >
                <View
                  style={
                    styles.featuredStarCircle
                  }
                >
                  <Text
                    style={
                      styles.featuredStar
                    }
                  >
                    ★
                  </Text>
                </View>


                <Text
                  style={
                    styles.featuredBadgeText
                  }
                >
                  PARTIDO DESTACADO
                </Text>
              </View>


              <Text
                numberOfLines={1}
                style={
                  styles.featuredMeta
                }
              >
                {roundLabel(
                  match,
                )}
                {' · '}
                {tournamentLabel(
                  match,
                )}
              </Text>


              <View
                style={
                  styles.featuredMatch
                }
              >

                <View
                  style={
                    styles.featuredTeam
                  }
                >
                  {!!home?.logo && (
                    <Image
                      source={{
                        uri:
                          home.logo,
                      }}
                      style={
                        styles.featuredLogo
                      }
                      resizeMode="contain"
                    />
                  )}


                  <Text
                    numberOfLines={1}
                    style={
                      styles.featuredTeamName
                    }
                  >
                    {home?.name ||
                      'Local'}
                  </Text>
                </View>


                <View
                  style={
                    styles.featuredCenter
                  }
                >
                  <Text
                    style={
                      styles.featuredDay
                    }
                  >
                    Hoy
                  </Text>


                  <Text
                    style={
                      styles.featuredTime
                    }
                  >
                    {matchTime(
                      match,
                    )}
                  </Text>
                </View>


                <View
                  style={
                    styles.featuredTeam
                  }
                >
                  {!!away?.logo && (
                    <Image
                      source={{
                        uri:
                          away.logo,
                      }}
                      style={
                        styles.featuredLogo
                      }
                      resizeMode="contain"
                    />
                  )}


                  <Text
                    numberOfLines={1}
                    style={
                      styles.featuredTeamName
                    }
                  >
                    {away?.name ||
                      'Visitante'}
                  </Text>
                </View>

              </View>


              <View
                style={
                  styles.featuredButton
                }
              >
                <Text
                  style={
                    styles.featuredButtonText
                  }
                >
                  Ver detalles
                </Text>


                <Text
                  style={
                    styles.featuredButtonArrow
                  }
                >
                  →
                </Text>
              </View>

            </View>

          </ImageBackground>
        </TouchableOpacity>
      );
    };


  /* =======================================================
     CARD
  ======================================================= */

  renderItem =
    ({
      item,
      index,
    }) => {
      const id =
        String(
          item?.id ||
          '',
        );


      const followed =
        !!this.state
          .followedById
          ?.[id];


      return (
        <View
          style={
            styles.matchWrap
          }
        >

          {index === 0 ? (
            <CopilotStep
              name="home-first-match"
              order={1}
              text="Toca un partido para ver el EN VIVO, alineaciones y posiciones."
            >
              <WalkthroughableView
                collapsable={
                  false
                }
              >
                <Card
                  match={
                    item
                  }
                  variant="homeCompact"
                  onPress={
                    () =>
                      this.goMatch(
                        item,
                      )
                  }
                  livePulse={
                    this.state
                      .livePulse
                  }
                />
              </WalkthroughableView>
            </CopilotStep>

          ) : (
            <Card
              match={
                item
              }
              variant="homeCompact"
              onPress={
                () =>
                  this.goMatch(
                    item,
                  )
              }
              livePulse={
                this.state
                  .livePulse
              }
            />
          )}


          {followed &&
          !isFinished(item) && (
            <View
              pointerEvents="none"
              style={
                styles.bell
              }
            >
              <SAFEImage
                source={
                  getBellIcon({
                    on:
                      true,

                    dark:
                      this.props
                        .theme
                        ?.mode ===
                      'dark',
                  })
                }
                style={
                  styles.bellImage
                }
              />
            </View>
          )}

        </View>
      );
    };


  /* =======================================================
     SECTION HEADER
  ======================================================= */

  renderSectionHeader =
    ({
      section,
    }) => {
      const colors =
        this.props
          .theme
          .colors;


      return (
        <View
          style={[
            styles.sectionHeader,
            {
              backgroundColor:
                colors.screenBg,
            },
          ]}
        >

          <View
            style={
              styles.sectionLeft
            }
          >
            <View
              style={
                styles.sectionAccent
              }
            />


            <View>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color:
                      colors.text,
                  },
                ]}
              >
                Hoy
              </Text>


              <Text
                style={[
                  styles.sectionSubtitle,
                  {
                    color:
                      colors.textMuted,
                  },
                ]}
              >
                {section.subtitle}
              </Text>
            </View>
          </View>


          <TouchableOpacity
            activeOpacity={
              0.75
            }
            onPress={
              () =>
                this.props
                  .navigation
                  .navigate(
                    'Calendar',
                  )
            }
            style={
              styles.viewAll
            }
          >
            <Text
              style={
                styles.viewAllText
              }
            >
              Ver todos
            </Text>

            <Text
              style={
                styles.viewAllArrow
              }
            >
              ›
            </Text>
          </TouchableOpacity>

        </View>
      );
    };


  /* =======================================================
     RENDER
  ======================================================= */

  render() {
    const {
      theme,
    } =
      this.props;


    const colors =
      theme.colors;


    const safeBottom =
      Math.max(
        this.props
          .insets
          ?.bottom ||
        0,

        8,
      );


    const liveCount =
      (
        this.state
          .matchs ||
        []
      ).filter(
        match =>
          isLive(match),
      ).length;


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

        <StatusBar
          barStyle={
            theme
              .statusBarStyle
          }
        />


        <Header
          navigation={
            this.props
              .navigation
          }

          showLogo

          logoName="Liga Nacional GT"

          logoSource={
            require(
              '../resources/logos/app-logo.png',
            )
          }

          logoSize={32}

          liveCount={
            liveCount
          }

          showSearch

          onSearchPress={
            () =>
              this.setState({
                showTeamSearch:
                  true,
              })
          }

          showSettings

          onSettingsPress={
            () =>
              this.props
                .navigation
                .navigate(
                  'Settings',
                )
          }

          disableBack
        />


        <SectionList
          sections={
            this.state
              .sections
          }

          keyExtractor={
            (
              item,
              index,
            ) =>
              `${
                item?.id ||
                'match'
              }-${index}`
          }

          renderItem={
            this.renderItem
          }

          renderSectionHeader={
            this.renderSectionHeader
          }

          stickySectionHeadersEnabled={
            false
          }

          showsVerticalScrollIndicator={
            false
          }

          onRefresh={
            this.refresh
          }

          refreshing={
            this.state
              .refreshing
          }

          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                68 +
                safeBottom,
            },
          ]}

          ListHeaderComponent={
            <>

              <PollCard />


              {this.renderFeaturedMatch()}


              <QuickAccess
                navigation={
                  this.props
                    .navigation
                }
              />

            </>
          }

          ListFooterComponent={
            <>

              <NewsCarousel
                navigation={
                  this.props
                    .navigation
                }
              />


              {/* EL ANUNCIO YA ES CONTENIDO, NO FIJO */}

              <View
                style={
                  styles.adContainer
                }
              >
                <AdFooter />
              </View>

            </>
          }

          ListEmptyComponent={
            null
          }
        />


        {/* SOLO LAS TABS SON FIJAS */}

        <View
          style={[
            styles.tabsFixed,
            {
              paddingBottom:
                safeBottom,
            },
          ]}
        >
          <FooterTabs
            navigation={
              this.props
                .navigation
            }

            routeName="Home"
          />
        </View>


        <TeamSearchModal
          visible={
            this.state
              .showTeamSearch
          }

          onClose={
            () =>
              this.setState({
                showTeamSearch:
                  false,
              })
          }

          onSelect={
            team =>
              this.props
                .navigation
                .navigate(
                  'TeamScreen',
                  {
                    teamId:
                      team.id,

                    scope:
                      'guatemala',
                  },
                )
          }
        />

      </View>
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
      paddingTop:
        3,
    },


    /* HERO */

    featuredWrap: {
      height:
        196,

      marginHorizontal:
        12,

      marginBottom:
        12,

      borderRadius:
        18,

      overflow:
        'hidden',

      elevation:
        4,

      shadowColor:
        '#071A3F',

      shadowOffset: {
        width:
          0,

        height:
          4,
      },

      shadowOpacity:
        0.18,

      shadowRadius:
        9,
    },


    featuredBackground: {
      flex:
        1,
    },


    featuredImage: {
      borderRadius:
        18,
    },


    featuredOverlay: {
      ...StyleSheet
        .absoluteFillObject,

      backgroundColor:
        'rgba(0,25,72,0.14)',
    },


    featuredContent: {
      flex:
        1,

      paddingHorizontal:
        14,

      paddingTop:
        12,

      paddingBottom:
        11,
    },


    featuredBadge: {
      alignSelf:
        'flex-start',

      minHeight:
        27,

      paddingLeft:
        4,

      paddingRight:
        10,

      borderRadius:
        999,

      borderWidth:
        1,

      borderColor:
        'rgba(255,255,255,0.65)',

      backgroundColor:
        'rgba(21,74,171,0.85)',

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    featuredStarCircle: {
      width:
        19,

      height:
        19,

      borderRadius:
        10,

      backgroundColor:
        '#FFD735',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        6,
    },


    featuredStar: {
      color:
        '#2661C8',

      fontSize:
        10,
    },


    featuredBadgeText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        9,

      includeFontPadding:
        false,
    },


    featuredMeta: {
      marginTop:
        5,

      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        9.5,
    },


    featuredMatch: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    featuredTeam: {
      flex:
        1,

      alignItems:
        'center',

      minWidth:
        0,
    },


    featuredLogo: {
      width:
        52,

      height:
        52,
    },


    featuredTeamName: {
      width:
        '100%',

      marginTop:
        4,

      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10,

      textAlign:
        'center',
    },


    featuredCenter: {
      width:
        88,

      alignItems:
        'center',
    },


    featuredDay: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10,
    },


    featuredTime: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        24,

      lineHeight:
        28,
    },


    featuredButton: {
      alignSelf:
        'center',

      height:
        34,

      minWidth:
        128,

      paddingHorizontal:
        16,

      borderRadius:
        999,

      backgroundColor:
        '#2E72FF',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    featuredButtonText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10,
    },


    featuredButtonArrow: {
      color:
        '#FFFFFF',

      marginLeft:
        7,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        15,
    },


    /* TODAY */

    sectionHeader: {
      paddingHorizontal:
        12,

      paddingTop:
        9,

      paddingBottom:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    sectionLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },


    sectionAccent: {
      width:
        3,

      height:
        35,

      borderRadius:
        3,

      backgroundColor:
        BRAND.primary,

      marginRight:
        9,
    },


    sectionTitle: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        18,

      lineHeight:
        21,

      includeFontPadding:
        false,
    },


    sectionSubtitle: {
      marginTop:
        1,

      fontFamily:
        'Poppins-Regular',

      fontSize:
        9,

      lineHeight:
        12,

      includeFontPadding:
        false,
    },


    viewAll: {
      height:
        32,

      paddingLeft:
        12,

      paddingRight:
        8,

      borderWidth:
        1,

      borderColor:
        '#D8E3F1',

      borderRadius:
        999,

      backgroundColor:
        '#FFFFFF',

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    viewAllText: {
      color:
        '#315DE4',

      fontFamily:
        'Poppins-Medium',

      fontSize:
        8.5,
    },


    viewAllArrow: {
      color:
        '#315DE4',

      marginLeft:
        7,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        17,

      marginTop:
        -2,
    },


    matchWrap: {
      position:
        'relative',
    },


    bell: {
      position:
        'absolute',

      right:
        17,

      top:
        8,
    },


    bellImage: {
      width:
        14,

      height:
        14,

      resizeMode:
        'contain',
    },


    /* AD */

    adContainer: {
      marginTop:
        1,

      marginBottom:
        6,
    },


    /* TABS */

    tabsFixed: {
      position:
        'absolute',

      left:
        0,

      right:
        0,

      bottom:
        0,

      backgroundColor:
        '#FFFFFF',
    },

  });


/* =========================================================
   COPILOT
========================================================= */

function HomeCopilotWrapper(
  props,
) {
  const {
    start,
    copilotEvents,
  } =
    useCopilot();


  return (
    <Home
      {...props}

      start={
        start
      }

      copilotEvents={
        copilotEvents
      }
    />
  );
}


export default withSafeAreaInsets(
  withTheme(
    HomeCopilotWrapper,
  ),
);