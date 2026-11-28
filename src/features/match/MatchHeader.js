// src/features/match/MatchHeader.js
// Cabecera del partido sobre la foto del estadio (duotono azul Liga).
// Marcador con la diagonal: 2 / 1.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { SoccerBall, MapPin } from 'phosphor-react-native';
import { Txt, TeamCrest, LiveBadge, PressableScale, ScoreSlash, StadiumBackdrop } from '../../ui';
import { useLiveMinute, useCountdown, formatTime24, formatDay } from '../../api/clock';
import { minuteText, shortName } from '../../api/matchCenter';
const W = 'rgba(255,255,255,0.75)';

const Scorers = ({ goals, align }) => (
  <View style={{ flex: 1, gap: 3, alignItems: align === 'right' ? 'flex-end' : 'flex-start' }}>
    {goals.map((g) => (
      <Txt key={g.id} variant="caption" color={W} numberOfLines={1}>
        {shortName(g.playerName)} {minuteText(g)}
        {g.kind === 'penalty_goal' ? ' (P)' : g.kind === 'own_goal' ? ' (AG)' : ''}
      </Txt>
    ))}
  </View>
);

const Countdown = ({ kickoff }) => {
  const c = useCountdown(kickoff);
  if (c.done) return null;
  const pad = (v) => String(v).padStart(2, '0');
  return (
    <Txt variant="number" color={W} align="center" style={{ marginTop: 8 }}>
      Faltan {c.days > 0 ? `${c.days}d ` : ''}
      {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
    </Txt>
  );
};

const Side = ({ team, onPress }) => (
  <PressableScale onPress={onPress} style={styles.side} accessibilityLabel={`Ver ${team?.name}`}>
    <TeamCrest team={team} size={70} />
    <Txt variant="h3" color="#fff" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
      {team?.name}
    </Txt>
  </PressableScale>
);

function MatchHeader({ model, onTeam, topInset = 0 }) {
  const m = model.match;
  const minute = useLiveMinute(m);
  const homeGoals = model.goals.filter((g) => g.scoringSide === 'home');
  const awayGoals = model.goals.filter((g) => g.scoringSide === 'away');
  const k = m.kickoff;
  const rowsOfScorers = Math.max(homeGoals.length, awayGoals.length);
  const height = 370 + rowsOfScorers * 18 + topInset;

  return (
    <StadiumBackdrop uri={model.stadium?.image} height={height} tint={m.isLive ? 'live' : 'brand'}>
      <View style={{ paddingTop: topInset + 52 }}>
        <Txt variant="overline" color="rgba(255,255,255,0.8)" align="center">
          {m.round?.name || ''}
          {model.season ? ` · ${model.season}` : ''}
        </Txt>

        <View style={styles.row}>
          <Side team={m.home} onPress={() => onTeam?.(m.home)} />
          <View style={styles.center}>
            {m.isScheduled ? (
              <>
                <Txt variant="h1" color="#fff" style={{ fontSize: 40, lineHeight: 44, fontVariant: ['tabular-nums'] }}>
                  {k ? formatTime24(k) : '--:--'}
                </Txt>
                <Txt variant="caption" color={W}>
                  {formatDay(k, true)}
                </Txt>
                <Countdown kickoff={k} />
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Txt variant="score" color="#fff">
                    {m.score.home ?? 0}
                  </Txt>
                  <ScoreSlash height={44} width={7} />
                  <Txt variant="score" color="#fff">
                    {m.score.away ?? 0}
                  </Txt>
                </View>
                {m.isLive ? (
                  <LiveBadge minute={minute} style={{ alignSelf: 'center', marginTop: 10 }} />
                ) : (
                  <Txt variant="overline" color={W} style={{ marginTop: 8 }}>
                    {m.statusLabel || 'Final'}
                  </Txt>
                )}
                {m.score.penHome || m.score.penAway ? (
                  <Txt variant="caption" color={W} style={{ marginTop: 4 }}>
                    Penales {m.score.penHome}–{m.score.penAway}
                  </Txt>
                ) : null}
              </>
            )}
          </View>
          <Side team={m.away} onPress={() => onTeam?.(m.away)} />
        </View>

        {rowsOfScorers ? (
          <View style={styles.scorers}>
            <Scorers goals={homeGoals} align="right" />
            <View style={{ width: 40, alignItems: 'center', paddingTop: 2 }}>
              <SoccerBall size={13} color="rgba(255,255,255,0.45)" weight="fill" />
            </View>
            <Scorers goals={awayGoals} align="left" />
          </View>
        ) : null}

        {model.stadium?.name || m.stadium?.name ? (
          <View style={styles.venue}>
            <MapPin size={13} color="rgba(255,255,255,0.6)" />
            <Txt variant="caption" color={W} numberOfLines={1}>
              {model.stadium?.name || m.stadium?.name}
            </Txt>
          </View>
        ) : null}
      </View>
    </StadiumBackdrop>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 26, paddingHorizontal: 12 },
  side: { flex: 1, alignItems: 'center', gap: 10 },
  center: { width: 150, alignItems: 'center' },
  scorers: { flexDirection: 'row', marginTop: 18, paddingHorizontal: 24 },
  venue: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 14 },
});

export default memo(MatchHeader);
