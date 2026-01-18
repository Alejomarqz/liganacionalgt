// TeamSquad.js — con dorsales enriquecidos desde events, soporte byTeam y pull-to-refresh
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, RefreshControl, TouchableOpacity  } from 'react-native';
import Avatar from './Avatar';
import { API_WEB_DEPORT_URL } from '@env';
import { withTheme } from '../utils/ThemeContext';

const RED  = '#d32f2f';
const NAVY = '#0b1f3b';
const POSN = { 1:'PO', 2:'DEF', 3:'MED', 4:'DEL' };

const toNum = (v) => (v==null || v==='') ? NaN : Number(v);
const toStr = (v) => (v==null) ? '' : String(v);

/* ===== Nombre: nick → PrimerNombre + PrimerApellido con partículas ===== */
const PARTICLE_SETS = [
  ["de"], ["del"], ["de","la"], ["de","los"], ["de","las"],
  ["da"], ["do"], ["das"], ["dos"], ["van"], ["von"], ["la"], ["las"], ["los"]
];
const splitTokens = (s='') => String(s).trim().split(/\s+/u).filter(Boolean);
function norm(words){ const parts=new Set(PARTICLE_SETS.map(a=>a.join(' '))); const out=[];
  for(let i=0;i<words.length;i++){ let used=false;
    if(i+1<words.length){const two=(words[i]+' '+words[i+1]).toLowerCase(); if(parts.has(two)){out.push(words[i].toLowerCase(),words[i+1].toLowerCase()); i++; used=true;}}
    if(!used){const one=words[i].toLowerCase(); out.push(parts.has(one)?one:one.replace(/^\p{L}/u,c=>c.toUpperCase()));}}
  return out.join(' ');
}
function pickSurname(last=''){const raw=splitTokens(last); if(!raw.length) return ''; const w0=(raw[0]||'').toLowerCase(); const w1=(raw[1]||'').toLowerCase();
  if(PARTICLE_SETS.some(s=>s.length===2&&s[0]===w0&&s[1]===w1)&&raw[1]) return norm([raw[0],raw[1]]);
  if(PARTICLE_SETS.some(s=>s.length===1&&s[0]===w0)&&raw[1]) return norm([raw[0],raw[1]]);
  return norm([raw[0]]);
}
const firstName = (f='') => { const t=splitTokens(f); return t.length?norm([t[0]]):''; };
const cleanNick = (n='') => { const t=splitTokens(n); return t.length?norm(t):''; };
function displayNameFrom(name={}){ const nick=(name?.nick??'').trim(); if(nick) return cleanNick(nick);
  return [firstName(name?.first||name?.given||''), pickSurname(name?.last||name?.family||name?.surname||'')].filter(Boolean).join(' ');
}

/* ===== Extraer dorsales de events/{id}.json → players{} ===== */
function numbersFromEventJSON(evt, teamId){
  const map = new Map();
  const tid = teamId!=null ? String(teamId) : null;
  if(evt && evt.players && typeof evt.players==='object'){
    for(const [pidKey,p] of Object.entries(evt.players)){
      if(!p) continue;
      const pid = toStr(p.playerId || p.id || p._id || pidKey);
      const belongs = !tid || (p.teamId!=null && String(p.teamId)===tid);
      const num = toNum(p.squadNo ?? p.shirt ?? p.number ?? p.dorsal);
      if(pid && belongs && Number.isFinite(num) && !map.has(pid)) map.set(pid,num);
    }
  }
  return map;
}

async function fetchEventIds({ pattern, teamId, limit=20 }){
  if(!pattern) return [];
  const url = String(pattern).replace(':teamId', String(teamId));
  try{
    const r = await fetch(url, { cache: 'no-store' });
    if(!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j) ? j : Object.values(j||{});
    const ids = [];
    for(const it of arr){
      const id = (it && (it.id||it.eventId||it.matchId||it.eid)) ?? (typeof it==='number'||typeof it==='string'?it:null);
      if(id!=null && !ids.includes(String(id))) ids.push(String(id));
      if(ids.length>=limit) break;
    }
    return ids;
  }catch{ return []; }
}

