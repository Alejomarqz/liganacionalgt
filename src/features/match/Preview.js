// src/features/match/Preview.js
// Contexto del partido: forma reciente, rachas, H2H, goleadores y tabla en vivo.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, Surface, TeamCrest, FormStrip, SectionHeader, PressableScale } from '../../ui';
import { formatKickoff } from '../../api/clock';

const FormCard = ({ team, form, position, colors }) => (
  <View style={{ flex: 1, gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <TeamCrest team={team} size={24} />
      <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
        {team?.short || team?.name}
      </Txt>
    </View>
    <FormStrip sequence={form?.sequence} size={20} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Txt variant="caption" tone="muted">
        Pts últimos {form?.sample ?? 5}
      </Txt>
      <Txt variant="caption" style={{ fontFamily: 'Poppins-Bold' }}>
        {form?.points ?? '–'}
      </Txt>
    </View>
    {position ? (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Txt variant="caption" tone="muted">
          Posición
        </Txt>
        <Txt variant="caption" style={{ fontFamily: 'Poppins-Bold' }}>
          {position.projected ?? position.official}°
          {position.change ? (
            <Txt variant="caption" color={position.change > 0 ? colors.success : colors.danger}>
              {' '}
              {position.change > 0 ? '▲' : '▼'}
              {Math.abs(position.change)}
            </Txt>
          ) : null}
        </Txt>
      </View>
    ) : null}
  </View>
);

function H2HBar({ h2h, match, colors }) {
  const aIsHome = h2h.teamA?.id === match.home?.id;
  const homeW = aIsHome ? h2h.teamA?.wins : h2h.teamB?.wins;
  const awayW = aIsHome ? h2h.teamB?.wins : h2h.teamA?.wins;
  const d = h2h.draws || 0;
  const total = (homeW || 0) + (awayW || 0) + d || 1;
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {[
          [homeW, 'Victorias', colors.primary],
          [d, 'Empates', colors.textMuted],
          [awayW, 'Victorias', colors.live],
        ].map(([v, l, c], i) => (
          <View key={i} style={{ alignItems: 'center', flex: 1 }}>
            <Txt variant="h1" color={c}>
              {v ?? 0}
            </Txt>
            <Txt variant="caption" tone="muted">
              {l}
            </Txt>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
        <View style={{ flex: (homeW || 0) / total || 0.001, backgroundColor: colors.primary }} />
        <View style={{ flex: d / total || 0.001, backgroundColor: colors.textMuted }} />
        <View style={{ flex: (awayW || 0) / total || 0.001, backgroundColor: colors.live }} />
      </View>
      <Txt variant="caption" tone="muted" align="center">
        {h2h.matchesPlayed || 0} partidos entre ambos
      </Txt>
    </View>
  );
}

function Preview({ model, onMatch, onTeam }) {
  const { colors, space } = useDesign();
  const { context, match } = model;
  const form = context.form || {};
  const pos = context.positions || {};

  return (
    <View style={{ gap: space[6] }}>
      {form.home || form.away ? (
        <View>
          <SectionHeader title="Forma reciente" style={{ paddingHorizontal: space[4] }} />
          <Surface style={{ marginHorizontal: space[4], flexDirection: 'row', gap: 16 }}>
            <FormCard team={match.home} form={form.home} position={pos.home} colors={colors} />
            <View style={{ width: 1, backgroundColor: colors.divider }} />
            <FormCard team={match.away} form={form.away} position={pos.away} colors={colors} />
          </Surface>
        </View>
      ) : null}

      {context.h2h?.matchesPlayed ? (
        <View>
          <SectionHeader title="Cara a cara" style={{ paddingHorizontal: space[4] }} />
          <Surface style={{ marginHorizontal: space[4], gap: 16 }}>
            <H2HBar h2h={context.h2h} match={match} colors={colors} />
            {context.h2h.matches.slice(0, 5).map((m) => (
              <PressableScale key={m.id} onPress={() => onMatch?.(m)} style={[styles.h2hRow, { borderTopColor: colors.divider }]}>
                <Txt variant="caption" tone="muted" style={{ width: 86 }} numberOfLines={1}>
                  {m.kickoff ? formatKickoff(m.kickoff).split(' · ')[0] : ''}
                </Txt>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                  <Txt variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {m.home?.short}
                  </Txt>
                  <TeamCrest team={m.home} size={18} />
                </View>
                <Txt variant="number" style={{ width: 52, textAlign: 'center', fontFamily: 'Poppins-ExtraBold' }}>
                  {m.score.home ?? '-'}–{m.score.away ?? '-'}
                </Txt>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TeamCrest team={m.away} size={18} />
                  <Txt variant="caption" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {m.away?.short}
                  </Txt>
                </View>
              </PressableScale>
            ))}
          </Surface>
        </View>
      ) : null}

      {context.topScorers ? (
        <View>
          <SectionHeader title="Goleadores de cada equipo" style={{ paddingHorizontal: space[4] }} />
          <Surface style={{ marginHorizontal: space[4], flexDirection: 'row', gap: 16 }}>
            {['home', 'away'].map((k) => (
              <View key={k} style={{ flex: 1, gap: 10 }}>
                <TeamCrest team={match[k]} size={22} />
                {(context.topScorers[k] || []).map((s) => (
                  <View key={s.player?.id} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
                    <Txt variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                      {s.player?.name}
                    </Txt>
                    <Txt variant="caption" style={{ fontFamily: 'Poppins-Bold' }}>
                      {s.goals}
                    </Txt>
                  </View>
                ))}
              </View>
            ))}
          </Surface>
        </View>
      ) : null}

      {context.liveStandings?.length ? (
        <View>
          <SectionHeader title="Tabla" style={{ paddingHorizontal: space[4] }} />
          <Surface padded={false} style={{ marginHorizontal: space[4] }}>
            {context.liveStandings.map((r, i) => {
              const mine = r.team.id === match.home?.id || r.team.id === match.away?.id;
              return (
                <PressableScale key={r.team.id} onPress={() => onTeam?.(r.team)} scaleTo={0.99}>
                  <View style={[styles.tableRow, { borderBottomColor: colors.divider }, mine ? { backgroundColor: colors.primarySoft } : null, i === context.liveStandings.length - 1 ? { borderBottomWidth: 0 } : null]}>
                    <Txt variant="number" tone="secondary" style={{ width: 24 }}>
                      {r.position}
                    </Txt>
                    <TeamCrest team={r.team} size={20} />
                    <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1, marginLeft: 10 }}>
                      {r.team.name}
                    </Txt>
                    <Txt variant="number" tone="secondary" style={{ width: 34, textAlign: 'center' }}>
                      {r.played}
                    </Txt>
                    <Txt variant="number" style={{ width: 36, textAlign: 'center', fontFamily: 'Poppins-ExtraBold' }}>
                      {r.points}
                    </Txt>
                  </View>
                </PressableScale>
              );
            })}
          </Surface>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  h2hRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});

export default memo(Preview);
