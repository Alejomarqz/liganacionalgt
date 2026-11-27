// src/features/standings/StandingsPreview.js
// Mini-tabla del Home con zonas de clasificación coloreadas.
import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, TeamCrest, Surface, PressableScale, Skeleton } from '../../ui';

// Liga Nacional: los 8 primeros avanzan a la fase final.
export const QUALIFY_SPOTS = 8;

const Head = ({ colors }) => (
  <View style={[styles.row, styles.head, { borderBottomColor: colors.divider }]}>
    <Txt variant="overline" tone="muted" style={styles.pos}>#</Txt>
    <Txt variant="overline" tone="muted" style={{ flex: 1 }}>Equipo</Txt>
    <Txt variant="overline" tone="muted" style={styles.cell}>PJ</Txt>
    <Txt variant="overline" tone="muted" style={styles.cell}>DG</Txt>
    <Txt variant="overline" tone="muted" style={[styles.cell, styles.pts]}>PTS</Txt>
  </View>
);

function StandingsPreview({ rows, loading, limit = 6, highlightTeamId, onPressTeam, onPressAll }) {
  const { colors, space } = useDesign();

  if (loading) {
    return (
      <Surface style={{ marginHorizontal: space[5], gap: 14 }}>
        {Array.from({ length: limit }).map((_, i) => (
          <Skeleton key={i} height={18} />
        ))}
      </Surface>
    );
  }

  const data = rows.slice(0, limit);

  return (
    <Surface padded={false} style={{ marginHorizontal: space[5] }}>
      <Head colors={colors} />
      {data.map((r, i) => {
        const zone = r.position === 1 ? colors.zoneChampion : r.position <= QUALIFY_SPOTS ? colors.zoneQualify : 'transparent';
        const mine = highlightTeamId && r.team.id === highlightTeamId;
        return (
          <PressableScale key={r.team.id ?? i} onPress={() => onPressTeam?.(r.team)} scaleTo={0.99}>
            <View
              style={[
                styles.row,
                { borderBottomColor: colors.divider },
                i === data.length - 1 ? { borderBottomWidth: 0 } : null,
                mine ? { backgroundColor: colors.primarySoft } : null,
              ]}
            >
              <View style={[styles.zone, { backgroundColor: zone }]} />
              <Txt variant="number" tone="secondary" style={styles.pos}>
                {r.position}
              </Txt>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <TeamCrest team={r.team} size={22} />
                <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {r.team.name}
                </Txt>
              </View>
              <Txt variant="number" tone="secondary" style={styles.cell}>
                {r.played}
              </Txt>
              <Txt variant="number" tone={r.gd > 0 ? 'success' : r.gd < 0 ? 'danger' : 'secondary'} style={styles.cell}>
                {r.gd > 0 ? `+${r.gd}` : r.gd}
              </Txt>
              <Txt variant="number" style={[styles.cell, styles.pts, { fontFamily: 'Poppins-ExtraBold' }]}>
                {r.points}
              </Txt>
            </View>
          </PressableScale>
        );
      })}
      {onPressAll ? (
        <PressableScale onPress={onPressAll} style={[styles.all, { borderTopColor: colors.divider }]}>
          <Txt variant="caption" tone="brand" style={{ fontFamily: 'Poppins-SemiBold' }}>
            Ver tabla completa
          </Txt>
        </PressableScale>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  head: { paddingVertical: 9 },
  zone: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2 },
  pos: { width: 24 },
  cell: { width: 34, textAlign: 'center' },
  pts: { width: 38 },
  all: { alignItems: 'center', paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth },
});

export default memo(StandingsPreview);
