// src/ui/LiveBadge.js
// "EN VIVO" sobrio: rectángulo rojo, punto blanco con pulso.
import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';
import { useDesign } from '../design/useDesign';
import Txt from './Text';

export const PulseDot = memo(function PulseDot({ size = 6, color }) {
  const { colors } = useDesign();
  const c = color || colors.live;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(p);
  }, [p]);
  const ring = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - p.value), transform: [{ scale: 1 + p.value * 1.6 }] }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={[StyleSheet.absoluteFill, { borderRadius: size, backgroundColor: c }, ring]} />
      <View style={{ width: size, height: size, borderRadius: size, backgroundColor: c }} />
    </View>
  );
});

/** label: 'EN VIVO' · minute: "67'" (si viene, se muestra sólo el minuto) */
function LiveBadge({ label = 'EN VIVO', minute, style }) {
  const { colors } = useDesign();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingLeft: 8, paddingRight: 9, paddingVertical: 4, borderRadius: 4, backgroundColor: colors.live }, style]}>
      <PulseDot size={6} color="#fff" />
      <Txt variant="overline" color="#fff" style={{ letterSpacing: 1.2, fontFamily: 'Inter-ExtraBold' }}>
        {minute || label}
      </Txt>
    </View>
  );
}

export default memo(LiveBadge);
