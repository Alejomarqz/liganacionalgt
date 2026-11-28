// src/features/matches/FixtureList.js
// Partidos agrupados: primero "EN VIVO", luego por día (Sábado 29, Domingo 30…).
import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, Surface, LiveBadge } from '../../ui';
import MatchRow from './MatchRow';

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dayLabel = (d) => (d ? `${DAYS[d.getDay()]} ${d.getDate()}` : 'Por definir');

function FixtureList({ matches, onOpen, style }) {
  const { colors } = useDesign();

  const groups = useMemo(() => {
    const live = matches.filter((m) => m.isLive);
    const rest = matches.filter((m) => !m.isLive);
    const out = [];
    if (live.length) out.push({ key: 'live', live: true, label: live[0].kickoff ? dayLabel(live[0].kickoff) : '', items: live });
    for (const m of rest) {
      const k = m.kickoff ? m.kickoff.toDateString() : 'tbd';
      let g = out.find((x) => x.key === k);
      if (!g) {
        g = { key: k, label: dayLabel(m.kickoff), items: [] };
        out.push(g);
      }
      g.items.push(m);
    }
    return out;
  }, [matches]);

  return (
    <Surface padded={false} style={style}>
      {groups.map((g, gi) => (
        <View key={g.key}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: g.live ? colors.liveSoft : 'transparent',
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
              borderTopWidth: gi > 0 ? 1 : 0,
              borderTopColor: colors.divider,
            }}
          >
            {g.live ? <LiveBadge /> : <Txt variant="overline" tone="secondary">{g.label}</Txt>}
            {g.live ? (
              <Txt variant="caption" tone="secondary" style={{ fontFamily: 'Inter-SemiBold', fontSize: 11 }}>
                {g.label}
              </Txt>
            ) : null}
          </View>
          {g.items.map((m, i) => (
            <MatchRow key={m.id} match={m} onPress={() => onOpen(m)} last={i === g.items.length - 1} />
          ))}
        </View>
      ))}
    </Surface>
  );
}

export default memo(FixtureList);
