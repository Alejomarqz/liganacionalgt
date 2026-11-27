// components/Settings.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Sun, Moon, DeviceMobile,
  Bell, BellSlash, Warning, Info,
} from 'phosphor-react-native';
import Header      from './Header';
import FooterTabs  from './FooterTabs';
import { useTheme } from '../utils/ThemeContext';
import analytics   from '@react-native-firebase/analytics';
import messaging   from '@react-native-firebase/messaging';
import {
  subscribeGlobalTopic,
  unsubscribeGlobalTopic,
  isSubscribedGlobalTopic,
  requestUserPermissionIfNeeded,
} from '../services/notifications';
import { BRAND } from '../utils/theme';

/* ── Helpers de color para iconos ── */
function getIconColor(isDark, active = false) {
  if (active) return isDark ? '#F1F2F6' : BRAND.primary;
  return isDark ? '#6B6E8A' : '#9496A8';
}
function getIconBg(isDark, active = false) {
  if (active) return isDark ? 'rgba(241,242,246,0.12)' : `${BRAND.primary}12`;
  return isDark ? '#22253A' : '#F0F2F7';
}

async function getSystemNotifAllowed() {
  try {
    const s = await messaging().getNotificationSettings?.();
    if (s && typeof s.authorizationStatus === 'number')
      return s.authorizationStatus === 2 || s.authorizationStatus === 3;
  } catch {}
  try {
    const a = await messaging().hasPermission?.();
    if (typeof a === 'number') return a === 1 || a === 2 || a === 3;
  } catch {}
  if (Platform.OS === 'android' && Platform.Version < 33) return true;
  return true;
}

