// components/StatsBox.js
import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { API_WEB_DEPORT_URL } from '@env';
import { useTheme } from '../utils/ThemeContext';
import { COLORS } from '../utils/theme';

// ===== Helpers numéricos =====
const nz = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const N = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const pickPair = (sum, ...keys) => {
  for (const k of keys) {
    const o = sum?.[k];
    if (!o) continue;
    const home = N(o.homeQty ?? o.home ?? o.h);
    const away = N(o.awayQty ?? o.away ?? o.a);
    if (
      home || away ||
      ('homeQty' in (o||{})) || ('awayQty' in (o||{})) ||
      ('home' in (o||{}))    || ('away' in (o||{}))    ||
      ('h' in (o||{}))       || ('a' in (o||{}))
    ) {
      return { home, away };
    }
  }
  return { home: 0, away: 0 };
};

function parseStatsFromEvent(payload) {
  const sum = payload?.summary || payload?.stats || {};

  // posesión
  const poss = sum.ballPossesion || sum.ballPossession || sum.possession || {};
  const possH = N(poss.homeQty ?? poss.home ?? poss.h);
  const possA = N(
    poss.awayQty ?? poss.away ?? poss.a ??
    (possH ? 100 - possH : 0)
  );

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

// ===== Hook interno para colores de tema =====
function useStatsColors() {
  const { theme } = useTheme();
  return theme?.colors || COLORS;
}

// ======================================================
export default function StatsBox({
  matchId,
  scope = 'guatemala',
  stats: statsProp,
  loading = false,
  homeName = 'Local',
  awayName = 'Visita',
  style,
}) {
  const colors = useStatsColors();
  const styles = React.useMemo(() => createStyles(colors), [colors]);

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
        const base = String(API_WEB_DEPORT_URL || '').replace(/\/+$/,'');
        const sc   = String(scope || 'guatemala').toLowerCase();
        const url  = `${base}/${sc}/events/${matchId}.json?ts=${Date.now()}`;
        const res  = await fetch(url, { cache: 'no-store' });
        const json = await res.json();
        const parsed = parseStatsFromEvent(json);
        if (!ignore) setLocal({ loading: false, stats: parsed, error: null });
      } catch (e) {
        if (!ignore) setLocal({ loading: false, stats: null, error: String(e) });
      }
    })();

    return () => { ignore = true; };
  }, [matchId, scope, statsProp]);

  const stats = statsProp ?? local.stats;
  const isLoading = loading || (!statsProp && local.loading);

  // === UI ===
  if (isLoading) {
    return (
      <View style={[styles.wrap, style]}>
        <Text style={styles.noInfo}>Cargando estadísticas…</Text>
      </View>
    );
  }
  if (!stats) {
    return (
      <View style={[styles.wrap, style]}>
        <Text style={styles.noInfo}>Sin estadísticas disponibles</Text>
      </View>
    );
  }

  // Posesión
  const possH = nz(stats?.poss?.home);
  const possA = nz(stats?.poss?.away || (possH ? 100 - possH : 0));
  const showPoss = (possH > 0 || possA > 0);

  // Filas (solo si hay datos)
  const rowsRaw = [
    { key:'shots',           label:'Tiros totales',   h:nz(stats?.shots?.home),           a:nz(stats?.shots?.away) },
    { key:'shotsOnTarget',   label:'Tiros a puerta',  h:nz(stats?.shotsOnTarget?.home),   a:nz(stats?.shotsOnTarget?.away) },
    { key:'shotsOffTarget',  label:'Tiros desviados', h:nz(stats?.shotsOffTarget?.home),  a:nz(stats?.shotsOffTarget?.away) },
    { key:'shotsOnWoodwork', label:'Tiros al palo',   h:nz(stats?.shotsOnWoodwork?.home), a:nz(stats?.shotsOnWoodwork?.away) },
    { key:'saves',           label:'Salvadas',        h:nz(stats?.saves?.home),           a:nz(stats?.saves?.away) },
    { key:'cornerKicks',     label:'Córners',         h:nz(stats?.cornerKicks?.home),     a:nz(stats?.cornerKicks?.away) },
    { key:'offsides',        label:'Offsides',        h:nz(stats?.offsides?.home),        a:nz(stats?.offsides?.away) },
    { key:'fouls',           label:'Faltas',          h:nz(stats?.fouls?.home),           a:nz(stats?.fouls?.away) },
    { key:'yellowCards',     label:'Amarillas',       h:nz(stats?.yellowCards?.home),     a:nz(stats?.yellowCards?.away) },
    { key:'redCards',        label:'Rojas',           h:nz(stats?.redCards?.home),        a:nz(stats?.redCards?.away) },
  ];
  const rows = rowsRaw.filter(it => (it.h > 0 || it.a > 0));

  return (
    <View style={[styles.wrap, style]}>
      {showPoss ? (
        <View style={styles.statCard}>
          <Text style={styles.statTitle}>Posesión</Text>

          <View style={styles.possBarWrap}>
            <View style={[styles.possSegHome, { flex: Math.max(0.01, possH) }]} />
            <View style={[styles.possSegAway, { flex: Math.max(0.01, possA) }]} />
          </View>

          <View style={styles.possPercRow}>
            <Text style={[styles.possPerc, styles.statNumHome]}>{Math.round(possH)}%</Text>
            <Text style={styles.possMid}>–</Text>
            <Text style={[styles.possPerc, styles.statNumAway]}>{Math.round(possA)}%</Text>
          </View>

          <View style={styles.possTeamsRow}>
            <Text style={styles.possTeamName}>{homeName}</Text>
            <Text style={styles.possTeamName}>{awayName}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.statCard}>
        {rows.length === 0 ? (
          <Text style={styles.noInfo}>Sin estadísticas con datos</Text>
        ) : rows.map(r => (
          <View key={r.key} style={styles.statRow}>
            <Text style={[styles.statNum, styles.statNumHome]}>{r.h}</Text>
            <Text style={styles.statLabel}>{r.label}</Text>
            <Text style={[styles.statNum, styles.statNumAway]}>{r.a}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ===== estilos dependientes del tema =====
function createStyles(UI) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 8 },

    noInfo: {
      textAlign: 'center',
      fontSize: 12,
      color: UI.textMuted || '#9CA3AF',
      padding: 10,
    },

    statCard: {
      borderWidth: 1,
      borderColor: UI.cardBorder || '#1f2937',
      backgroundColor: UI.cardBg || '#020617',
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
    },
    statTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: UI.text || '#F9FAFB',
      marginBottom: 10,
    },

    possBarWrap: {
      flexDirection: 'row',
      height: 16,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: UI.trackBg || '#111827',
      borderWidth: 1,
      borderColor: UI.cardBorder || '#1f2937',
    },
    // barras de posesión (mantenemos turquesa/morado)
    possSegHome: { backgroundColor: '#d32f2f' },
    possSegAway: { backgroundColor: '#1976d2' },

    possPercRow: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    possPerc: {
      fontSize: 16,
      fontWeight: '900',
      color: UI.text || '#F9FAFB',
    },
    possMid: {
      fontSize: 14,
      fontWeight: '800',
      color: UI.textMuted || '#9CA3AF',
    },

    possTeamsRow: {
      marginTop: 2,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    possTeamName: {
      fontSize: 12,
      fontWeight: '600',
      color: UI.textMuted || '#9CA3AF',
    },

    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: UI.cardBorder || '#1f2937',
    },
    statLabel: {
      flex: 1,
      textAlign: 'center',
      fontSize: 13,
      fontWeight: '700',
      color: UI.text || '#F9FAFB',
    },
    statNum: {
      width: 56,
      fontSize: 14,
      fontWeight: '900',
      textAlign: 'center',
      color: UI.text || '#F9FAFB',
      ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : null),
    },
    statNumHome: { color: UI.text || '#F9FAFB' },
    statNumAway: { color: UI.text || '#F9FAFB' },
  });
}
