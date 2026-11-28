// src/screens/QuinielaScreen.js
// Quiniela de la jornada: pronostica el marcador de cada partido.
// Se guarda solo, se cierra al pitazo y suma puntos con el resultado final.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Minus, Plus, LockSimple, CheckCircle, Trophy } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, Surface, PressableScale, Pill, Slash, TeamCrest, SkeletonCard, EmptyState } from '../ui';
import { useMatches } from '../api/liga';
import { formatDayHeader, formatTime24, gt, seasonLabel } from '../api/clock';
import { useGameIdentity } from '../features/games/identity';
import { useMyPredictions, useMyScore, useMyRank, savePick } from '../features/games/quinielaStore';
import { scorePick, isOpen, POINTS } from '../features/games/scoring';

const KIND = {
  exact: { label: 'Exacto', tone: 'success' },
  diff: { label: 'Diferencia', tone: 'brand' },
  result: { label: 'Ganador', tone: 'brand' },
  miss: { label: 'Fallo', tone: 'neutral' },
};

function Stepper({ value, onChange, disabled, colors }) {
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      <PressableScale disabled={disabled || value >= 20} onPress={() => onChange(value + 1)} hitSlop={hitSlop} style={[styles.stepBtn, { backgroundColor: colors.surfaceHigh }]} accessibilityLabel="Sumar gol">
        <Plus size={14} color={colors.text} weight="bold" />
      </PressableScale>
      <Txt variant="h1" style={{ fontSize: 30, lineHeight: 34, minWidth: 30, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
        {value}
      </Txt>
      <PressableScale disabled={disabled || value <= 0} onPress={() => onChange(value - 1)} hitSlop={hitSlop} style={[styles.stepBtn, { backgroundColor: colors.surfaceHigh }]} accessibilityLabel="Restar gol">
        <Minus size={14} color={colors.text} weight="bold" />
      </PressableScale>
    </View>
  );
}

function PickCard({ match, saved, onSave, colors }) {
  const open = isOpen(match);
  const [h, setH] = useState(saved?.home ?? 0);
  const [a, setA] = useState(saved?.away ?? 0);
  const [status, setStatus] = useState(saved ? 'saved' : 'idle');
  const timer = useRef(null);

  // Si llega el pronóstico guardado desde Firestore, lo reflejamos
  useEffect(() => {
    if (saved && status !== 'dirty') {
      setH(saved.home);
      setA(saved.away);
      setStatus('saved');
    }
  }, [saved?.home, saved?.away]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = (nh, na) => {
    setH(nh);
    setA(na);
    setStatus('dirty');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        await onSave(match, nh, na);
        setStatus('saved');
      } catch {
        setStatus('error');
      }
    }, 600);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const result = match.isFinished && saved ? scorePick(saved, { home: match.score.home, away: match.score.away }) : null;

  return (
    <Surface style={{ marginHorizontal: 16, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Txt variant="overline" tone="secondary">
          {formatTime24(match.kickoff)}
          {match.stadium?.name ? ` · ${match.stadium.name}` : ''}
        </Txt>
        {open ? (
          status === 'saved' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <CheckCircle size={14} color={colors.success} weight="fill" />
              <Txt variant="caption" tone="success" style={{ fontFamily: 'Inter-SemiBold' }}>
                Guardado
              </Txt>
            </View>
          ) : status === 'dirty' ? (
            <Txt variant="caption" tone="muted">
              Guardando…
            </Txt>
          ) : status === 'error' ? (
            <Txt variant="caption" tone="danger">
              Sin conexión, reintenta
            </Txt>
          ) : (
            <Txt variant="caption" tone="brand" style={{ fontFamily: 'Inter-SemiBold' }}>
              Abierto
            </Txt>
          )
        ) : match.isFinished && result ? (
          <Pill tone={KIND[result.kind]?.tone || 'neutral'} label={`+${result.points} · ${KIND[result.kind]?.label || ''}`} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <LockSimple size={13} color={colors.textMuted} weight="fill" />
            <Txt variant="caption" tone="muted">
              {match.isLive ? 'En juego' : 'Cerrado'}
            </Txt>
          </View>
        )}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.team}>
          <TeamCrest team={match.home} size={40} />
          <Txt variant="bodyStrong" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {match.home?.name}
          </Txt>
        </View>

        {open ? (
          <View style={styles.center}>
            <Stepper value={h} onChange={(v) => change(v, a)} colors={colors} />
            <Slash width={4} height={26} />
            <Stepper value={a} onChange={(v) => change(h, v)} colors={colors} />
          </View>
        ) : (
          <View style={[styles.center, { flexDirection: 'column', gap: 4 }]}>
            {match.isFinished || match.isLive ? (
              <Txt variant="h1" style={{ fontSize: 30, lineHeight: 34, fontVariant: ['tabular-nums'] }}>
                {match.score.home ?? 0} – {match.score.away ?? 0}
              </Txt>
            ) : null}
            <Txt variant="caption" tone="secondary">
              {saved ? `Tu pronóstico: ${saved.home} – ${saved.away}` : 'Sin pronóstico'}
            </Txt>
          </View>
        )}

        <View style={styles.team}>
          <TeamCrest team={match.away} size={40} />
          <Txt variant="bodyStrong" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {match.away?.name}
          </Txt>
        </View>
      </View>
    </Surface>
  );
}

