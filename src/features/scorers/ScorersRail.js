// src/features/scorers/ScorersRail.js
// Carrusel horizontal "Bota de Oro": líder destacado en dorado.
import React, { memo } from 'react';
import { FlatList, Image, View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { Crown } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, TeamCrest, PressableScale, SkeletonCard } from '../../ui';

const Photo = ({ player, team, size, colors }) => {
  const [failed, setFailed] = React.useState(false);
  if (player.photo && !failed) {
    return (
      <Image
        source={{ uri: player.photo }}
        onError={() => setFailed(true)}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceHigh }}
      />
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }}>
      <TeamCrest team={team} size={size * 0.55} />
    </View>
  );
};

const Card = memo(function Card({ item, index, onPress }) {
  const { colors, radius } = useDesign();
  const leader = index === 0;
  const body = (
    <>
      {leader ? <View pointerEvents="none" style={{ position: 'absolute', top: -20, bottom: -20, left: '58%', width: 34, backgroundColor: 'rgba(255,255,255,0.10)', transform: [{ skewX: '-20deg' }] }} /> : null}
      <View style={styles.rank}>
        {leader ? <Crown size={14} weight="fill" color="rgba(255,255,255,0.8)" /> : null}
        <Txt variant="overline" color={leader ? 'rgba(255,255,255,0.8)' : colors.textMuted}>
          {leader ? 'Líder' : `#${item.position || index + 1}`}
        </Txt>
      </View>
      <Photo player={item.player} team={item.team} size={58} colors={colors} />
      <Txt variant="bodyStrong" numberOfLines={1} align="center" color={leader ? '#fff' : colors.text} style={{ marginTop: 8 }}>
        {item.player.name}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <TeamCrest team={item.team} size={14} />
        <Txt variant="caption" numberOfLines={1} color={leader ? 'rgba(255,255,255,0.8)' : colors.textMuted}>
          {item.team?.short}
        </Txt>
      </View>
      <Txt variant="score" color={leader ? '#fff' : colors.text} style={{ fontSize: 30, lineHeight: 34, marginTop: 4 }}>
        {item.goals}
      </Txt>
      <Txt variant="overline" color={leader ? 'rgba(255,255,255,0.8)' : colors.textMuted} style={{ fontSize: 9 }}>
        goles
      </Txt>
    </>
  );

  const shell = { width: 132, borderRadius: radius.lg, overflow: 'hidden', padding: 14, alignItems: 'center', gap: 2 };

  return (
    <PressableScale onPress={() => onPress?.(item)}>
      {leader ? (
        <LinearGradient colors={[colors.primaryStrong, '#1E3FD8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={shell}>
          {body}
        </LinearGradient>
      ) : (
        <View style={[shell, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>{body}</View>
      )}
    </PressableScale>
  );
});

function ScorersRail({ rows, loading, onPress }) {
  const { space } = useDesign();
  if (loading) {
    return (
      <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: space[5] }}>
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i} height={190} style={{ width: 132 }} />
        ))}
      </View>
    );
  }
  return (
    <FlatList
      horizontal
      data={rows.slice(0, 10)}
      keyExtractor={(it, i) => String(it.player.id ?? i)}
      renderItem={({ item, index }) => <Card item={item} index={index} onPress={onPress} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space[5], gap: 12 }}
      snapToInterval={144}
      decelerationRate="fast"
    />
  );
}

const styles = StyleSheet.create({
  rank: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 6 },
});

export default memo(ScorersRail);
