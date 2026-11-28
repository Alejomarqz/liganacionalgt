// src/screens/GamesScreen.js
// Juegos v3 · tu temporada, quiniela con cuenta regresiva, reto del día,
// podio nacional y tus ligas.
import React, { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Target, UserFocus, UsersThree, CaretRight, Fire, Crown, Plus, CheckCircle } from 'phosphor-react-native';
import LinearGradient from 'react-native-linear-gradient';

import { useDesign } from '../design/useDesign';
import { CHIP_SKEW } from '../design/tokens';
import { Txt, Surface, SectionHeader, PressableScale, StadiumBackdrop, TeamCrest } from '../ui';
import { useScorers } from '../api/liga';
import { useCountdown, seasonLabel } from '../api/clock';
import { useGameStats } from '../features/games/useGameStats';
import { useMyLeagues } from '../features/games/quinielaStore';
import { isOpen } from '../features/games/scoring';
import { loadState, todayKey, buildPool, pickAnswer, MAX_TRIES } from '../features/games/daily';
import FooterTabs from '../../components/FooterTabs';
import PollCard from '../../components/PollCard';

const pad = (n) => String(n).padStart(2, '0');

function CloseIn({ date, colors }) {
  const c = useCountdown(date);
  if (!date || c.done) return null;
  const text = c.days > 0 ? `${c.days}d ${pad(c.hours)}h` : `${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`;
  return (
    <Txt variant="caption" color="rgba(255,255,255,0.85)" style={{ fontFamily: 'Inter-SemiBold' }}>
      El próximo partido cierra en <Txt variant="caption" color="#fff" style={{ fontFamily: 'Inter-ExtraBold', fontVariant: ['tabular-nums'] }}>{text}</Txt>
    </Txt>
  );
}

function SeasonStat({ value, label, icon }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {icon}
        <Txt variant="h1" color="#fff" style={{ fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] }}>
          {value}
        </Txt>
      </View>
      <Txt variant="caption" color="rgba(255,255,255,0.75)">
        {label}
      </Txt>
    </View>
  );
}

function Podium({ rows, myUid, colors }) {
  const top = rows.slice(0, 3);
  if (!top.length) return null;
  const order = [top[1], top[0], top[2]].filter(Boolean);
  const heights = { 1: 92, 2: 68, 3: 52 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 10, paddingHorizontal: 16 }}>
      {order.map((r) => {
        const pos = top.indexOf(r) + 1;
        const me = r.uid === myUid;
        return (
          <View key={r.uid} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
            {pos === 1 ? <Crown size={22} color={colors.gold} weight="fill" /> : null}
            <Txt variant="bodyStrong" numberOfLines={1} align="center" style={{ fontSize: 13 }}>
              {r.nick}
              {me ? ' (tú)' : ''}
            </Txt>
            <Txt variant="caption" tone="muted">
              {r.total ?? r.points ?? 0} pts
            </Txt>
            <LinearGradient
              colors={pos === 1 ? ['#3B7BFF', '#1A36B8'] : [colors.surfaceHigh, colors.surface]}
              style={{ width: '100%', height: heights[pos], borderTopLeftRadius: 12, borderTopRightRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: pos === 1 ? 0 : 1, borderColor: colors.border }}
            >
              <Txt variant="h1" color={pos === 1 ? '#fff' : colors.text} style={{ fontSize: 30 }}>
                {pos}
              </Txt>
            </LinearGradient>
          </View>
        );
      })}
    </View>
  );
}