export default function QuinielaScreen({ navigation, route }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  const { uid, nick, ready } = useGameIdentity();
  const matchesQ = useMatches();
  const seasonId = matchesQ.seasonId;
  const preds = useMyPredictions(uid);
  const totals = useMyScore({ uid, nick, seasonId, byRound: preds.byRound, matches: matchesQ.matches });
  const { rank, total } = useMyRank(seasonId, ready && !preds.loading ? totals.points : null);

  // Jornadas: por defecto la del próximo partido abierto (o la que pidió quien nos abrió)
  const rounds = useMemo(() => {
    const map = new Map();
    for (const m of matchesQ.matches) {
      if (m.round?.id && !map.has(m.round.id)) map.set(m.round.id, { id: m.round.id, order: m.round.sortOrder ?? m.round.number ?? 0, short: m.round.stageType === 'regular' ? `J${m.round.number}` : m.round.name, name: m.round.name });
    }
    return [...map.values()].sort((x, y) => x.order - y.order);
  }, [matchesQ.matches]);

  const defaultRound = useMemo(() => {
    const wanted = route?.params?.matchId && matchesQ.matches.find((m) => String(m.id) === String(route.params.matchId));
    if (wanted?.round?.id) return wanted.round.id;
    const nextOpen = [...matchesQ.matches].filter(isOpen).sort((x, y) => x.kickoff - y.kickoff)[0];
    return nextOpen?.round?.id ?? rounds[rounds.length - 1]?.id ?? null;
  }, [matchesQ.matches, rounds, route?.params?.matchId]);

  const [roundId, setRoundId] = useState(null);
  const active = roundId ?? defaultRound;
  const visibleRounds = useMemo(() => {
    const i = rounds.findIndex((r) => r.id === active);
    return i < 0 ? rounds.slice(-5) : rounds.slice(Math.max(0, i - 3), i + 3);
  }, [rounds, active]);

  const roundMatches = useMemo(() => matchesQ.matches.filter((m) => m.round?.id === active).sort((x, y) => (x.kickoff?.getTime() || 0) - (y.kickoff?.getTime() || 0)), [matchesQ.matches, active]);
  const picks = preds.byRound[String(active)]?.picks || {};
  const roundPoints = totals.rounds[String(active)] ?? 0;
  const openCount = roundMatches.filter(isOpen).length;
  const pickedOpen = roundMatches.filter((m) => isOpen(m) && picks[String(m.id)]).length;

  // agrupar por día (hora de Guatemala)
  const groups = useMemo(() => {
    const out = [];
    for (const m of roundMatches) {
      const k = gt(m.kickoff)?.key || 'tbd';
      let g = out.find((x) => x.k === k);
      if (!g) out.push((g = { k, label: formatDayHeader(m.kickoff), items: [] }));
      g.items.push(m);
    }
    return out;
  }, [roundMatches]);

  const onSave = useCallback((match, home, away) => savePick({ uid, seasonId, match, home, away }), [uid, seasonId]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 6, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' }}>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver" style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
            <CaretLeft size={22} color={colors.text} weight="bold" />
          </PressableScale>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <Txt variant="overline" tone="secondary">
            Quiniela · {seasonLabel()}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <Slash width={9} height={24} />
            <Txt variant="h1">Quiniela</Txt>
          </View>
        </View>

        {/* Mis números */}
        <Surface style={{ marginHorizontal: 16, marginTop: 18, flexDirection: 'row' }}>
          {[
            [roundPoints, 'Pts jornada', 'brand'],
            [totals.points, 'Pts torneo', 'primary'],
            [rank ? `#${rank}` : '–', total ? `de ${total}` : 'Posición', 'primary'],
          ].map(([v, l, tone], i) => (
            <View key={l} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? StyleSheet.hairlineWidth : 0, borderLeftColor: colors.divider }}>
              <Txt variant="h1" tone={tone} style={{ fontSize: 26, lineHeight: 30, fontVariant: ['tabular-nums'] }}>
                {v}
              </Txt>
              <Txt variant="caption" tone="muted">
                {l}
              </Txt>
            </View>
          ))}
        </Surface>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, marginTop: 12 }}>
          <Pill tone="success" label={`Exacto +${POINTS.exact}`} />
          <Pill tone="brand" label={`Ganador y diferencia +${POINTS.diff}`} />
          <Pill tone="neutral" label={`Ganador +${POINTS.result}`} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 }}>
          {visibleRounds.map((r) => (
            <Pill key={r.id} label={r.short} active={r.id === active} onPress={() => setRoundId(r.id)} />
          ))}
        </ScrollView>

        {openCount ? (
          <Txt variant="caption" tone="secondary" style={{ paddingHorizontal: 20, paddingBottom: 6 }}>
            Llevas {pickedOpen} de {openCount} pronósticos · se cierran al pitazo de cada partido
          </Txt>
        ) : null}

        <View style={{ gap: space[3], paddingTop: 6 }}>
          {matchesQ.loading || !ready ? (
            <>
              <SkeletonCard height={170} style={{ marginHorizontal: 16 }} />
              <SkeletonCard height={170} style={{ marginHorizontal: 16 }} />
            </>
          ) : !roundMatches.length ? (
            <EmptyState title="Sin partidos" message="Esta jornada aún no tiene partidos." />
          ) : (
            groups.map((g) => (
              <View key={g.k} style={{ gap: space[3] }}>
                <Txt variant="overline" tone="brand" style={{ paddingHorizontal: 20, marginTop: 6 }}>
                  {g.label}
                </Txt>
                {g.items.map((m) => (
                  <PickCard key={m.id} match={m} saved={picks[String(m.id)]} onSave={onSave} colors={colors} />
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 12, backgroundColor: colors.bgElevated, borderTopColor: colors.divider }]}>
        <PressableScale onPress={() => navigation.navigate('Ranking')} style={[styles.cta, { backgroundColor: colors.primaryStrong }]}>
          <Trophy size={18} color="#fff" weight="fill" />
          <Txt variant="bodyStrong" color="#fff" style={{ fontFamily: 'Inter-Bold' }}>
            Ver ranking y ligas
          </Txt>
        </PressableScale>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  team: { flex: 1, alignItems: 'center', gap: 8 },
  center: { width: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  stepBtn: { width: 34, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  cta: { height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
