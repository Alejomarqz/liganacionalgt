// App.js
import 'react-native-gesture-handler';
import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  StyleSheet,
  Platform,
  View,
  StatusBar,
} from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import analytics from '@react-native-firebase/analytics';
import mobileAds from 'react-native-google-mobile-ads';
import { initAdManager, setPushGrace } from './ads/AdManager';
import { initAppOpenAd, setOpenAdGrace } from './ads/AppOpenAdManager';



// Screens
import WelcomeScreen from './components/Welcome';
import HomeScreen from './components/Home';
import MatchScreen from './components/Match';
import TeamsScreen from './components/Teams';
import PlayersScreen from './components/Players';
import ScheduleScreen from './components/Schedule';
import Calendar from './components/Calendar';
import PositionsScreen from './components/Positions';
import ActiveNotificationsScreen from './components/ActiveNotifications';
import NewScreen from './components/New';
import ScorersScreen from './components/Scorers';
import WebviewScreen from './components/Webview';
import TeamScreen from './components/TeamScreen';
import PlayerScreen from './components/PlayerScreen';
import More from './components/More';
import Settings from './components/Settings';
import Torneos from './components/Torneos';
import CalendarConcacaf from './components/CalendarConcacaf';


import { CopilotProvider } from 'react-native-copilot';
import CustomCopilotTooltip from './utils/CustomCopilotTooltip';




// Notifications
import {
  installNotificationRouter,
  requestUserPermissionIfNeeded,
  onNavigationReady,
  getStartedFromPush,
  ensureGlobalTopicOnce,          // 👈 AGRÉGALO
} from './services/notifications';

// Firebase (principal = FCM)
import { ensureAnonLogin, initPush } from './services/firebase';

// Firestore (secundario = followers)


// Theme
import { ThemeProvider, useTheme } from './utils/ThemeContext';

const MainStack = createStackNavigator();

/** PaddingTop: ahora no mete color, solo estructura */
function PaddingTop({ children }) {
  return <View style={{ flex: 1 }}>{children}</View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeTopBg: { backgroundColor: 'transparent' },
  contentBg: { flex: 1 },
});

