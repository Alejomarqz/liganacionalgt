// src/features/matches/FeaturedMatch.js
// Partido destacado sobre la foto del estadio (Inicio).
// Programado: hora grande + fecha + Pronosticar / Recordarme.
// En vivo: marcador "2 / 1" con minuto.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { MapPin, Target, BellSimple, BellSimpleRinging } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, TeamCrest, PressableScale, LiveBadge, Slash, ScoreSlash } from '../../ui';
import { useLiveMinute, formatTime24, formatDay } from '../../api/clock';

const Side = ({ team }) => (
  <View style={styles.side}>
    <TeamCrest team={team} size={76} />
    <Txt variant="h3" color="#fff" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
      {team?.name}
    </Txt>
  </View>
);

function FeaturedMatch({ match, onPress, onPredict, reminderOn, onToggleReminder }) {
  const { colors } = useDesign();
  const minute = useLiveMinute(match);
  if (!match) return null;
  const k = match.kickoff;
  const eyebrow = match.isLive ? 'En vivo ahora' : match.isFinished ? 'Último resultado' : 'Partido destacado';

  return (
    <PressableScale onPress={onPress} scaleTo={0.99} style={{ paddingHorizontal: 20 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Slash width={5} height={13} color="#fff" />
        <Txt variant="overline" color="rgba(255,255,255,0.85)">
          {match.round?.name ? `${match.round.name} · ` : ''}
          {eyebrow}
        </Txt>
      </View>

      <View style={styles.teams}>
        <Side team={match.home} />
        <View style={styles.center}>
          {match.isScheduled ? (
            <>
              <Txt variant="h1" color="#fff" style={{ fontSize: 34, lineHeight: 38, fontVariant: ['tabular-nums'] }}>
                {k ? formatTime24(k) : '--:--'}
              </Txt>
              <Txt variant="caption" color="rgba(255,255,255,0.7)" style={{ marginTop: 2 }}>
                {formatDay(k)}
              </Txt>
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Txt variant="h1" color="#fff" style={{ fontSize: 40, lineHeight: 44 }}>
                  {match.score.home ?? 0}
                </Txt>
                <ScoreSlash height={30} width={5} live={match.isLive} />
                <Txt variant="h1" color="#fff" style={{ fontSize: 40, lineHeight: 44 }}>
                  {match.score.away ?? 0}
                </Txt>
              </View>
              {match.isLive ? <LiveBadge minute={minute} style={{ marginTop: 8, alignSelf: 'center' }} /> : (
                <Txt variant="overline" color="rgba(255,255,255,0.7)" style={{ marginTop: 6 }}>
                  {match.statusLabel || 'Final'}
                </Txt>
              )}
            </>
          )}
        </View>
        <Side team={match.away} />
      </View>

      {match.stadium?.name ? (
        <View style={styles.venue}>
          <MapPin size={13} color="rgba(255,255,255,0.6)" />
          <Txt variant="caption" color="rgba(255,255,255,0.7)" numberOfLines={1}>
            {match.stadium.name}
          </Txt>
        </View>
      ) : null}

      {match.isScheduled ? (
        <View style={styles.actions}>
          {/* Principal: azul vivo con brillo superior */}
          <PressableScale onPress={onPredict} style={{ flex: 1 }} accessibilityLabel="Pronosticar el marcador">
            <LinearGradient colors={['#5B86FF', '#2F5BFF', '#1E3FD8']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.btn, styles.btnPrimary]}>
              <Target size={17} color="#fff" weight="fill" />
              <Txt color="#fff" style={styles.btnLabel}>
                Pronosticar
              </Txt>
            </LinearGradient>
          </PressableScale>
          {/* Secundario: vidrio sobre la foto */}
          <PressableScale onPress={onToggleReminder} style={{ flex: 1 }} accessibilityLabel={reminderOn ? 'Quitar recordatorio' : 'Recordarme el partido'}>
            <View style={[styles.btn, reminderOn ? styles.btnGlassOn : styles.btnGlass]}>
              {reminderOn ? <BellSimpleRinging size={17} color="#9CC4FF" weight="fill" /> : <BellSimple size={17} color="#fff" weight="bold" />}
              <Txt color="#fff" style={styles.btnLabel}>
                {reminderOn ? 'Te avisamos' : 'Recordarme'}
              </Txt>
            </View>
          </PressableScale>
        </View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  teams: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  side: { flex: 1, alignItems: 'center', gap: 10 },
  center: { width: 116, alignItems: 'center' },
  venue: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 16 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  btn: { height: 46, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 },
  btnLabel: { fontFamily: 'Inter-Bold', fontSize: 15, letterSpacing: 0.2 },
  btnPrimary: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', shadowColor: '#1E3FD8', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  btnGlass: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)' },
  btnGlassOn: { backgroundColor: 'rgba(91,134,255,0.28)', borderWidth: 1, borderColor: 'rgba(156,196,255,0.6)' },
});

export default memo(FeaturedMatch);
