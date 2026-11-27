// components/TeamStats.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ActivityIndicator, StyleSheet,
  ScrollView, Image, TouchableOpacity, Animated, Easing,
} from 'react-native';
import { API_WEB_DEPORT_URL } from '@env';
import Avatar from './Avatar';
import { withTheme } from '../utils/ThemeContext';
import { BRAND } from '../utils/theme';

/* ─── Helpers ────────────────────────────────────────────── */
const toNum   = v => (v == null || v === '') ? 0 : Number(v) || 0;
const safeQty = obj => toNum(obj?.qty ?? obj);
const hexRgba = (hex, a) => {
  const c = (hex || '').replace('#', '');
  if (c.length !== 6) return `rgba(0,0,0,${a})`;
  return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
};
const displayName = (name = {}) => {
  const nick = (name?.nick || '').trim();
  if (nick) return nick;
  const first = (name?.first || name?.given || '').split(/\s+/).filter(Boolean)[0] || '';
  const last  = (name?.last  || name?.family || name?.surname || '').split(/\s+/).filter(Boolean)[0] || '';
  return [first, last].filter(Boolean).join(' ').trim() || '—';
};

const ICONS = {
  goals:   require('../resources/ball.png'),
  shots:   require('../resources/scorers.png'),
  yellow:  require('../resources/yellow.png'),
  red:     require('../resources/red.png'),
};

