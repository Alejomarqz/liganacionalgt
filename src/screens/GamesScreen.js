// src/screens/GamesScreen.js
// Juegos · siempre en modo "juego" (oscuro, con brillo azul), sin importar el tema.
// Protagonistas: Quiniela y ¿Quién es el jugador? · Liga Manager: próximamente.
import React, { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Target, Fire, Trophy, CaretRight, LockSimple, CheckCircle, Question, Clock } from 'phosphor-react-native';
import LinearGradient from 'react-native-linear-gradient';

import { palette, CHIP_SKEW } from '../design/tokens';
import { Txt, PressableScale, TeamCrest } from '../ui';
import { useScorers } from '../api/liga';
import { useCountdown, seasonLabel } from '../api/clock';
import { useGameStats } from '../features/games/useGameStats';
import { isOpen } from '../features/games/scoring';
import { loadState, todayKey, buildPool, pickAnswer, MAX_TRIES } from '../features/games/daily';
import FooterTabs from '../../components/FooterTabs';
import PollCard from '../../components/PollCard';

// Paleta fija del modo juego
const G = { bg: '#04060E', card: 'rgba(255,255,255,0.055)', line: 'rgba(255,255,255,0.10)', sub: '#9AA3BF', mut: '#5E6888', gold: '#FFC24B', green: '#2ED3A0', blue: palette.sky };
const pad = (n) => String(n).padStart(2, '0');

function Title({ children, right }) {
  return (
    <View style={styles.title}>
      <View style={styles.slash} />
      <Txt variant="h2" color="#fff" style={{ flex: 1 }}>
        {children}
      </Txt>
      {right}
    </View>
  );
}

function CloseIn({ date }) {
  const c = useCountdown(date);
  if (!date || c.done) return null;
  return (
    <View style={styles.row}>
      <Clock size={13} color="rgba(255,255,255,0.8)" weight="fill" />
      <Txt variant="caption" color="rgba(255,255,255,0.85)" style={{ fontFamily: 'Inter-SemiBold' }}>
        Cierra en{' '}
        <Txt variant="caption" color="#fff" style={{ fontFamily: 'Inter-ExtraBold', fontVariant: ['tabular-nums'] }}>
          {c.days > 0 ? `${c.days}d ${pad(c.hours)}h` : `${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`}
        </Txt>
      </Txt>
    </View>
  );
}

/** Pila de cartas para el adelanto de Liga Manager */
function CardStack() {
  const card = (colors, rot, x, y, z) => (
    <View style={{ position: 'absolute', left: x, top: y, zIndex: z, transform: [{ rotate: `${rot}deg` }] }}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.miniCard}>
        <View style={styles.miniShine} />
        <View style={styles.miniHead} />
        <View style={styles.miniBody} />
      </LinearGradient>
    </View>
  );
  return (
    <View style={{ width: 120, height: 130 }}>
      {card(['#F3F5FA', '#8A94A8'], -14, 4, 18, 1)}
      {card(['#3B7BFF', '#0A1440'], 12, 46, 14, 2)}
      {card(['#FFE9A3', '#B8862B'], -2, 24, 2, 3)}
    </View>
  );
}

