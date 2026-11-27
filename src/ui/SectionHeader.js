// src/ui/SectionHeader.js
import React, { memo } from 'react';
import { View } from 'react-native';
import { CaretRight } from 'phosphor-react-native';
import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import Txt from './Text';
import PressableScale from './PressableScale';

function SectionHeader({ title, eyebrow, actionLabel = 'Ver todo', onAction, right, style }) {
  const { colors, space } = useDesign();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          paddingHorizontal: space[5],
          marginBottom: space[3],
        },
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <Txt variant="overline" tone="brand" style={{ marginBottom: 2 }}>
            {eyebrow}
          </Txt>
        ) : null}
        <Txt variant="h2" numberOfLines={1}>
          {title}
        </Txt>
      </View>
      {right}
      {onAction ? (
        <PressableScale
          onPress={onAction}
          hitSlop={hitSlop}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 2, paddingBottom: 3 }}
        >
          <Txt variant="caption" tone="brand">
            {actionLabel}
          </Txt>
          <CaretRight size={12} weight="bold" color={colors.primary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

export default memo(SectionHeader);
