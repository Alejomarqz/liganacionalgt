// src/ui/SectionHeader.js
// Título de sección con la diagonal de la marca.
import React, { memo } from 'react';
import { View } from 'react-native';
import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import Txt from './Text';
import PressableScale from './PressableScale';
import { Slash } from './Slash';

function SectionHeader({ title, eyebrow, actionLabel = 'Ver todo', onAction, right, style }) {
  const { space } = useDesign();
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space[5], marginBottom: space[3] }, style]}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Txt variant="overline" tone="secondary" style={{ marginBottom: 4 }}>
            {eyebrow}
          </Txt>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Slash />
          <Txt variant="h2" numberOfLines={1} style={{ flexShrink: 1 }}>
            {title}
          </Txt>
        </View>
      </View>
      {right}
      {onAction ? (
        <PressableScale onPress={onAction} hitSlop={hitSlop}>
          <Txt variant="caption" tone="brand" style={{ fontFamily: 'Inter-SemiBold', fontSize: 12.5 }}>
            {actionLabel}
          </Txt>
        </PressableScale>
      ) : null}
    </View>
  );
}

export default memo(SectionHeader);
