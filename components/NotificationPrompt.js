// components/NotificationPrompt.js
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../utils/ThemeContext';
import LogoImg from './LogoImg';
import { requestUserPermissionIfNeeded } from '../services/notifications';
import { getBellIcon } from '../utils/bell';

const DISMISS_KEY = (id) => `fc_notiprompt_dismiss_${id || 'global'}`;
const SNOOZE_UNTIL_KEY = (id) => `fc_notiprompt_snooze_until_${id || 'global'}`;
const DAY_MS = 24 * 60 * 60 * 1000;


export default function NotificationPrompt({
  id = 'global',
  mode = 'team',
  teamId,
  enabled = false,     // ✅ NUEVO: ya está siguiendo (campana ON)
  onActivate,
  delayMs = 2000,
  shouldShow = true,
  onVisibleChange, // ✅ NUEVO
}) {

  const { theme } = useTheme();
  const colors = theme.colors;
  const isDark = theme?.mode === 'dark';

  const [visible, setVisible] = useState(false);
  const [neverAgain, setNeverAgain] = useState(false);
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
  let mounted = true;
  let timer;

  // ✅ (PARTE 4) Por defecto, dile al padre: "no estoy visible"
  try { onVisibleChange?.(false); } catch {}

  (async () => {
    try {
      // ✅ si ya sigue (campana ON), NO mostrar prompt
      if (enabled) return;

      // ✅ si "No mostrar de nuevo" está activo, NO mostrar
      const dismissed = await AsyncStorage.getItem(DISMISS_KEY(id));
      if (dismissed === '1') return;

      // ✅ si está en snooze (AHORA NO), NO mostrar hasta que venza
      const snoozeUntilRaw = await AsyncStorage.getItem(SNOOZE_UNTIL_KEY(id));
      const snoozeUntil = snoozeUntilRaw ? Number(snoozeUntilRaw) : 0;
      if (snoozeUntil && Date.now() < snoozeUntil) return;

      // ✅ si el padre dice "no mostrar", NO mostrar
      if (!shouldShow) return;


      timer = setTimeout(() => {
  if (!mounted) return;
  setVisible(true);
  try { onVisibleChange?.(true); } catch {}
  Animated.timing(anim, { toValue: 1, duration: 220, useNativeDriver: true }).start();
}, delayMs);

    } catch {}
  })();

  return () => {
    mounted = false;
    clearTimeout(timer);
  };
}, [id, delayMs, anim, enabled, shouldShow]); // ✅ enabled en deps


  const close = async () => {
    if (neverAgain) await AsyncStorage.setItem(DISMISS_KEY(id), '1');
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true })
  .start(() => {
    setVisible(false);
    try { onVisibleChange?.(false); } catch {}
  });

  };

  const snooze24h = async () => {
  try {
    await AsyncStorage.setItem(SNOOZE_UNTIL_KEY(id), String(Date.now() + DAY_MS));
  } catch {}
  close();
};


  const handleActivate = async () => {
  try {
    await requestUserPermissionIfNeeded();
    if (typeof onActivate === 'function') await onActivate();
    // ✅ NO guardamos DISMISS aquí
    // (el prompt dejará de salir porque enabled pasará a true desde la pantalla)
  } finally {
    close();
  }
};




  if (!visible) return null;

  const isTeam = mode === 'team';
  const title = isTeam ? 'Sigue a tu equipo y activa las notificaciones' : 'Activa las alertas de este partido';
  const body = isTeam
    ? 'Activa las alertas para recibir avisos cuando este equipo juegue: inicio, goles, resultado final y. Puedes cambiarlo después en Ajustes.'
    : 'Te avisaremos cuando empiece, haya goles y cuando termine el encuentro. Puedes ajustar esto más tarde en Ajustes.';
  const ctaLabel = isTeam ? 'SEGUIR' : 'ACTIVAR';

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

  // ✅ campana "on" (amarilla) usando tu sistema actual (PNG)
  const bellSrc = require('../resources/bell_yellow.png');



  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
            transform: [{ scale }],
            opacity: anim,
          },
        ]}
      >
        <View style={styles.headerRow}>
          {isTeam && teamId ? (
  <LogoImg
    teamId={String(teamId)}
    size={44}
    style={{ marginRight: 12 }}   // solo espacio a la derecha
  />
) : (
  <View
    style={[
      styles.iconCircle,
      { borderColor: colors.cardBorder, backgroundColor: isDark ? '#0b1220' : '#fff' },
    ]}
  >
    <Image source={bellSrc} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
  </View>
)}


          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>
        </View>

        <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setNeverAgain((v) => !v)}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.checkboxBox,
              {
                borderColor: colors.cardBorder,
                backgroundColor: neverAgain ? colors.accent : 'transparent',
              },
            ]}
          />
          <Text style={[styles.checkboxLabel, { color: colors.textMuted }]}>No mostrar de nuevo</Text>
        </TouchableOpacity>

        <View style={styles.buttonsRow}>
          <TouchableOpacity onPress={snooze24h} style={styles.btnGhost} activeOpacity={0.85}>
            <Text style={[styles.btnGhostText, { color: colors.textMuted }]}>AHORA NO</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleActivate}
            style={[styles.btnPrimary, { backgroundColor: colors.accent }]}
            activeOpacity={0.9}
          >
            <Text style={styles.btnTextPrimary}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', pointerEvents: 'box-none',
  },
  card: {
    width: '90%', maxWidth: 400, borderRadius: 18, borderWidth: 1,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    shadowOpacity: 0.20, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  title: { fontSize: 16, fontWeight: '800', lineHeight: 20 },
  body: { fontSize: 13, fontWeight: '500', lineHeight: 18, marginBottom: 10 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkboxBox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, marginRight: 8 },
  checkboxLabel: { fontSize: 12, fontWeight: '600' },
  buttonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btnGhost: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12 },
  btnGhostText: { fontSize: 12, fontWeight: '800' },
  btnPrimary: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, minWidth: 96, alignItems: 'center' },
  btnTextPrimary: { color: '#fff', fontSize: 12, fontWeight: '900', letterSpacing: 0.2 },
});
