// src/ui/PressableScale.js
// Feedback táctil premium: escala suave con spring + háptico opcional.
import React, { memo, useCallback } from 'react';
import { Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { motion } from '../design/tokens';

const APressable = Animated.createAnimatedComponent(Pressable);

function PressableScale({ scaleTo = motion.pressScale, style, children, onPressIn, onPressOut, disabled, ...rest }) {
  const s = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));

  const handleIn = useCallback(
    (e) => {
      s.value = withSpring(scaleTo, motion.spring);
      onPressIn?.(e);
    },
    [onPressIn, s, scaleTo],
  );
  const handleOut = useCallback(
    (e) => {
      s.value = withSpring(1, motion.spring);
      onPressOut?.(e);
    },
    [onPressOut, s],
  );

  return (
    <APressable
      accessibilityRole="button"
      {...rest}
      disabled={disabled}
      onPressIn={handleIn}
      onPressOut={handleOut}
      style={[style, aStyle, disabled ? { opacity: 0.5 } : null]}
    >
      {children}
    </APressable>
  );
}

export default memo(PressableScale);
