// src/ui/LiveBadge.js
// Indicador "EN VIVO" con pulso animado (Reanimated, corre en UI thread).
import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useDesign } from '../design/useDesign';
import Txt from './Text';

export const PulseDot = memo(function PulseDot({ size = 8, color }) {
  const { colors } = useDesign();
  const c = color || colors.live;
  const p = useSharedValue(0);

  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(p);
  }, [p]);

  const ring = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - p.value),
    transform: [{ scale: 1 + p.value * 1.6 }],
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: c }, ring]}
      />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: c }} />
    </View>
  );
});

function LiveBadge({ label = 'EN VIVO', minute, solid = false, style }) {
  const { colors, radius } = useDesign();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          alignSelf: 'flex-start',
          gap: 6,
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: solid ? colors.live : colors.liveSoft,
        },
        style,
      ]}
    >
      <PulseDot size={6} color={solid ? '#fff' : colors.live} />
      <Txt variant="overline" color={solid ? '#fff' : colors.live} style={{ letterSpacing: 1 }}>
        {minute ? `${label} · ${minute}` : label}
      </Txt>
    </View>
  );
}

export default memo(LiveBadge);
