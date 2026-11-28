// src/screens/HomeScreen.js
// Inicio v3 · identidad "La Diagonal"
// Foto del estadio en duotono con el partido destacado → jornada por día →
// tabla con forma → goleadores → pulso del torneo.

import React, { useCallback, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, StatusBar, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MagnifyingGlass, GearSix } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, SectionHeader, Pill, PressableScale, SkeletonCard, ErrorState, OfflineBanner, EmptyState, StadiumBackdrop } from '../ui';

import { useHome, useMatches, useStandings, useScorers, selectMatchday } from '../api/liga';
import FeaturedMatch from '../features/matches/FeaturedMatch';
import FixtureList from '../features/matches/FixtureList';
import StandingsTable, { computeForms } from '../features/standings/StandingsTable';
import ScorersRail from '../features/scorers/ScorersRail';
import SeasonPulse from '../features/season/SeasonPulse';
import LigaTVBanner from '../features/ligatv/LigaTVBanner';
import { useLigaTV } from '../features/ligatv/useLigaTV';
import { useMatchReminder } from '../notifications/reminders';
import { seasonLabel } from '../api/clock';

import FooterTabs from '../../components/FooterTabs';
import TeamSearchModal from '../../components/TeamSearchModal';
import AdFooter from '../../ads/AdFooter';

const LOGO = require('../../resources/logogrande.png');


function Header({ onSearch, onMore }) {
  return (
    <View style={styles.header}>
      <Image source={LOGO} style={{ width: 30, height: 30 }} resizeMode="contain" />
      <View style={{ flex: 1 }}>
        <Txt variant="h3" color="#fff" style={{ letterSpacing: 1.5, fontSize: 16, lineHeight: 19 }}>
          LIGA NACIONAL
        </Txt>
        <Txt variant="overline" color="rgba(255,255,255,0.6)" style={{ fontSize: 10, lineHeight: 12 }}>
          {seasonLabel()}
        </Txt>
      </View>
      <PressableScale onPress={onSearch} hitSlop={hitSlop} accessibilityLabel="Buscar equipo" style={styles.headerBtn}>
        <MagnifyingGlass size={21} color="#fff" />
      </PressableScale>
      <PressableScale onPress={onMore} hitSlop={hitSlop} accessibilityLabel="Más opciones y ajustes" style={styles.headerBtn}>
        <GearSix size={21} color="#fff" />
      </PressableScale>
    </View>
  );
}

function Featured({ match, onOpen, onPredict }) {
  const reminder = useMatchReminder(match && !match.isFinished ? match : null);
  return <FeaturedMatch match={match} onPress={() => onOpen(match)} onPredict={onPredict} reminderOn={reminder.on} onToggleReminder={reminder.toggle} />;
}

