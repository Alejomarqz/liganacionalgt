// src/screens/MatchCenterScreen.js
// Match Center v3 · Liga Nacional GT
// Resumen (línea de tiempo + votación) · Alineaciones (cancha) · Estadísticas · Previa (forma, H2H, tabla)
// Se actualiza solo cada 10 s mientras el partido está en vivo.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Share, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, ShareNetwork, BellSimple, BellSimpleRinging } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, PressableScale, Tabs, SkeletonCard, ErrorState, OfflineBanner } from '../ui';
import { useMatchCenterModel } from '../api/matchCenter';
import { minuteLabel } from '../api/clock';
import MatchHeader from '../features/match/MatchHeader';
import Timeline from '../features/match/Timeline';
import Lineups from '../features/match/Lineups';
import StatsBars from '../features/match/StatsBars';
import Preview from '../features/match/Preview';
import LigaTVBanner from '../features/ligatv/LigaTVBanner';
import { useLigaTV } from '../features/ligatv/useLigaTV';
import { useMatchReminder } from '../notifications/reminders';

import PollCard from '../../components/PollCard';
import AdFooter from '../../ads/AdFooter';
import { showInterstitialIfReady } from '../../ads/AdManager';

const TABS = [
  { key: 'summary', label: 'Resumen' },
  { key: 'lineups', label: 'Alineaciones' },
  { key: 'stats', label: 'Estadísticas' },
  { key: 'preview', label: 'Previa' },
];

function TopBar({ onBack, onShare, reminder, insetTop }) {
  return (
    <View style={[styles.topBar, { paddingTop: insetTop + 6 }]} pointerEvents="box-none">
      <PressableScale onPress={onBack} hitSlop={hitSlop} accessibilityLabel="Volver" style={styles.roundBtn}>
        <CaretLeft size={20} color="#fff" weight="bold" />
      </PressableScale>
      <View style={{ flex: 1 }} />
      {reminder ? (
        <PressableScale onPress={reminder.toggle} hitSlop={hitSlop} accessibilityLabel={reminder.on ? 'Dejar de seguir el partido' : 'Seguir partido: avisos de goles'} style={styles.roundBtn}>
          {reminder.on ? <BellSimpleRinging size={19} color="#FFC24B" weight="fill" /> : <BellSimple size={19} color="#fff" weight="bold" />}
        </PressableScale>
      ) : null}
      <PressableScale onPress={onShare} hitSlop={hitSlop} accessibilityLabel="Compartir" style={styles.roundBtn}>
        <ShareNetwork size={19} color="#fff" weight="bold" />
      </PressableScale>
    </View>
  );
}

export default function MatchCenterScreen({ navigation, route }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  // Pantalla de borde a borde: la foto va bajo la barra de estado
  const topInset = insets.top;
  const matchId = route?.params?.matchId;
  const { model, data, loading, error, refreshing, refresh, offline } = useMatchCenterModel(matchId);
  const { tv } = useLigaTV();
  const m = model?.match;

  const [tab, setTab] = useState(null);
  // Pestaña inicial inteligente: previa si no ha empezado, resumen si ya rodó el balón
  const activeTab = tab || (m?.isScheduled ? 'preview' : 'summary');

  const reminder = useMatchReminder(m && !m.isFinished ? m : null);

  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', () => showInterstitialIfReady('exit_match'));
    return sub;
  }, [navigation]);

  const openTeam = useCallback((t) => t?.id && navigation.navigate('TeamScreen', { teamId: t.id, team: t, scope: 'guatemala' }), [navigation]);
  const openMatch = useCallback((x) => x?.id && navigation.push('Match', { matchId: Number(x.id), slug: x.slug, routeKey: `m-${x.id}` }), [navigation]);
  const openPlayer = useCallback((p) => p?.id && navigation.navigate('Player', { playerId: p.id, player: p, scope: 'guatemala' }), [navigation]);

  const onShare = useCallback(() => {
    if (!m) return;
    const score = m.isScheduled ? 'vs' : `${m.score.home}-${m.score.away}`;
    const status = m.isLive ? ` (${minuteLabel(m)})` : m.isFinished ? ' (Final)' : '';
    Share.share({ message: `⚽ ${m.home?.name} ${score} ${m.away?.name}${status}\nSíguelo en la app oficial de la Liga Nacional GT` }).catch(() => {});
  }, [m]);

  // Partido crudo para PollCard (espera kickoff con zona horaria original)
  const pollMatch = useMemo(
    () => (data?.match ? { id: data.match.id, kickoff: data.match.kickoff, date: data.match.date, home: data.teams?.home, away: data.teams?.away } : null),
    [data],
  );

  if (loading && !model) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SkeletonCard height={300} style={{ borderRadius: 0 }} />
        <View style={{ padding: space[4], gap: 12 }}>
          <SkeletonCard height={60} />
          <SkeletonCard height={220} />
        </View>
        <TopBar onBack={() => navigation.goBack()} onShare={() => {}} insetTop={topInset} />
      </View>
    );
  }

  if (!model) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center' }}>
        <ErrorState message={error?.message} onRetry={refresh} />
        <TopBar onBack={() => navigation.goBack()} onShare={() => {}} insetTop={topInset} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" progressViewOffset={insets.top + 40} />}
      >
        <MatchHeader model={model} onTeam={openTeam} topInset={topInset} />

        <View style={{ backgroundColor: colors.bg, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 6 }}>
          <Tabs tabs={TABS} value={activeTab} onChange={setTab} scrollable />
        </View>

        <View style={{ paddingTop: space[4], gap: space[5] }}>
          <OfflineBanner visible={offline} />

          {activeTab === 'summary' ? (
            <>
              {m.isLive ? <LigaTVBanner tv={tv} onPress={() => navigation.navigate('LigaTV')} /> : null}
              {model.playerOfMatch ? (
                <View style={{ paddingHorizontal: space[4] }}>
                  <Txt variant="overline" tone="gold">
                    Figura del partido
                  </Txt>
                  <Txt variant="h3">{model.playerOfMatch.name || model.playerOfMatch.player?.name}</Txt>
                </View>
              ) : null}
              <Timeline model={model} />
              {pollMatch ? (
                <View style={{ paddingHorizontal: space[4] }}>
                  <PollCard match={pollMatch} />
                </View>
              ) : null}
            </>
          ) : null}

          {activeTab === 'lineups' ? <Lineups model={model} onPlayer={openPlayer} /> : null}
          {activeTab === 'stats' ? <StatsBars model={model} /> : null}
          {activeTab === 'preview' ? <Preview model={model} onMatch={openMatch} onTeam={openTeam} /> : null}

          <View style={{ alignItems: 'center' }}>
            <AdFooter />
          </View>
        </View>
      </ScrollView>

      <TopBar onBack={() => navigation.goBack()} onShare={onShare} reminder={!m.isFinished ? reminder : null} insetTop={topInset} />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12 },
  roundBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
