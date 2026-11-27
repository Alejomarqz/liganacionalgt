// components/StatsBox.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { API_WEB_DEPORT_URL } from '@env';
import { useTheme } from '../utils/ThemeContext';
import { BRAND } from '../utils/theme';

/* ─── Helpers ────────────────────────────────────────────── */
const nz = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const N  = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

const pickPair = (sum, ...keys) => {
  for (const k of keys) {
    const o = sum?.[k];
    if (!o) continue;
    const home = N(o.homeQty ?? o.home ?? o.h);
    const away = N(o.awayQty ?? o.away ?? o.a);
    if (home || away ||
      ('homeQty' in (o||{})) || ('awayQty' in (o||{})) ||
      ('home' in (o||{}))    || ('away' in (o||{}))    ||
      ('h' in (o||{}))       || ('a' in (o||{}))) {
      return { home, away };
    }
  }
  return { home: 0, away: 0 };
};

function parseStatsFromEvent(payload) {
  const sum  = payload?.summary || payload?.stats || {};
  const poss = sum.ballPossesion || sum.ballPossession || sum.possession || {};
  const possH = N(poss.homeQty ?? poss.home ?? poss.h);
  const possA = N(poss.awayQty ?? poss.away ?? poss.a ?? (possH ? 100 - possH : 0));
  return {
    poss:            { home: possH, away: possA },
    shots:           pickPair(sum, 'shots', 'totalShots'),
    shotsOnTarget:   pickPair(sum, 'shotsOnTarget', 'shotsOnGoal', 'onTargetShots'),
    shotsOffTarget:  pickPair(sum, 'shotsOffTarget', 'shotsOffGoal', 'offTargetShots'),
    shotsOnWoodwork: pickPair(sum, 'shotsOnWoodwork', 'woodwork'),
    saves:           pickPair(sum, 'saves'),
    cornerKicks:     pickPair(sum, 'cornerKicks', 'corners'),
    offsides:        pickPair(sum, 'offsides', 'offSides', 'offsidesCount'),
    fouls:           pickPair(sum, 'fouls'),
    yellowCards:     pickPair(sum, 'yellowCards', 'yellows'),
    redCards:        pickPair(sum, 'redCards', 'reds'),
  };
}

/* ─── Componente: fila de stat con barra dual ────────────── */
function StatRow({ label, home, away, homeColor, awayColor, colors, isDark, isFirst }) {
  const total    = home + away;
  const homeWins = home > away;
  const awayWins = away > home;
  const homePct  = total > 0 ? Math.max(3, Math.round((home / total) * 100)) : 50;
  const awayPct  = total > 0 ? 100 - homePct : 50;

  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={[
      SR.wrap,
      isFirst && { borderTopWidth: 0 },
      { borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' },
    ]}>
      {/* Número local */}
      <Text style={[
        SR.num, SR.numLeft,
        { color: homeWins ? homeColor : colors.textMuted },
        homeWins && SR.numWin,
      ]}>
        {home}
      </Text>

      {/* Centro */}
      <View style={SR.center}>
        <Text style={[SR.label, { color: colors.textMuted }]}>{label}</Text>

        {/* Barra doble — HOME crece desde centro hacia izquierda, AWAY hacia derecha */}
        <View style={SR.barRow}>
          {/* Barra home — alineada a la derecha */}
          <View style={[SR.barTrack, SR.barTrackLeft, { backgroundColor: trackBg }]}>
            <View style={[
              SR.barFill, SR.barFillLeft,
              { width: `${homePct}%`, backgroundColor: homeColor, opacity: homeWins ? 1 : 0.45 },
            ]} />
          </View>

          {/* Divisor central */}
          <View style={[SR.barDivider, { backgroundColor: isDark ? '#334155' : '#CBD5E1' }]} />

          {/* Barra away — alineada a la izquierda */}
          <View style={[SR.barTrack, SR.barTrackRight, { backgroundColor: trackBg }]}>
            <View style={[
              SR.barFill, SR.barFillRight,
              { width: `${awayPct}%`, backgroundColor: awayColor, opacity: awayWins ? 1 : 0.45 },
            ]} />
          </View>
        </View>
      </View>

      {/* Número visitante */}
      <Text style={[
        SR.num, SR.numRight,
        { color: awayWins ? awayColor : colors.textMuted },
        awayWins && SR.numWin,
      ]}>
        {away}
      </Text>
    </View>
  );
}

