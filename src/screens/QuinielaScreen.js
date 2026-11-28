// src/screens/QuinielaScreen.js
// Quiniela de la jornada: pronostica el marcador de cada partido.
// Se guarda solo, se cierra al pitazo y suma puntos con el resultado final.
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, Minus, Plus, LockSimple, CheckCircle, Trophy, Target } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, Surface, PressableScale, Pill, Slash, TeamCrest, SkeletonCard, EmptyState, ConfirmSheet } from '../ui';
import { formatDayHeader, formatTime24, gt, seasonLabel } from '../api/clock';
import { savePick } from '../features/games/quinielaStore';
import NativeAdCard from '../../ads/NativeAdCard';
import { showInterstitialIfReady } from '../../ads/AdManager';
import { useGameStats } from '../features/games/useGameStats';
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
  const [h, setH] = useState(0);
  const [a, setA] = useState(0);
  const [status, setStatus] = useState('idle'); // idle | saving | error
  const locked = Boolean(saved);

  const [asking, setAsking] = useState(false);
  const confirm = () => setAsking(true);
  const doSave = async () => {
    setStatus('saving');
    try {
      await onSave(match, h, a);
      setStatus('idle');
      setAsking(false);
      setTimeout(() => showInterstitialIfReady('quiniela_pick').catch(() => {}), 600);
    } catch {
      setStatus('error');
      setAsking(false);
    }
  };

  const confirmSheet = (
    <ConfirmSheet
      visible={asking}
      Icon={Target}
      title="¿Confirmas tu pronóstico?"
      message="Una vez confirmado ya no se puede cambiar."
      confirmLabel="Sí, confirmar"
      cancelLabel="Revisar"
      busy={status === 'saving'}
      onCancel={() => status !== 'saving' && setAsking(false)}
      onConfirm={doSave}
    >
      <View style={[styles.sheetScore, { backgroundColor: colors.band }]}>
        <View style={styles.sheetTeam}>
          <TeamCrest team={match.home} size={44} />
          <Txt variant="caption" numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: 'Inter-SemiBold', marginTop: 6 }}>
            {match.home?.name}
          </Txt>
        </View>
        <Txt variant="display" style={{ fontSize: 40, lineHeight: 46, fontVariant: ['tabular-nums'] }}>
          {h} – {a}
        </Txt>
        <View style={styles.sheetTeam}>
          <TeamCrest team={match.away} size={44} />
          <Txt variant="caption" numberOfLines={1} adjustsFontSizeToFit style={{ fontFamily: 'Inter-SemiBold', marginTop: 6 }}>
            {match.away?.name}
          </Txt>
        </View>
      </View>
    </ConfirmSheet>
  );

  const result = match.isFinished && saved ? scorePick(saved, { home: match.score.home, away: match.score.away }) : null;

  // Estado de la esquina superior derecha
  let badge;
  if (result) badge = <Pill tone={KIND[result.kind]?.tone || 'neutral'} label={`+${result.points} · ${KIND[result.kind]?.label || ''}`} />;
  else if (locked)
    badge = (
      <View style={styles.badgeRow}>
        <LockSimple size={13} color={colors.success} weight="fill" />
        <Txt variant="caption" tone="success" style={{ fontFamily: 'Inter-SemiBold' }}>
          Confirmado
        </Txt>
      </View>
    );
  else if (!open)
    badge = (
      <View style={styles.badgeRow}>
        <LockSimple size={13} color={colors.textMuted} weight="fill" />
        <Txt variant="caption" tone="muted">
          {match.isLive ? 'En juego' : 'Cerrado'}
        </Txt>
      </View>
    );
  else
    badge = (
      <Txt variant="caption" tone="brand" style={{ fontFamily: 'Inter-SemiBold' }}>
        Abierto
      </Txt>
    );

  const editable = open && !locked;

  return (
    <Surface style={{ marginHorizontal: 16, paddingVertical: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
        <Txt variant="overline" tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
          {formatTime24(match.kickoff)}
          {match.stadium?.name ? ` · ${match.stadium.name}` : ''}
        </Txt>
        {badge}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={styles.team}>
          <TeamCrest team={match.home} size={40} />
          <Txt variant="bodyStrong" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
            {match.home?.name}
          </Txt>
        </View>

        {editable ? (
          <View style={styles.center}>
            <Stepper value={h} onChange={setH} colors={colors} />
            <Slash width={4} height={26} />
            <Stepper value={a} onChange={setA} colors={colors} />
          </View>
        ) : (
          <View style={[styles.center, { flexDirection: 'column', gap: 4 }]}>
            {match.isFinished || match.isLive ? (
              <Txt variant="h1" style={{ fontSize: 30, lineHeight: 34, fontVariant: ['tabular-nums'] }}>
                {match.score.home ?? 0} – {match.score.away ?? 0}
              </Txt>
            ) : locked ? (
              <Txt variant="h1" tone="brand" style={{ fontSize: 30, lineHeight: 34, fontVariant: ['tabular-nums'] }}>
                {saved.home} – {saved.away}
              </Txt>
            ) : null}
            <Txt variant="caption" tone="secondary" align="center">
              {locked ? (match.isFinished || match.isLive ? `Tu pronóstico: ${saved.home} – ${saved.away}` : 'Tu pronóstico') : 'Sin pronóstico'}
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

      {editable ? (
        <PressableScale onPress={confirm} disabled={status === 'saving'} style={[styles.confirm, { backgroundColor: colors.primaryStrong }]}>
          <CheckCircle size={17} color="#fff" weight="fill" />
          <Txt variant="bodyStrong" color="#fff" style={{ fontFamily: 'Inter-Bold' }}>
            {status === 'saving' ? 'Guardando…' : 'Confirmar pronóstico'}
          </Txt>
        </PressableScale>
      ) : null}
      {status === 'error' ? (
        <Txt variant="caption" tone="danger" align="center" style={{ marginTop: 8 }}>
          No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.
        </Txt>
      ) : null}
      {confirmSheet}
    </Surface>
  );
}

export default function QuinielaScreen({ navigation, route }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  const { uid, ready, matchesQ, seasonId, preds, totals, rank, totalPlayers: total } = useGameStats({ withBoard: true });

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
            [totals.total, 'Pts totales', 'primary'],
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
            Llevas {pickedOpen} de {openCount} pronósticos confirmados · una vez confirmados no se cambian
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
            groups.map((g, gi) => (
              <View key={g.k} style={{ gap: space[3] }}>
                <Txt variant="overline" tone="brand" style={{ paddingHorizontal: 20, marginTop: 6 }}>
                  {g.label}
                </Txt>
                {g.items.map((m, i) => (
                  <React.Fragment key={m.id}>
                    <PickCard match={m} saved={picks[String(m.id)]} onSave={onSave} colors={colors} />
                    {gi === 0 && i === 1 ? <NativeAdCard /> : null}
                  </React.Fragment>
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
  sheetScore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 14, borderRadius: 18 },
  sheetTeam: { width: 96, alignItems: 'center' },
  team: { flex: 1, alignItems: 'center', gap: 8 },
  center: { width: 150, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
  stepBtn: { width: 34, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  confirm: { marginTop: 14, height: 44, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  cta: { height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
