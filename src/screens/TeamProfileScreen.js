// src/screens/TeamProfileScreen.js
// Perfil de equipo v3 · Liga Nacional GT
// Cabecera con el color del escudo, seguir equipo, y pestañas Resumen · Partidos · Plantel.

import React, { useCallback, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { CaretLeft, UsersThree, Check, Plus, MapPin, ClipboardText, Buildings } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Beams, Txt, Surface, PressableScale, Tabs, TeamCrest, FormStrip, SectionHeader, SkeletonCard, EmptyState } from '../ui';
import { api, useMatches, useStandings, useScorers, selectTeamMatches } from '../api/liga';
import { useQuery } from '../api/store';
import { useTeamProfile, useRoster, normalizeTeamProfile, GROUP_LABEL, GROUP_ORDER } from '../api/profiles';
import { useFollowTeam } from '../features/teams/useFollowTeam';
import { useTeamColor } from '../features/teams/useTeamColor';
import MatchRow from '../features/matches/MatchRow';
import HeroMatch from '../features/matches/HeroMatch';
import { useMatchReminder } from '../notifications/reminders';
import AdFooter from '../../ads/AdFooter';

const TABS = [
  { key: 'summary', label: 'Resumen' },
  { key: 'matches', label: 'Partidos' },
  { key: 'squad', label: 'Plantel' },
];

