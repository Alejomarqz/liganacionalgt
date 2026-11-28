// src/features/standings/StandingsTable.js
// Tabla oficial: zona inclinada, #, equipo, PJ, DG, forma (3 últimos), PTS.
// Sirve completa (pantalla Tabla) o recortada (Inicio / Equipo).
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useDesign } from '../../design/useDesign';
import { CHIP_SKEW } from '../../design/tokens';
import { Txt, TeamCrest, Surface, PressableScale, Skeleton, FormStrip } from '../../ui';

export const QUALIFY_SPOTS = 8;

/** Racha a partir de los partidos terminados (W/D/L, más reciente al final). */
export function computeForms(matches) {
  const byTeam = {};
  const done = matches.filter((m) => m.isFinished).sort((a, b) => (a.kickoff?.getTime() || 0) - (b.kickoff?.getTime() || 0));
  for (const m of done) {
    const h = m.score.home ?? 0;
    const a = m.score.away ?? 0;
    const hr = h > a ? 'W' : h < a ? 'L' : 'D';
    const ar = h > a ? 'L' : h < a ? 'W' : 'D';
    (byTeam[m.home?.id] = byTeam[m.home?.id] || []).push(hr);
    (byTeam[m.away?.id] = byTeam[m.away?.id] || []).push(ar);
  }
  const out = {};
  for (const [k, v] of Object.entries(byTeam)) out[k] = v.slice(-5).join('');
  return out;
}

function StandingsTable({ rows, loading, limit, forms = {}, highlightIds = [], relegationIds = [], onPressTeam, onPressAll, showLegend, style }) {
  const { colors, space } = useDesign();
  const data = limit ? rows.slice(0, limit) : rows;
  const lastPos = rows.length;

  if (loading) {
    return (
      <Surface style={[{ marginHorizontal: 12, gap: 16 }, style]}>
        {Array.from({ length: limit || 8 }).map((_, i) => (
          <Skeleton key={i} height={18} />
        ))}
      </Surface>
    );
  }

  const zoneColor = (r) => {
    if (relegationIds.includes(r.team.id) || (!relegationIds.length && r.position === lastPos && lastPos > QUALIFY_SPOTS)) return colors.zoneRelegation;
    if (r.position <= QUALIFY_SPOTS) return colors.zoneQualify;
    return 'transparent';
  };

  return (
    <View style={style}>
      <Surface padded={false} style={{ marginHorizontal: 12 }}>
        <View style={[styles.row, styles.head, { borderBottomColor: colors.divider, backgroundColor: colors.band }]}>
          <View style={{ width: 14 }} />
          <Txt variant="overline" tone="muted" style={styles.pos}>#</Txt>
          <Txt variant="overline" tone="muted" style={{ flex: 1 }}>Equipo</Txt>
          <Txt variant="overline" tone="muted" style={styles.pj}>PJ</Txt>
          <Txt variant="overline" tone="muted" style={styles.dg}>DG</Txt>
          <Txt variant="overline" tone="muted" style={[styles.form, { letterSpacing: 0.4 }]} numberOfLines={1} adjustsFontSizeToFit>Forma</Txt>
          <Txt variant="overline" tone="muted" style={styles.pts}>PTS</Txt>
        </View>
        {data.map((r, i) => {
          const mine = highlightIds.includes(r.team.id);
          return (
            <PressableScale key={r.team.id ?? i} onPress={() => onPressTeam?.(r.team)} scaleTo={0.99}>
              <View style={[styles.row, { borderBottomColor: colors.divider }, i === data.length - 1 && !onPressAll ? { borderBottomWidth: 0 } : null, mine ? { backgroundColor: colors.primarySoft } : null]}>
                <View style={[styles.zone, { backgroundColor: zoneColor(r) }]} />
                <Txt variant="number" tone="secondary" style={[styles.pos, { fontFamily: 'Inter-Bold' }]}>
                  {r.position}
                </Txt>
                <TeamCrest team={r.team} size={24} />
                <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1, marginLeft: 10, fontSize: 13.5 }}>
                  {r.team.name}
                </Txt>
                <Txt variant="number" tone="secondary" style={[styles.pj, { fontFamily: 'Inter-Medium' }]}>
                  {r.played}
                </Txt>
                <Txt variant="number" color={r.gd > 0 ? colors.success : r.gd < 0 ? colors.danger : colors.textSecondary} style={styles.dg}>
                  {r.gd > 0 ? `+${r.gd}` : r.gd}
                </Txt>
                <View style={[styles.form, { alignItems: 'center' }]}>
                  <FormStrip sequence={forms[r.team.id]} last={3} size={12} />
                </View>
                <Txt variant="points" style={styles.pts}>
                  {r.points}
                </Txt>
              </View>
            </PressableScale>
          );
        })}
        {onPressAll ? (
          <PressableScale onPress={onPressAll} style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Txt variant="caption" tone="brand" style={{ fontFamily: 'Inter-SemiBold' }}>
              Ver tabla completa
            </Txt>
          </PressableScale>
        ) : null}
      </Surface>
      {showLegend ? (
        <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: space[5], paddingTop: 12 }}>
          {[
            [colors.zoneQualify, 'Clasifica a cuartos'],
            [colors.zoneRelegation, 'Zona de descenso'],
          ].map(([c, l]) => (
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 4, height: 12, backgroundColor: c, transform: [{ skewX: CHIP_SKEW }] }} />
              <Txt variant="caption" tone="secondary" style={{ fontSize: 11 }}>
                {l}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 46, paddingRight: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  head: { height: 34 },
  zone: { width: 4, height: 22, marginRight: 10, transform: [{ skewX: CHIP_SKEW }] },
  pos: { width: 22 },
  pj: { width: 28, textAlign: 'center' },
  dg: { width: 34, textAlign: 'center' },
  form: { width: 50, textAlign: 'center' },
  pts: { width: 34, textAlign: 'right' },
});

export default memo(StandingsTable);
