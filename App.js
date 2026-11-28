import 'react-native-gesture-handler';
import * as React from 'react';

import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  StyleSheet,
  View,
  StatusBar,
} from 'react-native';

import {
  createStackNavigator,
} from '@react-navigation/stack';

import {
  GestureHandlerRootView,
} from 'react-native-gesture-handler';

import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import analytics from '@react-native-firebase/analytics';

import mobileAds from 'react-native-google-mobile-ads';

import SpInAppUpdates, {
  IAUUpdateKind,
} from 'sp-react-native-in-app-updates';


/* =========================================================
   ADS
========================================================= */

import {
  initAdManager,
  setPushGrace,
} from './ads/AdManager';

import {
  initAppOpenAd,
  setOpenAdGrace,
} from './ads/AppOpenAdManager';

import {
  initRewarded,
} from './ads/AdRewardedManager';


/* =========================================================
   SCREENS
========================================================= */

import WelcomeScreen
  from './components/Welcome';

// v3: pantallas de borde a borde (foto bajo la barra de estado)
const IMMERSIVE_ROUTES = new Set(['Home', 'Match', 'TeamScreen', 'Player', 'LigaTV', 'MyTeam', 'Games']);

// v3: Home rediseñado sobre la API Liga Nacional GT
import HomeScreen
  from './src/screens/HomeScreen';

import LigaTVScreen
  from './src/screens/LigaTVScreen';

import {
  installLocalNotificationRouter,
  pruneReminders,
} from './src/notifications/reminders';

import {
  primeLogos,
} from './src/api/logoRegistry';

// v3: Match Center nuevo
import MatchScreen
  from './src/screens/MatchCenterScreen';

import TeamsScreen
  from './components/Teams';

import PlayersScreen
  from './components/Players';

import ScheduleScreen
  from './components/Schedule';

import Calendar
  from './components/Calendar';

// v3: Tabla nueva (General / Local / Visita)
import PositionsScreen
  from './src/screens/TableScreen';

import GamesScreen
  from './src/screens/GamesScreen';

import QuinielaScreen
  from './src/screens/QuinielaScreen';

import RankingScreen
  from './src/screens/RankingScreen';

import DailyPlayerScreen
  from './src/screens/DailyPlayerScreen';

import ActiveNotificationsScreen
  from './components/ActiveNotifications';

import NewScreen
  from './components/New';

import ScorersScreen
  from './components/Scorers';

import WebviewScreen
  from './components/Webview';

// v3: Perfil de equipo nuevo
import TeamScreen
  from './src/screens/TeamProfileScreen';

// v3: Mi club (hub del equipo favorito)
import MyTeamScreen
  from './src/screens/MyClubScreen';

// v3: Perfil de jugador nuevo
import PlayerScreen
  from './src/screens/PlayerProfileScreen';

import More
  from './components/More';

import Settings
  from './components/Settings';


/* =========================================================
   COPILOT
========================================================= */

import {
  CopilotProvider,
} from 'react-native-copilot';

import CustomCopilotTooltip
  from './utils/CustomCopilotTooltip';


/* =========================================================
   NOTIFICATIONS
========================================================= */

import {
  installNotificationRouter,
  requestUserPermissionIfNeeded,
  onNavigationReady,
  getStartedFromPush,
  ensureGlobalTopicOnce,
} from './services/notifications';


/* =========================================================
   IN APP NOTIFICATIONS
========================================================= */

import InAppNotificationProvider
  from './components/inappnotification';

import {
  listenToLiveMatches,
} from './services/realtimenotifications';


/* =========================================================
   FIREBASE
========================================================= */

import {
  ensureAnonLogin,
  initPush,
} from './services/firebase';


/* =========================================================
   THEME
========================================================= */

import {
  ThemeProvider,
  useTheme,
} from './utils/ThemeContext';


/* =========================================================
   NAVIGATION
========================================================= */

const MainStack =
  createStackNavigator();


const TAB_SCREEN = {
  animation:
    'none',
};


const DETAIL_SCREEN = {
  animation:
    'fade',

  animationDuration:
    180,
};


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    container: {
      flex:
        1,
    },

    safeTopBg: {
      backgroundColor:
        'transparent',
    },

    contentBg: {
      flex:
        1,
    },

  });


/* =========================================================
   APP
========================================================= */

