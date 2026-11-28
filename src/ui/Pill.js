// src/ui/Pill.js
// Chip. Activo = fondo azul inclinado (la diagonal); inactivo = solo texto.
// tone (cuando no es seleccionable): neutral | brand | live | gold | success
import React, { memo } from 'react';
import { View } from 'react-native';
import { useDesign } from '../design/useDesign';
import { CHIP_SKEW } from '../design/tokens';
import Txt from './Text';
import PressableScale from './PressableScale';

function Pill({ label, tone = 'neutral', active = false, icon, onPress, style }) {
  const { colors } = useDesign();
  const selectable = Boolean(onPress);

  const toneBg = { neutral: colors.surfaceHigh, brand: colors.primarySoft, live: colors.liveSoft, gold: colors.goldSoft, success: colors.successSoft };
  const toneFg = { neutral: colors.textSecondary, brand: colors.primary, live: colors.live, gold: colors.gold, success: colors.success };

  const bg = selectable ? (active ? colors.primaryStrong : 'transparent') : toneBg[tone];
  const fg = selectable ? (active ? colors.onPrimary : colors.textSecondary) : toneFg[tone];

  const content = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' }, style]}>
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 2, right: 2, borderRadius: 4, backgroundColor: bg, transform: [{ skewX: CHIP_SKEW }] }} />
      {icon}
      <Txt variant="caption" color={fg} style={{ fontFamily: 'Inter-Bold' }}>
        {label}
      </Txt>
    </View>
  );

  if (!selectable) return content;
  return (
    <PressableScale onPress={onPress} accessibilityState={{ selected: active }}>
      {content}
    </PressableScale>
  );
}

export default memo(Pill);
