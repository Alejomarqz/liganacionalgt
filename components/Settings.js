import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './Header';
import FooterTabs from './FooterTabs';
import { useTheme } from '../utils/ThemeContext';
import analytics from '@react-native-firebase/analytics';
import messaging from '@react-native-firebase/messaging';

import {
  subscribeGlobalTopic,
  unsubscribeGlobalTopic,
  isSubscribedGlobalTopic,
  requestUserPermissionIfNeeded,
} from '../services/notifications';

export default function Settings({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, mode, setMode } = useTheme();
  const colors = theme.colors;

  const footerSpace = 58 + (insets.bottom || 0) + 12;

  const [globalOn, setGlobalOn] = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [sysAllowed, setSysAllowed] = useState(true); // Permiso del sistema (aprox)

  useEffect(() => {
    (async () => {
      try {
        await analytics().logScreenView({
          screen_name: 'Settings',
          screen_class: 'Settings',
        });
      } catch {}

      // 1) Estado de topic global
      try {
        const v = await isSubscribedGlobalTopic();
        setGlobalOn(!!v);
      } catch {}

      // 2) Estado de permiso del sistema
      try {
        const ok = await getSystemNotifAllowed();
        setSysAllowed(ok);
      } catch {}
    })();
  }, []);

  const themeOptions = [
    { key: 'system', label: 'Automático (según sistema)' },
    { key: 'light', label: 'Claro' },
    { key: 'dark', label: 'Oscuro' },
  ];

  // Verificar si el sistema permite notificaciones
  async function getSystemNotifAllowed() {
    try {
      const settings = await messaging().getNotificationSettings?.();
      if (settings && typeof settings.authorizationStatus === 'number') {
        return settings.authorizationStatus === 2 || settings.authorizationStatus === 3;
      }
    } catch {}

    try {
      const auth = await messaging().hasPermission?.();
      if (typeof auth === 'number') {
        return auth === 1 || auth === 2 || auth === 3;
      }
    } catch {}

    if (Platform.OS === 'android' && Platform.Version < 33) return true;

    return true;
  }

  const openSystemSettings = async () => {
    try {
      await Linking.openSettings();
    } catch {}
  };

  const onToggleGlobal = async (next) => {
    if (loadingGlobal) return;
    setLoadingGlobal(true);

    try {
      // Si desea activar, primero pedimos permiso (iOS y Android 13+)
      if (next) {
        await requestUserPermissionIfNeeded();
        const allowed = await getSystemNotifAllowed();
        setSysAllowed(allowed);
      }

      if (next) await subscribeGlobalTopic();
      else await unsubscribeGlobalTopic();

      setGlobalOn(!!next);

      try {
        await analytics().logEvent('settings_toggle_global_topic', {
          enabled: !!next,
        });
      } catch {}
    } finally {
      setLoadingGlobal(false);
    }
  };

  return (
    <View style={[S.screen, { backgroundColor: colors.screenBg }]}>
      <View style={S.headerFixed}>
        <Header navigation={navigation} title="Ajustes" />
      </View>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.content, { paddingBottom: footerSpace }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sección Apariencia */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: colors.textMuted }]}>Apariencia</Text>

          <View
            style={[
              S.card,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            {themeOptions.map((opt, idx) => {
              const selected = mode === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[
                    S.row,
                    idx > 0 && [S.divider, { borderTopColor: colors.cardBorder }],
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setMode(opt.key)}
                >
                  <View style={S.rowLeft}>
                    <View
                      style={[
                        S.radioOuter,
                        {
                          borderColor: selected ? colors.accent : colors.textMuted,
                        },
                      ]}
                    >
                      {selected && (
                        <View
                          style={[S.radioInner, { backgroundColor: colors.accent }]}
                        />
                      )}
                    </View>
                    <Text style={[S.rowLabel, { color: colors.text }]}>{opt.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sección Notificaciones */}
        <View style={S.section}>
          <Text style={[S.sectionTitle, { color: colors.textMuted }]}>Notificaciones</Text>

          <View
            style={[
              S.card,
              { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            ]}
          >
            {/* Switch global */}
            <View style={S.row}>
              <View style={{ flex: 1 }}>
                <Text style={[S.rowLabel, { color: colors.text, fontWeight: '700' }]}>
                  Notificaciones generales
                </Text>
                <Text style={[S.subLabel, { color: colors.textMuted }]}>
                  Goles, inicio y final de partidos
                </Text>
                {!sysAllowed && (
                  <Text style={[S.warn, { color: colors.accent }]}>
                    Están bloqueadas en el teléfono. Actívalas en Ajustes del sistema.
                  </Text>
                )}
              </View>

              <Switch
              value={globalOn}
              onValueChange={onToggleGlobal}
              disabled={loadingGlobal}
              trackColor={{ false: colors.cardBorder, true: colors.accent }} // Usamos el color del tema
              thumbColor={globalOn ? colors.bot : colors.bot} // Color del círculo del switch
            />

            </View>

            <View style={[S.divider, { borderTopColor: colors.cardBorder }]} />

            {/* Leyenda de desactivar notificaciones en match y equipo */}
            <Text style={[S.hint, { color: colors.textMuted }]}>
              Para desactivar alertas de un partido o equipo específico, usa la campanita dentro del partido/equipo
            </Text>
          </View>
        </View>
      </ScrollView>

      <FooterTabs navigation={navigation} routeName="More" />
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f7f7' },
  headerFixed: {},
  scroll: { flex: 1 },
  content: { paddingHorizontal: 12, paddingTop: 12 },

  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },

  row: {
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },

  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  rowLabel: { fontSize: 14, fontWeight: '500' },
  subLabel: { marginTop: 2, fontSize: 12, fontWeight: '500' },
  warn: { marginTop: 6, fontSize: 12, fontWeight: '800' },

  hint: { marginTop: 8, fontSize: 12, lineHeight: 16 },

  chev: { fontSize: 22, fontWeight: '900' },
});
