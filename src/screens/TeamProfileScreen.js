// src/screens/TeamProfileScreen.js
// Perfil de club v3 · se usa en "Equipo" y en "Mi club".
// Portada a pantalla completa (foto del club bajo la barra de estado),
// hoja de contenido con pestañas: Resumen · Partidos · Plantel · Noticias.

import React, { useCallback, useMemo, useState } from 'react';
import { Image, RefreshControl, ScrollView, Share, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, UsersThree, Check, Plus, MapPin, ClipboardText, Buildings, ShareNetwork, ArrowsLeftRight } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, Surface, PressableScale, Tabs, TeamCrest, FormStrip, SectionHeader, SkeletonCard, EmptyState, StadiumBackdrop } from '../ui';
import { api, useMatches, useStandings, useScorers, selectTeamMatches } from '../api/liga';
import { useQuery } from '../api/store';
import { useTeamProfile, useRoster, normalizeTeamProfile, GROUP_LABEL, GROUP_ORDER } from '../api/profiles';
import { useNews } from '../api/news';
import { formatDay } from '../api/clock';
import { useFollowTeam } from '../features/teams/useFollowTeam';
import { clubHero, clubNickname } from '../features/teams/clubMedia';
import FixtureList from '../features/matches/FixtureList';
import NewsRail from '../features/news/NewsRail';
import FooterTabs from '../../components/FooterTabs';
import AdFooter from '../../ads/AdFooter';

const TABS = [
  { key: 'summary', label: 'Resumen' },
  { key: 'matches', label: 'Partidos' },
  { key: 'squad', label: 'Plantel' },
  { key: 'news', label: 'Noticias' },
];

