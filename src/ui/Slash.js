// src/ui/Slash.js
// La diagonal del escudo: firma visual de Liga Nacional GT.
import React, { memo } from 'react';
import { View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDesign } from '../design/useDesign';
import { SLASH_SKEW } from '../design/tokens';

/** Marcador de sección (antes de cada título). */
export const Slash = memo(function Slash({ width = 7, height = 16, color, style }) {
  const { colors } = useDesign();
  const content = color ? (
    <View style={{ flex: 1, backgroundColor: color }} />
  ) : (
    <LinearGradient colors={colors.primaryGradient} style={{ flex: 1 }} />
  );
  return <View style={[{ width, height, borderRadius: 1, overflow: 'hidden', transform: [{ skewX: SLASH_SKEW }] }, style]}>{content}</View>;
});

/** Separador del marcador: 2 / 1 */
export const ScoreSlash = memo(function ScoreSlash({ height = 44, width = 7, live, muted, style }) {
  const { colors } = useDesign();
  if (live || muted) {
    return <Slash width={width} height={height} color={live ? colors.live : colors.textMuted} style={[{ marginHorizontal: width * 2 }, style]} />;
  }
  return <Slash width={width} height={height} style={[{ marginHorizontal: width * 2 }, style]} />;
});

/** Haces de luz diagonales para fondos de foto. */
export const Beams = memo(function Beams() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -120, bottom: -120, left: 0, right: 0 }}>
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
        style={{ position: 'absolute', top: 0, bottom: 0, left: '52%', width: 90, transform: [{ skewX: SLASH_SKEW }] }}
      />
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: '70%', width: 24, backgroundColor: 'rgba(255,255,255,0.05)', transform: [{ skewX: SLASH_SKEW }] }} />
    </View>
  );
});

export default Slash;
