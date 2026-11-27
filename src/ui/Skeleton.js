// src/ui/Skeleton.js
// Placeholders con brillo: la app nunca muestra un spinner en blanco.
import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  interpolate,
  cancelAnimation,
} from 'react-native-reanimated';
import { useDesign } from '../design/useDesign';

function Skeleton({ width = '100%', height = 14, radius = 8, style }) {
  const { colors } = useDesign();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1100 }), -1, true);
    return () => cancelAnimation(t);
  }, [t]);

  const a = useAnimatedStyle(() => ({ opacity: interpolate(t.value, [0, 1], [0.55, 1]) }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: radius, backgroundColor: colors.skeletonHighlight }, a, style]}
    />
  );
}

export const SkeletonCard = memo(function SkeletonCard({ height = 120, style }) {
  const { colors, radius, space } = useDesign();
  return (
    <View
      style={[
        {
          height,
          borderRadius: radius.lg,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          padding: space[4],
          justifyContent: 'space-between',
        },
        style,
      ]}
    >
      <Skeleton width="40%" height={10} />
      <Skeleton width="85%" height={18} />
      <Skeleton width="60%" height={10} />
    </View>
  );
});

export default memo(Skeleton);
