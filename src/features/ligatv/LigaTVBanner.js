// src/features/ligatv/LigaTVBanner.js
// Banner del Home: aparece sólo si hay transmisión en vivo o programada.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PlayCircle, Television } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, PressableScale, LiveBadge } from '../../ui';
import { formatKickoff } from '../../api/clock';

function LigaTVBanner({ tv, onPress }) {
  const { colors, radius, space } = useDesign();
  const upcoming = tv?.startsAt && tv.startsAt.getTime() > Date.now();
  if (!tv?.active && !upcoming) return null;

  return (
    <PressableScale onPress={onPress} style={{ marginHorizontal: space[5] }}>
      <LinearGradient
        colors={tv.active ? colors.liveGradient : [colors.surfaceHigh, colors.surface]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.card, { borderRadius: radius.lg, borderColor: tv.active ? 'transparent' : colors.border }]}
      >
        <View style={[styles.icon, { backgroundColor: tv.active ? 'rgba(255,255,255,0.14)' : colors.primarySoft }]}>
          <Television size={22} weight="duotone" color={tv.active ? '#fff' : colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          {tv.active ? <LiveBadge solid label="LIGA TV EN VIVO" /> : <Txt variant="overline" tone="brand">Liga TV · {formatKickoff(tv.startsAt)}</Txt>}
          <Txt variant="bodyStrong" numberOfLines={1} color={tv.active ? '#fff' : colors.text}>
            {tv.title}
          </Txt>
        </View>
        <PlayCircle size={34} weight="fill" color={tv.active ? '#fff' : colors.primary} />
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});

export default memo(LigaTVBanner);