export default function GamesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { nick, matchesQ, preds, totals, rank } = useGameStats({ withBoard: true });
  const scorers = useScorers();

  const open = useMemo(() => matchesQ.matches.filter(isOpen).sort((a, b) => a.kickoff - b.kickoff), [matchesQ.matches]);
  const picked = (m) => preds.byRound[String(m.round?.id)]?.picks?.[String(m.id)];
  const confirmed = open.filter(picked).length;
  const pending = open.length - confirmed;
  const nextClose = open.find((m) => !picked(m))?.kickoff || open[0]?.kickoff || null;
  const nextMatch = open.find((m) => !picked(m)) || open[0] || null;

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
    <View style={{ flex: 1, backgroundColor: G.bg }}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <LinearGradient colors={['rgba(30,63,216,0.55)', 'rgba(10,20,64,0.25)', 'rgba(4,6,14,0)']} locations={[0, 0.35, 0.7]} style={StyleSheet.absoluteFill} />
      </View>

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        {/* Encabezado: quién eres y tus números */}
        <View style={[styles.row, { paddingHorizontal: 20, justifyContent: 'space-between' }]}>
          <View style={[styles.row, { gap: 10 }]}>
            <LinearGradient colors={[palette.sky, palette.blue]} style={styles.avatar}>
              <Txt variant="bodyStrong" color="#fff" style={{ fontFamily: 'InterDisplay-Black' }}>
                {(nick || 'AF').slice(0, 2).toUpperCase()}
              </Txt>
            </LinearGradient>
            <View>
              <Txt variant="overline" color={G.sub} style={{ fontSize: 9.5 }}>
                Juega con la Liga · {seasonLabel()}
              </Txt>
              <Txt variant="h2" color="#fff">
                {nick || 'Jugador'}
              </Txt>
            </View>
          </View>
          <PressableScale onPress={() => navigation.navigate('Ranking')} style={styles.pill}>
            <Trophy size={15} color={G.gold} weight="fill" />
            <Txt variant="bodyStrong" color="#fff" style={{ fontFamily: 'InterDisplay-ExtraBold' }}>
              {rank ? `#${rank}` : '–'}
            </Txt>
          </PressableScale>
        </View>

        <View style={[styles.row, { gap: 8, paddingHorizontal: 20, marginTop: 14 }]}>
          {[
            [totals.total, 'Puntos', '#fff'],
            [totals.exact, 'Exactos', G.green],
            [daily?.streak || 0, 'Racha', G.gold],
          ].map(([v, l, c]) => (
            <View key={l} style={styles.stat}>
              <Txt variant="h1" color={c} style={{ fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] }}>
                {v}
              </Txt>
              <Txt variant="caption" color={G.sub}>
                {l}
              </Txt>
            </View>
          ))}
        </View>

        {/* ── QUINIELA ── */}
        <Title>Quiniela de la jornada</Title>
        <PressableScale onPress={() => navigation.navigate('Quiniela')} scaleTo={0.985} style={{ marginHorizontal: 16 }}>
          <LinearGradient colors={['#3B7BFF', '#2350E8', '#14214F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View pointerEvents="none" style={styles.heroBeam} />
            <View style={[styles.row, { gap: 8 }]}>
              <Target size={17} color="#fff" weight="fill" />
              <Txt variant="overline" color="rgba(255,255,255,0.9)">
                Pronostica el marcador · Gana hasta 5 pts por partido
              </Txt>
            </View>

            {nextMatch ? (
              <View style={[styles.row, { marginTop: 16, justifyContent: 'center', gap: 16 }]}>
                <TeamCrest team={nextMatch.home} size={50} />
                <View style={{ alignItems: 'center' }}>
                  <Txt variant="h1" color="#fff" style={{ fontSize: 30 }}>
                    ? – ?
                  </Txt>
                  <Txt variant="caption" color="rgba(255,255,255,0.8)">
                    {nextMatch.home?.short} vs {nextMatch.away?.short}
                  </Txt>
                </View>
                <TeamCrest team={nextMatch.away} size={50} />
              </View>
            ) : null}

            <Txt variant="h1" color="#fff" align="center" style={{ marginTop: 14, fontSize: 24, lineHeight: 28 }}>
              {!open.length ? 'Mira cómo te fue en la jornada' : pending ? `Te faltan ${pending} de ${open.length}` : '¡Jornada completa!'}
            </Txt>

            {open.length ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                <View style={styles.track}>
                  <View style={[styles.trackFill, { width: `${Math.max((confirmed / open.length) * 100, 4)}%` }]} />
                </View>
                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                  <Txt variant="caption" color="rgba(255,255,255,0.85)">
                    {confirmed}/{open.length} confirmados
                  </Txt>
                  <CloseIn date={nextClose} />
                </View>
              </View>
            ) : null}

            <View style={styles.cta}>
              <Txt variant="bodyStrong" color="#14214F" style={{ fontFamily: 'Inter-ExtraBold' }}>
                {pending ? 'JUGAR AHORA' : 'VER MI QUINIELA'}
              </Txt>
            </View>
          </LinearGradient>
        </PressableScale>

        {/* ── ¿QUIÉN ES EL JUGADOR? ── */}
        <Title right={<Txt variant="caption" color={G.sub}>Nuevo cada día</Txt>}>¿Quién es el jugador?</Title>
        <PressableScale onPress={() => navigation.navigate('DailyPlayer')} scaleTo={0.985} style={{ marginHorizontal: 16 }}>
          <View style={styles.dailyCard}>
            <View style={styles.dailyPhotoWrap}>
              {answer?.photo ? (
                <Image source={{ uri: answer.photo }} blurRadius={dailyDone ? 0 : 24} style={StyleSheet.absoluteFill} resizeMode="cover" />
              ) : null}
              <LinearGradient colors={['rgba(4,6,14,0)', 'rgba(4,6,14,0.85)']} style={StyleSheet.absoluteFill} />
              {!dailyDone ? (
                <View style={styles.qmark}>
                  <Question size={44} color="#fff" weight="bold" />
                </View>
              ) : null}
            </View>
            <View style={{ flex: 1, padding: 16, justifyContent: 'space-between' }}>
              <View>
                <Txt variant="overline" color={G.gold}>
                  Reto diario
                </Txt>
                <Txt variant="h2" color="#fff" style={{ marginTop: 4 }}>
                  {dailyDone ? (today?.won ? `¡Era ${answer?.short || answer?.name || ''}!` : 'Hoy no salió') : 'Adivina al goleador escondido'}
                </Txt>
                <Txt variant="caption" color={G.sub} style={{ marginTop: 4 }}>
                  {dailyDone ? (today?.won ? `Acertaste en ${today.tries}/${MAX_TRIES}. Vuelve mañana.` : 'Mañana hay otro jugador.') : '6 intentos · hasta 6 pts al ranking'}
                </Txt>
              </View>
              <View style={[styles.row, { justifyContent: 'space-between', marginTop: 10 }]}>
                <View style={[styles.row, { gap: 5 }]}>
                  <Fire size={15} color={G.gold} weight="fill" />
                  <Txt variant="bodyStrong" color="#fff">
                    Racha {daily?.streak || 0}
                  </Txt>
                </View>
                {dailyDone ? (
                  <CheckCircle size={22} color={today?.won ? G.green : G.mut} weight="fill" />
                ) : (
                  <View style={styles.smallCta}>
                    <Txt variant="caption" color="#04060E" style={{ fontFamily: 'Inter-ExtraBold' }}>
                      JUGAR
                    </Txt>
                  </View>
                )}
              </View>
            </View>
          </View>
        </PressableScale>

        {/* ── LIGA MANAGER (próximamente) ── */}
        <Title>Liga Manager</Title>
        <PressableScale onPress={() => navigation.navigate('LigaManager')} scaleTo={0.985} style={{ marginHorizontal: 16 }}>
          <LinearGradient colors={['#1A1F33', '#0B0E1A']} style={styles.manager}>
            <View style={{ flex: 1 }}>
              <View style={[styles.row, { gap: 6 }]}>
                <LockSimple size={13} color={G.gold} weight="fill" />
                <Txt variant="overline" color={G.gold}>
                  Próximamente
                </Txt>
              </View>
              <Txt variant="h2" color="#fff" style={{ marginTop: 6 }}>
                Colecciona cartas y sé el DT
              </Txt>
              <Txt variant="caption" color={G.sub} style={{ marginTop: 4 }}>
                Abre sobres con jugadores reales, arma tu once y compite.
              </Txt>
              <View style={[styles.row, { gap: 4, marginTop: 10 }]}>
                <Txt variant="caption" color="#fff" style={{ fontFamily: 'Inter-Bold' }}>
                  Ver adelanto
                </Txt>
                <CaretRight size={12} color="#fff" weight="bold" />
              </View>
            </View>
            <CardStack />
          </LinearGradient>
        </PressableScale>

        {/* ── Votación ── */}
        <Title>Votación del partido</Title>
        <View style={{ paddingHorizontal: 16 }}>
          <PollCard />
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom, backgroundColor: '#070C1C' }}>
        <FooterTabs navigation={navigation} routeName="Games" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  slash: { width: 7, height: 16, backgroundColor: palette.sky, transform: [{ skewX: '-20deg' }] },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: G.card, borderWidth: 1, borderColor: G.line },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: G.card, borderWidth: 1, borderColor: G.line },
  hero: { borderRadius: 22, padding: 18, overflow: 'hidden' },
  heroBeam: { position: 'absolute', top: -80, bottom: -80, left: '55%', width: 90, backgroundColor: 'rgba(255,255,255,0.08)', transform: [{ skewX: '-20deg' }] },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: '#fff', transform: [{ skewX: CHIP_SKEW }] },
  cta: { marginTop: 16, height: 48, borderRadius: 12, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  dailyCard: { flexDirection: 'row', borderRadius: 22, overflow: 'hidden', backgroundColor: G.card, borderWidth: 1, borderColor: G.line, minHeight: 170 },
  dailyPhotoWrap: { width: 128, backgroundColor: '#111A33', overflow: 'hidden' },
  qmark: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  smallCta: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, backgroundColor: G.gold },
  manager: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,194,75,0.25)', overflow: 'hidden' },
  miniCard: { width: 64, height: 90, borderRadius: 10, overflow: 'hidden', padding: 8 },
  miniShine: { position: 'absolute', top: -20, bottom: -20, left: 30, width: 14, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ skewX: '-20deg' }] },
  miniHead: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.25)', alignSelf: 'flex-end' },
  miniBody: { marginTop: 4, width: 40, height: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, backgroundColor: 'rgba(0,0,0,0.25)', alignSelf: 'flex-end' },
});
