// src/ui/StateViews.js
// Estados vacíos / error consistentes en toda la app.
import React, { memo } from 'react';
import { View } from 'react-native';
import { WifiSlash, SoccerBall, ArrowClockwise } from 'phosphor-react-native';
import { useDesign } from '../design/useDesign';
import Txt from './Text';
import PressableScale from './PressableScale';

export const EmptyState = memo(function EmptyState({ title, message, Icon = SoccerBall, style }) {
  const { colors, space } = useDesign();
  return (
    <View style={[{ alignItems: 'center', padding: space[8], gap: space[2] }, style]}>
      <Icon size={36} color={colors.textMuted} weight="duotone" />
      <Txt variant="h3" align="center">
        {title}
      </Txt>
      {message ? (
        <Txt variant="body" tone="muted" align="center">
          {message}
        </Txt>
      ) : null}
    </View>
  );
});

export const ErrorState = memo(function ErrorState({ message, onRetry, style }) {
  const { colors, space, radius } = useDesign();
  return (
    <View style={[{ alignItems: 'center', padding: space[8], gap: space[3] }, style]}>
      <WifiSlash size={36} color={colors.textMuted} weight="duotone" />
      <Txt variant="h3" align="center">
        No pudimos conectar
      </Txt>
      <Txt variant="body" tone="muted" align="center">
        {message || 'Revisa tu conexión e inténtalo de nuevo.'}
      </Txt>
      {onRetry ? (
        <PressableScale
          onPress={onRetry}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: colors.primary,
            paddingHorizontal: space[5],
            paddingVertical: space[3],
            borderRadius: radius.pill,
          }}
        >
          <ArrowClockwise size={16} color={colors.onPrimary} weight="bold" />
          <Txt variant="bodyStrong" tone="onPrimary">
            Reintentar
          </Txt>
        </PressableScale>
      ) : null}
    </View>
  );
});

// Banner fino cuando mostramos datos guardados sin conexión.
export const OfflineBanner = memo(function OfflineBanner({ visible }) {
  const { colors, space } = useDesign();
  if (!visible) return null;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 6,
        backgroundColor: colors.surfaceHigh,
        marginBottom: space[2],
      }}
    >
      <WifiSlash size={13} color={colors.textSecondary} />
      <Txt variant="caption" tone="secondary">
        Sin conexión · mostrando lo último guardado
      </Txt>
    </View>
  );
});
