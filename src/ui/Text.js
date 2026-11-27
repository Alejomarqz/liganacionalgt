// src/ui/Text.js
import React, { memo } from 'react';
import { Text as RNText } from 'react-native';
import { useDesign } from '../design/useDesign';

/**
 * <Txt variant="h2" tone="secondary">Hola</Txt>
 * variant: display | h1 | h2 | h3 | body | bodyStrong | caption | overline | score | scoreSm | number
 * tone: primary(text) | secondary | muted | brand | live | gold | success | inverse | onPrimary
 */
function Txt({ variant = 'body', tone = 'primary', color, align, style, children, ...rest }) {
  const { colors, type } = useDesign();
  const toneMap = {
    primary: colors.text,
    secondary: colors.textSecondary,
    muted: colors.textMuted,
    brand: colors.primary,
    live: colors.live,
    gold: colors.gold,
    success: colors.success,
    danger: colors.danger,
    inverse: colors.textInverse,
    onPrimary: colors.onPrimary,
  };
  return (
    <RNText
      allowFontScaling
      maxFontSizeMultiplier={1.3}
      {...rest}
      style={[
        type[variant] || type.body,
        { color: color || toneMap[tone] || colors.text },
        align ? { textAlign: align } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

export default memo(Txt);