async function buildNumbersCache({ base, scope, eventIds, teamId }){
  const cache = new Map();
  for(const id of eventIds){
    try{
      const url = `${base}/${scope}/events/${id}.json`;
      const r = await fetch(url, { cache: 'no-store' });
      if(!r.ok) continue;
      const j = await r.json();
      const m = numbersFromEventJSON(j, teamId);
      for(const [pid,num] of m.entries()) if(!cache.has(pid)) cache.set(pid,num);
    }catch{}
  }
  return cache;
}

/* ===== Normalización de jugadores ===== */
function normalizePlayer(pid, wrap) {
  const info = (wrap && wrap.info) ? wrap.info : (wrap || {});
  const summary = (wrap && wrap.summary) ? wrap.summary : {};
  return {
    id: toStr(pid ?? info.id ?? info.playerId),
    _pid: toStr(pid ?? info.id ?? info.playerId),
    teamId: info.teamId,
    squadNo: info.squadNo,
    posnId: info.posnId,
    order: info.order,
    name: info.name || {},
    summary,
    images: info.images || wrap?.images || {},
    positionId: info.posnId,
    playerId: toStr(pid ?? info.id ?? info.playerId),
  };
}
function extractSquad(j){
  const candidates = [ j?.players, j?.plantilla, j?.roster, j?.info?.squad, j?.team?.players, j?.squad, j?.plantel ].filter(Boolean);
  let raw = [];
  for(const src of candidates){
    if(Array.isArray(src)){ raw = src; break; }
    if(src && typeof src==='object'){ raw = Object.entries(src); break; }
  }
  let list=[];
  if(raw.length){
    if(Array.isArray(raw[0])) list = raw.map(([pid,wrap])=>normalizePlayer(pid,wrap));
    else list = raw.map((wrap,idx)=>normalizePlayer(idx,wrap));
  }
  const coach =
    list.find(p=>toNum(p.posnId)===5) ||
    list.find(p=>String(p.role||'').toLowerCase().includes('coach')) || null;
  return { list, coach };
}

