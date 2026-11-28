// src/features/match/Pitch.js
// Cancha vertical (SVG) con el 11 titular ubicado por formación.
// Usa fieldX/fieldY si el Núcleo los manda (0–100); si no, distribuye por la
// formación (p. ej. "4-2-3-1") y los grupos de posición.
import React, { memo, useMemo } from 'react';
import { Image, View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Circle, Path } from 'react-native-svg';
import { useDesign } from '../../design/useDesign';
import { Txt, PressableScale } from '../../ui';
import EventIcon from './EventIcon';
import { positionGroup } from '../../api/profiles';

const GROUP_RANK = { gk: 0, df: 1, mf: 2, fw: 3, other: 2 };

export function layoutStarters(starters, formation) {
  if (!starters?.length) return [];
  // 1) Coordenadas oficiales si existen
  if (starters.every((p) => p.x !== null && p.y !== null)) {
    return starters.map((p) => ({ ...p, px: p.x / 100, py: p.y / 100 }));
  }
  // 2) Formación
  const lines = [1, ...String(formation || '4-4-2').split('-').map((v) => parseInt(v, 10)).filter((v) => v > 0)];
  const total = lines.reduce((a, b) => a + b, 0);
  const sorted = [...starters].sort((a, b) => GROUP_RANK[positionGroup(a.position)] - GROUP_RANK[positionGroup(b.position)]);
  const fixedLines = total === sorted.length ? lines : [1, ...chunkEven(sorted.length - 1)];

  const out = [];
  let idx = 0;
  fixedLines.forEach((count, li) => {
    // py: 0 = arco propio (abajo) → 1 = ataque (arriba)
    const py = fixedLines.length === 1 ? 0.5 : 0.06 + (li / (fixedLines.length - 1)) * 0.82;
    for (let k = 0; k < count && idx < sorted.length; k += 1, idx += 1) {
      const px = (k + 1) / (count + 1);
      out.push({ ...sorted[idx], px, py });
    }
  });
  return out;
}

function chunkEven(n) {
  if (n <= 0) return [];
  const a = Math.round(n * 0.4);
  const b = Math.round(n * 0.4);
  return [a, b, n - a - b].filter((v) => v > 0);
}

const PitchLines = ({ w, h }) => {
  const c = 'rgba(255,255,255,0.28)';
  const sw = 1.5;
  const boxW = w * 0.58;
  const boxH = h * 0.15;
  const smallW = w * 0.28;
  const smallH = h * 0.055;
  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
      {/* franjas */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Rect key={i} x={0} y={(h / 8) * i} width={w} height={h / 8} fill={i % 2 ? 'rgba(255,255,255,0.025)' : 'transparent'} />
      ))}
      <Rect x={sw} y={sw} width={w - sw * 2} height={h - sw * 2} stroke={c} strokeWidth={sw} fill="none" rx={6} />
      <Line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={c} strokeWidth={sw} />
      <Circle cx={w / 2} cy={h / 2} r={w * 0.14} stroke={c} strokeWidth={sw} fill="none" />
      <Circle cx={w / 2} cy={h / 2} r={2.5} fill={c} />
      {/* áreas */}
      <Rect x={(w - boxW) / 2} y={sw} width={boxW} height={boxH} stroke={c} strokeWidth={sw} fill="none" />
      <Rect x={(w - smallW) / 2} y={sw} width={smallW} height={smallH} stroke={c} strokeWidth={sw} fill="none" />
      <Rect x={(w - boxW) / 2} y={h - boxH - sw} width={boxW} height={boxH} stroke={c} strokeWidth={sw} fill="none" />
      <Rect x={(w - smallW) / 2} y={h - smallH - sw} width={smallW} height={smallH} stroke={c} strokeWidth={sw} fill="none" />
      <Path d={`M ${w / 2 - w * 0.1} ${boxH} A ${w * 0.12} ${w * 0.12} 0 0 0 ${w / 2 + w * 0.1} ${boxH}`} stroke={c} strokeWidth={sw} fill="none" />
      <Path d={`M ${w / 2 - w * 0.1} ${h - boxH} A ${w * 0.12} ${w * 0.12} 0 0 1 ${w / 2 + w * 0.1} ${h - boxH}`} stroke={c} strokeWidth={sw} fill="none" />
    </Svg>
  );
};

const PlayerDot = memo(function PlayerDot({ p, marks, color, onPress }) {
  const [failed, setFailed] = React.useState(false);
  const size = 40;
  const badge = (marks || []).filter((k) => k !== 'sub_in');
  return (
    <PressableScale onPress={() => onPress?.(p)} style={{ alignItems: 'center', width: 76 }} accessibilityLabel={p.name}>
      <View style={{ width: size, height: size }}>
        {p.photo && !failed ? (
          <Image source={{ uri: p.photo }} onError={() => setFailed(true)} style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: '#fff', backgroundColor: color }} />
        ) : (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Txt variant="number" color="#fff" style={{ fontFamily: 'InterDisplay-ExtraBold' }}>
              {p.number ?? ''}
            </Txt>
          </View>
        )}
        {badge.length ? (
          <View style={styles.badges}>
            {badge.slice(0, 3).map((k, i) => (
              <View key={i} style={styles.badge}>
                <EventIcon kind={k} size={11} />
              </View>
            ))}
          </View>
        ) : null}
        {p.photo && !failed && p.number != null ? (
          <View style={[styles.num, { backgroundColor: color }]}>
            <Txt variant="overline" color="#fff" style={{ fontSize: 9, letterSpacing: 0 }}>
              {p.number}
            </Txt>
          </View>
        ) : null}
      </View>
      <View style={styles.nameTag}>
        <Txt variant="caption" color="#fff" numberOfLines={1} style={{ fontSize: 10.5, fontFamily: 'Inter-SemiBold' }}>
          {p.shortName}
        </Txt>
      </View>
    </PressableScale>
  );
});

function Pitch({ starters, formation, marks, teamColor, onPlayer }) {
  const { radius } = useDesign();
  const { width } = useWindowDimensions();
  const w = Math.min(width - 32, 480);
  const h = w * 1.42;
  const placed = useMemo(() => layoutStarters(starters, formation), [starters, formation]);

  return (
    <View style={{ width: w, height: h, alignSelf: 'center', borderRadius: radius.lg, overflow: 'hidden', backgroundColor: '#1D7A46' }}>
      <PitchLines w={w} h={h} />
      {placed.map((p) => (
        <View key={p.id} style={{ position: 'absolute', left: p.px * w - 38, top: (1 - p.py) * h - 30 }}>
          <PlayerDot p={p} marks={marks[p.id]} color={teamColor} onPress={onPlayer} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badges: { position: 'absolute', right: -8, top: -6, flexDirection: 'row', gap: 1 },
  badge: { backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, padding: 2 },
  num: { position: 'absolute', left: -6, bottom: -4, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
  nameTag: { marginTop: 3, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.45)', maxWidth: 76 },
});

export default memo(Pitch);
