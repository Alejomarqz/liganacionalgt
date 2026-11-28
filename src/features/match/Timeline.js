// src/features/match/Timeline.js
// Eventos del partido en filas: local a la izquierda, visitante a la derecha,
// minuto e ícono al centro. Lo más reciente arriba. Separador de descanso.
import React, { memo, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useDesign } from '../../design/useDesign';
import { Txt, Surface, EmptyState } from '../../ui';
import EventIcon from './EventIcon';
import { minuteText } from '../../api/matchCenter';

const KIND_LABEL = {
  goal: 'Gol',
  penalty_goal: 'Gol de penal',
  own_goal: 'Autogol',
  penalty_miss: 'Penal fallado',
  yellow: 'Amarilla',
  red: 'Roja',
  second_yellow: 'Doble amarilla',
  sub: 'Cambio',
  var: 'VAR',
};
const GOALS = new Set(['goal', 'penalty_goal', 'own_goal']);

const Band = ({ label, colors }) => (
  <View style={[styles.band, { backgroundColor: colors.band, borderBottomColor: colors.divider }]}>
    <Txt variant="overline" tone="secondary" style={{ fontSize: 9.5 }}>
      {label}
    </Txt>
  </View>
);

function EventRow({ e, index, colors }) {
  const home = e.side === 'home';
  const goal = GOALS.has(e.kind);
  const name = e.kind === 'sub' ? e.relatedName || e.playerName : e.playerName || e.teamName;
  const sub = e.kind === 'sub' ? `Sale ${e.playerName}` : e.kind === 'penalty_goal' ? 'Penal' : e.kind === 'own_goal' ? 'Autogol' : null;
  const text = (
    <View style={{ alignItems: home ? 'flex-end' : 'flex-start' }}>
      <Txt variant="bodyStrong" numberOfLines={1} align={home ? 'right' : 'left'} style={{ fontFamily: goal ? 'Inter-Bold' : 'Inter-Medium', fontSize: 13.5 }}>
        {name}
      </Txt>
      {sub ? (
        <Txt variant="caption" tone="muted" numberOfLines={1}>
          {sub}
        </Txt>
      ) : null}
    </View>
  );
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 10) * 35).duration(280)}
      accessibilityLabel={`${minuteText(e)} ${KIND_LABEL[e.kind] || ''} ${name}`}
      style={[styles.row, { borderBottomColor: colors.divider }]}
    >
      <View style={styles.half}>{home ? text : null}</View>
      <View style={styles.mid}>
        <Txt variant="number" color={goal ? colors.text : colors.textSecondary} style={{ fontFamily: 'InterDisplay-Bold' }}>
          {minuteText(e)}
        </Txt>
        <EventIcon kind={e.kind} size={15} />
      </View>
      <View style={styles.half}>{!home ? text : null}</View>
    </Animated.View>
  );
}

function Timeline({ model }) {
  const { colors } = useDesign();
  const { events, match } = model;

  const items = useMemo(() => {
    const out = [];
    let h = 0;
    let a = 0;
    let last = null;
    for (const e of events) {
      if (last === 'first_half' && e.period === 'second_half') out.push({ band: true, key: 'ht', label: `Descanso · ${h} – ${a}` });
      last = e.period || last;
      if (GOALS.has(e.kind)) {
        if (e.scoringSide === 'home') h += 1;
        else a += 1;
      }
      out.push(e);
    }
    return out.reverse();
  }, [events]);

  if (!events.length) {
    return (
      <Surface style={{ marginHorizontal: 16 }}>
        <EmptyState
          title={match.isScheduled ? 'Aún no empieza' : 'Sin eventos'}
          message={match.isScheduled ? 'Aquí verás goles, tarjetas y cambios minuto a minuto.' : 'No hay eventos registrados para este partido.'}
        />
      </Surface>
    );
  }

  return (
    <Surface padded={false} style={{ marginHorizontal: 16 }}>
      {match.isFinished ? <Band label={`Final · ${match.score.home} – ${match.score.away}`} colors={colors} /> : null}
      {items.map((it, i) => (it.band ? <Band key={it.key} label={it.label} colors={colors} /> : <EventRow key={it.id} e={it} index={i} colors={colors} />))}
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  half: { flex: 1 },
  mid: { width: 70, alignItems: 'center', gap: 4 },
  band: { alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
});

export default memo(Timeline);
