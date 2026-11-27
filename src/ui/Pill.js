// src/ui/Pill.js
import React, { memo } from 'react';
import { View } from 'react-native';
import { useDesign } from '../design/useDesign';
import Txt from './Text';
import PressableScale from './PressableScale';

/** tone: neutral | brand | live | gold | success */
function Pill({ label, tone = 'neutral', active = false, icon, onPress, style }) {
  const { colors, radius } = useDesign();
  const bgMap = {
    neutral: colors.surfaceHigh,
    brand: colors.primarySoft,
    live: colors.liveSoft,
    gold: colors.goldSoft,
    success: colors.successSoft,
  };
  const fgMap = {
    neutral: colors.textSecondary,
    brand: colors.primary,
    live: colors.live,
    gold: colors.gold,
    success: colors.success,
  };
  const bg = active ? colors.primary : bgMap[tone];
  const fg = active ? colors.onPrimary : fgMap[tone];

  const content = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {icon}
      <Txt variant="caption" color={fg} style={{ fontFamily: 'Poppins-SemiBold' }}>
        {label}
      </Txt>
    </View>
  );

  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} accessibilityState={{ selected: active }}>
      {content}
    </PressableScale>
  );
}

export default memo(Pill);