/* ===== Componente ===== */
function TeamSquad({
  teamId,
  scope = 'guatemala',
  navigation,
  eventIdsHint = null,           // opcional: para pruebas rápidas
  eventsByTeamUrlPattern = null, // recomendado: /events/byTeam/:teamId.json
  theme,                         // ⬅️ NUEVO
}) {
  const { colors } = theme;
  const base = String(API_WEB_DEPORT_URL || '').replace(/\/+$/, '');
  const sc   = String(scope).toLowerCase();


  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [raw, setRaw] = useState(null);
  const [numCache, setNumCache] = useState(null);

  // 🔽 pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const [reloadTs, setReloadTs]     = useState(0);

  // 1) Cargar plantilla base del equipo
  useEffect(()=>{
    let cancel=false;
    (async()=>{
      try{
        setLoading(true); setErr(null); setNumCache(null);
        const url = `${base}/${sc}/statsCenter/teams/${teamId}.json?ts=${Date.now()}`;
        const r = await fetch(url, { cache:'no-store' });
        if(!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if(!cancel) setRaw(j);
      }catch(e){ if(!cancel) setErr(String(e||'Error de red')); }
      finally{ if(!cancel) setLoading(false); }
    })();
    return ()=>{cancel=true;};
  },[teamId, sc, base, reloadTs]);

  // 2) Si faltan dorsales, completar desde events
  useEffect(()=>{
    let cancel=false;
    (async()=>{
      try{
        const { list } = extractSquad(raw || {});
        const hayFaltantes = (list||[]).some(p=>!Number.isFinite(toNum(p.squadNo)));
        if(!hayFaltantes) return;

        const ids = Array.isArray(eventIdsHint) && eventIdsHint.length
          ? eventIdsHint.map(String)
          : await fetchEventIds({ pattern: eventsByTeamUrlPattern, teamId, limit: 20 });

        if(!ids.length) return;

        const cache = await buildNumbersCache({ base, scope: sc, eventIds: ids, teamId });
        if(!cancel) setNumCache(cache);
      }catch{}
    })();
    return ()=>{cancel=true;};
  },[raw, base, sc, teamId, eventIdsHint, eventsByTeamUrlPattern, reloadTs]);

  // 3) Apagar el spinner de pull-to-refresh cuando termine la carga
  useEffect(() => {
    if (!loading && refreshing) setRefreshing(false);
  }, [loading, refreshing]);

  const { data, coach } = useMemo(()=>{
    const { list, coach } = extractSquad(raw || {});
    const enriched = list.map(p=>{
      const n = toNum(p.squadNo);
      if(Number.isFinite(n) && n>0) return p;
      const pid = toStr(p?.id || p?._pid || p?.playerId);
      const from = numCache?.get(pid);
      return (from && Number.isFinite(from)) ? { ...p, squadNo: from } : p;
    });

    const arr = enriched.filter(p=>[1,2,3,4].includes(toNum(p.posnId)));
    arr.sort((a,b)=>{
      const pa=toNum(a.posnId), pb=toNum(b.posnId);
      if(pa!==pb) return (pa||9)-(pb||9);
      const na=toNum(a.squadNo), nb=toNum(b.squadNo);
      if(Number.isFinite(na) && Number.isFinite(nb)) return na-nb;
      if(Number.isFinite(na)) return -1;
      if(Number.isFinite(nb)) return  1;
      const an=displayNameFrom(a?.name||{}).toLowerCase();
      const bn=displayNameFrom(b?.name||{}).toLowerCase();
      return an.localeCompare(bn,'es');
    });
    return { data: arr, coach };
  },[raw, numCache]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
        <Text style={[styles.muted, { color: colors.textMuted }]}>Cargando plantilla…</Text>
      </View>
    );
  }

  if (err || (!data?.length && !coach)) {
    return (
      <View style={styles.center}>
        <Text style={[styles.muted, { color: colors.textMuted }]}> Sin información de plantilla para este torneo.</Text>
        <Text style={[styles.muted, { marginTop: 4, color: colors.textMuted }, ]}> {err ? `(${err})` : `(teamId=${teamId}, scope=${scope})`}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBg }}>
      <FlatList
        data={data}
        keyExtractor={(it, idx) => toStr(it?.id || it?._pid || it?.playerId || idx)}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ padding: 10, paddingBottom: 10 }}
        renderItem={({ item }) => {
  const pid    = item?.id || item?._pid || item?.playerId;
  const name   = displayNameFrom(item?.name || {});
  const numInt = Number.parseInt(item?.squadNo, 10);
  const hasNumber = Number.isFinite(numInt) && numInt > 0;
  const posId  = toNum(item?.posnId || item?.positionId || 0);
  const pos    = POSN[posId] || '—';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => navigation?.navigate('Player', {
        playerId: pid,
        teamId,
        scope,
        player: item, // mandamos info+summary para fallback
      })}
    >
      <View style={[styles.row, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, ]} >
        <Avatar id={pid} player={item} size={44} rounded borderColor={colors.cardBorder} style={{ marginRight: 10 }} />
        <View style={[styles.numPill, { backgroundColor: colors.rowBg || colors.cardBg }, ]}>
          <Text style={[styles.numText, { color: colors.accent }]}> {hasNumber ? `${numInt}` : '—'} </Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text
            style={[styles.name, { color: colors.text }]}
            numberOfLines={1}
          >
            {name}
          </Text>
          <Text
            style={[styles.sub, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            {pos}
          </Text>
  </View>
</View>

    </TouchableOpacity>
  );
}}
        // 🔽 Pull-to-refresh con spinner rojo (igual que TeamMatches)
        refreshControl={
  <RefreshControl
    refreshing={refreshing}
    onRefresh={() => {
      if (!refreshing) {
        setRefreshing(true);
        setReloadTs(Date.now());
      }
    }}
    colors={[colors.accent]}              // Android
    tintColor={colors.accent}             // iOS
    progressBackgroundColor={colors.cardBg} // Android
  />
}

      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: 20, alignItems: 'center' },
  muted: { color: '#666', fontSize: 13, marginTop: 6 },
  row: {
    flexDirection:'row', alignItems:'center',
    backgroundColor:'#fff', borderWidth:1, borderColor:'rgba(0,0,0,0.06)',
    padding:10, borderRadius:10,
  },
  numPill: {
    minWidth: 42, paddingHorizontal: 10, height: 26,
    borderRadius: 7, backgroundColor: '#f7f7f7',
    alignItems:'center', justifyContent:'center',
  },
  numText: { fontSize: 13, fontWeight: '800', color: RED },
  name: { fontSize: 14, fontWeight: '700', color: NAVY },
  sub:  { fontSize: 12, color: '#555', marginTop: 2 },
  sep: { height: 8 },
});
export default withTheme(TeamSquad);
