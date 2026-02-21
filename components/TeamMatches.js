// components/TeamMatches.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl, AppState, InteractionManager, Platform } from 'react-native';
import { API_WEB_DEPORT_URL } from '@env';
import Card from './Card';
import { useFocusEffect } from '@react-navigation/native';
import analytics from '@react-native-firebase/analytics';
import { useTheme } from '../utils/ThemeContext';




/* ========================== Constantes / Helpers ========================== */
const BASE = String(API_WEB_DEPORT_URL || '').replace(/\/+$/,'');
const SCOPE_DEFAULT = 'guatemala';
const POLL_MS = 20000;              // overlay cada 20s
const FUTURE = new Set([0]);        // Programado

const isObj   = x => !!x && typeof x === 'object';

function isHHMM(s){ return typeof s === 'string' && /^\d{2}:\d{2}$/.test(s); }

function sanitizeForCard(m){
  if (!m) return m;
  const out = { ...m };

  // 1) fecha ajustada válida (YYYYMMDD)
  const dateRaw = (out._dateAdj || out.date || '');
  out._dateAdj = /^\d{8}$/.test(String(dateRaw)) ? String(dateRaw) : (String(out.date||'').replace(/-/g,''));

  // 2) hora válida: si no es HH:MM, mandamos cadena vacía
  const hhmm = (out.scheduledStart == null ? '' : String(out.scheduledStart));
  out.scheduledStart = isHHMM(hhmm) ? hhmm : '';

  // 3) por seguridad, gmt numérico o null
  out.gmt = Number.isFinite(+out.gmt) ? Number(out.gmt) : null;

  return out;
}

function hourToGT(hhmm, gmtOrigen, mode='trustLocal') {
  const s = String(hhmm || '').slice(0,5);
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return { hhmm: 'Por definir', shift: 0 };  // ⬅️ igual que Calendar

  let H = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  let M = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  if (mode === 'convert' && Number.isFinite(+gmtOrigen)) {
    const GT_OFFSET = -6;
    const delta = GT_OFFSET - Number(gmtOrigen);
    let total = H*60 + M + delta*60, shift = 0;
    while (total < 0)    { total += 1440; shift -= 1; }
    while (total >=1440) { total -= 1440; shift += 1; }
    H = Math.floor(total/60); M = total%60;
    return { hhmm: `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`, shift };
  }
  return { hhmm: `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`, shift: 0 };
}