const fmtCount = (n) => (n == null ? '' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)} mil` : String(n));

function StatBox({ value, label, tone }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Txt variant="h2" tone={tone} style={{ fontSize: 22, lineHeight: 26, fontVariant: ['tabular-nums'] }}>
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

const SquadPlayer = ({ p, colors, onPress, last }) => {
  const [failed, setFailed] = React.useState(false);
  return (
    <PressableScale onPress={() => onPress(p)} scaleTo={0.99}>
      <View style={[styles.listRow, { borderBottomColor: colors.divider }, last ? { borderBottomWidth: 0 } : null]}>
        {p.photo && !failed ? (
          <Image source={{ uri: p.photo }} onError={() => setFailed(true)} style={[styles.squadPhoto, { backgroundColor: colors.surfaceHigh }]} />
        ) : (
          <View style={[styles.squadPhoto, { backgroundColor: colors.surfaceHigh }]} />
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
            {p.goals} goles
          </Txt>
        ) : null}
        <Txt variant="h3" tone="muted" style={{ width: 34, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
          {p.number ?? ''}
        </Txt>
      </View>
    </PressableScale>
  );
};

const NewsRow = ({ post, onPress, colors, last }) => (
  <PressableScale onPress={() => onPress(post)} scaleTo={0.99}>
    <View style={[styles.listRow, { borderBottomColor: colors.divider, alignItems: 'flex-start' }, last ? { borderBottomWidth: 0 } : null]}>
      {post.image ? <Image source={{ uri: post.image }} style={[styles.newsImg, { backgroundColor: colors.surfaceHigh }]} /> : null}
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="bodyStrong" numberOfLines={3} style={{ fontSize: 13.5, lineHeight: 18 }}>
          {post.title}
        </Txt>
        {post.date ? (
          <Txt variant="caption" tone="muted">
            {formatDay(post.date)}
          </Txt>
        ) : null}
      </View>
    </View>
  </PressableScale>
);

/**
 * Vista reutilizable del club.
 * isMyClub: se muestra como pestaña "Mi club" (sin flecha atrás, con "Cambiar club" y barra inferior).
 */
export function TeamProfileView({ navigation, teamId, passed = {}, isMyClub = false, onChangeClub }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('summary');

  const dir = useQuery('teams-raw', api.teams, { staleTime: 6 * 3600 * 1000 });
  const dirTeam = useMemo(() => (dir.data?.teams || []).find((t) => Number(t.id) === teamId) || {}, [dir.data, teamId]);
  const profileQ = useTeamProfile(teamId);
  const team = useMemo(() => normalizeTeamProfile(profileQ.data, { ...passed, ...dirTeam, id: teamId }), [profileQ.data, passed, dirTeam, teamId]);

  const matchesQ = useMatches();
  const standings = useStandings();
  const scorers = useScorers();
  const roster = useRoster(teamId);
  const follow = useFollowTeam(teamId);
  const news = useNews(team.name || '', 8);

  const hero = clubHero(team);
  const nickname = team.nickname || clubNickname(team);

  const teamMatches = useMemo(() => selectTeamMatches(matchesQ.matches, teamId), [matchesQ.matches, teamId]);
  const upcoming = useMemo(() => teamMatches.filter((m) => m.isScheduled || m.isLive), [teamMatches]);
  const results = useMemo(() => teamMatches.filter((m) => m.isFinished).reverse(), [teamMatches]);
  const next = teamMatches.find((m) => m.isLive) || upcoming[0] || null;
  const last = results[0] || null;

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
  const openPlayer = useCallback((p) => navigation.navigate('Player', { playerId: p.id, player: { ...p, team }, teamId, scope: 'guatemala' }), [navigation, teamId, team]);
  const openNews = useCallback((post) => navigation.navigate('New', { notice: post.raw }), [navigation]);

  const onRefresh = useCallback(() => {
    profileQ.refresh();
    matchesQ.refresh();
    standings.refresh();
    roster.refresh();
    news.refresh();
  }, [profileQ, matchesQ, standings, roster, news]);

  const onShare = useCallback(() => {
    Share.share({ message: `${team.name}${row ? ` · ${row.position}° con ${row.points} pts` : ''}\nApp oficial de la Liga Nacional GT` }).catch(() => {});
  }, [team.name, row]);

  const HEADER_H = insets.top + 360;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + (isMyClub ? 110 : 40) }}
        refreshControl={<RefreshControl refreshing={profileQ.refreshing || matchesQ.refreshing} onRefresh={onRefresh} tintColor="#fff" progressViewOffset={insets.top + 40} />}
      >
        {/* Portada: foto del club a todo lo ancho, bajo la barra de estado */}
        <StadiumBackdrop source={hero || undefined} mode={hero ? 'photo' : 'duotone'} height={HEADER_H}>
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: space[5], paddingBottom: 44 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={styles.crestBox}>
                <TeamCrest team={team} size={56} />
              </View>
              <View style={{ flex: 1 }}>
                {isMyClub ? (
                  <Txt variant="overline" color="rgba(255,255,255,0.75)">
                    Mi club
                  </Txt>
                ) : null}
                <Txt variant="h1" color="#fff" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                  {team.name || 'Equipo'}
                </Txt>
                <Txt variant="caption" color="rgba(255,255,255,0.8)" numberOfLines={1}>
                  {[nickname, team.city].filter(Boolean).join(' · ')}
                </Txt>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <PressableScale
                onPress={follow.toggle}
                disabled={follow.busy}
                style={[styles.btn, follow.following ? styles.btnGhost : { backgroundColor: '#fff' }]}
              >
                {follow.following ? <Check size={16} color="#fff" weight="bold" /> : <Plus size={16} color={colors.primaryStrong} weight="bold" />}
                <Txt variant="bodyStrong" color={follow.following ? '#fff' : '#0A1440'} style={{ fontFamily: 'Inter-Bold' }}>
                  {follow.following ? 'Siguiendo' : 'Seguir'}
                </Txt>
              </PressableScale>
              {isMyClub ? (
                <PressableScale onPress={onChangeClub} style={[styles.btn, styles.btnGhost]}>
                  <ArrowsLeftRight size={16} color="#fff" weight="bold" />
                  <Txt variant="bodyStrong" color="#fff" style={{ fontFamily: 'Inter-Bold' }}>
                    Cambiar club
                  </Txt>
                </PressableScale>
              ) : null}
              {follow.count != null ? (
                <View style={styles.followers}>
                  <UsersThree size={15} color="rgba(255,255,255,0.8)" />
                  <Txt variant="caption" color="rgba(255,255,255,0.85)" style={{ fontFamily: 'Inter-SemiBold' }}>
                    {fmtCount(follow.count)}
                  </Txt>
                </View>
              ) : null}
            </View>
          </View>
        </StadiumBackdrop>

        {/* Hoja con pestañas (se queda arriba al hacer scroll) */}
        <View style={{ backgroundColor: colors.bg, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 6 }}>
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
        </View>

        <View style={{ paddingTop: space[5], gap: space[6] }}>
          {tab === 'summary' ? (
            <>
              {matchesQ.loading ? (
                <SkeletonCard height={120} style={{ marginHorizontal: 16 }} />
              ) : next ? (
                <View>
                  <SectionHeader title={next.isLive ? 'En vivo' : 'Próximo partido'} />
                  <FixtureList matches={[next]} onOpen={openMatch} style={{ marginHorizontal: 16 }} />
                </View>
              ) : null}

              {last ? (
                <View>
                  <SectionHeader title="Último resultado" onAction={() => setTab('matches')} actionLabel="Ver partidos" />
                  <FixtureList matches={[last]} onOpen={openMatch} style={{ marginHorizontal: 16 }} />
                </View>
              ) : null}

              {row ? (
                <View>
                  <SectionHeader title={`${row.position}° en la tabla`} onAction={() => navigation.navigate('Positions')} actionLabel="Ver tabla" />
                  <Surface style={{ marginHorizontal: 16, gap: 16 }}>
                    <View style={{ flexDirection: 'row' }}>
                      <StatBox value={row.points} label="Puntos" tone="brand" />
                      <StatBox value={row.played} label="Jugados" />
                      <StatBox value={row.gf} label="A favor" tone="success" />
                      <StatBox value={row.ga} label="En contra" tone="danger" />
                    </View>
                    <View style={{ flexDirection: 'row', height: 6, gap: 3 }}>
                      <View style={{ flex: row.won || 0.001, backgroundColor: colors.formW, transform: [{ skewX: '-20deg' }] }} />
                      <View style={{ flex: row.drawn || 0.001, backgroundColor: colors.formD, transform: [{ skewX: '-20deg' }] }} />
                      <View style={{ flex: row.lost || 0.001, backgroundColor: colors.formL, transform: [{ skewX: '-20deg' }] }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Txt variant="caption" tone="secondary">
                        {row.won} ganados · {row.drawn} empates · {row.lost} perdidos
                      </Txt>
                      <FormStrip sequence={form} size={13} />
                    </View>
                  </Surface>
                </View>
              ) : null}

              {teamScorers.length ? (
                <View>
                  <SectionHeader title="Goleadores del club" />
                  <Surface padded={false} style={{ marginHorizontal: 16 }}>
                    {teamScorers.map((s, i) => (
                      <PressableScale key={s.player.id} onPress={() => openPlayer(s.player)} scaleTo={0.99}>
                        <View style={[styles.listRow, { borderBottomColor: colors.divider }, i === teamScorers.length - 1 ? { borderBottomWidth: 0 } : null]}>
                          <Txt variant="number" tone="muted" style={{ width: 22 }}>
                            {i + 1}
                          </Txt>
                          <Txt variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                            {s.player.name}
                          </Txt>
                          <Txt variant="points" style={{ fontSize: 17 }}>
                            {s.goals}
                          </Txt>
                        </View>
                      </PressableScale>
                    ))}
                  </Surface>
                </View>
              ) : null}

              {news.posts.length || news.loading ? (
                <View>
                  <SectionHeader title="Noticias del club" onAction={() => setTab('news')} actionLabel="Ver todas" />
                  <NewsRail posts={news.posts.slice(0, 5)} loading={news.loading} onOpen={openNews} />
                </View>
              ) : null}

              <View>
                <SectionHeader title="El club" />
                <Surface padded={false} style={{ marginHorizontal: 16 }}>
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
                  <FixtureList matches={upcoming} onOpen={openMatch} style={{ marginHorizontal: 16 }} />
                </View>
              ) : null}
              {results.length ? (
                <View>
                  <SectionHeader title="Resultados" />
                  <FixtureList matches={results} onOpen={openMatch} style={{ marginHorizontal: 16 }} />
                </View>
              ) : null}
              {!upcoming.length && !results.length && !matchesQ.loading ? <EmptyState title="Sin partidos" /> : null}
            </>
          ) : null}

          {tab === 'squad' ? (
            roster.loading ? (
              <SkeletonCard height={400} style={{ marginHorizontal: 16 }} />
            ) : roster.list.length ? (
              GROUP_ORDER.filter((g) => roster.groups[g]?.length).map((g) => (
                <View key={g}>
                  <SectionHeader title={GROUP_LABEL[g]} right={<Txt variant="caption" tone="muted">{roster.groups[g].length}</Txt>} />
                  <Surface padded={false} style={{ marginHorizontal: 16 }}>
                    {roster.groups[g].map((p, i) => (
                      <SquadPlayer key={p.id} p={p} colors={colors} onPress={openPlayer} last={i === roster.groups[g].length - 1} />
                    ))}
                  </Surface>
                </View>
              ))
            ) : (
              <EmptyState title="Plantel no disponible" message="Pronto verás aquí a todos los jugadores del club." />
            )
          ) : null}

          {tab === 'news' ? (
            news.loading ? (
              <SkeletonCard height={300} style={{ marginHorizontal: 16 }} />
            ) : news.posts.length ? (
              <Surface padded={false} style={{ marginHorizontal: 16 }}>
                {news.posts.map((p, i) => (
                  <NewsRow key={p.id} post={p} onPress={openNews} colors={colors} last={i === news.posts.length - 1} />
                ))}
              </Surface>
            ) : (
              <EmptyState title="Sin noticias" message="No encontramos noticias recientes de este club." />
            )
          ) : null}

          <View style={{ alignItems: 'center' }}>
            <AdFooter />
          </View>
        </View>
      </ScrollView>

      {/* Barra superior flotante */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        {!isMyClub ? (
          <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver" style={styles.roundBtn}>
            <CaretLeft size={20} color="#fff" weight="bold" />
          </PressableScale>
        ) : null}
        <View style={{ flex: 1 }} />
        <PressableScale onPress={onShare} hitSlop={hitSlop} accessibilityLabel="Compartir" style={styles.roundBtn}>
          <ShareNetwork size={19} color="#fff" weight="bold" />
        </PressableScale>
      </View>

      {isMyClub ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom, backgroundColor: colors.bgElevated }}>
          <FooterTabs navigation={navigation} routeName="MyTeam" />
        </View>
      ) : null}
    </View>
  );
}

export default function TeamProfileScreen({ navigation, route }) {
  const teamId = Number(route?.params?.teamId) || null;
  return <TeamProfileView navigation={navigation} teamId={teamId} passed={route?.params?.team || {}} />;
}

const styles = StyleSheet.create({
  crestBox: { width: 80, height: 80, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 42, paddingHorizontal: 18, borderRadius: 10 },
  btnGhost: { backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  followers: { flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 'auto' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  squadPhoto: { width: 40, height: 40, borderRadius: 20 },
  newsImg: { width: 92, height: 64, borderRadius: 10 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 12 },
  roundBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(6,10,23,0.35)', alignItems: 'center', justifyContent: 'center' },
});
