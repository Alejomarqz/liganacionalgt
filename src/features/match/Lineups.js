// src/features/match/Lineups.js
import React, { memo, useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, Surface, TeamCrest, Pill, EmptyState } from '../../ui';
import Pitch from './Pitch';
import EventIcon from './EventIcon';

const SubRow = memo(function SubRow({ p, marks, colors, onPress, last }) {
  const [failed, setFailed] = React.useState(false);
  return (
    <View style={[styles.subRow, { borderBottomColor: colors.divider }, last ? { borderBottomWidth: 0 } : null]}>
      <Txt variant="number" tone="muted" style={{ width: 26 }}>
        {p.number ?? '–'}
      </Txt>
      {p.photo && !failed ? (
        <Image source={{ uri: p.photo }} onError={() => setFailed(true)} style={[styles.subPhoto, { backgroundColor: colors.surfaceHigh }]} />
      ) : (
        <View style={[styles.subPhoto, { backgroundColor: colors.surfaceHigh }]} />
      )}
      <View style={{ flex: 1 }}>
        <Txt variant="bodyStrong" numberOfLines={1} onPress={() => onPress?.(p)}>
          {p.name}
        </Txt>
        {p.position ? (
          <Txt variant="caption" tone="muted">
            {p.position}
          </Txt>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {(marks || []).map((k, i) => (
          <EventIcon key={i} kind={k} size={14} />
        ))}
      </View>
    </View>
  );
});

function Lineups({ model, onPlayer }) {
  const { colors, space } = useDesign();
  const [sideKey, setSideKey] = useState('home');
  const { match, lineups, formations, playerMarks, lineupConfirmed } = model;

  if (!model.hasLineups) {
    return (
      <Surface style={{ marginHorizontal: space[4] }}>
        <EmptyState title="Alineaciones pendientes" message="Las publicamos en cuanto los equipos las confirmen, normalmente 1 hora antes del partido." />
      </Surface>
    );
  }

  const team = match[sideKey];
  const side = lineups[sideKey];
  const teamColor = sideKey === 'home' ? colors.primaryStrong : '#B4203A';

  return (
    <View style={{ gap: space[4] }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: space[4] }}>
        {['home', 'away'].map((k) => (
          <Pill key={k} label={match[k]?.short || match[k]?.name} active={sideKey === k} icon={<TeamCrest team={match[k]} size={16} />} onPress={() => setSideKey(k)} />
        ))}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space[4] }}>
        <Txt variant="h3">{team?.name}</Txt>
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          {formations[sideKey] ? <Pill label={formations[sideKey]} tone="brand" /> : null}
          {lineupConfirmed[sideKey] ? <Pill label="Confirmada" tone="success" /> : <Pill label="Probable" tone="gold" />}
        </View>
      </View>

      <Pitch starters={side.starters} formation={formations[sideKey]} marks={playerMarks} teamColor={teamColor} onPlayer={onPlayer} />

      {side.subs.length ? (
        <View>
          <Txt variant="overline" tone="muted" style={{ paddingHorizontal: space[4], marginBottom: 8 }}>
            Suplentes
          </Txt>
          <Surface padded={false} style={{ marginHorizontal: space[4] }}>
            {side.subs.map((p, i) => (
              <SubRow key={p.id} p={p} marks={playerMarks[p.id]} colors={colors} onPress={onPlayer} last={i === side.subs.length - 1} />
            ))}
          </Surface>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  subPhoto: { width: 32, height: 32, borderRadius: 16 },
});

export default memo(Lineups);