const fmtCount = (n) => (n == null ? '' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)} mil` : String(n));

function StatBox({ value, label, tone }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Txt variant="h2" tone={tone} style={{ fontVariant: ['tabular-nums'] }}>
        {value ?? '–'}
      </Txt>
      <Txt variant="caption" tone="muted">
        {label}
      </Txt>
    </View>
  );
}

function InfoRow({ Icon, label, value, colors, last }) {
  if (!value) return null;
  return (
    <View style={[styles.infoRow, { borderBottomColor: colors.divider }, last ? { borderBottomWidth: 0 } : null]}>
      <Icon size={18} color={colors.textMuted} weight="duotone" />
      <Txt variant="body" tone="secondary" style={{ width: 92 }}>
        {label}
      </Txt>
      <Txt variant="bodyStrong" style={{ flex: 1 }} numberOfLines={2}>
        {value}
      </Txt>
    </View>
  );
}

function NextMatch({ match, onOpen }) {
  const reminder = useMatchReminder(match?.isScheduled ? match : null);
  if (!match) return null;
  return <HeroMatch match={match} onPress={() => onOpen(match)} reminderOn={reminder.on} onToggleReminder={match.isScheduled ? reminder.toggle : undefined} />;
}

const SquadPlayer = ({ p, colors, onPress, last }) => {
  const [failed, setFailed] = React.useState(false);
  return (
    <PressableScale onPress={() => onPress(p)} scaleTo={0.99}>
      <View style={[styles.squadRow, { borderBottomColor: colors.divider }, last ? { borderBottomWidth: 0 } : null]}>
        {p.photo && !failed ? (
          <Image source={{ uri: p.photo }} onError={() => setFailed(true)} style={[styles.squadPhoto, { backgroundColor: colors.surfaceHigh }]} />
        ) : (
          <View style={[styles.squadPhoto, { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }]}>
            <Txt variant="number" tone="muted">
              {p.number ?? ''}
            </Txt>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Txt variant="bodyStrong" numberOfLines={1}>
            {p.name}
          </Txt>
          <Txt variant="caption" tone="muted" numberOfLines={1}>
            {[p.position, p.nationality, p.age ? `${p.age} años` : null].filter(Boolean).join(' · ')}
          </Txt>
        </View>
        {p.goals ? (
          <Txt variant="caption" tone="brand" style={{ fontFamily: 'Inter-Bold' }}>
            {p.goals} ⚽
          </Txt>
        ) : null}
        <Txt variant="h3" tone="muted" style={{ width: 34, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
          {p.number ?? ''}
        </Txt>
      </View>
    </PressableScale>
  );
};

export default function TeamProfileScreen({ navigation, route }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  const teamId = Number(route?.params?.teamId) || null;
  const passed = route?.params?.team || {};
  const [tab, setTab] = useState('summary');

  // Directorio (teams.php) trae ciudad, DT, estadio, goles — lo usamos como base
  const dir = useQuery('teams-raw', api.teams, { staleTime: 6 * 3600 * 1000 });
  const dirTeam = useMemo(() => (dir.data?.teams || []).find((t) => Number(t.id) === teamId) || {}, [dir.data, teamId]);
  const profileQ = useTeamProfile(teamId);
  const team = useMemo(() => normalizeTeamProfile(profileQ.data, { ...passed, ...dirTeam, id: teamId }), [profileQ.data, passed, dirTeam, teamId]);

  const matchesQ = useMatches();
  const standings = useStandings();
  const scorers = useScorers();
  const roster = useRoster(teamId);
  const follow = useFollowTeam(teamId);
  const brand = useTeamColor(team, colors.primaryStrong);

  const teamMatches = useMemo(() => selectTeamMatches(matchesQ.matches, teamId), [matchesQ.matches, teamId]);
  const upcoming = useMemo(() => teamMatches.filter((m) => m.isScheduled || m.isLive), [teamMatches]);
  const results = useMemo(() => teamMatches.filter((m) => m.isFinished).reverse(), [teamMatches]);
  const next = teamMatches.find((m) => m.isLive) || upcoming[0] || null;

  const form = useMemo(
    () =>
      results
        .slice(0, 5)
        .reverse()
        .map((m) => {
          const mine = m.home?.id === teamId ? m.score.home : m.score.away;
          const theirs = m.home?.id === teamId ? m.score.away : m.score.home;
          return mine > theirs ? 'W' : mine < theirs ? 'L' : 'D';
        })
        .join(''),
    [results, teamId],
  );

  const row = standings.rows.find((r) => r.team.id === teamId);
  const teamScorers = scorers.rows.filter((s) => s.team?.id === teamId).slice(0, 5);

  const openMatch = useCallback((m) => navigation.navigate('Match', { matchId: Number(m.id), slug: m.slug, routeKey: `m-${m.id}` }), [navigation]);
  const openPlayer = useCallback((p) => navigation.navigate('Player', { playerId: p.id, player: p, teamId, scope: 'guatemala' }), [navigation, teamId]);

  const onRefresh = useCallback(() => {
    profileQ.refresh();
    matchesQ.refresh();
    standings.refresh();
    roster.refresh();
  }, [profileQ, matchesQ, standings, roster]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={profileQ.refreshing || matchesQ.refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        {/* Cabecera */}
        <LinearGradient colors={[brand, colors.bg]} locations={[0, 1]} style={{ paddingTop: 56, paddingBottom: space[5], paddingHorizontal: space[5] }}>
          <Beams />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={styles.crestBox}>
              <TeamCrest team={team} size={72} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt variant="h1" color="#fff" numberOfLines={2}>
                {team.name || 'Equipo'}
              </Txt>
              {team.city ? (
                <Txt variant="caption" color="rgba(255,255,255,0.8)">
                  {team.city}
                </Txt>
              ) : null}
              {follow.count != null ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <UsersThree size={14} color="rgba(255,255,255,0.8)" />
                  <Txt variant="caption" color="rgba(255,255,255,0.8)">
                    {fmtCount(follow.count)} seguidores
                  </Txt>
                </View>
              ) : null}
            </View>
          </View>
          <PressableScale
            onPress={follow.toggle}
            disabled={follow.busy}
            style={[styles.follow, follow.following ? { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.4)' } : { backgroundColor: '#fff', borderColor: '#fff' }]}
          >
            {follow.following ? <Check size={16} color="#fff" weight="bold" /> : <Plus size={16} color={brand} weight="bold" />}
            <Txt variant="bodyStrong" color={follow.following ? '#fff' : brand}>
              {follow.following ? 'Siguiendo · recibes sus alertas' : 'Seguir equipo'}
            </Txt>
          </PressableScale>
        </LinearGradient>

        <View style={{ backgroundColor: colors.bg }}>
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
        </View>

        <View style={{ paddingTop: space[5], gap: space[6] }}>
          {tab === 'summary' ? (
            <>
              {matchesQ.loading ? <SkeletonCard height={220} style={{ marginHorizontal: space[5] }} /> : <NextMatch match={next} onOpen={openMatch} />}

              {row ? (
                <View>
                  <SectionHeader eyebrow="Temporada" title={`${row.position}° en la tabla`} onAction={() => navigation.navigate('Positions')} actionLabel="Tabla" />
                  <Surface style={{ marginHorizontal: space[5], gap: 16 }}>
                    <View style={{ flexDirection: 'row' }}>
                      <StatBox value={row.points} label="Puntos" tone="brand" />
                      <StatBox value={row.played} label="Jugados" />
                      <StatBox value={row.gf} label="GF" tone="success" />
                      <StatBox value={row.ga} label="GC" tone="danger" />
                    </View>
                    <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                      <View style={{ flex: row.won || 0.001, backgroundColor: colors.success }} />
                      <View style={{ flex: row.drawn || 0.001, backgroundColor: colors.textMuted }} />
                      <View style={{ flex: row.lost || 0.001, backgroundColor: colors.danger }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Txt variant="caption" tone="secondary">
                        {row.won}G · {row.drawn}E · {row.lost}P
                      </Txt>
                      <FormStrip sequence={form} size={14} />
                    </View>
                  </Surface>
                </View>
              ) : null}

              {teamScorers.length ? (
                <View>
                  <SectionHeader eyebrow="Gol" title="Goleadores del equipo" />
                  <Surface padded={false} style={{ marginHorizontal: space[5] }}>
                    {teamScorers.map((s, i) => (
                      <PressableScale key={s.player.id} onPress={() => openPlayer(s.player)} scaleTo={0.99}>
                        <View style={[styles.squadRow, { borderBottomColor: colors.divider }, i === teamScorers.length - 1 ? { borderBottomWidth: 0 } : null]}>
                          <Txt variant="number" tone="muted" style={{ width: 22 }}>
                            {i + 1}
                          </Txt>
                          <Txt variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                            {s.player.name}
                          </Txt>
                          <Txt variant="h3" style={{ fontVariant: ['tabular-nums'] }}>
                            {s.goals}
                          </Txt>
                        </View>
                      </PressableScale>
                    ))}
                  </Surface>
                </View>
              ) : null}

              <View>
                <SectionHeader eyebrow="Club" title="Información" />
                <Surface padded={false} style={{ marginHorizontal: space[5] }}>
                  <InfoRow Icon={ClipboardText} label="Entrenador" value={team.coach} colors={colors} />
                  <InfoRow Icon={Buildings} label="Estadio" value={team.stadium?.name} colors={colors} />
                  <InfoRow Icon={MapPin} label="Ciudad" value={team.city} colors={colors} />
                  <InfoRow Icon={UsersThree} label="Plantel" value={team.rosterCount ? `${team.rosterCount} jugadores` : null} colors={colors} last />
                </Surface>
              </View>
            </>
          ) : null}

          {tab === 'matches' ? (
            <>
              {upcoming.length ? (
                <View>
                  <SectionHeader title="Próximos" />
                  <Surface padded={false} style={{ marginHorizontal: space[5] }}>
                    {upcoming.map((m, i) => (
                      <MatchRow key={m.id} match={m} onPress={() => openMatch(m)} last={i === upcoming.length - 1} />
                    ))}
                  </Surface>
                </View>
              ) : null}
              {results.length ? (
                <View>
                  <SectionHeader title="Resultados" />
                  <Surface padded={false} style={{ marginHorizontal: space[5] }}>
                    {results.map((m, i) => (
                      <MatchRow key={m.id} match={m} onPress={() => openMatch(m)} last={i === results.length - 1} />
                    ))}
                  </Surface>
                </View>
              ) : null}
              {!upcoming.length && !results.length && !matchesQ.loading ? <EmptyState title="Sin partidos" /> : null}
            </>
          ) : null}

          {tab === 'squad' ? (
            roster.loading ? (
              <SkeletonCard height={400} style={{ marginHorizontal: space[5] }} />
            ) : roster.list.length ? (
              GROUP_ORDER.filter((g) => roster.groups[g]?.length).map((g) => (
                <View key={g}>
                  <SectionHeader title={GROUP_LABEL[g]} right={<Txt variant="caption" tone="muted">{roster.groups[g].length}</Txt>} />
                  <Surface padded={false} style={{ marginHorizontal: space[5] }}>
                    {roster.groups[g].map((p, i) => (
                      <SquadPlayer key={p.id} p={p} colors={colors} onPress={openPlayer} last={i === roster.groups[g].length - 1} />
                    ))}
                  </Surface>
                </View>
              ))
            ) : (
              <EmptyState title="Plantel no disponible" message="Pronto verás aquí a todos los jugadores del equipo." />
            )
          ) : null}

          <View style={{ alignItems: 'center' }}>
            <AdFooter />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.topBar, { paddingTop: 6 }]} pointerEvents="box-none">
        <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver" style={styles.roundBtn}>
          <CaretLeft size={20} color="#fff" weight="bold" />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  crestBox: { width: 96, height: 96, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  follow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18, paddingVertical: 12, borderRadius: 999, borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  squadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  squadPhoto: { width: 40, height: 40, borderRadius: 20 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 12 },
  roundBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
