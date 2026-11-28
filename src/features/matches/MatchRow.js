// src/features/matches/MatchRow.js
// Fila de partido estilo liga oficial: local a la izquierda, visitante a la
// derecha y en el centro la hora o el marcador "2 / 1".
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, TeamCrest, PressableScale, ScoreSlash } from '../../ui';
import { useLiveMinute, formatTime24 } from '../../api/clock';

export { formatTime24 };

function Center({ match, minute, colors }) {
  if (match.isScheduled) {
    return (
      <Txt variant="time" align="center">
        {match.kickoff ? formatTime24(match.kickoff) : '--:--'}
      </Txt>
    );
  }
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Txt variant="scoreSm">{match.score.home ?? 0}</Txt>
        <ScoreSlash height={16} width={3} live={match.isLive} muted={!match.isLive} />
        <Txt variant="scoreSm">{match.score.away ?? 0}</Txt>
      </View>
      <Txt variant="overline" color={match.isLive ? colors.live : colors.textMuted} style={{ fontSize: 10, letterSpacing: 1 }}>
        {match.isLive ? minute : match.statusCompact || 'FIN'}
      </Txt>
    </View>
  );
}

function MatchRow({ match, onPress, last }) {
  const { colors } = useDesign();
  const minute = useLiveMinute(match);
  const h = match.score.home ?? 0;
  const a = match.score.away ?? 0;
  const homeLost = match.isFinished && h < a;
  const awayLost = match.isFinished && a < h;

  return (
    <PressableScale onPress={onPress} scaleTo={0.99} accessibilityLabel={`${match.home?.name} contra ${match.away?.name}`}>
      <View style={[styles.row, { borderBottomColor: colors.divider }, last ? { borderBottomWidth: 0 } : null]}>
        <View style={[styles.side, { justifyContent: 'flex-end' }]}>
          <Txt variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} align="right" color={homeLost ? colors.textSecondary : colors.text} style={styles.name}>
            {match.home?.name}
          </Txt>
          <TeamCrest team={match.home} size={26} />
        </View>
        <View style={styles.center}>
          <Center match={match} minute={minute} colors={colors} />
        </View>
        <View style={styles.side}>
          <TeamCrest team={match.away} size={26} />
          <Txt variant="bodyStrong" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} color={awayLost ? colors.textSecondary : colors.text} style={styles.name}>
            {match.away?.name}
          </Txt>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontSize: 13.5 },
  center: { width: 72, alignItems: 'center' },
});

export default memo(
  MatchRow,
  (a, b) =>
    a.match.revision === b.match.revision &&
    a.match.status === b.match.status &&
    a.last === b.last &&
    a.match.score.home === b.match.score.home &&
    a.match.score.away === b.match.score.away,
);
