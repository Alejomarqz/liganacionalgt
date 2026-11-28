// src/features/ligatv/Reactions.js
// Reacciones en vivo (⚽🔥👏😱💙) que suben flotando sobre el video.
// Los toques se agrupan y se envían cada 3 s con un incremento (bajo costo en
// Firestore); todos ven flotar las reacciones de los demás.
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming, runOnJS } from 'react-native-reanimated';
import firestore from '@react-native-firebase/firestore';
import { PressableScale } from '../../ui';
import { useDesign } from '../../design/useDesign';
import { getUid } from '../games/identity';

export const REACTIONS = [
  { key: 'goal', emoji: '⚽' },
  { key: 'fire', emoji: '🔥' },
  { key: 'clap', emoji: '👏' },
  { key: 'wow', emoji: '😱' },
  { key: 'heart', emoji: '💙' },
];
const EMOJI = Object.fromEntries(REACTIONS.map((r) => [r.key, r.emoji]));
const DOC = () => firestore().collection('liga_tv_reactions').doc('main');
const FLUSH_MS = 3000;
const MAX_FLOATERS = 24;

const Floater = memo(function Floater({ id, emoji, x, onDone }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }, (fin) => fin && runOnJS(onDone)(id));
  }, [id, onDone, t]);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.75 ? 1 : 1 - (t.value - 0.75) / 0.25,
    transform: [{ translateY: -220 * t.value }, { translateX: Math.sin(t.value * 6 + x) * 14 }, { scale: 0.7 + t.value * 0.5 }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.floater, { right: 14 + (x % 5) * 10 }, style]}>
      <Text style={{ fontSize: 26 }}>{emoji}</Text>
    </Animated.View>
  );
});

/** Capa de reacciones flotantes: va encima del reproductor. */
export function ReactionsOverlay({ floaters, onDone }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {floaters.map((f) => (
        <Floater key={f.id} id={f.id} emoji={f.emoji} x={f.x} onDone={onDone} />
      ))}
    </View>
  );
}

/** Hook: escucha las reacciones de todos y envía las propias agrupadas. */
export function useReactions(enabled = true) {
  const [floaters, setFloaters] = useState([]);
  const last = useRef(null);
  const pending = useRef({});
  const seq = useRef(0);

  const spawn = useCallback((key, n) => {
    setFloaters((cur) => {
      const add = Array.from({ length: Math.min(n, 6) }, () => ({ id: `${Date.now()}-${(seq.current += 1)}`, emoji: EMOJI[key] || '⚽', x: Math.floor(Math.random() * 10) }));
      return [...cur, ...add].slice(-MAX_FLOATERS);
    });
  }, []);

  // Reacciones de los demás
  useEffect(() => {
    if (!enabled) return undefined;
    const unsub = DOC().onSnapshot(
      (snap) => {
        const data = snap?.data?.() || {};
        if (last.current) {
          for (const r of REACTIONS) {
            const d = (data[r.key] || 0) - (last.current[r.key] || 0) - (pending.current[`sent_${r.key}`] || 0);
            if (d > 0) spawn(r.key, d);
          }
          for (const r of REACTIONS) pending.current[`sent_${r.key}`] = 0;
        }
        last.current = data;
      },
      () => {},
    );
    return () => unsub();
  }, [enabled, spawn]);

  // Envío agrupado
  useEffect(() => {
    if (!enabled) return undefined;
    const t = setInterval(() => {
      const inc = {};
      for (const r of REACTIONS) {
        const n = pending.current[r.key] || 0;
        if (n) {
          inc[r.key] = firestore.FieldValue.increment(Math.min(n, 20));
          pending.current[`sent_${r.key}`] = (pending.current[`sent_${r.key}`] || 0) + Math.min(n, 20);
          pending.current[r.key] = 0;
        }
      }
      if (Object.keys(inc).length) getUid().then(() => DOC().set(inc, { merge: true })).catch(() => {});
    }, FLUSH_MS);
    return () => clearInterval(t);
  }, [enabled]);

  const react = useCallback(
    (key) => {
      pending.current[key] = (pending.current[key] || 0) + 1;
      spawn(key, 1); // feedback inmediato
    },
    [spawn],
  );
  const remove = useCallback((id) => setFloaters((cur) => cur.filter((f) => f.id !== id)), []);

  return { floaters, react, remove };
}

/** Barra de botones de reacción. */
export const ReactionBar = memo(function ReactionBar({ onReact }) {
  const { colors } = useDesign();
  return (
    <View style={[styles.bar, { borderBottomColor: colors.divider }]}>
      {REACTIONS.map((r) => (
        <PressableScale key={r.key} onPress={() => onReact(r.key)} scaleTo={0.85} accessibilityLabel={`Reaccionar ${r.emoji}`} style={[styles.btn, { backgroundColor: colors.surfaceHigh }]}>
          <Text style={{ fontSize: 20 }}>{r.emoji}</Text>
        </PressableScale>
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  floater: { position: 'absolute', bottom: 40 },
  bar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  btn: { width: 54, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
