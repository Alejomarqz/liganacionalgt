// src/features/season/SeasonPulse.js
// "Pulso de la temporada": métricas rápidas desde home.seasonSummary.
import React, { memo } from 'react';
import { View } from 'react-native';
import { SoccerBall, ChartLineUp, Flag, Fire } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, Surface } from '../../ui';

const Tile = ({ Icon, value, label, tint, soft }) => {
  const { radius } = useDesign();
  return (
    <Surface style={{ flex: 1, minWidth: '46%', gap: 8 }} level={0}>
      <View style={{ width: 32, height: 32, borderRadius: radius.sm, backgroundColor: soft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={tint} weight="duotone" />
      </View>
      <Txt variant="h1" style={{ fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
      <Txt variant="caption" tone="muted" numberOfLines={1}>
        {label}
      </Txt>
    </Surface>
  );
};

function SeasonPulse({ summary }) {
  const { colors, space } = useDesign();
  if (!summary) return null;
  const m = summary.matches || {};
  const g = summary.goals || {};
  const top = summary.highestScoringMatch;
  const progress = m.total ? Math.round((m.finished / m.total) * 100) : 0;

  return (
    <View style={{ paddingHorizontal: space[5], gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Tile Icon={SoccerBall} value={g.current ?? g.finished ?? 0} label="Goles en el torneo" tint={colors.primary} soft={colors.primarySoft} />
        <Tile Icon={ChartLineUp} value={(g.averagePerFinishedMatch ?? 0).toFixed(2)} label="Goles por partido" tint={colors.success} soft={colors.successSoft} />
      </View>

      <Surface level={0} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Flag size={16} color={colors.gold} weight="duotone" />
            <Txt variant="bodyStrong">Avance del torneo</Txt>
          </View>
          <Txt variant="number" tone="secondary">
            {m.finished ?? 0}/{m.total ?? 0}
          </Txt>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.surfaceHigh, overflow: 'hidden' }}>
          <View style={{ width: `${progress}%`, height: '100%', borderRadius: 4, backgroundColor: colors.primary }} />
        </View>
        <Txt variant="caption" tone="muted">
          {m.remaining ? `Faltan ${m.remaining} partidos` : 'Fase regular completada'}
        </Txt>
      </Surface>

      {top ? (
        <Surface level={0} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.liveSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Fire size={20} color={colors.live} weight="fill" />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" tone="muted">
              Partido con más goles
            </Txt>
            <Txt variant="bodyStrong" numberOfLines={1}>
              {top.home} {top.score?.[0]}–{top.score?.[1]} {top.away}
            </Txt>
          </View>
          <Txt variant="h2" tone="live">
            {top.goals}
          </Txt>
        </Surface>
      ) : null}
    </View>
  );
}

export default memo(SeasonPulse);
