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
      x.value = withSpring(l.x, motion.spring);
      w.value = withSpring(l.width, motion.spring);
    }
  }, [value, layouts, x, w]);

  const indicator = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], width: w.value }));

  const Row = scrollable ? ScrollView : View;
  const rowProps = scrollable
    ? { horizontal: true, showsHorizontalScrollIndicator: false, contentContainerStyle: { paddingHorizontal: space[4] } }
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
                style={{ flex: scrollable ? undefined : 1, paddingHorizontal: scrollable ? space[4] : 0, paddingVertical: 12, alignItems: 'center' }}
              >
                <Txt variant="bodyStrong" color={active ? colors.text : colors.textMuted} numberOfLines={1}>
                  {label}
                </Txt>
              </PressableScale>
            );
          })}
          <Animated.View style={[{ position: 'absolute', bottom: 0, left: 0, height: 3, borderRadius: 2, backgroundColor: colors.primary }, indicator]} />
        </View>
      </Row>
    </View>
  );
}

export default memo(Tabs);
