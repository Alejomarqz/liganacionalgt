// src/features/match/Timeline.js
// Línea de tiempo vertical: local a la izquierda, visitante a la derecha.
// Los eventos aparecen con animación escalonada.
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

const Divider = ({ label, score, colors }) => (
  <View style={styles.divider}>
    <View style={[styles.line, { backgroundColor: colors.divider }]} />
    <View style={[styles.dividerPill, { backgroundColor: colors.surfaceHigh }]}>
      <Txt variant="overline" tone="secondary">
        {label}
        {score ? `  ${score}` : ''}
      </Txt>
    </View>
    <View style={[styles.line, { backgroundColor: colors.divider }]} />
  </View>
);

function EventRow({ e, index, colors }) {
  const home = e.side === 'home';
  const isGoal = ['goal', 'penalty_goal', 'own_goal'].includes(e.kind);
  const content = (
    <View style={[styles.content, { alignItems: home ? 'flex-end' : 'flex-start' }]}>
      <Txt variant="bodyStrong" numberOfLines={1} align={home ? 'right' : 'left'} style={isGoal ? { fontFamily: 'Poppins-Bold' } : null}>
        {e.kind === 'sub' ? e.relatedName || e.playerName : e.playerName || e.teamName}
      </Txt>
      <Txt variant="caption" tone="muted" numberOfLines={1} align={home ? 'right' : 'left'}>
        {e.kind === 'sub' ? `Sale ${e.playerName}` : KIND_LABEL[e.kind] || e.display || e.type}
      </Txt>
    </View>
  );
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 40).springify().damping(18)} style={styles.row}>
      <View style={styles.half}>{home ? content : null}</View>
      <View style={styles.axis}>
        <View style={[styles.minute, { backgroundColor: isGoal ? colors.primary : colors.surfaceHigh }]}>
          <Txt variant="number" color={isGoal ? '#fff' : colors.text} style={{ fontSize: 11, fontFamily: 'Poppins-Bold' }}>
            {minuteText(e)}
          </Txt>
        </View>
        <View style={{ marginTop: 6 }}>
          <EventIcon kind={e.kind} size={15} />
        </View>
      </View>
      <View style={styles.half}>{!home ? content : null}</View>
    </Animated.View>
  );
}

function Timeline({ model }) {
  const { colors, space } = useDesign();
  const { events, match } = model;

  // Insertamos separadores de periodo y marcador parcial al descanso
  const items = useMemo(() => {
    const out = [];
    let h = 0;
    let a = 0;
    let lastPeriod = null;
    for (const e of events) {
      if (lastPeriod === 'first_half' && e.period === 'second_half') out.push({ divider: true, label: 'Descanso', score: `${h}–${a}`, key: 'ht' });
      lastPeriod = e.period || lastPeriod;
      if (['goal', 'penalty_goal', 'own_goal'].includes(e.kind)) {
        if (e.scoringSide === 'home') h += 1;
        else a += 1;
      }
      out.push(e);
    }
    return out.reverse(); // lo más reciente arriba
  }, [events]);

  if (!events.length) {
    return (
      <Surface style={{ marginHorizontal: space[4] }}>
        <EmptyState title={match.isScheduled ? 'Aún no empieza' : 'Sin eventos'} message={match.isScheduled ? 'Aquí verás goles, tarjetas y cambios minuto a minuto.' : 'No hay eventos registrados para este partido.'} />
      </Surface>
    );
  }

  return (
    <Surface style={{ marginHorizontal: space[4], paddingHorizontal: 8 }}>
      {match.isFinished ? <Divider label="Final" score={`${match.score.home}–${match.score.away}`} colors={colors} /> : null}
      {items.map((it, i) => (it.divider ? <Divider key={it.key} label={it.label} score={it.score} colors={colors} /> : <EventRow key={it.id} e={it} index={i} colors={colors} />))}
      <Divider label="Inicio" colors={colors} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  half: { flex: 1 },
  axis: { width: 64, alignItems: 'center' },
  minute: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, minWidth: 40, alignItems: 'center' },
  content: { gap: 0, paddingHorizontal: 4 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  line: { flex: 1, height: 1 },
  dividerPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
});

export default memo(Timeline);
