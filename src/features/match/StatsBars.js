// src/features/match/StatsBars.js
// Barras comparativas animadas; el lado que domina se resalta.
import React, { memo, useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { useDesign } from '../../design/useDesign';
import { Txt, Surface, EmptyState } from '../../ui';

const Bar = ({ ratio, color, align }) => {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(ratio, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [ratio, v]);
  const s = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View style={{ flex: 1, height: 6, borderRadius: 3, overflow: 'hidden', alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
      <Animated.View style={[{ height: '100%', borderRadius: 3, backgroundColor: color }, s]} />
    </View>
  );
};

function StatRow({ row, colors }) {
  const total = row.home + row.away || 1;
  const hr = row.home / total;
  const ar = row.away / total;
  const hWin = row.home > row.away;
  const aWin = row.away > row.home;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Txt variant="number" style={{ fontFamily: hWin ? 'Poppins-ExtraBold' : 'Poppins-Medium', minWidth: 40 }} color={hWin ? colors.text : colors.textSecondary}>
          {row.home}
          {row.unit}
        </Txt>
        <Txt variant="caption" tone="secondary">
          {row.label}
        </Txt>
        <Txt variant="number" align="right" style={{ fontFamily: aWin ? 'Poppins-ExtraBold' : 'Poppins-Medium', minWidth: 40 }} color={aWin ? colors.text : colors.textSecondary}>
          {row.away}
          {row.unit}
        </Txt>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <View style={{ flex: 1, backgroundColor: colors.surfaceHigh, borderRadius: 3 }}>
          <Bar ratio={hr} color={hWin ? colors.primary : colors.textMuted} align="right" />
        </View>
        <View style={{ flex: 1, backgroundColor: colors.surfaceHigh, borderRadius: 3 }}>
          <Bar ratio={ar} color={aWin ? colors.live : colors.textMuted} align="left" />
        </View>
      </View>
    </View>
  );
}

function StatsBars({ model }) {
  const { colors, space } = useDesign();
  const rows = model.stats;
  if (!rows.length) {
    return (
      <Surface style={{ marginHorizontal: space[4] }}>
        <EmptyState title="Sin estadísticas" message="Este partido no tiene estadísticas detalladas todavía." />
      </Surface>
    );
  }
  return (
    <Surface style={{ marginHorizontal: space[4], gap: 18 }}>
      {rows.map((r) => (
        <StatRow key={r.key} row={r} colors={colors} />
      ))}
    </Surface>
  );
}

export default memo(StatsBars);
