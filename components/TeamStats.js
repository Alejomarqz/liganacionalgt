// components/TeamStats.js — KPIs con iconos locales y filas con Avatar
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { API_WEB_DEPORT_URL } from '@env';
import Avatar from './Avatar';
import { withTheme } from '../utils/ThemeContext';


const RED   = '#d32f2f';
const NAVY  = '#0b1f3b';
const GREEN = '#2e7d32';
const BLUE  = '#1976d2';
const YELL  = '#f9a825';
const GRAY  = '#666';

const ICONS = {
  goals:   require('../resources/ball.png'),
  shots:   require('../resources/scorers.png'),
  yellow:  require('../resources/yellow.png'),
  red:     require('../resources/red.png'),
};

const toNum   = (v) => (v==null || v==='') ? 0 : Number(v) || 0;
const safeQty = (obj) => toNum(obj?.qty ?? obj);
const tint = (hex, a=0.08) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${a})`;
  const r = parseInt(m[1],16), g = parseInt(m[2],16), b = parseInt(m[3],16);
  return `rgba(${r},${g},${b},${a})`;
};

const displayNameFrom = (name={}) => {
  const nick = (name?.nick || '').trim();
  if (nick) return nick;
  const first = (name?.first || name?.given || '').split(/\s+/).filter(Boolean)[0] || '';
  const last  = (name?.last  || name?.family|| name?.surname || '').split(/\s+/).filter(Boolean)[0] || '';
  return [first, last].filter(Boolean).join(' ').trim() || '—';
};

function TeamStats({ teamId, scope='guatemala', navigation, theme }) {
  const { colors } = theme;
  const isDark = theme.mode === 'dark';

  const base = String(API_WEB_DEPORT_URL || '').replace(/\/+$/, '');
  const sc   = String(scope).toLowerCase();


  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [json, setJson] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true); setErr(null);
        // Cache por defecto; el pull-to-refresh de TeamScreen remonta el componente
        const url = `${base}/${sc}/statsCenter/teams/${teamId}.json`;
        const r = await fetch(url, { cache:'default' });
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
    topGoals, topMinutes, topYellows, topExpelled,
    goalsByLine
  } = useMemo(() => {
    const sum = json?.summary || {};
    const playersObj = json?.players || {};

    const players = Object.entries(playersObj).map(([pid, wrap]) => {
      const info = wrap?.info || {};
      const s    = wrap?.summary || {};
      const secondYellow = safeQty(s?.secondYellowCards || s?.yellowRed || s?.doubleYellow);
      const reds  = safeQty(s?.redCards);
      return {
        id: pid,
        // guardo info completo para Avatar (puede traer images, photo, etc.)
        info,
        name: displayNameFrom(info?.name || {}),
        posnId: toNum(info?.posnId),
        goals: safeQty(s?.goals),
        minutes: safeQty(s?.minutesPlayed),
        matches: safeQty(s?.matches),
        yellows: safeQty(s?.yellowCards),
        reds,
        secondYellow,
        expelled: reds + secondYellow,
      };
    });

    // PJ del summary si existe; si no, infiero por max(matches) de jugadores
    let gamesPlayed =
      safeQty(sum?.matches || sum?.played || sum?.pj || sum?.matchesPlayed);
    if (!gamesPlayed) {
      gamesPlayed = players.reduce((m,p)=>Math.max(m, p.matches||0), 0);
    }

    const kpisBase = [
      { key:'goals',   label:'Goles',     icon: ICONS.goals,  color: GREEN, value: safeQty(sum?.goals) },
      { key:'shots',   label:'Tiros',     icon: ICONS.shots,  color: BLUE,  value: safeQty(sum?.shots) },
      { key:'yellows', label:'Amarillas', icon: ICONS.yellow, color: YELL,  value: safeQty(sum?.yellowCards) },
      { key:'reds',    label:'Rojas',     icon: ICONS.red,    color: RED,   value: safeQty(sum?.redCards) },
    ].map(k => ({ ...k, avg: gamesPlayed ? +(k.value / gamesPlayed).toFixed(2) : null }));

    const kMax = Math.max(1, ...kpisBase.map(k => k.value));

    const by = (key, proj = (x)=>x[key]) =>
      players.slice().sort((a,b)=> (proj(b)-proj(a)) || (b.minutes-a.minutes));

    const topGoals    = by('goals').filter(p=>p.goals>0).slice(0,3);
    const topMinutes  = by('minutes').slice(0,3);
    const topYellows  = by('yellows').filter(p=>p.yellows>0).slice(0,3);
    const topExpelled = by('expelled').filter(p=>p.expelled>0).slice(0,3);

    // Goles por línea (1 PO, 2 DEF, 3 MED, 4 DEL)
    const lines = { 1:0, 2:0, 3:0, 4:0 };
    players.forEach(p => { lines[p.posnId] = (lines[p.posnId]||0) + p.goals; });
    const goalsByLine = [
      { k: 'DEF', value: lines[2]||0 },
      { k: 'MED', value: lines[3]||0 },
      { k: 'DEL', value: lines[4]||0 },
    ];

    return { teamKPIs: kpisBase, kMax, gamesPlayed, topGoals, topMinutes, topYellows, topExpelled, goalsByLine };
  }, [json]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.muted, { color: colors.textMuted }]}> Cargando estadísticas… </Text>
      </View>
    );
  }
  if (err || !json) {
    return (
      <View style={styles.center}>
        <Text style={[styles.muted, { color: colors.textMuted }]}>  No hay estadísticas disponibles. </Text>
        {err ? (<Text style={[styles.muted, { marginTop: 4, color: colors.textMuted }, ]} > ({err}) </Text> ) : null}
      </View>
    );
  }

  return (
  <ScrollView style={{ flex: 1, backgroundColor: colors.appBg }} contentContainerStyle={{ padding: 0, paddingBottom: 16 }} >

      {/* ===================== KPIs con iconos locales ===================== */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

        <Text style={[styles.cardTitle, { color: colors.text }]}> Resumen del equipo</Text>
        <View style={styles.kpiGrid}>
          {teamKPIs.map((k) => {
            const pct = Math.round((k.value / (kMax || 1)) * 100);
            return (
              <View key={k.key} style={[styles.kpiTile, { borderColor: k.color, backgroundColor: tint(k.color, 0.08) }]}>
                <Image source={k.icon} style={[styles.kpiIconImg, (isDark && (k.key === 'goals' || k.key === 'shots')) ? { tintColor: '#ffffff' } : null]} />

                <Text style={[styles.kpiValue, { color: k.color }]}>{k.value}</Text>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}> {k.label}</Text>

                {k.avg != null && (
                  <View style={[styles.avgRow, { backgroundColor: tint(colors.text, 0.08) },]} >
                  <Text style={[styles.avgText, { color: colors.text }]}> {k.avg} / partido </Text>
                  </View>
                )}


                <View style={[styles.bar, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)' }, ]}>
                  <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: k.color }, ]} />
                </View>
              </View>
            );
          })}
        </View>

        {gamesPlayed ? (
          <Text style={[styles.kpiFoot, { color: colors.textMuted }]}> Base: {gamesPlayed} partidos </Text>
        ) : null}
      </View>

      

      {/* ===================== Top goleadores (con Avatar) ===================== */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

  <Text style={[styles.cardTitle, { color: colors.text }]}>Goleadores</Text>

  {topGoals.length === 0 ? (
    <Text style={[styles.muted, { color: colors.textMuted }]}>—</Text>

  ) : topGoals.map((p, i) => (
    <TouchableOpacity
      key={p.id}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Player', { playerId: Number(p.id), teamId, scope })}
      style={styles.row}
    >
      <View style={styles.rowLeft}>
        <Avatar id={p.id} player={p.info} size={32} rounded borderColor="#e7e7e7" />
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{i+1}. {p.name}</Text>
      </View>
      <Text style={[styles.rowValue, { color: GREEN }]}>{p.goals}</Text>
    </TouchableOpacity>
  ))}
</View>


      {/* ===================== Más minutos (con Avatar) ===================== */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

  <Text style={[styles.cardTitle, { color: colors.text }]}> Jugadores con más minutos</Text>

  {topMinutes.map((p, i) => (
    <TouchableOpacity
      key={p.id}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Player', { playerId: Number(p.id), teamId, scope })}
      style={styles.row}
    >
      <View style={styles.rowLeft}>
        <Avatar id={p.id} player={p.info} size={32} rounded borderColor="#e7e7e7" />
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{i+1}. {p.name}</Text>
      </View>
      <Text style={[styles.rowValue, { color: colors.text }]}>{p.minutes}</Text>
    </TouchableOpacity>
  ))}
</View>


      {/* ===================== Más amonestados (con Avatar) ===================== */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

  <Text style={[styles.cardTitle, { color: colors.text }]}>Más amonestados</Text>
  {topYellows.length === 0 ? (
    <Text style={styles.muted}>—</Text>
  ) : topYellows.map((p, i) => (
    <TouchableOpacity
      key={p.id}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Player', { playerId: Number(p.id), teamId, scope })}
      style={styles.row}
    >
      <View style={styles.rowLeft}>
        <Avatar id={p.id} player={p.info} size={32} rounded borderColor="#e7e7e7" />
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{i+1}. {p.name}</Text>
      </View>
      <Text style={[styles.rowValue, { color: YELL }]}>{p.yellows}</Text>
    </TouchableOpacity>
  ))}
</View>


      {/* ===================== Más expulsados (con Avatar) ===================== */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

  <Text style={[styles.cardTitle, { color: colors.text }]}>Más expulsados</Text>
  {topExpelled.length === 0 ? (
    <Text style={styles.muted}>—</Text>
  ) : topExpelled.map((p, i) => (
    <TouchableOpacity
      key={p.id}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Player', { playerId: Number(p.id), teamId, scope })}
      style={styles.row}
    >
      <View style={styles.rowLeft}>
        <Avatar id={p.id} player={p.info} size={32} rounded borderColor="#e7e7e7" />
        <Text style={[styles.rowName, { color: colors.text }]} numberOfLines={1}>{i+1}. {p.name}</Text>
      </View>
      <Text style={[styles.rowValue, { color: RED }]}>{p.expelled}</Text>
    </TouchableOpacity>
  ))}
</View>


      {/* ===================== Goles por línea ===================== */}
      <View style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>

        <Text style={[styles.cardTitle, { color: colors.text }]}>Goles por línea</Text>
        <View style={{ gap: 6 }}>
          {goalsByLine.map((g) => (
            <View key={g.k} style={styles.row}>
              <Text style={[styles.rowName, { color: colors.text }]}>{g.k}</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>{g.value}</Text>

            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 24, alignItems: 'center' },
  muted: { color: GRAY, fontSize: 13 },

  card: {
    backgroundColor:'#fff', borderWidth: 1, borderColor:'rgba(0,0,0,0.06)',
    borderRadius: 12, padding: 12, marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '800', color: NAVY, marginBottom: 8 },

  // === KPIs con iconos
  kpiGrid: { flexDirection:'row', flexWrap:'wrap', gap: 10 },
  kpiTile: {
    width: '48%', borderRadius: 14, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  kpiIconImg: { width: 22, height: 22, marginBottom: 6, resizeMode: 'contain' },
  kpiValue: { fontSize: 22, fontWeight:'800', lineHeight: 24 },
  kpiLabel: { fontSize: 12, color: GRAY, marginTop: 2 },

  avgRow: { marginTop: 6, backgroundColor:'rgba(0,0,0,0.04)', borderRadius: 8, alignSelf:'flex-start', paddingHorizontal:8, paddingVertical:3 },
  avgText: { fontSize: 11, color: NAVY },

  bar: { height: 6, backgroundColor:'rgba(0,0,0,0.06)', borderRadius: 999, marginTop: 8, overflow:'hidden' },
  barFill: { height: '100%', borderRadius: 999 },

  kpiFoot: { marginTop: 8, fontSize: 11, color: GRAY, textAlign:'right' },

  // === Listas con Avatar
  row: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical: 6 },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  rowName: { flex: 1, fontSize: 13, color: NAVY, marginLeft: 6 },
  rowValue: { fontSize: 14, fontWeight: '800', color: NAVY, minWidth: 28, textAlign:'right' },
});
export default withTheme(TeamStats);
