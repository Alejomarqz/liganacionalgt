/**
 * @format
 * @lint-ignore-every XPLATJSCOPYRIGHT1
 */

// 1) Debe ir PRIMERO
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';

// === FCM background (un solo handler, top-level, antes del registerComponent) ===
messaging().setBackgroundMessageHandler(async remoteMessage => {
  try {
    if (__DEV__) {
      console.log(
        '[FCM][BG] message:',
        remoteMessage?.messageId,
        remoteMessage?.data || remoteMessage?.notification
      );
    }
    // NO hagas navegación aquí (no hay UI). Si necesitas, persiste algo.
  } catch (e) {
    if (__DEV__) console.log('[FCM][BG] handler error:', e?.message || e);
  }
});

/* === Opcional (útil para debug de taps) ===
messaging().getInitialNotification().then(remoteMessage => {
  if (remoteMessage && __DEV__) {
    console.log('[FCM] opened app from quit by notification:', remoteMessage?.data);
  }
});

messaging().onNotificationOpenedApp(remoteMessage => {
  if (__DEV__) {
    console.log('[FCM] from background tap:', remoteMessage?.data);
  }
});
*/

// 2) ¡Nombre debe coincidir con MainActivity.getMainComponentName()!
AppRegistry.registerComponent('chapin', () => App);