export default function HomeScreen({ navigation }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  const [searchOpen, setSearchOpen] = useState(false);
  const [roundId, setRoundId] = useState(null);

  const home = useHome();
  const matchesQ = useMatches();
  const standings = useStandings();
  const scorers = useScorers();
  const { tv } = useLigaTV();

  const day = useMemo(() => selectMatchday(matchesQ.matches, home.data?.featuredRound?.id), [matchesQ.matches, home.data?.featuredRound?.id]);
  const forms = useMemo(() => computeForms(matchesQ.matches), [matchesQ.matches]);

  const rounds = useMemo(() => {
    const map = new Map();
    for (const m of matchesQ.matches) {
      if (m.round?.id && !map.has(m.round.id)) {
        map.set(m.round.id, {
          id: m.round.id,
          order: m.round.sortOrder ?? m.round.number ?? 0,
          short: m.round.stageType === 'regular' ? `J${m.round.number}` : m.round.name,
        });
      }
    }
    return [...map.values()].sort((a, b) => a.order - b.order);
  }, [matchesQ.matches]);

  const activeRound = roundId ?? day.roundInfo?.id ?? null;
  // Selector: 3 jornadas antes y las siguientes (no 22 chips de golpe)
  const visibleRounds = useMemo(() => {
    const i = rounds.findIndex((r) => r.id === activeRound);
    return i < 0 ? rounds.slice(-6) : rounds.slice(Math.max(0, i - 3), i + 3);
  }, [rounds, activeRound]);

  const roundMatches = useMemo(
    () => matchesQ.matches.filter((m) => m.round?.id === activeRound).sort((a, b) => (a.kickoff?.getTime() || 0) - (b.kickoff?.getTime() || 0)),
    [activeRound, matchesQ.matches],
  );
  const roundName = roundMatches[0]?.round?.name || day.roundInfo?.name || 'Jornada';
  const featured = day.live[0] || day.next || day.recent[0] || null;

  const openMatch = useCallback((m) => m && navigation.navigate('Match', { matchId: Number(m.id), slug: m.slug }), [navigation]);
  const openTeam = useCallback((t) => t?.id && navigation.navigate('TeamScreen', { teamId: t.id, team: t, scope: 'guatemala' }), [navigation]);

  const onRefresh = useCallback(() => {
    home.refresh();
    matchesQ.refresh();
    standings.refresh();
    scorers.refresh();
  }, [home, matchesQ, standings, scorers]);

  const fatal = matchesQ.error && !matchesQ.matches.length;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.photoTint[1]} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={home.refreshing || matchesQ.refreshing} onRefresh={onRefresh} tintColor="#fff" colors={[colors.primaryStrong]} />}
      >
        {/* 1 · Foto del estadio + partido destacado */}
        <StadiumBackdrop height={featured?.isScheduled ? 420 : 370}>
          <Header onSearch={() => setSearchOpen(true)} onMore={() => navigation.navigate('More')} />
          <View style={{ paddingTop: 34 }}>
            {matchesQ.loading ? (
              <SkeletonCard height={220} style={{ marginHorizontal: space[5], backgroundColor: 'transparent', borderColor: 'transparent' }} />
            ) : featured ? (
              <Featured match={featured} onOpen={openMatch} onPredict={() => navigation.navigate('Games', { matchId: featured.id })} />
            ) : null}
          </View>
        </StadiumBackdrop>

        <OfflineBanner visible={matchesQ.offline || home.offline} />

        {fatal ? (
          <ErrorState message={matchesQ.error?.message} onRetry={onRefresh} />
        ) : (
          <View style={{ gap: space[8] }}>
            {/* 2 · Liga TV (sólo si hay transmisión) */}
            <LigaTVBanner tv={tv} onPress={() => navigation.navigate('LigaTV')} />

            {/* 3 · Jornada */}
            <View>
              <SectionHeader title={roundName} onAction={() => navigation.navigate('Calendar')} actionLabel="Calendario" />
              {visibleRounds.length > 1 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 12 }}>
                  {visibleRounds.map((r) => (
                    <Pill key={r.id} label={r.short} active={r.id === activeRound} onPress={() => setRoundId(r.id)} />
                  ))}
                </ScrollView>
              ) : null}
              {matchesQ.loading ? (
                <SkeletonCard height={280} style={{ marginHorizontal: 16 }} />
              ) : roundMatches.length ? (
                <FixtureList matches={roundMatches} onOpen={openMatch} style={{ marginHorizontal: 16 }} />
              ) : (
                <EmptyState title="Sin partidos" message="No hay partidos para esta jornada." />
              )}
            </View>

            {/* 4 · Tabla */}
            <View>
              <SectionHeader title="Tabla general" onAction={() => navigation.navigate('Positions')} actionLabel="Ver tabla" />
              <StandingsTable rows={standings.rows} loading={standings.loading} limit={6} forms={forms} onPressTeam={openTeam} onPressAll={() => navigation.navigate('Positions')} />
            </View>

            <View style={{ alignItems: 'center' }}>
              <AdFooter />
            </View>

            {/* 5 · Goleadores */}
            <View>
              <SectionHeader title="Goleadores" onAction={() => navigation.navigate('Scorers')} />
              <ScorersRail
                rows={scorers.rows}
                loading={scorers.loading}
                onPress={(it) => navigation.navigate('Player', { playerId: it.player.id, player: { ...it.player, team: it.team }, scope: 'guatemala' })}
              />
            </View>

            {/* 6 · Pulso del torneo */}
            {home.data?.seasonSummary ? (
              <View>
                <SectionHeader title="El torneo en números" />
                <SeasonPulse summary={home.data.seasonSummary} />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom, backgroundColor: colors.bgElevated }]}>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 8 },
  headerBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
