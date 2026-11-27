// src/screens/HomeScreen.js
// Home v3 · Liga Nacional GT
// Orden pensado para retención: lo más vivo arriba (partido en vivo / cuenta
// regresiva), Liga TV, la jornada completa, tabla, goleadores y datos curiosos.

import React, { useCallback, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StatusBar, View, StyleSheet, FlatList, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MagnifyingGlass, GearSix } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, Surface, SectionHeader, Pill, PressableScale, SkeletonCard, ErrorState, OfflineBanner, EmptyState } from '../ui';

import { useHome, useMatches, useStandings, useScorers, selectMatchday } from '../api/liga';
import HeroMatch from '../features/matches/HeroMatch';
import MatchRow from '../features/matches/MatchRow';
import StandingsPreview from '../features/standings/StandingsPreview';
import ScorersRail from '../features/scorers/ScorersRail';
import SeasonPulse from '../features/season/SeasonPulse';
import LigaTVBanner from '../features/ligatv/LigaTVBanner';
import { useLigaTV } from '../features/ligatv/useLigaTV';
import { useMatchReminder } from '../notifications/reminders';

import FooterTabs from '../../components/FooterTabs';
import TeamSearchModal from '../../components/TeamSearchModal';
import AdFooter from '../../ads/AdFooter';
import PollCard from '../../components/PollCard';

const LOGO = require('../../resources/logogrande.png');

/* ── Encabezado ── */
function Header({ onSearch, onSettings }) {
  const { colors, space } = useDesign();
  return (
    <View style={[styles.header, { paddingHorizontal: space[5] }]}>
      <Image source={LOGO} style={styles.logo} resizeMode="contain" />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Txt variant="overline" tone="brand">
          Oficial
        </Txt>
        <Txt variant="h2" numberOfLines={1} style={{ marginTop: -2 }}>
          Liga Nacional
        </Txt>
      </View>
      <PressableScale onPress={onSearch} hitSlop={hitSlop} accessibilityLabel="Buscar equipo" style={[styles.headerBtn, { backgroundColor: colors.surfaceHigh }]}>
        <MagnifyingGlass size={19} color={colors.text} weight="bold" />
      </PressableScale>
      <PressableScale onPress={onSettings} hitSlop={hitSlop} accessibilityLabel="Ajustes" style={[styles.headerBtn, { backgroundColor: colors.surfaceHigh }]}>
        <GearSix size={19} color={colors.text} weight="bold" />
      </PressableScale>
    </View>
  );
}

/* ── Hero con recordatorio ── */
function Hero({ match, onOpen }) {
  const reminder = useMatchReminder(match?.isScheduled ? match : null);
  return (
    <HeroMatch
      match={match}
      onPress={() => onOpen(match)}
      reminderOn={reminder.on}
      onToggleReminder={match?.isScheduled ? reminder.toggle : undefined}
    />
  );
}

/* ── Carrusel cuando hay varios partidos en vivo ── */
function LiveCarousel({ matches, onOpen }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const { colors } = useDesign();
  if (matches.length <= 1) return <Hero match={matches[0]} onOpen={onOpen} />;
  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        data={matches}
        keyExtractor={(m) => String(m.id)}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <Hero match={item} onOpen={onOpen} />
          </View>
        )}
      />
      <View style={styles.dots}>
        {matches.map((m, i) => (
          <View key={m.id} style={[styles.dot, { backgroundColor: i === index ? colors.live : colors.borderStrong, width: i === index ? 18 : 6 }]} />
        ))}
      </View>
    </View>
  );
}

/* ── Selector de jornada ── */
function RoundPicker({ rounds, selected, onSelect }) {
  const { space } = useDesign();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: space[5], gap: 8, paddingBottom: space[3] }}>
      {rounds.map((r) => (
        <Pill key={r.id} label={r.short} active={r.id === selected} onPress={() => onSelect(r.id)} />
      ))}
    </ScrollView>
  );
}

