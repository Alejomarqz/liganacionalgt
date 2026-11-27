// src/features/matches/HeroMatch.js
// Tarjeta protagonista del Home: partido en vivo (con reloj que corre)
// o el próximo partido con cuenta regresiva.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { MapPin, BellSimple, BellSimpleRinging } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, TeamCrest, LiveBadge, PressableScale } from '../../ui';
import { useLiveMinute, useCountdown, formatKickoff } from '../../api/clock';

const CountdownUnit = ({ value, label }) => (
  <View style={{ alignItems: 'center', minWidth: 46 }}>
    <Txt variant="scoreSm" color="#fff" style={{ fontSize: 22, lineHeight: 26 }}>
      {String(value).padStart(2, '0')}
    </Txt>
    <Txt variant="overline" color="rgba(255,255,255,0.6)" style={{ fontSize: 9 }}>
      {label}
    </Txt>
  </View>
);

const Countdown = memo(function Countdown({ kickoff }) {
  const c = useCountdown(kickoff);
  if (c.done) return null;
  return (
    <View style={styles.countdown}>
      {c.days > 0 ? <CountdownUnit value={c.days} label="días" /> : null}
      <CountdownUnit value={c.hours} label="hrs" />
      <CountdownUnit value={c.minutes} label="min" />
      <CountdownUnit value={c.seconds} label="seg" />
    </View>
  );
});

const Side = ({ team, align }) => (
  <View style={[styles.side, { alignItems: 'center' }]}>
    <View style={styles.crestHalo}>
      <TeamCrest team={team} size={64} />
    </View>
    <Txt variant="bodyStrong" color="#fff" numberOfLines={1} align="center" style={{ marginTop: 10 }}>
      {team?.name}
    </Txt>
  </View>
);

function HeroMatch({ match, onPress, reminderOn, onToggleReminder }) {
  const { colors, radius, space } = useDesign();
  const minute = useLiveMinute(match);
  if (!match) return null;

  const live = match.isLive;
  const gradient = live ? colors.liveGradient : colors.heroGradient;

  return (
    <PressableScale onPress={onPress} scaleTo={0.985} style={{ marginHorizontal: space[5] }}>
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderRadius: radius.xl, padding: space[5] }]}
      >
        {/* Brillo decorativo */}
        <View pointerEvents="none" style={styles.glow} />

        <View style={styles.topRow}>
          {live ? (
            <LiveBadge solid minute={minute} />
          ) : (
            <Txt variant="overline" color="rgba(255,255,255,0.75)">
              {match.isFinished ? 'Último resultado' : 'Próximo partido'}
            </Txt>
          )}
          <Txt variant="overline" color="rgba(255,255,255,0.75)">
            {match.round?.name || ''}
          </Txt>
        </View>

        <View style={styles.teamsRow}>
          <Side team={match.home} />
          <View style={styles.center}>
            {match.isScheduled ? (
              <Txt variant="h2" color="#fff" align="center">
                VS
              </Txt>
            ) : (
              <Txt variant="score" color="#fff" align="center">
                {match.score.home ?? 0}
                <Txt variant="score" color="rgba(255,255,255,0.4)">
                  {' – '}
                </Txt>
                {match.score.away ?? 0}
              </Txt>
            )}
            {match.score.penHome || match.score.penAway ? (
              <Txt variant="caption" color="rgba(255,255,255,0.7)" align="center">
                Penales {match.score.penHome}–{match.score.penAway}
              </Txt>
            ) : null}
          </View>
          <Side team={match.away} />
        </View>

        {match.isScheduled ? <Countdown kickoff={match.kickoff} /> : null}

        <View style={styles.footer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <MapPin size={14} color="rgba(255,255,255,0.7)" />
            <Txt variant="caption" color="rgba(255,255,255,0.8)" numberOfLines={1} style={{ flexShrink: 1 }}>
              {match.isScheduled ? formatKickoff(match.kickoff) : match.stadium?.name || ''}
              {match.isScheduled && match.stadium?.name ? ` · ${match.stadium.name}` : ''}
            </Txt>
          </View>
          {match.isScheduled && onToggleReminder ? (
            <PressableScale
              onPress={onToggleReminder}
              accessibilityLabel={reminderOn ? 'Quitar recordatorio' : 'Recordarme el partido'}
              style={[styles.bell, reminderOn ? { backgroundColor: '#fff' } : null]}
            >
              {reminderOn ? (
                <BellSimpleRinging size={16} weight="fill" color={colors.primaryStrong} />
              ) : (
                <BellSimple size={16} weight="bold" color="#fff" />
              )}
              <Txt variant="caption" color={reminderOn ? colors.primaryStrong : '#fff'} style={{ fontFamily: 'Poppins-SemiBold' }}>
                {reminderOn ? 'Te avisamos' : 'Avísame'}
              </Txt>
            </PressableScale>
          ) : null}
        </View>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden', minHeight: 230 },
  glow: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -120,
    right: -80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  teamsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  side: { flex: 1 },
  crestHalo: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { minWidth: 110, alignItems: 'center' },
  countdown: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 10 },
  bell: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
});

export default memo(HeroMatch);
