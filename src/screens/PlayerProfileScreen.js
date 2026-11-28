// src/screens/PlayerProfileScreen.js
// Perfil de jugador v3 · Liga Nacional GT
import React, { useCallback, useMemo } from 'react';
import { Image, RefreshControl, ScrollView, Share, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, ShareNetwork, Crown } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { StadiumBackdrop, ContentSheet, Txt, Surface, PressableScale, TeamCrest, SectionHeader, SkeletonCard, Pill } from '../ui';
import { usePlayer, normalizePlayerProfile, positionGroup, GROUP_LABEL } from '../api/profiles';
import { useScorers } from '../api/liga';
import { clubHero } from '../features/teams/clubMedia';
import MatchRow from '../features/matches/MatchRow';
import AdFooter from '../../ads/AdFooter';

const POSITION_NAME = { gk: 'Portero', df: 'Defensa', mf: 'Mediocampista', fw: 'Delantero' };

function ageFrom(birth) {
  if (!birth) return null;
  const d = new Date(birth);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a -= 1;
  return a;
}

const Stat = ({ value, label, highlight, colors }) => (
  <View style={[styles.stat, { backgroundColor: highlight ? colors.primarySoft : colors.surfaceAlt, borderColor: colors.border }]}>
    <Txt variant="h1" tone={highlight ? 'brand' : 'primary'} style={{ fontVariant: ['tabular-nums'] }}>
      {value}
    </Txt>
    <Txt variant="caption" tone="muted" numberOfLines={1}>
      {label}
    </Txt>
  </View>
);

export default function PlayerProfileScreen({ navigation, route }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  const playerId = route?.params?.playerId;
  const passed = route?.params?.player || {};

  const q = usePlayer(playerId);
  const scorers = useScorers();
  const p = useMemo(() => normalizePlayerProfile(q.data, { ...passed, id: playerId }), [q.data, passed, playerId]);

  const scorerRow = scorers.rows.find((s) => String(s.player.id) === String(playerId));
  const team = p.team || scorerRow?.team || null;
  const [photoFailed, setPhotoFailed] = React.useState(false);

  const goals = p.stats.goals ?? scorerRow?.goals ?? null;
  const age = p.age ?? ageFrom(p.birthDate);
  const group = p.group !== 'other' ? p.group : positionGroup(p.position);

  const stats = [
    ['Partidos', p.stats.appearances],
    ['Titular', p.stats.starts],
    ['Minutos', p.stats.minutes],
    ['Goles', goals, true],
    ['Asistencias', p.stats.assists],
    ['Amarillas', p.stats.yellow],
    ['Rojas', p.stats.red],
  ].filter(([, v]) => v !== null && v !== undefined);

  const info = [
    ['Posición', POSITION_NAME[group] || p.position],
    ['Dorsal', p.number],
    ['Edad', age ? `${age} años` : null],
    ['Nacionalidad', p.nationality],
    ['Altura', p.height ? `${p.height}${String(p.height).includes('m') ? '' : ' cm'}` : null],
    ['Pie hábil', p.foot],
  ].filter(([, v]) => v);

  const onShare = useCallback(() => {
    Share.share({ message: `${p.name}${team ? ` · ${team.name}` : ''}${goals ? ` · ${goals} goles` : ''}\nApp oficial de la Liga Nacional GT` }).catch(() => {});
  }, [p.name, team, goals]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={q.refreshing} onRefresh={q.refresh} tintColor="#fff" />}
      >
        <StadiumBackdrop source={clubHero(team) || undefined} mode={clubHero(team) ? 'photo' : 'duotone'} height={insets.top + 450}>
          <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: space[5], paddingBottom: 100 }}>
          {p.number != null ? (
            <Txt variant="display" color="rgba(255,255,255,0.08)" style={styles.watermark}>
              {p.number}
            </Txt>
          ) : null}
          <View style={{ alignItems: 'center', gap: 10 }}>
            <View style={styles.photoRing}>
              {p.photo && !photoFailed ? (
                <Image source={{ uri: p.photo }} onError={() => setPhotoFailed(true)} style={styles.photo} />
              ) : (
                <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                  {team ? <TeamCrest team={team} size={56} /> : null}
                </View>
              )}
            </View>
            <Txt variant="h1" color="#fff" align="center" numberOfLines={2}>
              {p.name || 'Jugador'}
            </Txt>
            {team ? (
              <PressableScale onPress={() => navigation.navigate('TeamScreen', { teamId: team.id, team, scope: 'guatemala' })} style={styles.teamChip}>
                <TeamCrest team={team} size={18} />
                <Txt variant="bodyStrong" color="#fff">
                  {team.name}
                </Txt>
              </PressableScale>
            ) : null}
            {scorerRow ? <Pill tone="gold" label={`#${scorerRow.position} en la tabla de goleo`} icon={scorerRow.position === 1 ? <Crown size={13} color={colors.gold} weight="fill" /> : null} /> : null}
          </View>
          </View>
        </StadiumBackdrop>

        <ContentSheet style={{ gap: space[6] }}>

        {q.loading && !p.name ? (
          <SkeletonCard height={160} style={{ marginHorizontal: space[5] }} />
        ) : stats.length ? (
          <View>
            <SectionHeader eyebrow="Apertura" title="Estadísticas" />
            <View style={styles.statsGrid}>
              {stats.map(([l, v, h]) => (
                <Stat key={l} label={l} value={v} highlight={h} colors={colors} />
              ))}
            </View>
          </View>
        ) : null}

        {info.length ? (
          <View>
            <SectionHeader title="Ficha" />
            <Surface padded={false} style={{ marginHorizontal: space[5] }}>
              {info.map(([l, v], i) => (
                <View key={l} style={[styles.infoRow, { borderBottomColor: colors.divider }, i === info.length - 1 ? { borderBottomWidth: 0 } : null]}>
                  <Txt variant="body" tone="secondary">
                    {l}
                  </Txt>
                  <Txt variant="bodyStrong">{String(v)}</Txt>
                </View>
              ))}
            </Surface>
          </View>
        ) : null}

        {p.matches.length ? (
          <View>
            <SectionHeader title="Últimos partidos" />
            <Surface padded={false} style={{ marginHorizontal: space[5] }}>
              {p.matches.map((m, i) => (
                <MatchRow key={m.id || i} match={m} last={i === p.matches.length - 1} onPress={() => m.id && navigation.navigate('Match', { matchId: Number(m.id), slug: m.slug, routeKey: `m-${m.id}` })} />
              ))}
            </Surface>
          </View>
        ) : null}

        <View style={{ alignItems: 'center' }}>
          <AdFooter />
        </View>
        </ContentSheet>
      </ScrollView>

      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver" style={styles.roundBtn}>
          <CaretLeft size={20} color="#fff" weight="bold" />
        </PressableScale>
        <View style={{ flex: 1 }} />
        <PressableScale onPress={onShare} hitSlop={hitSlop} accessibilityLabel="Compartir" style={styles.roundBtn}>
          <ShareNetwork size={19} color="#fff" weight="bold" />
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  watermark: { position: 'absolute', right: -10, bottom: 20, fontSize: 170, lineHeight: 180 },
  photoRing: { padding: 4, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.18)' },
  photo: { width: 120, height: 120, borderRadius: 60 },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.22)' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20 },
  stat: { width: '31.5%', flexGrow: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1, gap: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6 },
  roundBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(6,10,23,0.35)', alignItems: 'center', justifyContent: 'center' },
});