function shiftYmd(ymd, shift){
  const s=String(ymd||''); if (!shift || s.length!==8) return s||'';
  const y=+s.slice(0,4), mo=+s.slice(4,6)-1, d=+s.slice(6,8);
  const dt=new Date(Date.UTC(y,mo,d)); dt.setUTCDate(dt.getUTCDate()+shift);
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth()+1).padStart(2,'0')}${String(dt.getUTCDate()).padStart(2,'0')}`;
}
function normalizeRoundTitle(rt, j) {
  const raw = String(rt || '').trim();
  if (/^jornada\s*\d+$/i.test(raw)) return raw.replace(/\s+/g,' ').replace(/Jornada/i,'Jornada');
  if (typeof j === 'number') return `Jornada ${j}`;
  if (!raw || raw === '...' || raw === '···') return 'Jornada';
  return raw.replace(/[•·]+/g,'').trim() || 'Jornada';
}
function sortRounds(a,b){
  const rx=/^Jornada\s+(\d+)$/i, ma=String(a).match(rx), mb=String(b).match(rx);
  if (ma&&mb) return +ma[1]-+mb[1];
  if (ma&&!mb) return -1; if (!ma&&mb) return 1;
  return String(a).localeCompare(String(b));
}
function sortMatches(a,b){
  const ka = `${(a && (a._dateAdj||a.date) || '')}${(a && a.scheduledStart) || ''}${String(a && a.matchId || '').padStart(9,'0')}`;
  const kb = `${(b && (b._dateAdj||b.date) || '')}${(b && b.scheduledStart) || ''}${String(b && b.matchId || '').padStart(9,'0')}`;
  return ka.localeCompare(kb);
}
function normalizeScoreForFirstRender(ev){
  if (!isObj(ev)) return ev;
  const teams = isObj(ev.teams) ? ev.teams : {};
  const hid = teams.homeTeamId;
  const aid = teams.awayTeamId;
  if (!ev.scoreHA && isObj(ev.scoreStatus) && hid!=null && aid!=null){
    const hs=Number(ev.scoreStatus[String(hid)] && ev.scoreStatus[String(hid)].score);
    const as=Number(ev.scoreStatus[String(aid)] && ev.scoreStatus[String(aid)].score);
    if (isFinite(hs) && isFinite(as)) ev={...ev, scoreHA:{H:hs, A:as}};
  }
  if (!ev.scoreHA && typeof ev.score==='string'){
    const m=/^\s*(\d+)\s*[-:]\s*(\d+)\s*$/.exec(ev.score);
    if (m){
      const H=+m[1], A=+m[2];
      const patch={...ev, scoreHA:{H,A}};
      if (hid!=null && aid!=null && !ev.scoreStatus){
        patch.scoreStatus = { [String(hid)]:{score:H}, [String(aid)]:{score:A} };
      }
      return patch;
    }
  }
  return ev;
}

/* ============================ Fetch de agenda ============================ */
async function fetchAgendaForTeam(teamId, scope){
  const teamUrl = `${BASE}/${scope}/agendaMaM/agenda_${teamId}.json`;
  const allUrl  = `${BASE}/${scope}/agenda-jornadas.json`;

  // 1) específica del equipo
  try{
    const r = await fetch(`${teamUrl}?t=${Date.now()}`, { headers:{'Cache-Control':'no-cache'} });
    if (r.ok){
      const j = await r.json();
      return j && j.events ? j.events : (j || {});
    }
  }catch(_){}

  // 2) fallback: filtrar jornadas por equipo
  try{
    const r = await fetch(`${allUrl}?t=${Date.now()}`, { headers:{'Cache-Control':'no-cache'} });
    if (r.ok){
      const j   = await r.json();
      const evs = j && j.events ? j.events : {};
      const out = {};
      const keys = Object.keys(evs||{});
      for (let i=0;i<keys.length;i++){
        const k = keys[i];
        const ev = evs[k];
        const hid = ev && ev.teams ? (ev.teams.homeTeamId || ev.teams.homeId) : null;
        const aid = ev && ev.teams ? (ev.teams.awayTeamId || ev.teams.awayId) : null;
        if (String(hid)===String(teamId) || String(aid)===String(teamId)){
          out[k] = ev;
        }
      }
      return out;
    }
  }catch(_){}

  return {};
}

/* ============ Transformación event -> match (para <Card match={...}>) ============ */
function eventToMatch(key, ev, scope){
  if (!isObj(ev)) return null;
  const teams = isObj(ev.teams) ? ev.teams : {};
  const homeTeamId = teams.homeTeamId != null ? teams.homeTeamId : (teams.homeId != null ? teams.homeId : null);
  const awayTeamId = teams.awayTeamId != null ? teams.awayTeamId : (teams.awayId != null ? teams.awayId : null);

  const mode = (scope === 'guatemala') ? 'trustLocal' : 'convert';
  const { hhmm, shift } = hourToGT(String(ev.scheduledStart || ev.scheduled || ''), ev.gmt, mode);
  const dateAdj = shift ? shiftYmd(ev.date, shift) : ev.date;
  
  const match = {
    channelKey: key,
    matchId: Number(String(key).split('.').pop() || ev.matchId || 0),
    scope: scope,
    jornada: typeof ev.jornada==='number' ? ev.jornada
          : (typeof ev.jornada==='string' && /^\d+$/.test(ev.jornada) ? Number(ev.jornada) : null),
    roundTitle: normalizeRoundTitle(ev.roundTitle, ev.jornada),

    date: String(ev.date||'').replace(/-/g,''),
    _dateAdj: String(dateAdj||'').replace(/-/g,''),
    scheduledStart: (isHHMM(hhmm) ? hhmm : ''),   // ⬅️ cadena vacía si no es HH:MM
    gmt: isFinite(+ev.gmt) ? Number(ev.gmt) : null,

    statusId: Number(ev.statusId != null ? ev.statusId : 0),
    statusObj: ev.status || null,

    teams:{
      homeTeamId: homeTeamId,
      awayTeamId: awayTeamId,
      homeTeamName: teams.homeTeamName || teams.homeName || '',
      awayTeamName: teams.awayTeamName || teams.awayName || '',
    },

    score: ev.score != null ? ev.score : null,
    scoreStatus: ev.scoreStatus != null ? ev.scoreStatus : null,
  };
  return normalizeScoreForFirstRender(match);
}

/* ========================= Overlay (events/{id}.json) ========================= */
function buildEventUrl(scope, id){ return `${BASE}/${scope}/events/${id}.json`; }

/* ============================= Componente principal ============================= */
export default function TeamMatches({ teamId, navigation, scope=SCOPE_DEFAULT, initialTab = 'future', onTabChange, }) {
  const { theme } = useTheme();
  const UI = theme.colors;
  const isDark = theme.name === 'dark' || theme.mode === 'dark';

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [matches, setMatches] = useState([]);

  // overlay: Map(matchId -> patch)
  const [overlay, setOverlay] = useState(new Map());
  const overlayAbortRef = useRef(null);
  const pollRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  // --- NUEVO: tab de visualización (solo esto es “el switch”)
  const normTab = (t) => (t === 'future' || t === 'past') ? t : 'future';
  const [tab, setTab] = useState(normTab(initialTab));

  const setTabAndNotify = useCallback((next) => {
  const v = normTab(next);
  setTab(v);
  onTabChange && onTabChange(v);
}, [onTabChange]);

  // scroll al separador (SE MANTIENE, no lo usamos con el switch, pero no lo tocamos)
  const scrollRef = useRef(null);

  
  
  const applyOverlay = useCallback((m)=>{
    if (!m) return m;
    const p = overlay.get(String(m.matchId));
    if (!p) return m;
    const merged = { ...m };
    if (p.statusId != null)   merged.statusId   = Number(p.statusId);
    if (p.statusObj != null)  merged.statusObj  = p.statusObj;
    if (p.score != null)      merged.score      = p.score;
    if (p.scoreStatus != null)merged.scoreStatus= p.scoreStatus;
    return normalizeScoreForFirstRender(merged);
  }, [overlay]);

  const load = useCallback(async ()=>{
    setLoading(true); setErr('');
    try{
      const eventsObj = await fetchAgendaForTeam(teamId, scope);
      const flat = [];
      const keys = Object.keys(eventsObj||{});
      keys.sort(sortRounds);
      for (let i=0;i<keys.length;i++){
        const key = keys[i];
        const ev  = eventsObj[key];
        const m   = eventToMatch(key, ev, scope);
        if (m) flat.push(m);
      }
      flat.sort(sortMatches);
      setMatches(flat);
      setOverlay(prev => new Map(prev));
    }catch(e){
      setErr(e && e.message ? e.message : 'No se pudo cargar la agenda');
    }finally{
      setLoading(false);
    }
  }, [teamId, scope]);

  useEffect(()=>{ load(); }, [load]);

  const onRefresh = useCallback(async ()=>{
    setRefreshing(true);
    try {
      await load();
      await fetchOverlayOnce(true);
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  // dividir en pasados vs próximos (sin headers de fecha)
  const pastAndFuture = useMemo(()=>{
    const past = [];
    const future = [];
    for (let i=0;i<matches.length;i++){
      const m = matches[i];
      if (FUTURE.has(Number(m.statusId))) future.push(m);
      else past.push(m);
    }
    return { past, future };
  }, [matches]);

  // ids para overlay
  const idsForOverlay = useMemo(()=>{
    const ids = [];
    for (let i=0;i<matches.length;i++){
      const id = String(matches[i].matchId||'');
      if (id) ids.push(id);
    }
    return Array.from(new Set(ids));
  }, [matches]);

  // overlay fetch
  const fetchOverlayOnce = useCallback(async (silent)=>{
    if (!idsForOverlay.length) return;
    if (overlayAbortRef.current) { try{ overlayAbortRef.current.abort(); }catch(_){ } }
    const controller = new AbortController();
    overlayAbortRef.current = controller;
    try{
      const patches = await Promise.all(idsForOverlay.map(async (id)=>{
        const res = await fetch(`${buildEventUrl(scope, id)}?t=${Date.now()}`, {
          signal: controller.signal,
          headers:{'Cache-Control':'no-cache'}
        });
        if (!res.ok) throw new Error('net');
        const data = await res.json();
        const statusId    = Number((data && data.statusId != null) ? data.statusId
                              : (data && data.status && (data.status.statusId != null ? data.status.statusId : data.status.id)));
        const statusObj   = (data && (data.status || data.statusObj)) || null;
        const score       = (data && data.score) || null;
        const scoreStatus = (data && data.scoreStatus) || null;
        return [String(id), { statusId: isFinite(statusId)?statusId:0, statusObj, score, scoreStatus }];
      }));
      setOverlay(prev=>{
        const next = new Map(prev);
        for (let i=0;i<patches.length;i++){
          const p = patches[i];
          next.set(p[0], p[1]);
        }
        return next;
      });
    }catch(e){
      if (!silent) { /* opcional: console.log('overlay error', e && e.message); */ }
    }
  }, [idsForOverlay, scope]);

  const startOverlayPolling = useCallback(()=>{
    if (pollRef.current) return;
    fetchOverlayOnce(true);
    pollRef.current = setInterval(fetchOverlayOnce, POLL_MS);
  }, [fetchOverlayOnce]);

  const stopOverlayPolling = useCallback(()=>{
    if (pollRef.current){ clearInterval(pollRef.current); pollRef.current=null; }
    if (overlayAbortRef.current){ try{ overlayAbortRef.current.abort(); }catch(_){ } }
  }, []);

  useEffect(()=>{
    const sub = AppState.addEventListener('change', st => {
      appStateRef.current = st;
      if (st === 'active') startOverlayPolling(); else stopOverlayPolling();
    });
    startOverlayPolling();
    return ()=>{ stopOverlayPolling(); sub && sub.remove && sub.remove(); };
  }, [startOverlayPolling, stopOverlayPolling]);
  useEffect(() => {
  setTab(normTab(initialTab));     // sincroniza con el valor que venga de TeamScreen
}, [initialTab]);

  // (nos quedamos con tu focus effect si lo tenías; no afecta al switch)
  useFocusEffect(
    React.useCallback(() => {
      InteractionManager.runAfterInteractions(() => {});
      return () => {};
    }, [])
  );

  /* ================================ Render ================================ */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="small" color={UI.accent} />
<Text style={[styles.muted, { color: UI.textMuted }]}>Cargando partidos…</Text>
      </View>
    );
  }
  if (err) {
    return (
      <View style={styles.center}>
        <Text style={[styles.error, { color: UI.accent }]}>{String(err)}</Text>
        <TouchableOpacity onPress={load} style={{marginTop:8}}>
          <Text style={{ color: UI.accent, fontWeight:'800' }}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
  <ScrollView
    style={[styles.scroll, { backgroundColor: UI.screenBg }]}
    ref={scrollRef}
    contentContainerStyle={[styles.container, { backgroundColor: UI.screenBg }]}
    nestedScrollEnabled={true}
    refreshControl={
  <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      colors={[UI.accent]}
      tintColor={UI.accent}
      progressBackgroundColor={UI.cardBg}
    />
  }

    
  >

    {/* ====== Switch Próximos / Resultados ====== */}
    <View
  style={[
    styles.switchWrap,
    {
      backgroundColor: UI.segmentBg,
      borderColor: UI.segmentBorder,
    },
  ]}
>

      <TouchableOpacity
  style={[
    styles.switchBtn,
    tab === 'future' && [
      styles.switchBtnActive,
      { backgroundColor: UI.accent, borderColor: UI.accent },
    ],
  ]}
        onPress={() => setTabAndNotify('future')}
        activeOpacity={0.8}
      >
  <Text
    style={[
      styles.switchTxt,
      { color: UI.segmentText },
      tab === 'future' && { color: UI.segmentTextActive },
    ]}
  >
    Próximos
  </Text>
</TouchableOpacity>

      <TouchableOpacity
  style={[
    styles.switchBtn,
    tab === 'past' && [
      styles.switchBtnActive,
      { backgroundColor: UI.accent, borderColor: UI.accent },
    ],
  ]}
        onPress={() => setTabAndNotify('past')}
        activeOpacity={0.8}
      >
  <Text
    style={[
      styles.switchTxt,
      { color: UI.segmentText },
      tab === 'past' && { color: UI.segmentTextActive },
    ]}
  >
    Resultados
  </Text>
</TouchableOpacity>
    </View>

    {/* ===== Contenido según TAB ===== */}
    {tab === 'past' && (
      <>
       {/* Título (opcional) */}
        {pastAndFuture.past.length > 0 && (
          <View style={{ minHeight: 1, paddingTop: 0, marginTop: 0 }}>
            <Text style={[styles.blockTitle, { color: UI.text }]}>Últimos resultados</Text>
          </View>
        )}
        {/* Resultados (pasados) sin títulos de fecha */}
        {[...pastAndFuture.past].reverse().map((raw, idx, arr) => {
          const merged = applyOverlay(raw);
          const isLast = idx === arr.length - 1;
          return (
            <View key={`f-${merged.matchId||idx}`} style={[styles.cardWrap, isLast && styles.cardWrapLast]}>
              <Card
  match={sanitizeForCard(merged)}
  onPress={async () => {
    if (!merged || !merged.matchId) return;

    // 🔹 Analytics: abrir partido desde TeamScreen / TeamMatches
    try {
      await analytics().logEvent('open_match_from_team', {
        origin: 'team',
        match_id: String(merged.matchId),
        home_team: String(merged?.teams?.homeTeamName ?? ''),
        away_team: String(merged?.teams?.awayTeamName ?? ''),
        scope: String(merged?.scope ?? scope ?? ''),
      });
    } catch {}

    if (navigation && navigation.navigate) {
      navigation.push('Match', {
        matchId: String(merged.matchId),
        channel: merged.scope || scope,
        pre: {
          id: String(merged.matchId),
          teams: {
            homeTeamId: String((merged.teams && merged.teams.homeTeamId) || ''),
            awayTeamId: String((merged.teams && merged.teams.awayTeamId) || ''),
            homeTeamName: merged.teams && (merged.teams.homeTeamName || ''),
            awayTeamName: merged.teams && (merged.teams.awayTeamName || ''),
          },
          date: merged._dateAdj || merged.date || null,
          scheduledStart: merged.scheduledStart || null,
          gmt: merged.gmt != null ? merged.gmt : null,
        },
      });
    }
  }}
  showTourneyBadge={false}
  tourneyText=""
/>

            </View>
          );
        })}
      </>
    )}

    {tab === 'future' && (
      <>
        {/* Título (opcional) */}
        {pastAndFuture.future.length > 0 && (
          <View style={{ minHeight: 1, paddingTop: 2, marginTop: 2 }}>
            <Text style={[styles.blockTitle, { color: UI.text }]}>Próximos partidos</Text>
          </View>
        )}

        {/* Próximos (sin títulos de fecha) */}
        {pastAndFuture.future.map((raw, idx, arr) => {
          const merged = applyOverlay(raw);
          const isLast = idx === arr.length - 1;
          return (
            <View key={`f-${merged.matchId||idx}`} style={[styles.cardWrap, isLast && styles.cardWrapLast]}>
              <Card
                match={sanitizeForCard(merged)}  // ← evita NaN:NaN
                onPress={() => {
                  if (!merged || !merged.matchId) return;
                  if (navigation && navigation.navigate){
                    navigation.push('Match', {
                      matchId: String(merged.matchId),
                      channel: merged.scope || scope,
                      pre:{
                        id:String(merged.matchId),
                        teams:{
                          homeTeamId:String(merged.teams && merged.teams.homeTeamId || ''),
                          awayTeamId:String(merged.teams && merged.teams.awayTeamId || ''),
                          homeTeamName: merged.teams && (merged.teams.homeTeamName || ''),
                          awayTeamName: merged.teams && (merged.teams.awayTeamName || ''),
                        },
                        date: merged._dateAdj || merged.date || null,
                        scheduledStart: merged.scheduledStart || null,
                        gmt: merged.gmt != null ? merged.gmt : null,
                      },
                    });
                  }
                }}
                showTourneyBadge={false}
                tourneyText=""
              />
            </View>
          );
        })}
      </>
    )}

  </ScrollView>
  );

}

/* =================================== Estilos =================================== */
const styles = StyleSheet.create({
    scroll: {
    flex: 1,        // llena todo el alto disponible de la tab
    width: '100%',  // ocupa todo el ancho
  },
  container: {
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 10, // casi ancho completo (como Calendar)
    width: '100%',
  },
  cardWrap: {
    marginBottom: 0,
  },
  cardWrapLast: {
   marginBottom: 0,     // sin margen en el último
 },

  center:{ alignItems:'center', paddingVertical:16 },
  muted:{ opacity:0.7, marginTop:6 },
  error:{ color:'#d32f2f' },

  blockTitle:{
    fontSize:15, fontWeight:'800', color:'#0f172a',
    paddingHorizontal: 4, marginTop: 4, marginBottom: 6,
  },

  // ===== Estilos NUEVOS del switch =====
  switchWrap:{
    flexDirection:'row',
    alignSelf:'center',
    backgroundColor:'#eaeaea',
    borderRadius:999,
    padding:0,
    marginHorizontal:10,
    marginBottom:8,
    marginTop:0,
    borderWidth: 1,
    borderColor: '#0f1235',
  },
  switchBtn:{
    paddingVertical:4,
    paddingHorizontal:12,
    borderRadius:999,
  },
  switchBtnActive:{
    borderWidth: 1,
    
  },
  switchTxt:{
    fontSize:13,
    fontWeight:'800',
    
  },
  switchTxtActive:{
    fontWeight:'900',
  },
});
