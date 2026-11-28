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

/** Haces de luz diagonales para fondos de foto.
 *  Degradado HORIZONTAL (de lado a lado) para que los bordes se disuelvan:
 *  así no aparece ninguna línea dura sobre la foto. */
const BEAM = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0.11)', 'rgba(255,255,255,0.07)', 'rgba(255,255,255,0)'];
const BEAM_SOFT = ['rgba(255,255,255,0)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0)'];

export const Beams = memo(function Beams() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: -160, bottom: -160, left: 0, right: 0 }}>
      <LinearGradient
        colors={BEAM}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, bottom: 0, left: '44%', width: 150, transform: [{ skewX: SLASH_SKEW }] }}
      />
      <LinearGradient
        colors={BEAM_SOFT}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', top: 0, bottom: 0, left: '72%', width: 60, transform: [{ skewX: SLASH_SKEW }] }}
      />
    </View>
  );
});

export default Slash;