export default function GamesScreen({ navigation }) {
  const { colors } = useDesign();
  const insets = useSafeAreaInsets();
  const { uid, matchesQ, preds, totals, rank, board } = useGameStats({ withBoard: true });
  const leagues = useMyLeagues(uid);
  const scorers = useScorers();

  // Quiniela: partidos abiertos, confirmados y el próximo cierre
  const open = useMemo(() => matchesQ.matches.filter(isOpen).sort((a, b) => a.kickoff - b.kickoff), [matchesQ.matches]);
  const confirmed = open.filter((m) => preds.byRound[String(m.round?.id)]?.picks?.[String(m.id)]).length;
  const pending = open.length - confirmed;
  const nextClose = open.find((m) => !preds.byRound[String(m.round?.id)]?.picks?.[String(m.id)])?.kickoff || open[0]?.kickoff || null;
  const progress = open.length ? confirmed / open.length : 0;

  // Reto del día
  const [daily, setDaily] = useState(null);
  useFocusEffect(
    useCallback(() => {
      loadState().then(setDaily);
    }, []),
  );
  const pool = useMemo(() => buildPool(scorers.rows), [scorers.rows]);
  const answer = useMemo(() => (daily && pool.length ? pickAnswer(daily, pool) : null), [daily, pool]);
  const today = daily?.days?.[todayKey()];
  const dailyDone = Boolean(today?.done);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom }} showsVerticalScrollIndicator={false}>
        {/* Portada + tu temporada */}
        <StadiumBackdrop height={insets.top + 300}>
          <View style={{ paddingTop: insets.top + 18, paddingHorizontal: 20 }}>
            <Txt variant="overline" color="rgba(255,255,255,0.8)">
              Juega con la Liga · {seasonLabel()}
            </Txt>
            <Txt variant="display" color="#fff" style={{ marginTop: 4 }}>
              Juegos
            </Txt>
            <View style={styles.seasonPanel}>
              <SeasonStat value={totals.total} label="Puntos" />
              <View style={styles.sep} />
              <SeasonStat value={rank ? `#${rank}` : '–'} label="Nacional" />
              <View style={styles.sep} />
              <SeasonStat value={daily?.streak || 0} label="Racha" icon={<Fire size={18} color="#FFB020" weight="fill" />} />
            </View>
          </View>
        </StadiumBackdrop>

        <View style={{ gap: 26 }}>
          {/* Quiniela */}
          <View>
            <SectionHeader title="Quiniela de la jornada" />
            <PressableScale onPress={() => navigation.navigate('Quiniela')} style={{ marginHorizontal: 16 }}>
              <LinearGradient colors={['#3B7BFF', '#2350E8', '#1A36B8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.quiniela}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Target size={18} color="#fff" weight="fill" />
                  <Txt variant="overline" color="rgba(255,255,255,0.9)">
                    {open.length ? `${open.length} partidos abiertos` : 'Jornada cerrada'}
                  </Txt>
                </View>
                <Txt variant="h1" color="#fff" style={{ marginTop: 8 }}>
                  {!open.length ? 'Mira cómo te fue' : pending ? `Te faltan ${pending} pronóstico${pending === 1 ? '' : 's'}` : '¡Todo confirmado!'}
                </Txt>
                {open.length ? (
                  <View style={{ marginTop: 12, gap: 8 }}>
                    <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
                      <View style={{ width: `${Math.max(progress * 100, 3)}%`, height: '100%', backgroundColor: '#fff', transform: [{ skewX: CHIP_SKEW }] }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Txt variant="caption" color="rgba(255,255,255,0.85)">
                        {confirmed} de {open.length} confirmados
                      </Txt>
                    </View>
                    <CloseIn date={nextClose} colors={colors} />
                  </View>
                ) : null}
                <View style={styles.cta}>
                  <Txt variant="bodyStrong" color="#1A36B8" style={{ fontFamily: 'Inter-Bold' }}>
                    {pending ? 'Pronosticar ahora' : 'Ver mi quiniela'}
                  </Txt>
                </View>
              </LinearGradient>
            </PressableScale>
          </View>

          {/* Reto del día */}
          <View>
            <SectionHeader title="Reto del día" />
            <PressableScale onPress={() => navigation.navigate('DailyPlayer')} style={{ marginHorizontal: 16 }}>
              <Surface style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={[styles.teaser, { backgroundColor: colors.surfaceHigh }]}>
                  {answer?.photo ? (
                    <Image source={{ uri: answer.photo }} blurRadius={dailyDone ? 0 : 22} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <UserFocus size={30} color={colors.primary} weight="duotone" />
                  )}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Txt variant="h3">¿Quién es el jugador?</Txt>
                  {dailyDone ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {today?.won ? <CheckCircle size={14} color={colors.success} weight="fill" /> : null}
                      <Txt variant="caption" tone={today?.won ? 'success' : 'secondary'} style={{ fontFamily: 'Inter-SemiBold' }}>
                        {today?.won ? `Era ${answer?.name || ''} · ${today.tries}/${MAX_TRIES}` : 'Hoy no salió. Mañana hay otro.'}
                      </Txt>
                    </View>
                  ) : (
                    <Txt variant="caption" tone="secondary">
                      Adivina al goleador escondido. Hasta 6 pts al ranking.
                    </Txt>
                  )}
                  {answer?.team && !dailyDone ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <Fire size={13} color={colors.warning} weight="fill" />
                      <Txt variant="caption" style={{ fontFamily: 'Inter-Bold' }}>
                        Racha {daily?.streak || 0}
                      </Txt>
                    </View>
                  ) : null}
                </View>
                <CaretRight size={16} color={colors.textMuted} weight="bold" />
              </Surface>
            </PressableScale>
          </View>

          {/* Podio */}
          {board.rows.length ? (
            <View>
              <SectionHeader title="Top de la temporada" onAction={() => navigation.navigate('Ranking')} actionLabel="Ranking completo" />
              <Podium rows={board.rows} myUid={uid} colors={colors} />
            </View>
          ) : null}

          {/* Ligas */}
          <View>
            <SectionHeader title="Mis ligas" onAction={() => navigation.navigate('Ranking')} actionLabel={leagues.leagues.length ? 'Ver todas' : undefined} />
            {leagues.leagues.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
                {leagues.leagues.map((l) => (
                  <PressableScale key={l.code} onPress={() => navigation.navigate('Ranking')}>
                    <Surface style={{ width: 170, gap: 6 }}>
                      <UsersThree size={20} color={colors.primary} weight="duotone" />
                      <Txt variant="h3" numberOfLines={1}>
                        {l.name}
                      </Txt>
                      <Txt variant="caption" tone="muted">
                        {(l.members || []).length} personas · {l.code}
                      </Txt>
                    </Surface>
                  </PressableScale>
                ))}
              </ScrollView>
            ) : (
              <PressableScale onPress={() => navigation.navigate('Ranking')} style={{ marginHorizontal: 16 }}>
                <Surface style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                    <Plus size={22} color={colors.primary} weight="bold" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3">Crea tu liga con amigos</Txt>
                    <Txt variant="caption" tone="secondary">
                      Comparte el código por WhatsApp y compitan cada jornada.
                    </Txt>
                  </View>
                  <CaretRight size={16} color={colors.textMuted} weight="bold" />
                </Surface>
              </PressableScale>
            )}
          </View>

          {/* Votación */}
          <View>
            <SectionHeader title="Votación del partido" />
            <View style={{ paddingHorizontal: 16 }}>
              <PollCard />
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom, backgroundColor: colors.bgElevated }}>
        <FooterTabs navigation={navigation} routeName="Games" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  seasonPanel: { flexDirection: 'row', alignItems: 'center', marginTop: 22, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(6,10,23,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  sep: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.15)' },
  quiniela: { borderRadius: 20, padding: 18 },
  cta: { marginTop: 16, height: 44, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  teaser: { width: 64, height: 64, borderRadius: 32, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
