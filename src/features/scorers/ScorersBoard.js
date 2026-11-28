// src/features/scorers/ScorersBoard.js
// "Bota de Oro": líder en tarjeta grande + ranking 2–6 con barra de distancia al líder.
import React, { memo, useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Crown } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';
import { CHIP_SKEW } from '../../design/tokens';
import { Txt, TeamCrest, PressableScale, Surface, SkeletonCard } from '../../ui';

function Photo({ player, team, size, ring, colors }) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[box, { borderWidth: ring ? 3 : 0, borderColor: 'rgba(255,255,255,0.85)', overflow: 'hidden', backgroundColor: ring ? 'rgba(255,255,255,0.15)' : colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }]}>
      {player.photo && !failed ? (
        <Image source={{ uri: player.photo }} onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : (
        <TeamCrest team={team} size={size * 0.55} />
      )}
    </View>
  );
}

function Leader({ item, onPress, colors }) {
  return (
    <PressableScale onPress={() => onPress?.(item)} scaleTo={0.985} style={{ marginHorizontal: 16 }}>
      <LinearGradient colors={['#3B7BFF', '#2350E8', '#1A36B8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.leader}>
        {/* escudo del club como marca de agua */}
        <View pointerEvents="none" style={styles.watermark}>
          <TeamCrest team={item.team} size={170} />
        </View>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Crown size={14} color="#FFD24A" weight="fill" />
            <Txt variant="overline" color="rgba(255,255,255,0.9)">
              Bota de Oro · Líder
            </Txt>
          </View>
          <View>
            <Txt variant="h2" color="#fff" numberOfLines={2} style={{ fontSize: 22, lineHeight: 26 }}>
              {item.player.name}
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
              <TeamCrest team={item.team} size={18} />
              <Txt variant="caption" color="rgba(255,255,255,0.85)" style={{ fontFamily: 'Inter-SemiBold' }} numberOfLines={1}>
                {item.team?.name}
              </Txt>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
            <Txt variant="display" color="#fff" style={{ fontSize: 52, lineHeight: 54, letterSpacing: -2, fontVariant: ['tabular-nums'] }}>
              {item.goals}
            </Txt>
            <Txt variant="overline" color="rgba(255,255,255,0.8)" style={{ marginBottom: 9 }}>
              goles
            </Txt>
          </View>
        </View>
        <Photo player={item.player} team={item.team} size={112} ring colors={colors} />
      </LinearGradient>
    </PressableScale>
  );
}

function Row({ item, leaderGoals, onPress, colors, last }) {
  const ratio = leaderGoals ? Math.max(0.06, item.goals / leaderGoals) : 0;
  return (
    <PressableScale onPress={() => onPress?.(item)} scaleTo={0.99}>
      <View style={[styles.row, { borderBottomColor: colors.divider }, last ? { borderBottomWidth: 0 } : null]}>
        <Txt variant="points" tone="secondary" style={{ width: 22, fontSize: 14 }}>
          {item.position}
        </Txt>
        <Photo player={item.player} team={item.team} size={40} colors={colors} />
        <View style={{ flex: 1, gap: 5 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Txt variant="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
              {item.player.name}
            </Txt>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TeamCrest team={item.team} size={14} />
            <View style={{ flex: 1, height: 5, backgroundColor: colors.surfaceHigh, overflow: 'hidden' }}>
              <View style={{ width: `${ratio * 100}%`, height: '100%', backgroundColor: colors.primaryStrong, transform: [{ skewX: CHIP_SKEW }] }} />
            </View>
          </View>
        </View>
        <Txt variant="points" style={{ width: 38, textAlign: 'right', fontSize: 20, lineHeight: 24 }}>
          {item.goals}
        </Txt>
      </View>
    </PressableScale>
  );
}

function ScorersBoard({ rows, loading, onPress, limit = 6 }) {
  const { colors } = useDesign();
  if (loading) {
    return (
      <View style={{ gap: 12, paddingHorizontal: 16 }}>
        <SkeletonCard height={180} />
        <SkeletonCard height={220} />
      </View>
    );
  }
  if (!rows.length) return null;
  const [leader, ...rest] = rows.slice(0, limit);
  return (
    <View style={{ gap: 12 }}>
      <Leader item={leader} onPress={onPress} colors={colors} />
      {rest.length ? (
        <Surface padded={false} style={{ marginHorizontal: 16 }}>
          {rest.map((it, i) => (
            <Row key={it.player.id ?? i} item={{ ...it, position: it.position || i + 2 }} leaderGoals={leader.goals} onPress={onPress} colors={colors} last={i === rest.length - 1} />
          ))}
        </Surface>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  leader: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: 20, minHeight: 176, overflow: 'hidden' },
  watermark: { position: 'absolute', left: -40, bottom: -50, opacity: 0.09 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
});

export default memo(ScorersBoard);
