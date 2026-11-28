// src/ui/Tabs.js
// Pestañas segmentadas con indicador animado (Reanimated).
import React, { memo, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useDesign } from '../design/useDesign';
import { motion } from '../design/tokens';
import Txt from './Text';
import PressableScale from './PressableScale';

function Tabs({ tabs, value, onChange, style, scrollable = false }) {
  const { colors, space } = useDesign();
  const [layouts, setLayouts] = useState({});
  const x = useSharedValue(0);
  const w = useSharedValue(0);

  useEffect(() => {
    const l = layouts[value];
    if (l) {
      // El indicador va un poco más corto que la pestaña e inclinado (la diagonal)
      x.value = withSpring(l.x + 12, motion.spring);
      w.value = withSpring(Math.max(0, l.width - 24), motion.spring);
    }
  }, [value, layouts, x, w]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { skewX: '-30deg' }], width: w.value }));

  const Row = scrollable ? ScrollView : View;
  const rowProps = scrollable
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: { paddingHorizontal: 12 } }
    : { style: { flexDirection: 'row', paddingHorizontal: space[4] } };

  return (
    <View style={[{ borderBottomWidth: 1, borderBottomColor: colors.divider }, style]}>
      <Row {...rowProps}>
        <View style={{ flexDirection: 'row', flex: scrollable ? undefined : 1 }}>
          {tabs.map((t) => {
            const key = t.key ?? t;
            const label = t.label ?? t;
            const active = key === value;
            return (
              <PressableScale
                key={key}
                onPress={() => onChange(key)}
                scaleTo={0.96}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onLayout={(e) => {
                  const { x: lx, width } = e.nativeEvent.layout;
                  setLayouts((p) => (p[key]?.x === lx && p[key]?.width === width ? p : { ...p, [key]: { x: lx, width } }));
                }}
                style={{ flex: scrollable ? undefined : 1, paddingHorizontal: scrollable ? 12 : 0, paddingVertical: 13, alignItems: 'center' }}
              >
                <Txt variant="bodyStrong" color={active ? colors.text : colors.textMuted} numberOfLines={1} style={{ fontFamily: 'Inter-Bold', fontSize: 13.5 }}>
                  {label}
                </Txt>
              </PressableScale>
            );
          })}
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, height: 3, backgroundColor: colors.primary }, indicator]} />
        </View>
      </Row>
    </View>
  );
}

export default memo(Tabs);