/* ─── Barra animada ──────────────────────────────────────── */
function AnimBar({ value, max, color, delay = 0, isDark }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: max > 0 ? value / max : 0,
      duration: 600, delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, max]);
  return (
    <View style={[barS.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
      <Animated.View style={[barS.fill, {
        backgroundColor: color,
        width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
      }]} />
    </View>
  );
}
const barS = StyleSheet.create({
  track: { height: 3, borderRadius: 2, overflow: 'hidden', marginTop: 6 },
  fill:  { height: 3, borderRadius: 2 },
});

/* ══════════════════════════════════════════════════════════
   TEAMSTATS
══════════════════════════════════════════════════════════ */
function TeamStats({ teamId, scope = 'guatemala', navigation, theme }) {
  const { colors } = theme;
  const isDark = theme.mode === 'dark';
  const base = String(API_WEB_DEPORT_URL || '').replace(/\/+$/, '');
  const sc   = String(scope).toLowerCase();

  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(null);
  const [json,    setJson]    = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true); setErr(null);
        const r = await fetch(`${base}/${sc}/statsCenter/teams/${teamId}.json`, { cache: 'default' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!cancel) setJson(j);
      } catch (e) {
        if (!cancel) setErr(String(e?.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [teamId, sc, base]);

  const {
    teamKPIs, kMax, gamesPlayed,
    topGoals, topMinutes, topYellows, topExpelled, goalsByLine,
  } = useMemo(() => {
    const sum = json?.summary || {};
    const playersObj = json?.players || {};
    const players = Object.entries(playersObj).map(([pid, wrap]) => {
      const info = wrap?.info || {};
      const s    = wrap?.summary || {};
      const secondYellow = safeQty(s?.secondYellowCards || s?.yellowRed || s?.doubleYellow);
      const reds = safeQty(s?.redCards);
      return {
        id: pid, info,
        name: displayName(info?.name || {}),
        posnId: toNum(info?.posnId),
        goals:   safeQty(s?.goals),
        minutes: safeQty(s?.minutesPlayed),
        matches: safeQty(s?.matches),
        yellows: safeQty(s?.yellowCards),
        reds, secondYellow,
        expelled: reds + secondYellow,
      };
    });

    let gamesPlayed = safeQty(sum?.matches || sum?.played || sum?.pj || sum?.matchesPlayed);
    if (!gamesPlayed) gamesPlayed = players.reduce((m, p) => Math.max(m, p.matches || 0), 0);

    const kpisBase = [
      { key: 'goals',   label: 'Goles',     icon: ICONS.goals,  color: BRAND.primary, value: safeQty(sum?.goals) },
      { key: 'shots',   label: 'Tiros',     icon: ICONS.shots,  color: BRAND.primary, value: safeQty(sum?.shots) },
      { key: 'yellows', label: 'Amarillas', icon: ICONS.yellow, color: '#D97706',     value: safeQty(sum?.yellowCards) },
      { key: 'reds',    label: 'Rojas',     icon: ICONS.red,    color: '#DC2626',     value: safeQty(sum?.redCards) },
    ].map(k => ({ ...k, avg: gamesPlayed ? +(k.value / gamesPlayed).toFixed(2) : null }));

    const kMax = Math.max(1, ...kpisBase.map(k => k.value));
    const by = key => players.slice().sort((a, b) => (b[key] - a[key]) || (b.minutes - a.minutes));

    const topGoals    = by('goals').filter(p => p.goals > 0).slice(0, 5);
    const topMinutes  = by('minutes').slice(0, 5);
    const topYellows  = by('yellows').filter(p => p.yellows > 0).slice(0, 5);
    const topExpelled = by('expelled').filter(p => p.expelled > 0).slice(0, 5);

    const lines = { 1: 0, 2: 0, 3: 0, 4: 0 };
    players.forEach(p => { lines[p.posnId] = (lines[p.posnId] || 0) + p.goals; });
    const goalsByLine = [
      { k: 'Defensores',     value: lines[2] || 0 },
      { k: 'Mediocampistas', value: lines[3] || 0 },
      { k: 'Delanteros',     value: lines[4] || 0 },
    ];
    const lineMax = Math.max(1, ...goalsByLine.map(g => g.value));

    return {
      teamKPIs: kpisBase, kMax, gamesPlayed,
      topGoals, topMinutes, topYellows, topExpelled,
      goalsByLine: goalsByLine.map(g => ({ ...g, max: lineMax })),
    };
  }, [json]);

  if (loading) return (
    <View style={S.centered}>
      <ActivityIndicator size="large" color={BRAND.primary} />
      <Text style={[S.mutedText, { color: colors.textMuted, marginTop: 10 }]}>Cargando estadísticas…</Text>
    </View>
  );

  if (err || !json) return (
    <View style={S.centered}>
      <Text style={[S.mutedText, { color: colors.textMuted }]}>No hay estadísticas disponibles</Text>
    </View>
  );

  const cardBg  = colors.cardBg;
  const border  = colors.cardBorder;
  const textCol = colors.text;
  const mutedCol = colors.textMuted;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.screenBg }}
      contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ══ RESUMEN — 4 KPIs en grid 2x2 ══ */}
      <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>

        {/* Header de sección */}
        <View style={S.secHeader}>
          <View style={[S.secBar, { backgroundColor: BRAND.primary }]} />
          <Text style={[S.secTitle, { color: textCol }]}>Resumen del equipo</Text>
          {gamesPlayed > 0 && (
            <View style={[S.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
              <Text style={[S.pillText, { color: mutedCol }]}>{gamesPlayed} PJ</Text>
            </View>
          )}
        </View>

        {/* Grid 2x2 */}
        <View style={S.kpiGrid}>
          {teamKPIs.map((k, idx) => (
            <View
              key={k.key}
              style={[
                S.kpiTile,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)',
                },
              ]}
            >
              {/* Icono + label */}
              <View style={S.kpiTop}>
                <Image
                  source={k.icon}
                  style={[
                    S.kpiIcon,
                    isDark && (k.key === 'goals' || k.key === 'shots') && { tintColor: '#fff' },
                  ]}
                />
                <Text style={[S.kpiLabel, { color: mutedCol }]}>{k.label}</Text>
              </View>

              {/* Número grande */}
              <Text style={[S.kpiValue, { color: textCol }]}>{k.value}</Text>

              {/* Promedio */}
              {k.avg != null && (
                <Text style={[S.kpiAvg, { color: mutedCol }]}>{k.avg} / partido</Text>
              )}

              {/* Barra */}
              <AnimBar value={k.value} max={kMax} color={k.color} delay={idx * 80} isDark={isDark} />
            </View>
          ))}
        </View>
      </View>

      {/* ══ GOLEADORES ══ */}
      {topGoals.length > 0 && (
        <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={S.secHeader}>
            <View style={[S.secBar, { backgroundColor: BRAND.primary }]} />
            <Text style={[S.secTitle, { color: textCol }]}>Goleadores</Text>
          </View>
          {topGoals.map((p, i) => (
            <PlayerRow
              key={p.id} player={p} index={i}
              right={<Text style={[S.statValue, { color: BRAND.primary }]}>{p.goals}</Text>}
              rightSub="goles"
              isDark={isDark} colors={colors}
              onPress={() => navigation.navigate('Player', { playerId: Number(p.id), teamId, scope })}
            />
          ))}
        </View>
      )}

      {/* ══ MÁS MINUTOS ══ */}
      {topMinutes.length > 0 && (
        <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={S.secHeader}>
            <View style={[S.secBar, { backgroundColor: BRAND.primary }]} />
            <Text style={[S.secTitle, { color: textCol }]}>Más minutos jugados</Text>
          </View>
          {topMinutes.map((p, i) => (
            <PlayerRow
              key={p.id} player={p} index={i}
              right={<Text style={[S.statValue, { color: textCol }]}>{p.minutes}'</Text>}
              rightSub="min"
              isDark={isDark} colors={colors}
              onPress={() => navigation.navigate('Player', { playerId: Number(p.id), teamId, scope })}
            />
          ))}
        </View>
      )}

      {/* ══ MÁS AMONESTADOS ══ */}
      {topYellows.length > 0 && (
        <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={S.secHeader}>
            <View style={[S.secBar, { backgroundColor: '#D97706' }]} />
            <Text style={[S.secTitle, { color: textCol }]}>Más amonestados</Text>
          </View>
          {topYellows.map((p, i) => (
            <PlayerRow
              key={p.id} player={p} index={i}
              right={<Text style={[S.statValue, { color: '#D97706' }]}>{p.yellows}</Text>}
              rightSub="amarillas"
              isDark={isDark} colors={colors}
              onPress={() => navigation.navigate('Player', { playerId: Number(p.id), teamId, scope })}
            />
          ))}
        </View>
      )}

      {/* ══ MÁS EXPULSADOS ══ */}
      {topExpelled.length > 0 && (
        <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
          <View style={S.secHeader}>
            <View style={[S.secBar, { backgroundColor: '#DC2626' }]} />
            <Text style={[S.secTitle, { color: textCol }]}>Más expulsados</Text>
          </View>
          {topExpelled.map((p, i) => (
            <PlayerRow
              key={p.id} player={p} index={i}
              right={<Text style={[S.statValue, { color: '#DC2626' }]}>{p.expelled}</Text>}
              rightSub="expulsiones"
              isDark={isDark} colors={colors}
              onPress={() => navigation.navigate('Player', { playerId: Number(p.id), teamId, scope })}
            />
          ))}
        </View>
      )}

      {/* ══ GOLES POR LÍNEA ══ */}
      <View style={[S.card, { backgroundColor: cardBg, borderColor: border }]}>
        <View style={S.secHeader}>
          <View style={[S.secBar, { backgroundColor: BRAND.primary }]} />
          <Text style={[S.secTitle, { color: textCol }]}>Goles por línea</Text>
        </View>
        <View style={{ gap: 14 }}>
          {goalsByLine.map(g => (
            <View key={g.k}>
              <View style={S.lineRow}>
                <Text style={[S.lineName, { color: textCol }]}>{g.k}</Text>
                <Text style={[S.lineValue, { color: BRAND.primary }]}>{g.value}</Text>
              </View>
              <AnimBar value={g.value} max={g.max} color={BRAND.primary} delay={100} isDark={isDark} />
            </View>
          ))}
        </View>
      </View>

    </ScrollView>
  );
}

