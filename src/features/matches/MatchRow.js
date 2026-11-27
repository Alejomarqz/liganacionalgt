// src/features/matches/MatchRow.js
// Fila compacta de partido (estilo apps deportivas top): escudos, marcador
// tabular, estado/minuto a la derecha. Ganador resaltado.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, TeamCrest, PressableScale, PulseDot } from '../../ui';
import { useLiveMinute, formatTime } from '../../api/clock';

const TeamLine = ({ team, score, dim, showScore, colors }) => (
  <View style={styles.line}>
    <TeamCrest team={team} size={22} />
    <Txt
      variant="bodyStrong"
      numberOfLines={1}
      style={{ flex: 1, marginLeft: 10, fontFamily: dim ? 'Poppins-Medium' : 'Poppins-SemiBold' }}
      color={dim ? colors.textSecondary : colors.text}
    >
      {team?.name}
    </Txt>
    {showScore ? (
      <Txt variant="scoreSm" color={dim ? colors.textMuted : colors.text} style={{ minWidth: 22, textAlign: 'right' }}>
        {score ?? 0}
      </Txt>
    ) : null}
  </View>
);

function MatchRow({ match, onPress, last }) {
  const { colors, space } = useDesign();
  const minute = useLiveMinute(match);
  const showScore = !match.isScheduled;
  const h = match.score.home ?? 0;
  const a = match.score.away ?? 0;
  const homeDim = match.isFinished && h < a;
  const awayDim = match.isFinished && a < h;

  return (
    <PressableScale onPress={onPress} scaleTo={0.99}>
      <View
        style={[
          styles.row,
          { paddingHorizontal: space[4], borderBottomColor: colors.divider },
          last ? { borderBottomWidth: 0 } : null,
        ]}
      >
        {match.isLive ? <View style={[styles.liveBar, { backgroundColor: colors.live }]} /> : null}
        <View style={{ flex: 1, gap: 8 }}>
          <TeamLine team={match.home} score={h} dim={homeDim} showScore={showScore} colors={colors} />
          <TeamLine team={match.away} score={a} dim={awayDim} showScore={showScore} colors={colors} />
        </View>
        <View style={[styles.status, { borderLeftColor: colors.divider }]}>
          {match.isLive ? (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <PulseDot size={6} />
              <Txt variant="number" tone="live" style={{ fontFamily: 'Poppins-Bold' }}>
                {minute}
              </Txt>
            </View>
          ) : match.isScheduled ? (
            <View style={{ alignItems: 'center' }}>
              <Txt variant="number" style={{ fontFamily: 'Poppins-Bold' }}>
                {formatTime(match.kickoff)}
              </Txt>
              <Txt variant="caption" tone="muted" style={{ fontSize: 10 }}>
                {match.kickoff && match.kickoff.getHours() < 12 ? 'a. m.' : 'p. m.'}
              </Txt>
            </View>
          ) : (
            <Txt variant="caption" tone="muted" style={{ fontFamily: 'Poppins-SemiBold' }}>
              {match.statusCompact || 'FIN'}
            </Txt>
          )}
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  line: { flexDirection: 'row', alignItems: 'center' },
  status: { width: 62, alignItems: 'center', justifyContent: 'center', borderLeftWidth: StyleSheet.hairlineWidth, marginLeft: 12, alignSelf: 'stretch' },
  liveBar: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 3, borderRadius: 2 },
});

export default memo(MatchRow, (a, b) => a.match.revision === b.match.revision && a.match.status === b.match.status && a.last === b.last && a.match.score.home === b.match.score.home && a.match.score.away === b.match.score.away);
