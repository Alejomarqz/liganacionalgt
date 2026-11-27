// src/ui/Surface.js
// Tarjeta base. Todas las tarjetas de la app salen de aquí.
import React, { memo } from 'react';
import { View } from 'react-native';
import { useDesign } from '../design/useDesign';
import PressableScale from './PressableScale';

function Surface({ onPress, level = 1, padded = true, tone = 'surface', radiusKey = 'lg', style, children, ...rest }) {
  const { colors, radius, space, elevation } = useDesign();
  const base = {
    backgroundColor: tone === 'alt' ? colors.surfaceAlt : tone === 'high' ? colors.surfaceHigh : colors.surface,
    borderRadius: radius[radiusKey],
    borderWidth: 1,
    borderColor: colors.border,
    padding: padded ? space[4] : 0,
    overflow: 'hidden',
    ...elevation(level),
  };
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={[base, style]} {...rest}>
        {children}
      </PressableScale>
    );
  }
  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}

export default memo(Surface);
