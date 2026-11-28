// src/features/ligatv/LigaTVBanner.js
// Banner de Liga TV: sólo aparece si hay transmisión en vivo o programada.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Television, Play } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, PressableScale, LiveBadge } from '../../ui';
import { formatKickoff } from '../../api/clock';

function LigaTVBanner({ tv, onPress }) {
  const { colors } = useDesign();
  const upcoming = tv?.startsAt && tv.startsAt.getTime() > Date.now();
  if (!tv?.active && !upcoming) return null;

  return (
    <PressableScale onPress={onPress} style={{ marginHorizontal: 16, marginTop: 16 }}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: tv.active ? 'rgba(255,59,78,0.35)' : colors.border }]}>
        <View style={[styles.icon, { backgroundColor: tv.active ? colors.liveSoft : colors.primarySoft }]}>
          <Television size={22} weight="duotone" color={tv.active ? colors.live : colors.primary} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          {tv.active ? (
            <LiveBadge label="LIGA TV EN VIVO" />
          ) : (
            <Txt variant="overline" tone="brand">
              Liga TV · {formatKickoff(tv.startsAt)}
            </Txt>
          )}
          <Txt variant="bodyStrong" numberOfLines={1}>
            {tv.title}
          </Txt>
        </View>
        <View style={[styles.play, { backgroundColor: tv.active ? colors.live : colors.primaryStrong }]}>
          <Play size={16} weight="fill" color="#fff" />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 18 },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  play: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});

export default memo(LigaTVBanner);
