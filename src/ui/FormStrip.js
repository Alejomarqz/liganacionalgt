// src/ui/FormStrip.js
// Racha reciente: G / E / P en chips de color (más reciente a la derecha).
import React, { memo } from 'react';
import { View } from 'react-native';
import { useDesign } from '../design/useDesign';
import Txt from './Text';

const LABEL = { W: 'G', D: 'E', L: 'P' };

function FormStrip({ sequence = '', size = 22, style }) {
  const { colors } = useDesign();
  const bg = { W: colors.success, D: colors.textMuted, L: colors.danger };
  const items = String(sequence).toUpperCase().split('').filter((c) => LABEL[c]);
  if (!items.length) return null;
  return (
    <View style={[{ flexDirection: 'row', gap: 4 }, style]}>
      {items.map((r, i) => (
        <View
          key={i}
          accessibilityLabel={r === 'W' ? 'Ganó' : r === 'D' ? 'Empató' : 'Perdió'}
          style={{ width: size, height: size, borderRadius: 6, backgroundColor: bg[r], alignItems: 'center', justifyContent: 'center', opacity: 0.55 + (0.45 * (i + 1)) / items.length }}
        >
          <Txt variant="overline" color="#fff" style={{ letterSpacing: 0, fontSize: size * 0.48 }}>
            {LABEL[r]}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export default memo(FormStrip);
