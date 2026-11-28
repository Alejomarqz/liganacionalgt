// src/screens/TableScreen.js
// Tabla v3 · "Tabla general" con General / Local / Visita.
// Local y Visita se calculan en el teléfono con los partidos terminados.
import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDesign } from '../design/useDesign';
import { Txt, Pill, Slash, SectionHeader, OfflineBanner, ErrorState } from '../ui';
import { useMatches, useStandings, useScorers } from '../api/liga';
import StandingsTable, { computeForms } from '../features/standings/StandingsTable';
import ScorersRail from '../features/scorers/ScorersRail';
import { seasonLabel } from '../api/clock';
import FooterTabs from '../../components/FooterTabs';
import AdFooter from '../../ads/AdFooter';
import NativeAdCard from '../../ads/NativeAdCard';

const VIEWS = [
  { key: 'general', label: 'General' },
  { key: 'home', label: 'Local' },
  { key: 'away', label: 'Visita' },
];

/** Tabla de local o visita a partir de los partidos terminados. */
export function venueTable(matches, venue) {
  const t = {};
  for (const m of matches) {
    if (!m.isFinished) continue;
    const team = venue === 'home' ? m.home : m.away;
    if (!team?.id) continue;
    const gf = venue === 'home' ? m.score.home ?? 0 : m.score.away ?? 0;
    const ga = venue === 'home' ? m.score.away ?? 0 : m.score.home ?? 0;
    const r = (t[team.id] = t[team.id] || { team, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 });
    r.played += 1;
    r.gf += gf;
    r.ga += ga;
    if (gf > ga) r.won += 1;
    else if (gf < ga) r.lost += 1;
    else r.drawn += 1;
  }
  return Object.values(t)
    .map((r) => ({ ...r, gd: r.gf - r.ga, points: r.won * 3 + r.drawn }))
    .sort((a, b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name))
    .map((r, i) => ({ ...r, position: i + 1 }));
}

export default function TableScreen({ navigation }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  const [view, setView] = useState('general');
  const standings = useStandings();
  const matchesQ = useMatches();
  const scorers = useScorers();

  const forms = useMemo(() => computeForms(matchesQ.matches), [matchesQ.matches]);
  const rows = useMemo(() => (view === 'general' ? standings.rows : venueTable(matchesQ.matches, view)), [view, standings.rows, matchesQ.matches]);

  const openTeam = useCallback((t) => t?.id && navigation.navigate('TeamScreen', { teamId: t.id, team: t, scope: 'guatemala' }), [navigation]);
  const onRefresh = useCallback(() => {
    standings.refresh();
    matchesQ.refresh();
  }, [standings, matchesQ]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={standings.refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <Txt variant="overline" tone="secondary">
            {seasonLabel()} · Fase regular
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <Slash width={9} height={24} />
            <Txt variant="h1">Tabla general</Txt>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 16, paddingBottom: 12 }}>
          {VIEWS.map((v) => (
            <Pill key={v.key} label={v.label} active={view === v.key} onPress={() => setView(v.key)} />
          ))}
        </ScrollView>

        <OfflineBanner visible={standings.offline} />

        {standings.error && !standings.rows.length ? (
          <ErrorState message={standings.error?.message} onRetry={onRefresh} />
        ) : (
          <StandingsTable rows={rows} loading={standings.loading} forms={forms} onPressTeam={openTeam} showLegend={view === 'general'} />
        )}
        <NativeAdCard style={{ marginTop: 16 }} />

        {standings.projectionActive && view === 'general' ? (
          <Txt variant="caption" tone="muted" style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            Tabla proyectada con los partidos en vivo.
          </Txt>
        ) : null}

        <View style={{ alignItems: 'center', marginTop: space[6] }}>
          <AdFooter />
        </View>

        <View style={{ marginTop: space[6] }}>
          <SectionHeader title="Goleadores" onAction={() => navigation.navigate('Scorers')}  />
          <ScorersRail
            rows={scorers.rows}
            loading={scorers.loading}
            onPress={(it) => navigation.navigate('Player', { playerId: it.player.id, player: { ...it.player, team: it.team }, scope: 'guatemala' })}
          />
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom, backgroundColor: colors.bgElevated }}>
        <FooterTabs navigation={navigation} routeName="Positions" />
      </View>
    </View>
  );
}