function AppInner() {

  const navigationRef =
    React.useRef(
      null,
    );


  const routeNameRef =
    React.useRef(
      null,
    );


  const [
    initialRoute,
    setInitialRoute,
  ] =
    React.useState(
      'Welcome',
    );

  // v3: pantallas con foto arriba van de borde a borde (bajo la barra de estado)
  const [
    currentRoute,
    setCurrentRoute,
  ] =
    React.useState('Welcome');

  const immersive =
    IMMERSIVE_ROUTES.has(currentRoute);


  const {
    theme,
  } =
    useTheme();


  const colors =
    theme.colors;


  /* =======================================================
     UPDATE
  ======================================================= */

  const checkForceUpdate =
    async () => {

      try {

        const inAppUpdates =
          new SpInAppUpdates(
            false,
          );


        const result =
          await inAppUpdates
            .checkNeedsUpdate();


        if (
          result.shouldUpdate
        ) {

          await inAppUpdates
            .startUpdate({
              updateType:
                IAUUpdateKind
                  .IMMEDIATE,
            });

        }

      } catch (
        e
      ) {

        console.log(
          '[IN APP UPDATE]',
          e,
        );

      }

    };


  /* =======================================================
     INIT
  ======================================================= */

  React.useEffect(
    () => {

      let unsubRealtime =
        null;


      const initApp =
        async () => {

          // Logos oficiales en memoria antes de pintar pantallas legacy
          primeLogos();

          try {

            await ensureAnonLogin();

            await initPush();

          } catch {}


          try {

            await requestUserPermissionIfNeeded();

            await ensureGlobalTopicOnce();

          } catch {}


          installNotificationRouter(
            navigationRef,
            {
              onForegroundMessage:
                remote => {

                  console.log(
                    '[APP] Push foreground:',
                    remote?.data
                      ?.type,
                  );

                },
            },
          );


          try {

            unsubRealtime =
              listenToLiveMatches(
                'guatemala',
              );

          } catch (
            e
          ) {

            console.log(
              '[APP] Error realtime:',
              e,
            );

          }


          if (
            getStartedFromPush()
          ) {

            setPushGrace();

            setOpenAdGrace(
              10_000,
            );

            setInitialRoute(
              'Home',
            );

          }


          try {

            await mobileAds()
              .initialize();

            initAdManager();

            initAppOpenAd();

            initRewarded();

          } catch {}


          await checkForceUpdate();

        };


      initApp();


      return () => {

        if (
          unsubRealtime
        ) {

          unsubRealtime();

        }

      };

    },
    [],
  );


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <SafeAreaProvider>

      <SafeAreaView
        style={[
          styles.container,
          styles.safeTopBg,

          {
            backgroundColor:
              colors.headerBg,
          },
        ]}
        edges={
          immersive ? [] : ['top']
        }
      >

        <StatusBar
          backgroundColor={
            immersive ? 'transparent' : colors.statusBarBg
          }
          barStyle={
            immersive ? 'light-content' : theme.statusBarStyle
          }
          translucent={
            immersive
          }
        />


        <View
          style={[
            styles.contentBg,

            {
              backgroundColor:
                colors.appBg,
            },
          ]}
        >

          <View
            style={{
              flex:
                1,
            }}
          >

            <InAppNotificationProvider>

              <NavigationContainer
                theme={
                  theme.navigation
                }
                ref={
                  navigationRef
                }

                onReady={
                  async () => {

                    try {

                      const rn =
                        navigationRef
                          .current
                          ?.getCurrentRoute()
                          ?.name ||
                        'Unknown';


                      routeNameRef.current =
                        rn;

                      setCurrentRoute(rn);


                      await analytics()
                        .logScreenView({
                          screen_name:
                            rn,

                          screen_class:
                            rn,
                        });

                    } catch {}


                    onNavigationReady(
                      navigationRef,
                    );

                    // Recordatorios locales (Notifee): abrir partido / Liga TV al tocar
                    try {
                      pruneReminders();
                      installLocalNotificationRouter(
                        (name, params) =>
                          navigationRef.current?.navigate(name, params),
                      );
                    } catch {}

                  }
                }

                onStateChange={
                  async () => {

                    try {

                      const currentName =
                        navigationRef
                          .current
                          ?.getCurrentRoute()
                          ?.name ||
                        'Unknown';


                      if (
                        routeNameRef
                          .current !==
                        currentName
                      ) {

                        routeNameRef.current =
                          currentName;

                        setCurrentRoute(currentName);


                        await analytics()
                          .logScreenView({
                            screen_name:
                              currentName,

                            screen_class:
                              currentName,
                          });

                      }

                    } catch {}

                  }
                }
              >

                <MainStack.Navigator
                  initialRouteName={
                    initialRoute
                  }

                  screenOptions={{
                    headerShown:
                      false,

                    ...DETAIL_SCREEN,
                  }}
                >

                  {/* WELCOME */}

                  <MainStack.Screen
                    name="Welcome"
                    component={
                      WelcomeScreen
                    }
                    options={
                      TAB_SCREEN
                    }
                  />


                  {/* HOME */}

                  <MainStack.Screen
                    name="Home"
                    component={
                      HomeScreen
                    }
                    options={
                      TAB_SCREEN
                    }
                  />


                  {/* POSITIONS */}

                  <MainStack.Screen
                    name="Positions"
                    component={
                      PositionsScreen
                    }
                    options={
                      TAB_SCREEN
                    }
                  />


                  {/* CALENDAR */}

                  <MainStack.Screen
                    name="Calendar"
                    component={
                      Calendar
                    }
                    options={
                      TAB_SCREEN
                    }
                  />


                  {/* MORE */}

                  <MainStack.Screen
                    name="More"
                    component={
                      More
                    }
                    options={
                      TAB_SCREEN
                    }
                  />


                  {/* MATCH */}

                  <MainStack.Screen
                    name="Match"
                    options={
                      DETAIL_SCREEN
                    }
                  >
                    {props => (

                      <MatchScreen
                        key={
                          props.route
                            ?.params
                            ?.routeKey ||
                          'match'
                        }

                        {...props}
                      />

                    )}
                  </MainStack.Screen>


                  {/* TEAMS */}

                  <MainStack.Screen
                    name="Teams"
                    component={
                      TeamsScreen
                    }
                  />


                  {/* MY TEAM */}

                  <MainStack.Screen
                    name="MyTeam"
                    component={
                      MyTeamScreen
                    }
                    options={
                      DETAIL_SCREEN
                    }
                  />


                  {/* JUEGOS (quiniela y reto diario) */}

                  <MainStack.Screen
                    name="Games"
                    component={
                      GamesScreen
                    }
                  />

                  <MainStack.Screen name="Quiniela" component={QuinielaScreen} />
                  <MainStack.Screen name="Ranking" component={RankingScreen} />
                  <MainStack.Screen name="DailyPlayer" component={DailyPlayerScreen} />

                  {/* LIGA TV (transmisiones en vivo propias) */}

                  <MainStack.Screen
                    name="LigaTV"
                    component={
                      LigaTVScreen
                    }
                  />


                  {/* PLAYERS */}

                  <MainStack.Screen
                    name="Players"
                    component={
                      PlayersScreen
                    }
                  />


                  {/* SCHEDULE */}

                  <MainStack.Screen
                    name="Schedule"
                    component={
                      ScheduleScreen
                    }
                  />


                  {/* NOTIFICATIONS */}

                  <MainStack.Screen
                    name="ActiveNotifications"
                    component={
                      ActiveNotificationsScreen
                    }
                  />


                  {/* NEWS */}

                  <MainStack.Screen
                    name="New"
                    component={
                      NewScreen
                    }
                  />


                  {/* SCORERS */}

                  <MainStack.Screen
                    name="Scorers"
                    component={
                      ScorersScreen
                    }
                  />


                  {/* WEBVIEW */}

                  <MainStack.Screen
                    name="Webview"
                    component={
                      WebviewScreen
                    }
                  />


                  {/* TEAM PROFILE */}

                  <MainStack.Screen
                    name="TeamScreen"
                    component={
                      TeamScreen
                    }
                  />


                  {/* PLAYER */}

                  <MainStack.Screen
                    name="Player"
                    component={
                      PlayerScreen
                    }
                  />


                  {/* SETTINGS */}

                  <MainStack.Screen
                    name="Settings"
                    component={
                      Settings
                    }
                  />

                </MainStack.Navigator>

              </NavigationContainer>

            </InAppNotificationProvider>

          </View>

        </View>

      </SafeAreaView>

    </SafeAreaProvider>

  );
}


/* =========================================================
   ROOT
========================================================= */

export default function AppRoot() {

  return (

    <GestureHandlerRootView
      style={{
        flex:
          1,
      }}
    >

      <ThemeProvider>

        <CopilotProvider
          tooltipComponent={
            CustomCopilotTooltip
          }

          labels={{
            previous:
              'Atrás',

            next:
              'Siguiente',

            skip:
              'Saltar',

            finish:
              'Entendido',
          }}

          arrowColor="transparent"

          backdropColor="rgba(0,0,0,0.22)"

          tooltipStyle={{
            borderRadius:
              16,

            paddingHorizontal:
              16,

            paddingVertical:
              12,
          }}
        >

          <AppInner />

        </CopilotProvider>

      </ThemeProvider>

    </GestureHandlerRootView>

  );
}