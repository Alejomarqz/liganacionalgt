// src/features/match/MatchHeader.js
// Cabecera del partido: escudos, marcador grande, minuto en vivo y goleadores.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { MapPin, IdentificationBadge, SoccerBall } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, TeamCrest, LiveBadge, PressableScale } from '../../ui';
import { useLiveMinute, formatKickoff, useCountdown } from '../../api/clock';
import { minuteText, shortName } from '../../api/matchCenter';

const Scorers = ({ goals, align }) => (
  <View style={{ gap: 2, alignItems: align === 'left' ? 'flex-start' : 'flex-end' }}>
    {goals.map((g) => (
      <Txt key={g.id} variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={1}>
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
    <Txt variant="number" color="rgba(255,255,255,0.85)" align="center" style={{ marginTop: 4 }}>
      {c.days > 0 ? `${c.days}d ` : ''}
      {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
    </Txt>
  );
};

function Side({ team, onPress }) {
  return (
    <PressableScale onPress={onPress} style={styles.side} accessibilityLabel={`Ver ${team?.name}`}>
      <View style={styles.halo}>
        <TeamCrest team={team} size={58} />
      </View>
      <Txt variant="bodyStrong" color="#fff" align="center" numberOfLines={2} style={{ marginTop: 8 }}>
        {team?.name}
      </Txt>
    </PressableScale>
  );
}

function MatchHeader({ model, onTeam, topInset = 0, compact }) {
  const { colors, space } = useDesign();
  const m = model.match;
  const minute = useLiveMinute(m);
  const homeGoals = model.goals.filter((g) => g.scoringSide === 'home');
  const awayGoals = model.goals.filter((g) => g.scoringSide === 'away');

  return (
    <LinearGradient colors={m.isLive ? colors.liveGradient : colors.heroGradient} style={{ paddingTop: topInset + 50, paddingBottom: space[5], paddingHorizontal: space[4] }}>
      <View pointerEvents="none" style={styles.glow} />
      <Txt variant="overline" color="rgba(255,255,255,0.7)" align="center">
        {model.competition} · {m.round?.name || ''}
      </Txt>

      <View style={styles.row}>
        <Side team={m.home} onPress={() => onTeam?.(m.home)} />
        <View style={styles.center}>
          {m.isScheduled ? (
            <>
              <Txt variant="h1" color="#fff" align="center">
                {m.kickoff ? `${m.kickoff.getHours() % 12 || 12}:${String(m.kickoff.getMinutes()).padStart(2, '0')}` : 'VS'}
              </Txt>
              <Countdown kickoff={m.kickoff} />
            </>
          ) : (
            <Txt variant="score" color="#fff" align="center" style={{ fontSize: 46, lineHeight: 52 }}>
              {m.score.home ?? 0}
              <Txt variant="score" color="rgba(255,255,255,0.35)" style={{ fontSize: 46, lineHeight: 52 }}>
                {' : '}
              </Txt>
              {m.score.away ?? 0}
            </Txt>
          )}
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            {m.isLive ? (
              <LiveBadge solid minute={minute} />
            ) : (
              <Txt variant="overline" color="rgba(255,255,255,0.75)">
                {m.isScheduled ? formatKickoff(m.kickoff).split(' · ')[0] : m.statusLabel || 'Finalizado'}
              </Txt>
            )}
          </View>
          {m.score.penHome || m.score.penAway ? (
            <Txt variant="caption" color="rgba(255,255,255,0.75)" align="center" style={{ marginTop: 4 }}>
              Penales {m.score.penHome}–{m.score.penAway}
            </Txt>
          ) : null}
        </View>
        <Side team={m.away} onPress={() => onTeam?.(m.away)} />
      </View>

      {!compact && (homeGoals.length || awayGoals.length) ? (
        <View style={styles.scorers}>
          <View style={{ flex: 1 }}>
            <Scorers goals={homeGoals} align="left" />
          </View>
          <SoccerBall size={14} color="rgba(255,255,255,0.5)" weight="fill" style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Scorers goals={awayGoals} align="right" />
          </View>
        </View>
      ) : null}

      <View style={styles.meta}>
        {model.stadium?.name || m.stadium?.name ? (
          <View style={styles.metaItem}>
            <MapPin size={13} color="rgba(255,255,255,0.65)" />
            <Txt variant="caption" color="rgba(255,255,255,0.75)" numberOfLines={1}>
              {model.stadium?.name || m.stadium?.name}
            </Txt>
          </View>
        ) : null}
        {model.referee ? (
          <View style={styles.metaItem}>
            <IdentificationBadge size={13} color="rgba(255,255,255,0.65)" />
            <Txt variant="caption" color="rgba(255,255,255,0.75)" numberOfLines={1}>
              {typeof model.referee === 'string' ? model.referee : model.referee.name}
            </Txt>
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  glow: { position: 'absolute', width: 320, height: 320, borderRadius: 160, top: -160, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 14 },
  side: { flex: 1, alignItems: 'center' },
  halo: { width: 78, height: 78, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  center: { minWidth: 120, alignItems: 'center', paddingTop: 10 },
  scorers: { flexDirection: 'row', gap: 10, marginTop: 14, paddingHorizontal: 6 },
  meta: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 14, marginTop: 14 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '60%' },
});

export default memo(MatchHeader);
