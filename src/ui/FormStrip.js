// src/ui/FormStrip.js
// Racha: barras inclinadas verde/gris/rojo (más reciente a la derecha).
import React, { memo } from 'react';
import { View } from 'react-native';
import { useDesign } from '../design/useDesign';
import { CHIP_SKEW } from '../design/tokens';

const A11Y = { W: 'Ganó', D: 'Empató', L: 'Perdió' };

function FormStrip({ sequence = '', size = 12, last, style }) {
  const { colors } = useDesign();
  const bg = { W: colors.formW, D: colors.formD, L: colors.formL };
  let items = String(sequence).toUpperCase().split('').filter((c) => bg[c]);
  if (last) items = items.slice(-last);
  if (!items.length) return null;
  return (
    <View accessibilityLabel={items.map((r) => A11Y[r]).join(', ')} style={[{ flexDirection: 'row', gap: 3 }, style]}>
      {items.map((r, i) => (
        <View key={i} style={{ width: size * 0.75, height: size, borderRadius: 1, backgroundColor: bg[r], transform: [{ skewX: CHIP_SKEW }] }} />
      ))}
    </View>
  );
}

export default memo(FormStrip);