const SR = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  num: {
    width: 32,
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
    includeFontPadding: false,
  },
  numLeft:  { textAlign: 'left' },
  numRight: { textAlign: 'right' },
  numWin:   { fontFamily: 'Poppins-Bold', fontSize: 15 },

  center: { flex: 1, alignItems: 'center', paddingHorizontal: 10, gap: 6 },
  label:  {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    textAlign: 'center',
  },

  barRow: { flexDirection: 'row', alignItems: 'center', width: '100%', height: 6 },

  barTrack:      { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barTrackLeft:  { alignItems: 'flex-end' },   // barra home crece desde derecha
  barTrackRight: { alignItems: 'flex-start' }, // barra away crece desde izquierda

  barFill:      { height: 6, borderRadius: 3 },
  barFillLeft:  {},
  barFillRight: {},

  barDivider: { width: 2, height: 14, borderRadius: 1, marginHorizontal: 3 },
});

/* ══════════════════════════════════════════════════════════
   STATSBOX
══════════════════════════════════════════════════════════ */
export default function StatsBox({
  matchId,
  scope = 'guatemala',
  stats: statsProp,
  loading = false,
  homeName = 'Local',
  awayName = 'Visita',
  style,
}) {
  const { theme } = useTheme();
  const colors = theme?.colors || {};
  const isDark = theme?.mode === 'dark';

  const HOME_COLOR = BRAND.primary;                        // azul royal
  const AWAY_COLOR = isDark ? '#f87171' : '#DC2626';       // rojo

  const [local, setLocal] = React.useState({
    loading: !statsProp && !!matchId,
    stats: null,
    error: null,
  });

  React.useEffect(() => {
    if (statsProp || !matchId) return;
    let ignore = false;
    (async () => {
      try {
        setLocal(s => ({ ...s, loading: true, error: null }));
        const base = String(API_WEB_DEPORT_URL || '').replace(/\/+$/, '');
        const sc   = String(scope || 'guatemala').toLowerCase();
        const url  = `${base}/${sc}/events/${matchId}.json?ts=${Date.now()}`;
        const res  = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        if (!ignore) setLocal({ loading: false, stats: parseStatsFromEvent(json), error: null });
      } catch (e) {
        if (!ignore) setLocal({ loading: false, stats: null, error: String(e) });
      }
    })();
    return () => { ignore = true; };
  }, [matchId, scope, statsProp]);

  const stats     = statsProp ?? local.stats;
  const isLoading = loading || (!statsProp && local.loading);

  /* ── Loading skeleton ── */
  if (isLoading) {
    const skBg = isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0';
    return (
      <View style={[S.wrap, style]}>
        <View style={[S.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          {[90, 70, 80, 60, 75].map((w, i) => (
            <View key={i} style={[S.skRow, i === 0 && { marginTop: 0 }]}>
              <View style={[S.skBlock, { width: 24, backgroundColor: skBg }]} />
              <View style={[S.skLine, { flex: 1, width: `${w}%`, backgroundColor: skBg, opacity: 1 - i * 0.1 }]} />
              <View style={[S.skBlock, { width: 24, backgroundColor: skBg }]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={[S.wrap, style]}>
        <View style={[S.card, S.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[S.emptyText, { color: colors.textMuted }]}>Sin estadísticas disponibles</Text>
        </View>
      </View>
    );
  }

  const possH = nz(stats?.poss?.home);
  const possA = nz(stats?.poss?.away || (possH ? 100 - possH : 0));
  const showPoss = possH > 0 || possA > 0;

  // Nombres cortos para que no se monten
  const shortHome = homeName.length > 10 ? homeName.slice(0, 10) + '.' : homeName;
  const shortAway = awayName.length > 10 ? awayName.slice(0, 10) + '.' : awayName;

  const rowsRaw = [
    { key: 'shots',           label: 'Tiros',        h: nz(stats?.shots?.home),           a: nz(stats?.shots?.away) },
    { key: 'shotsOnTarget',   label: 'A puerta',     h: nz(stats?.shotsOnTarget?.home),   a: nz(stats?.shotsOnTarget?.away) },
    { key: 'shotsOffTarget',  label: 'Desviados',    h: nz(stats?.shotsOffTarget?.home),  a: nz(stats?.shotsOffTarget?.away) },
    { key: 'shotsOnWoodwork', label: 'Al palo',      h: nz(stats?.shotsOnWoodwork?.home), a: nz(stats?.shotsOnWoodwork?.away) },
    { key: 'saves',           label: 'Salvadas',     h: nz(stats?.saves?.home),           a: nz(stats?.saves?.away) },
    { key: 'cornerKicks',     label: 'Córners',      h: nz(stats?.cornerKicks?.home),     a: nz(stats?.cornerKicks?.away) },
    { key: 'offsides',        label: 'Offsides',     h: nz(stats?.offsides?.home),        a: nz(stats?.offsides?.away) },
    { key: 'fouls',           label: 'Faltas',       h: nz(stats?.fouls?.home),           a: nz(stats?.fouls?.away) },
    { key: 'yellowCards',     label: 'Amarillas',    h: nz(stats?.yellowCards?.home),     a: nz(stats?.yellowCards?.away) },
    { key: 'redCards',        label: 'Rojas',        h: nz(stats?.redCards?.home),        a: nz(stats?.redCards?.away) },
  ].filter(r => r.h > 0 || r.a > 0);

  const trackBg = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
  const possHomePct = (possH + possA) > 0 ? Math.round((possH / (possH + possA)) * 100) : 50;
  const possAwayPct = 100 - possHomePct;

  return (
    <View style={[S.wrap, style]}>

      {/* ══ POSESIÓN ══ */}
      {showPoss && (
        <View style={[S.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

          {/* Nombres de equipos — cada uno en su lado, sin chocar */}
          <View style={S.possTeamsRow}>
            <View style={S.possTeamLeft}>
              <View style={[S.teamDot, { backgroundColor: HOME_COLOR }]} />
              <Text style={[S.teamLabel, { color: colors.text }]} numberOfLines={1}>{shortHome}</Text>
            </View>
            <Text style={[S.possCenterLabel, { color: colors.textMuted }]}>POSESIÓN</Text>
            <View style={S.possTeamRight}>
              <Text style={[S.teamLabel, { color: colors.text, textAlign: 'right' }]} numberOfLines={1}>{shortAway}</Text>
              <View style={[S.teamDot, { backgroundColor: AWAY_COLOR }]} />
            </View>
          </View>

          {/* Barra gruesa segmentada */}
          <View style={S.possBarWrap}>
            <View style={[S.possSegHome, { flex: possHomePct, backgroundColor: HOME_COLOR }]} />
            <View style={[S.possSegAway, { flex: possAwayPct, backgroundColor: AWAY_COLOR }]} />
          </View>

          {/* Porcentajes grandes */}
          <View style={S.possPercRow}>
            <View style={S.possPercBlock}>
              <Text style={[S.possPercNum, { color: HOME_COLOR }]}>{possHomePct}%</Text>
            </View>
            <View style={[S.possPercDivider, { backgroundColor: isDark ? '#334155' : '#E2E8F0' }]} />
            <View style={[S.possPercBlock, { alignItems: 'flex-end' }]}>
              <Text style={[S.possPercNum, { color: AWAY_COLOR }]}>{possAwayPct}%</Text>
            </View>
          </View>

        </View>
      )}

      {/* ══ ESTADÍSTICAS ══ */}
      {rowsRaw.length > 0 && (
        <View style={[S.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

          {/* Header — nombres en los extremos, título centrado */}
          <View style={[S.statsHeaderRow, { borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]}>
            <Text style={[S.statsHeaderTeam, { color: HOME_COLOR }]} numberOfLines={1}>
              {shortHome}
            </Text>
            <Text style={[S.statsHeaderTitle, { color: colors.textMuted }]}>
              ESTADÍSTICAS
            </Text>
            <Text style={[S.statsHeaderTeam, { color: AWAY_COLOR, textAlign: 'right' }]} numberOfLines={1}>
              {shortAway}
            </Text>
          </View>

          {/* Filas */}
          {rowsRaw.map((r, i) => (
            <StatRow
              key={r.key}
              label={r.label}
              home={r.h}
              away={r.a}
              homeColor={HOME_COLOR}
              awayColor={AWAY_COLOR}
              colors={colors}
              isDark={isDark}
              isFirst={i === 0}
            />
          ))}
        </View>
      )}

      {rowsRaw.length === 0 && !showPoss && (
        <View style={[S.card, S.emptyCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
          <Text style={[S.emptyText, { color: colors.textMuted }]}>Sin estadísticas con datos</Text>
        </View>
      )}

    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 8 },
  card: { borderWidth: 1, borderRadius: 14, marginBottom: 10, overflow: 'hidden' },

  /* Skeleton */
  skRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12, marginTop: 1 },
  skBlock: { height: 20, borderRadius: 4 },
  skLine:  { height: 6, borderRadius: 3, alignSelf: 'center' },

  /* Empty */
  emptyCard: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { fontFamily: 'Poppins-Regular', fontSize: 13 },

  /* Posesión — nombres */
  possTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 8,
  },
  possTeamLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  possTeamRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  teamDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  teamLabel: { fontFamily: 'Poppins-SemiBold', fontSize: 12, flexShrink: 1 },
  possCenterLabel: {
    fontFamily: 'Poppins-Regular',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    flexShrink: 0,
  },

  /* Barra posesión */
  possBarWrap: {
    flexDirection: 'row',
    marginHorizontal: 14,
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  possSegHome: { height: 12 },
  possSegAway: { height: 12 },

  /* Porcentajes */
  possPercRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 14,
  },
  possPercBlock:   { flex: 1 },
  possPercDivider: { width: 1, height: 24, marginHorizontal: 12 },
  possPercNum: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    includeFontPadding: false,
  },

  /* Stats header */
  statsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  statsHeaderTeam: {
    flex: 1,
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
  },
  statsHeaderTitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 9,
    letterSpacing: 1,
    textAlign: 'center',
    flexShrink: 0,
  },
});