/* ─── PlayerRow ──────────────────────────────────────────── */
function PlayerRow({ player, index, right, rightSub, isDark, colors, onPress }) {
  const isLast = false;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        S.playerRow,
        { borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
      ]}
    >
      {/* Rank */}
      <Text style={[S.rank, { color: colors.textMuted }]}>{index + 1}</Text>

      {/* Avatar */}
      <Avatar
        id={player.id} player={player.info} size={34}
        rounded borderColor={isDark ? '#2A2D3E' : '#F0F2F7'}
      />

      {/* Nombre */}
      <Text style={[S.playerName, { color: colors.text }]} numberOfLines={1}>
        {player.name}
      </Text>

      {/* Valor */}
      <View style={S.playerRight}>
        {right}
        <Text style={[S.rightSub, { color: colors.textMuted }]}>{rightSub}</Text>
      </View>
    </TouchableOpacity>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  mutedText: { fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center' },

  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },

  /* Section header */
  secHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  secBar:    { width: 3, height: 16, borderRadius: 2 },
  secTitle:  { fontFamily: 'Poppins-SemiBold', fontSize: 13, flex: 1 },
  pill: { borderRadius: 50, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { fontFamily: 'Poppins-Regular', fontSize: 11 },

  /* KPI grid */
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  kpiTile: { width: '48%', borderRadius: 12, borderWidth: 1, padding: 12 },
  kpiTop:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  kpiIcon: { width: 16, height: 16, resizeMode: 'contain', opacity: 0.8 },
  kpiLabel: { fontFamily: 'Poppins-Regular', fontSize: 11 },
  kpiValue: { fontFamily: 'Poppins-Bold', fontSize: 26, lineHeight: 30 },
  kpiAvg:   { fontFamily: 'Poppins-Regular', fontSize: 10, marginTop: 2 },

  /* Player row */
  playerRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank:       { fontFamily: 'Poppins-Regular', fontSize: 12, width: 16, textAlign: 'center' },
  playerName: { fontFamily: 'Poppins-Regular', fontSize: 13, flex: 1 },
  playerRight: { alignItems: 'flex-end', minWidth: 48 },
  statValue:  { fontFamily: 'Poppins-Bold', fontSize: 15 },
  rightSub:   { fontFamily: 'Poppins-Regular', fontSize: 10, marginTop: 1 },

  /* Goals by line */
  lineRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineName:  { fontFamily: 'Poppins-Regular', fontSize: 13 },
  lineValue: { fontFamily: 'Poppins-Bold', fontSize: 14 },
});

export default withTheme(TeamStats);