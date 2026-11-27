// components/NotificationPrompt.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme }   from '../utils/ThemeContext';
import LogoImg        from './LogoImg';
import { requestUserPermissionIfNeeded } from '../services/notifications';

/* ─── Storage keys ───────────────────────────────────────── */
const DISMISS_KEY     = id => `fc_notiprompt_dismiss_${id || 'global'}`;
const SNOOZE_UNTIL_KEY = id => `fc_notiprompt_snooze_until_${id || 'global'}`;
const DAY_MS = 24 * 60 * 60 * 1000;

/* ══════════════════════════════════════════════════════════
   NOTIFICATION PROMPT
══════════════════════════════════════════════════════════ */
export default function NotificationPrompt({
  id          = 'global',
  mode        = 'team',
  teamId,
  enabled     = false,
  onActivate,
  delayMs     = 2000,
  shouldShow  = true,
  onVisibleChange,
}) {
  const { theme } = useTheme();
  const colors    = theme.colors;
  const isDark    = theme?.mode === 'dark';

  const [visible,    setVisible]    = useState(false);
  const [neverAgain, setNeverAgain] = useState(false);
  const [anim]                      = useState(() => new Animated.Value(0));

  /* ── Lógica de visibilidad ── */
  useEffect(() => {
    let mounted = true, timer;
    try { onVisibleChange?.(false); } catch {}

    (async () => {
      try {
        if (enabled)    return;
        if (!shouldShow) return;

        const dismissed = await AsyncStorage.getItem(DISMISS_KEY(id));
        if (dismissed === '1') return;

        const snoozeRaw   = await AsyncStorage.getItem(SNOOZE_UNTIL_KEY(id));
        const snoozeUntil = snoozeRaw ? Number(snoozeRaw) : 0;
        if (snoozeUntil && Date.now() < snoozeUntil) return;

        timer = setTimeout(() => {
          if (!mounted) return;
          setVisible(true);
          try { onVisibleChange?.(true); } catch {}
          Animated.spring(anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }).start();
        }, delayMs);
      } catch {}
    })();

    return () => { mounted = false; clearTimeout(timer); };
  }, [id, delayMs, anim, enabled, shouldShow]);

  /* ── Handlers ── */
  const dismiss = () => {
    Animated.timing(anim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setVisible(false);
      try { onVisibleChange?.(false); } catch {}
    });
  };

  const close = async () => {
    if (neverAgain) {
      try { await AsyncStorage.setItem(DISMISS_KEY(id), '1'); } catch {}
    }
    dismiss();
  };

  const snooze24h = async () => {
    try { await AsyncStorage.setItem(SNOOZE_UNTIL_KEY(id), String(Date.now() + DAY_MS)); } catch {}
    dismiss();
  };

  const handleActivate = async () => {
    try {
      await requestUserPermissionIfNeeded();
      if (typeof onActivate === 'function') await onActivate();
    } finally {
      dismiss();
    }
  };

  if (!visible) return null;

  /* ── Textos según modo ── */
  const isTeam   = mode === 'team';
  const title    = isTeam
    ? 'Sigue a tu equipo'
    : 'Activa las alertas';
  const body     = isTeam
    ? 'Recibe avisos cuando este equipo juegue: inicio del partido, goles y resultado final. Puedes desactivarlo cuando quieras.'
    : 'Te avisaremos cuando empiece, haya goles y cuando termine el encuentro. Puedes ajustar esto más tarde en Ajustes.';
  const ctaLabel = isTeam ? 'Seguir' : 'Activar';

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor:     colors.cardBorder,
            opacity:         anim,
            transform:       [{ scale }],
          },
        ]}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          {isTeam && teamId ? (
            <LogoImg teamId={String(teamId)} size={44} style={styles.logoImg} />
          ) : (
            <View style={[
              styles.bellCircle,
              { backgroundColor: isDark ? `${colors.accent}22` : `${colors.accent}12`, borderColor: colors.cardBorder },
            ]}>
              <Image
                source={require('../resources/bell_yellow.png')}
                style={styles.bellIcon}
              />
            </View>
          )}

          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>
        </View>

        {/* ── Cuerpo ── */}
        <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>

        {/* ── Checkbox "no mostrar de nuevo" ── */}
        <TouchableOpacity
          onPress={() => setNeverAgain(v => !v)}
          activeOpacity={0.75}
          style={styles.checkRow}
        >
          <View style={[
            styles.checkbox,
            {
              borderColor:     neverAgain ? colors.accent : colors.cardBorder,
              backgroundColor: neverAgain ? colors.accent : 'transparent',
            },
          ]}>
            {neverAgain && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.checkLabel, { color: colors.textMuted }]}>
            No mostrar de nuevo
          </Text>
        </TouchableOpacity>

        {/* ── Divider ── */}
        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

        {/* ── Botones ── */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            onPress={snooze24h}
            activeOpacity={0.7}
            style={styles.btnGhost}
          >
            <Text style={[styles.btnGhostText, { color: colors.textMuted }]}>Ahora no</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleActivate}
            activeOpacity={0.85}
            style={[styles.btnPrimary, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.btnPrimaryText}>{ctaLabel}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'box-none',
  },

  card: {
    width: '88%', maxWidth: 400,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14,
    shadowOpacity: 0.18, shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },

  /* Header */
  headerRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  logoImg:    { marginRight: 0 },
  bellCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  bellIcon:   { width: 22, height: 22, resizeMode: 'contain' },
  headerText: { flex: 1 },
  title:      { fontFamily: 'Poppins-Bold', fontSize: 15, lineHeight: 20 },

  /* Cuerpo */
  body: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13, lineHeight: 19,
    marginBottom: 12,
  },

  /* Checkbox */
  checkRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  checkbox:  {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 11, fontFamily: 'Poppins-Bold', lineHeight: 13 },
  checkLabel: { fontFamily: 'Poppins-Regular', fontSize: 12 },

  /* Divider */
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },

  /* Botones */
  buttonsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 8 },
  btnGhost:   { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  btnGhostText: { fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  btnPrimary: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, minWidth: 96, alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: 'Poppins-Bold', color: '#fff',
    fontSize: 13, letterSpacing: 0.2,
  },
});