/* ── Sub-componentes ── */
function SectionLabel({ label, colors }) {
  return <Text style={[S.sectionLabel, { color: colors.textMuted }]}>{label}</Text>;
}
function Card({ children, colors }) {
  return (
    <View style={[S.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
      {children}
    </View>
  );
}
function Divider({ colors }) {
  return <View style={[S.divider, { backgroundColor: colors.cardBorder }]} />;
}

/* ══════════════════════════════════════════════════════════
   THEME OPTIONS
══════════════════════════════════════════════════════════ */
const THEME_OPTIONS = [
  { key: 'system', label: 'Automático', sub: 'Según el sistema', Icon: DeviceMobile },
  { key: 'light',  label: 'Claro',      sub: 'Fondo blanco',     Icon: Sun          },
  { key: 'dark',   label: 'Oscuro',     sub: 'Fondo oscuro',     Icon: Moon         },
];

/* ══════════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════════ */
export default function Settings({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme, mode, setMode } = useTheme();
  const colors      = theme.colors;
  const isDark      = theme.mode === 'dark';
  const footerSpace = 58 + (insets.bottom || 0) + 16;

  const [globalOn,      setGlobalOn]      = useState(false);
  const [loadingGlobal, setLoadingGlobal] = useState(false);
  const [sysAllowed,    setSysAllowed]    = useState(true);

  useEffect(() => {
    (async () => {
      try { await analytics().logScreenView({ screen_name: 'Settings', screen_class: 'Settings' }); } catch {}
      try { setGlobalOn(!!(await isSubscribedGlobalTopic())); } catch {}
      try { setSysAllowed(await getSystemNotifAllowed()); } catch {}
    })();
  }, []);

  const onToggleGlobal = async next => {
    if (loadingGlobal) return;
    setLoadingGlobal(true);
    try {
      if (next) {
        await requestUserPermissionIfNeeded();
        setSysAllowed(await getSystemNotifAllowed());
      }
      if (next) await subscribeGlobalTopic();
      else      await unsubscribeGlobalTopic();
      setGlobalOn(!!next);
      try { await analytics().logEvent('settings_toggle_global_topic', { enabled: !!next }); } catch {}
    } finally {
      setLoadingGlobal(false);
    }
  };

  const activeColor   = isDark ? '#F1F2F6' : BRAND.primary;
  // Switch usa primaryLight en dark para visibilidad sobre fondos oscuros
  const switchOnColor = isDark ? BRAND.primaryLight : BRAND.primary;

  return (
    <View style={[S.screen, { backgroundColor: colors.screenBg }]}>
      <Header navigation={navigation} title="Ajustes" />

      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.content, { paddingBottom: footerSpace }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ Apariencia ══ */}
        <View style={S.section}>
          <SectionLabel label="Apariencia" colors={colors} />
          <Card colors={colors}>
            {THEME_OPTIONS.map((opt, idx) => {
              const selected = mode === opt.key;
              return (
                <React.Fragment key={opt.key}>
                  {idx > 0 && <Divider colors={colors} />}
                  <TouchableOpacity
                    activeOpacity={0.72}
                    onPress={() => setMode(opt.key)}
                    style={S.row}
                  >
                    <View style={[S.iconWrap, { backgroundColor: getIconBg(isDark, selected) }]}>
                      <opt.Icon
                        size={20}
                        color={getIconColor(isDark, selected)}
                        weight={selected ? 'fill' : 'regular'}
                      />
                    </View>

                    <View style={S.rowText}>
                      <Text style={[
                        S.rowLabel,
                        { color: selected ? activeColor : colors.text },
                        selected && { fontFamily: 'Poppins-SemiBold' },
                      ]}>
                        {opt.label}
                      </Text>
                      <Text style={[S.rowSub, { color: colors.textMuted }]}>{opt.sub}</Text>
                    </View>

                    <View style={[S.radioOuter, { borderColor: selected ? activeColor : colors.cardBorder }]}>
                      {selected && <View style={[S.radioInner, { backgroundColor: activeColor }]} />}
                    </View>
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </Card>
        </View>

        {/* ══ Notificaciones ══ */}
        <View style={S.section}>
          <SectionLabel label="Notificaciones" colors={colors} />
          <Card colors={colors}>

            <View style={S.row}>
              <View style={[S.iconWrap, { backgroundColor: getIconBg(isDark, globalOn) }]}>
                {globalOn
                  ? <Bell      size={20} color={getIconColor(isDark, true)}  weight="fill"    />
                  : <BellSlash size={20} color={getIconColor(isDark, false)} weight="regular" />
                }
              </View>
              <View style={S.rowText}>
                <Text style={[S.rowLabel, { color: colors.text, fontFamily: 'Poppins-SemiBold' }]}>
                  Notificaciones generales
                </Text>
                <Text style={[S.rowSub, { color: colors.textMuted }]}>
                  Goles, inicio y final de partidos
                </Text>
              </View>
              <Switch
                value={globalOn}
                onValueChange={onToggleGlobal}
                disabled={loadingGlobal}
                trackColor={{
                  false: isDark ? '#2A2D3E' : '#E4E6F0',
                  true:  switchOnColor,
                }}
                thumbColor={Platform.OS === 'android'
                  ? (globalOn ? '#fff' : (isDark ? '#6B6E8A' : '#C8CAD8'))
                  : undefined
                }
              />
            </View>

            {!sysAllowed && (
              <>
                <Divider colors={colors} />
                <TouchableOpacity
                  style={S.row}
                  activeOpacity={0.75}
                  onPress={() => Linking.openSettings().catch(() => {})}
                >
                  <View style={[S.iconWrap, { backgroundColor: 'rgba(245,158,11,0.14)' }]}>
                    <Warning size={20} color="#f59e0b" weight="fill" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.rowLabel, { color: '#f59e0b', fontFamily: 'Poppins-SemiBold' }]}>
                      Bloqueadas en el sistema
                    </Text>
                    <Text style={[S.rowSub, { color: colors.textMuted }]}>
                      Toca para abrir Ajustes del teléfono →
                    </Text>
                  </View>
                </TouchableOpacity>
              </>
            )}

            <Divider colors={colors} />

            <View style={S.row}>
              <View style={[S.iconWrap, { backgroundColor: getIconBg(isDark, false) }]}>
                <Info size={20} color={getIconColor(isDark, false)} weight="regular" />
              </View>
              <Text style={[S.hintText, { color: colors.textMuted }]}>
                Para silenciar un partido o equipo específico, usá la campanita dentro del partido o equipo.
              </Text>
            </View>

          </Card>
        </View>

        {/* ── Footer — nombre + versión ── */}
        <Text style={[S.version, { color: colors.textMuted }]}>
          Liga Nacional GT · v1.0
        </Text>

      </ScrollView>

      <FooterTabs navigation={navigation} routeName="More" />
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  screen:  { flex: 1 },
  scroll:  { flex: 1 },
  content: { paddingHorizontal: 14, paddingTop: 16 },

  section:      { marginBottom: 24 },
  sectionLabel: {
    fontFamily: 'Poppins-SemiBold', fontSize: 11,
    textTransform: 'uppercase', letterSpacing: 0.7,
    marginBottom: 8, marginLeft: 2,
  },

  card:    { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  divider: { height: StyleSheet.hairlineWidth },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowText:  { flex: 1 },
  rowLabel: { fontFamily: 'Poppins-Regular', fontSize: 14, lineHeight: 20 },
  rowSub:   { fontFamily: 'Poppins-Regular', fontSize: 12, marginTop: 1 },

  radioOuter: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  radioInner: { width: 10, height: 10, borderRadius: 5 },

  hintText: { fontFamily: 'Poppins-Regular', fontSize: 12, lineHeight: 18, flex: 1 },

  version: {
    fontFamily: 'Poppins-Regular', fontSize: 11,
    textAlign: 'center', marginBottom: 8,
  },
});