/** Componente interno que sí puede usar hooks (useTheme, etc.) */
function AppInner() {
  const navigationRef = React.useRef(null);
  const routeNameRef = React.useRef(null);
  const [initialRoute, setInitialRoute] = React.useState('Welcome');

  const { theme } = useTheme();
  const colors = theme.colors;

  React.useEffect(() => {
  const initializeApp = async () => {
    try {
      // Inicializa FCM, Firestore, etc.
      await ensureAnonLogin();           // proyecto principal (FCM)
      await initPush();
    } catch (error) {
      console.error('Error initializing services:', error);
    }
  };

  const initializeNotifications = async () => {
    try {
      // Solicitar permiso y suscripción
      await requestUserPermissionIfNeeded();  // muestra el popup
      await ensureGlobalTopicOnce();          // suscripción a futbolchapin
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
    
    // Configurar notificaciones en primer plano
    installNotificationRouter?.(navigationRef, {
      onForegroundMessage: (remote) => {
        // Opcional: banner in-app si quieres mostrar algo aquí
      },
    });
    
    // Verificar si fue lanzado desde una notificación
    if (getStartedFromPush?.()) {
      setPushGrace();          // interstitial grace
      setOpenAdGrace(10_000);  // App Open Ad grace de 10s
      setInitialRoute('Home');
    }
  };

  const initializeAds = async () => {
    try {
      // Inicialización de AdMob
      await mobileAds().initialize();
      console.log('AdMob Initialized');
      initAdManager();  // Inicialización del AdManager
      initAppOpenAd();  // Inicialización de App Open Ad
    } catch (error) {
      console.error('AdMob initialization failed:', error);
    }
  };

  // Llamar a las funciones asíncronas
  const initApp = async () => {
    await initializeApp();
    await initializeNotifications();
    await initializeAds();
  };

  initApp(); // Ejecutar la inicialización

}, []); // El hook se ejecuta una vez al montar el componente



  return (
    <SafeAreaProvider>
      {/* SafeArea SOLO arriba, con el color de header del tema */}
      <SafeAreaView
        style={[styles.container, styles.safeTopBg, { backgroundColor: colors.headerBg }]}
        edges={['top']}
      >
        <StatusBar
          backgroundColor={colors.statusBarBg}
          barStyle={theme.statusBarStyle}
          translucent={false}
        />
        <View style={[styles.contentBg, { backgroundColor: colors.appBg }]}>
          <PaddingTop>
            <NavigationContainer
              theme={theme.navigation}
              ref={navigationRef}
              onReady={async () => {
                try {
                  const rn =
                    navigationRef.current?.getCurrentRoute()?.name || 'Unknown';
                  routeNameRef.current = rn;
                  await analytics().logScreenView({
                    screen_name: rn,
                    screen_class: rn,
                  });
                } catch {}
                onNavigationReady(navigationRef);
              }}
              onStateChange={async () => {
                try {
                  const currentRoute =
                    navigationRef.current?.getCurrentRoute();
                  const currentName = currentRoute?.name || 'Unknown';
                  if (routeNameRef.current !== currentName) {
                    routeNameRef.current = currentName;
                    await analytics().logScreenView({
                      screen_name: currentName,
                      screen_class: currentName,
                    });
                  }
                } catch {}
              }}
            >
              <MainStack.Navigator
                initialRouteName={initialRoute}
                screenOptions={{ headerShown: false }}
              >
                <MainStack.Screen name="Welcome" component={WelcomeScreen} />
                <MainStack.Screen name="Home" component={HomeScreen} />

                <MainStack.Screen name="Match" options={{ headerShown: false }}>
                  {(props) => (
                    <MatchScreen
                      key={props.route?.params?.routeKey || 'match'}
                      {...props}
                    />
                  )}
                </MainStack.Screen>

                <MainStack.Screen name="Teams" component={TeamsScreen} />
                <MainStack.Screen name="More" component={More} />
                <MainStack.Screen name="Players" component={PlayersScreen} />
                <MainStack.Screen name="Schedule" component={ScheduleScreen} />
                <MainStack.Screen name="Positions" component={PositionsScreen} />
                <MainStack.Screen
                  name="ActiveNotifications"
                  component={ActiveNotificationsScreen}
                />
                <MainStack.Screen name="New" component={NewScreen} />
                <MainStack.Screen name="Scorers" component={ScorersScreen} />
                <MainStack.Screen name="Webview" component={WebviewScreen} />
                <MainStack.Screen
                  name="Calendar"
                  component={Calendar}
                  options={{ title: 'Calendario' }}
                />
                <MainStack.Screen name="TeamScreen" component={TeamScreen} />
                <MainStack.Screen name="Settings" component={Settings} />
                <MainStack.Screen name="Torneos" component={Torneos} />
                <MainStack.Screen name="CalendarConcacaf" component={CalendarConcacaf} />


                <MainStack.Screen
                  name="Player"
                  component={PlayerScreen}
                  options={{ title: 'Jugador' }}
                />
              </MainStack.Navigator>
            </NavigationContainer>
          </PaddingTop>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/** Export real: envuelto con GestureHandlerRootView + ThemeProvider */
export default function AppRoot() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <CopilotProvider
  tooltipComponent={CustomCopilotTooltip}
  labels={{
    previous: "Atrás",
    next: "Siguiente",
    skip: "Saltar",
    finish: "Entendido",
  }}
  arrowColor="transparent"
  backdropColor="rgba(0,0,0,0.22)"
  tooltipStyle={{
    backgroundColor: "transparent",
    padding: 0,
    borderRadius: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  }}
>
  <AppInner />
</CopilotProvider>



      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