export default function HomeScreen({ navigation }) {
  const { colors, space, isDark } = useDesign();
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [roundId, setRoundId] = useState(null);

  const home = useHome();
  const matchesQ = useMatches();
  const standings = useStandings();
  const scorers = useScorers();
  const { tv } = useLigaTV();

  const day = useMemo(() => selectMatchday(matchesQ.matches, home.data?.featuredRound?.id), [matchesQ.matches, home.data?.featuredRound?.id]);

  // Lista de jornadas disponibles (ordenadas) para el selector
  const rounds = useMemo(() => {
    const map = new Map();
    for (const m of matchesQ.matches) {
      if (m.round?.id && !map.has(m.round.id)) {
        map.set(m.round.id, {
          id: m.round.id,
          order: m.round.sortOrder ?? m.round.number ?? 0,
          short: m.round.stageType === 'regular' ? `J${m.round.number}` : m.round.name,
          name: m.round.name,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.order - b.order);
  }, [matchesQ.matches]);

  const activeRound = roundId ?? day.roundInfo?.id ?? null;
  const roundMatches = useMemo(
    () => (activeRound === day.roundInfo?.id ? day.round : matchesQ.matches.filter((m) => m.round?.id === activeRound)).slice().sort((a, b) => (a.kickoff?.getTime() || 0) - (b.kickoff?.getTime() || 0)),
    [activeRound, day, matchesQ.matches],
  );
  const roundName = roundMatches[0]?.round?.name || day.roundInfo?.name || 'Jornada';

  const heroMatches = day.live.length ? day.live : [day.next || day.recent[0]].filter(Boolean);

  const openMatch = useCallback((m) => m && navigation.navigate('Match', { matchId: Number(m.id), slug: m.slug }), [navigation]);
  const openTeam = useCallback((t) => t?.id && navigation.navigate('TeamScreen', { teamId: t.id, team: t, scope: 'guatemala' }), [navigation]);

  const refreshing = home.refreshing || matchesQ.refreshing || standings.refreshing;
  const onRefresh = useCallback(() => {
    home.refresh();
    matchesQ.refresh();
    standings.refresh();
    scorers.refresh();
  }, [home, matchesQ, standings, scorers]);

  const fatal = matchesQ.error && !matchesQ.matches.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bg} />
      <Header onSearch={() => setSearchOpen(true)} onSettings={() => navigation.navigate('Settings')} />
      <OfflineBanner visible={matchesQ.offline || home.offline} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom, gap: space[8] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {fatal ? (
          <ErrorState message={matchesQ.error?.message} onRetry={onRefresh} />
        ) : (
          <>
            {/* 1. Protagonista */}
            <View style={{ marginTop: space[2] }}>
              {matchesQ.loading ? <SkeletonCard height={230} style={{ marginHorizontal: space[5] }} /> : <LiveCarousel matches={heroMatches} onOpen={openMatch} />}
            </View>

            {/* 2. Liga TV */}
            <LigaTVBanner tv={tv} onPress={() => navigation.navigate('LigaTV')} />

            {/* 2b. Votación / pronóstico del partido destacado */}
            <View style={{ paddingHorizontal: space[5] }}>
              <PollCard />
            </View>

            {/* 3. Jornada */}
            <View>
              <SectionHeader eyebrow="Partidos" title={roundName} onAction={() => navigation.navigate('Calendar')} actionLabel="Calendario" />
              {rounds.length > 1 ? <RoundPicker rounds={rounds} selected={activeRound} onSelect={setRoundId} /> : null}
              {matchesQ.loading ? (
                <SkeletonCard height={300} style={{ marginHorizontal: space[5] }} />
              ) : roundMatches.length ? (
                <Surface padded={false} style={{ marginHorizontal: space[5] }}>
                  {roundMatches.map((m, i) => (
                    <MatchRow key={m.id} match={m} onPress={() => openMatch(m)} last={i === roundMatches.length - 1} />
                  ))}
                </Surface>
              ) : (
                <EmptyState title="Sin partidos" message="No hay partidos para esta jornada." />
              )}
            </View>

            {/* 4. Tabla */}
            <View>
              <SectionHeader eyebrow="Clasificación" title="Tabla de posiciones" onAction={() => navigation.navigate('Positions')} />
              <StandingsPreview rows={standings.rows} loading={standings.loading} onPressTeam={openTeam} onPressAll={() => navigation.navigate('Positions')} />
            </View>

            {/* Publicidad integrada como contenido */}
            <View style={{ alignItems: 'center' }}>
              <AdFooter />
            </View>

            {/* 5. Goleadores */}
            <View>
              <SectionHeader eyebrow="Bota de Oro" title="Goleadores" onAction={() => navigation.navigate('Scorers')} />
              <ScorersRail rows={scorers.rows} loading={scorers.loading} onPress={(it) => navigation.navigate('Player', { playerId: it.player.id, player: { ...it.player, team: it.team }, scope: 'guatemala' })} />
            </View>

            {/* 6. Pulso de la temporada */}
            {home.data?.seasonSummary ? (
              <View>
                <SectionHeader eyebrow="Números" title="Pulso del torneo" />
                <SeasonPulse summary={home.data.seasonSummary} />
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom }]}>
        <FooterTabs navigation={navigation} routeName="Home" />
      </View>

      <TeamSearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelect={(team) => {
          setSearchOpen(false);
          navigation.navigate('TeamScreen', { teamId: team.id, scope: 'guatemala' });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8 },
  logo: { width: 40, height: 40 },
  headerBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
  dot: { height: 6, borderRadius: 3 },
});
