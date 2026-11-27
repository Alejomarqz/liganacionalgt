// components/notificationPrompt.js
// ══════════════════════════════════════════════════════════
// Modal para pedir permiso de seguir equipo o partido
// ══════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestUserPermissionIfNeeded } from './notifications';

const DISMISS_KEY      = (id) => `fc_notiprompt_dismiss_${id || 'global'}`;
const SNOOZE_UNTIL_KEY = (id) => `fc_notiprompt_snooze_until_${id || 'global'}`;
const DAY_MS = 24 * 60 * 60 * 1000;

export default function NotificationPrompt({
  id          = 'global',
  mode        = 'team',
  teamId,
  teamName,
  matchTitle,
  enabled     = false,
  onActivate,
  delayMs     = 2000,
  shouldShow  = true,
  onVisibleChange,
  colors = {
    cardBg:     '#1A1A2E',
    cardBorder: '#2A2A3E',
    text:       '#FFFFFF',
    textMuted:  '#B0B0C0',
    accent:     '#F1C40F',
  },
}) {
  const [visible,    setVisible]    = useState(false);
  const [neverAgain, setNeverAgain] = useState(false);
  const [anim]                      = useState(() => new Animated.Value(0));

  useEffect(() => {
    let mounted = true;
    let timer;
    try { onVisibleChange?.(false); } catch {}

    (async () => {
      try {
        if (enabled || !shouldShow) return;

        const dismissed = await AsyncStorage.getItem(DISMISS_KEY(id));
        if (dismissed === '1') return;

        const snoozeRaw   = await AsyncStorage.getItem(SNOOZE_UNTIL_KEY(id));
        const snoozeUntil = snoozeRaw ? Number(snoozeRaw) : 0;
        if (snoozeUntil && Date.now() < snoozeUntil) return;

        timer = setTimeout(() => {
          if (!mounted) return;
          setVisible(true);
          try { onVisibleChange?.(true); } catch {}
          Animated.spring(anim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        }, delayMs);
      } catch {}
    })();

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [id, delayMs, anim, enabled, shouldShow]);

  const dismiss = () => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
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
    try {
      await AsyncStorage.setItem(
        SNOOZE_UNTIL_KEY(id),
        String(Date.now() + DAY_MS),
      );
    } catch {}
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

  const isTeam = mode === 'team';
  const title  = isTeam
    ? `Sigue a ${teamName || 'tu equipo'}`
    : 'Activa las alertas';
  const body   = isTeam
    ? 'Recibe avisos de goles, alineaciones, tarjetas rojas, inicio y fin de cada partido. Puedes desactivarlo cuando quieras.'
    : `Recibe alertas en vivo${matchTitle ? ` de ${matchTitle}` : ''}: goles, inicio y resultado final.`;
  const ctaLabel = isTeam ? 'Seguir' : 'Activar';

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

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
        <View style={styles.headerRow}>
          <View
            style={[
              styles.bellCircle,
              {
                backgroundColor: `${colors.accent}18`,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text style={styles.bellIcon}>{isTeam ? '⚽' : '🔔'}</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>
        </View>

        <Text style={[styles.body, { color: colors.textMuted }]}>{body}</Text>

        <View style={styles.levelHint}>
          <Text style={[styles.levelText, { color: colors.textMuted }]}>
            {isTeam
              ? '📋 Alineaciones · ⚽ Goles · 🟥 Rojas · 🔄 Cambios'
              : '⚽ Goles · 🏟️ Inicio · 🏁 Resultado'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setNeverAgain((v) => !v)}
          activeOpacity={0.75}
          style={styles.checkRow}
        >
          <View
            style={[
              styles.checkbox,
              {
                borderColor:     neverAgain ? colors.accent : colors.cardBorder,
                backgroundColor: neverAgain ? colors.accent : 'transparent',
              },
            ]}
          >
            {neverAgain && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={[styles.checkLabel, { color: colors.textMuted }]}>
            No mostrar de nuevo
          </Text>
        </TouchableOpacity>

        <View style={[styles.divider, { backgroundColor: colors.cardBorder }]} />

        <View style={styles.buttonsRow}>
          <TouchableOpacity onPress={snooze24h} activeOpacity={0.7} style={styles.btnGhost}>
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

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  card: {
    width: '88%',
    maxWidth: 400,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 12,
  },
  bellCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  bellIcon: { fontSize: 22 },
  headerText: { flex: 1 },
  title: { fontFamily: 'Poppins-Bold', fontSize: 15, lineHeight: 20 },
  body: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13, lineHeight: 19,
    marginBottom: 8,
  },
  levelHint: {
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  levelText: { fontFamily: 'Poppins-Regular', fontSize: 11, lineHeight: 16 },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 8,
  },
  checkbox: {
    width: 18, height: 18, borderRadius: 5, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  checkmark: { color: '#fff', fontSize: 11, fontFamily: 'Poppins-Bold', lineHeight: 13 },
  checkLabel: { fontFamily: 'Poppins-Regular', fontSize: 12 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
  btnGhost: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10 },
  btnGhostText: { fontFamily: 'Poppins-SemiBold', fontSize: 13 },
  btnPrimary: {
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 10, minWidth: 96, alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: 'Poppins-Bold', color: '#1A1A2E',
    fontSize: 13, letterSpacing: 0.2,
  },
});