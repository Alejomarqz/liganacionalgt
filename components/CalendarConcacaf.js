// CalendarConcacaf.js — SOLO Eliminatorias CONCACAF (tabs por fecha) + overlay 20s
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, Easing, Platform, RefreshControl, AppState,
} from 'react-native';
import { API_WEB_DEPORT_URL } from '@env';
import Header from './Header';
import AdFooter from '../ads/AdFooter';
import Card from './Card';
import TeamSearchModal from './TeamSearchModal';
import FooterTabs from './FooterTabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import analytics from '@react-native-firebase/analytics';
import { useTheme } from '../utils/ThemeContext';

/* ==================== Constantes / helpers ==================== */
const GT_OFFSET = -6;
const POLL_MS   = 20000;
const LIVE_SET  = new Set([1, 5, 6, 8, 10, 12]);

const BASE = String(API_WEB_DEPORT_URL || '').replace(/\/+$/,'');
const CC_URL = `${BASE}/concacaf/agendaMaM/es/agenda.json`;
const buildEventUrl = (scope, id) => `${BASE}/${scope}/events/${id}.json`;

const isLive = (statusId) => LIVE_SET.has(Number(statusId));

function hourToGT(hhmm, gmtOrigen, mode='trustLocal') {
  const s = String(hhmm || '').slice(0,5);
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return { hhmm: 'Por definir', shift: 0 };

  let H = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  let M = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  if (mode === 'convert' && Number.isFinite(+gmtOrigen)) {
    const delta = GT_OFFSET - Number(gmtOrigen);
    let total = H*60 + M + delta*60;
    let shift = 0;
    while (total < 0)    { total += 1440; shift -= 1; }
    while (total >=1440) { total -= 1440; shift += 1; }
    H = Math.floor(total/60); M = total%60;
    return { hhmm: `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`, shift };
  }
  return { hhmm: `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`, shift: 0 };
}

function shiftYmd(ymd, shift) {
  const s = String(ymd || '');
  if (!shift || s.length !== 8) return s || '';
  const y = +s.slice(0,4), mo = +s.slice(4,6)-1, d = +s.slice(6,8);
  const dt = new Date(Date.UTC(y, mo, d));
  dt.setUTCDate(dt.getUTCDate()+shift);
  return `${dt.getUTCFullYear()}${String(dt.getUTCMonth()+1).padStart(2,'0')}${String(dt.getUTCDate()).padStart(2,'0')}`;
}

function sortMatches(a,b){
  const ka = `${a?._dateAdj||a?.date||''}${a?.scheduledStart||''}${String(a?.matchId||'').padStart(9,'0')}`;
  const kb = `${b?._dateAdj||b?.date||''}${b?.scheduledStart||''}${String(b?.matchId||'').padStart(9,'0')}`;
  return ka.localeCompare(kb);
}

function normalizeScoreForFirstRender(ev){
  if (!ev||typeof ev!=='object') return ev;
  const hid=ev?.teams?.homeTeamId, aid=ev?.teams?.awayTeamId;
  if (!ev.scoreHA && hid!=null && aid!=null && ev?.scoreStatus){
    const hs=Number(ev.scoreStatus[String(hid)]?.score);
    const as=Number(ev.scoreStatus[String(aid)]?.score);
    if (Number.isFinite(hs)&&Number.isFinite(as)) ev={...ev,scoreHA:{H:hs,A:as}};
  }
  if (!ev.scoreHA && typeof ev.score==='string'){
    const m=/^\s*(\d+)\s*[-:]\s*(\d+)\s*$/.exec(ev.score);
    if (m){
      const H=parseInt(m[1],10), A=parseInt(m[2],10);
      const patched={...ev,scoreHA:{H,A}};
      if (hid!=null && aid!=null && !ev.scoreStatus){
        patched.scoreStatus={ [String(hid)]:{score:H}, [String(aid)]:{score:A} };
      }
      ev=patched;
    }
  }
  return ev;
}

function eventsToArray(eventsObj, scope='concacaf'){
  const out=[];
  for (const key in (eventsObj||{})){
    if (!Object.prototype.hasOwnProperty.call(eventsObj,key)) continue;
    const ev=eventsObj[key]||{};
    const matchId=key.split('.').pop();

    const teams=ev.teams||{};
    const homeTeamId=teams.homeTeamId??teams.homeId??null;
    const awayTeamId=teams.awayTeamId??teams.awayId??null;

    // Para CONCACAF normalmente conviene convertir por gmt (si tu feed lo trae bien)
    const mode = 'convert';
    const { hhmm, shift } = hourToGT(String(ev.scheduledStart||''), ev.gmt, mode);
    const dateAdj = shift ? shiftYmd(ev.date, shift) : ev.date;

    out.push({
      channelKey:key,
      matchId:Number(matchId),
      scope,
      date: String(ev.date||'').replace(/-/g,''),
      _dateAdj: String(dateAdj||'').replace(/-/g,''),
      scheduledStart: hhmm || 'Por definir',
      gmt: Number.isFinite(+ev.gmt) ? Number(ev.gmt) : null,
      statusId: Number(ev.statusId ?? 0),
      statusObj: ev.status || null,
      teams:{
        homeTeamId, awayTeamId,
        homeTeamName: teams.homeTeamName ?? teams.homeName ?? '',
        awayTeamName: teams.awayTeamName ?? teams.awayName ?? '',
      },
      score: ev.score ?? null,
      scoreStatus: ev.scoreStatus ?? null,
    });
  }
  return out;
}

function ymdOnly(ymd){ return String(ymd||'').slice(0,8); }
function formatDateTab(ymd){
  const s=ymdOnly(ymd); if (s.length!==8) return s||'';
  const dt=new Date(+s.slice(0,4), +s.slice(4,6)-1, +s.slice(6,8));
  const dias=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const dd=String(dt.getDate()).padStart(2,'0');
  const mm=String(dt.getMonth()+1).padStart(2,'0');
  return `${dias[dt.getDay()]} ${dd}/${mm}`;
}

function minutesToKO(m){
  if (!m || Number(m.statusId)!==0) return null;
  const ymd=ymdOnly(m._dateAdj||m.date);
  const hhmm=String(m.scheduledStart||'').slice(0,5);
  if (ymd.length!==8 || hhmm.length<4) return null;
  const y=+ymd.slice(0,4), mo=+ymd.slice(4,6)-1, d=+ymd.slice(6,8);
  const [H,M]=hhmm.split(':').map(Number);
  const schedLocal=new Date(y,mo,d,H,M).getTime();
  return Math.round((schedLocal-Date.now())/60000);
}
const isNearKO = (m) => { const mins=minutesToKO(m); return mins!==null && mins<=30 && mins>=-5; };

export default function CalendarConcacaf({ navigation }) {
  useEffect(() => {
    (async () => {
      try { await analytics().logScreenView({ screen_name: 'CalendarConcacaf', screen_class: 'CalendarConcacaf' }); } catch {}
    })();
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const [showTeamSearch, setShowTeamSearch] = useState(false);

  const insets = useSafeAreaInsets();
  const TAB_H = 58;
  const padBottom = TAB_H + 6;
  const safeBottom = Math.max(insets.bottom || 0, 0);

  const { theme } = useTheme();
  const colors = theme.colors;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [tabs, setTabs] = useState([]); // [{key: ymd, label}]
  const [active, setActive] = useState('');
  const [byDate, setByDate] = useState(new Map());

  const tabsScrollRef = useRef(null);
  const [tabPositions, setTabPositions] = useState({});
  const didInitialAlign = useRef(false);

  const [livePulse] = useState(new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(livePulse, { toValue: 1.12, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(livePulse, { toValue: 1.00, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { try{loop.stop();}catch{} };
  }, [livePulse]);

  const fetchCC = useCallback(async (silent=false) => {
    if (!silent) setLoading(true);
    setErr('');
    try{
      const res = await fetch(`${CC_URL}?t=${Date.now()}`, { headers:{'Cache-Control':'no-cache, no-store, must-revalidate','Pragma':'no-cache','Expires':'0'} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const arr = eventsToArray(data?.events||{}, 'concacaf').map(normalizeScoreForFirstRender);

      const by = new Map();
      for (const m of arr){
        const ymd=String(m._dateAdj||m.date||'').slice(0,8);
        if (ymd.length!==8) continue;
        if (!by.has(ymd)) by.set(ymd,[]);
        by.get(ymd).push(m);
      }
      for (const [k,list] of by.entries()) by.set(k, list.sort(sortMatches));

      const ymds=Array.from(by.keys()).sort();
      const tabsArr=ymds.map(ymd=>({key:ymd, label:formatDateTab(ymd)}));

      setByDate(by);
      setTabs(tabsArr);

      const now=new Date();
      const today=`${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
      let key=ymds[0]||'';
      for (let i=0;i<ymds.length;i++){ if (ymds[i]>=today){ key=ymds[i]; break; } }
      setActive(prev => (prev && by.has(prev)) ? prev : key);
    }catch(e){ setErr(e?.message||'Error'); }
    finally{ if(!silent) setLoading(false); }
  },[]);

  useEffect(()=>{ fetchCC(false); },[fetchCC]);

  const onRefresh = useCallback(async ()=>{
    setRefreshing(true);
    try{ await fetchCC(true); }
    finally{ setRefreshing(false); }
  },[fetchCC]);

  const activeList = useMemo(()=> byDate.get(active) || [], [byDate, active]);

  /* ==================== OVERLAY en vivo (concacaf) ==================== */
  const [overlay, setOverlay] = useState(new Map());
  const overlayAbortRef = useRef(null);

  const applyOverlay = useCallback((m)=>{
    if (!m) return m;
    const p = overlay.get(String(m.matchId));
    if (!p) return m;
    const merged = { ...m };
    if (p.statusId != null) merged.statusId = Number(p.statusId);
    if (p.statusObj != null) merged.statusObj = p.statusObj;
    if (p.score != null) merged.score = p.score;
    if (p.scoreStatus != null) merged.scoreStatus = p.scoreStatus;
    return normalizeScoreForFirstRender(merged);
  },[overlay]);

  const buildTargetIds = useCallback(()=>{
    const list = activeList;
    const liveFirst = list.filter(m => isLive(m.statusId));
    const nearKOList = list.filter(m => !isLive(m.statusId) && isNearKO(m));
    const rest = list.filter(m => !liveFirst.includes(m) && !nearKOList.includes(m));
    const ordered = [...liveFirst, ...nearKOList, ...rest].slice(0, 12);
    return ordered.map(m => String(m.matchId));
  },[activeList]);

  const fetchOverlayOnce = useCallback(async ()=>{
    if (overlayAbortRef.current) { try{ overlayAbortRef.current.abort(); }catch{} }
    const ids = buildTargetIds();
    if (!ids.length) return;

    const controller = new AbortController();
    overlayAbortRef.current = controller;

    try{
      const patches = await Promise.all(ids.map(async (id)=>{
        const url = `${buildEventUrl('concacaf', id)}?t=${Date.now()}`;
        const res = await fetch(url, { signal: controller.signal, headers:{'Cache-Control':'no-cache'} });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const statusId = Number(data?.statusId ?? data?.status?.statusId ?? data?.status?.id ?? 0);
        const statusObj = data?.status || data?.statusObj || null;
        const score = data?.score ?? null;
        const scoreStatus = data?.scoreStatus ?? null;
        return [id, { statusId, statusObj, score, scoreStatus }];
      }));

      setOverlay(prev=>{
        const next = new Map(prev);
        for (const [id, p] of patches) next.set(String(id), p);
        return next;
      });
    }catch{}
  },[buildTargetIds]);

  const pollRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const startPolling = useCallback(()=>{
    if (pollRef.current) return;
    fetchOverlayOnce();
    pollRef.current = setInterval(fetchOverlayOnce, POLL_MS);
  },[fetchOverlayOnce]);

  const stopPolling = useCallback(()=>{
    if (pollRef.current){ clearInterval(pollRef.current); pollRef.current=null; }
    if (overlayAbortRef.current){ try{ overlayAbortRef.current.abort(); }catch{} }
  },[]);

  useEffect(()=>{
    const sub = AppState.addEventListener('change', st=>{
      appStateRef.current = st;
      if (st==='active') startPolling(); else stopPolling();
    });
    startPolling();
    return ()=>{ stopPolling(); sub?.remove?.(); };
  },[startPolling, stopPolling]);

  useEffect(()=>{
    if (appStateRef.current==='active'){ stopPolling(); startPolling(); }
  },[active, startPolling, stopPolling]);

  /* ==================== Auto-scroll tabs ==================== */
  useEffect(()=>{
    if (!active || !tabsScrollRef.current) return;
    const info = tabPositions[active]; if (!info) return;
    const x = Math.max(0, info.x - 12);
    tabsScrollRef.current.scrollTo({ x, y:0, animated: !!didInitialAlign.current });
    if (!didInitialAlign.current) didInitialAlign.current = true;
  },[active, tabPositions]);

  const renderCard = useCallback((item) => {
    const merged = applyOverlay(item);
    return (
      <View style={styles.cardWrap}>
        <Card
          match={merged}
          onPress={async ()=>{
            if (!merged?.matchId) return;

            try {
              await analytics().logEvent('open_match_from_calendar', {
                origin: 'calendar_concacaf',
                comp: 'CONCACAF',
                match_id: String(merged.matchId),
                home_team: String(merged?.teams?.homeTeamName ?? ''),
                away_team: String(merged?.teams?.awayTeamName ?? ''),
                scope: 'concacaf',
              });
            } catch {}

            navigation?.push?.('Match', {
              matchId:String(merged.matchId),
              channel:'concacaf',
              pre:{
                id:String(merged.matchId),
                teams:{
                  homeTeamId:String(merged?.teams?.homeTeamId ?? ''),
                  awayTeamId:String(merged?.teams?.awayTeamId ?? ''),
                  homeTeamName:merged?.teams?.homeTeamName ?? '',
                  awayTeamName:merged?.teams?.awayTeamName ?? '',
                },
                date:merged._dateAdj || merged.date || null,
                scheduledStart:merged.scheduledStart ?? null,
                gmt:merged.gmt ?? null,
              },
            });
          }}
          showTourneyBadge={false}
          tourneyText="Eliminatorias CONCACAF"
          livePulse={livePulse}
        />
      </View>
    );
  },[applyOverlay, navigation, livePulse]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
      <Header
        title="Eliminatorias CONCACAF"
        navigation={navigation}
        showSearch
        onSearchPress={() => setShowTeamSearch(true)}
      />

      {/* Tabs sticky + lista en un solo flujo */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.muted, { color: colors.textMuted }]}>Cargando…</Text>
        </View>
      )}

      {!loading && !!err && (
        <View style={styles.center}>
          <Text style={[styles.error, { color: colors.error || '#c00' }]}>
            No se pudo cargar la agenda ({String(err)})
          </Text>
        </View>
      )}

      {!loading && !err && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: padBottom + 20}}
          scrollIndicatorInsets={{ bottom: padBottom }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#fc2729']}
              tintColor="#fc2729"
              title="Actualizando..."
            />
          }
        >
          {/* 0) Header sticky tabs */}
          <View
            style={[
              styles.stickyHeader,
              {
                backgroundColor: colors.screenBg,
                borderBottomColor: colors.cardBorder,
              },
            ]}
          >
            <ScrollView
              ref={tabsScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal:10, paddingTop: 4, paddingBottom: 6 }}
            >
              {tabs.map(t=>{
                const isA=t.key===active;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={async ()=>{
                      setActive(t.key);
                      try {
                        await analytics().logEvent('calendar_date_tab', {
                          comp: 'CONCACAF',
                          ymd: String(t.key),
                          label: String(t.label || ''),
                        });
                      } catch {}
                    }}
                    activeOpacity={0.85}
                    style={[
                      styles.tabBtn,
                      isA
                        ? {
                            borderColor: colors.accent,
                            backgroundColor:
                              theme.mode === 'dark'
                                ? 'rgba(252,39,41,0.24)'
                                : 'rgba(252,39,41,0.08)',
                          }
                        : {
                            borderColor: colors.cardBorder,
                            backgroundColor: colors.cardBg,
                          },
                    ]}
                    onLayout={(e)=>{
                      const {x,width}=e.nativeEvent.layout;
                      setTabPositions(prev => (prev[t.key] && prev[t.key].x===x && prev[t.key].w===width) ? prev : { ...prev, [t.key]:{x,w:width} });
                    }}
                  >
                    <Text style={[styles.tabText, { color: colors.text }]} numberOfLines={1}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* 1) Bloque partidos */}
          <View style={{ paddingHorizontal: 10, marginTop: 0, alignItems: 'stretch' }}>
            {activeList.length === 0 ? (
              <Text style={[styles.muted, { color: colors.textMuted }]}>
                No hay partidos para “{tabs.find(x=>x.key===active)?.label || active}”.
              </Text>
            ) : (
              activeList.map((item, i) => (
                <View key={`${item.channelKey}-${i}`} style={styles.cardWrap}>
                  {renderCard(item)}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <TeamSearchModal
        visible={showTeamSearch}
        onClose={() => setShowTeamSearch(false)}
        onSelect={(team) =>
          navigation.navigate('TeamScreen', {
            teamId: team.id,
            scope: team.scope,
          })
        }
      />

      {/* Footer fijo */}
      <View style={[styles.footerFixed, { height: TAB_H + safeBottom }]}>
        <View style={{ position:'absolute', left:0, right:0, bottom: TAB_H + safeBottom, zIndex:20, elevation:20 }}>
          <AdFooter />
        </View>
        <View style={{ position:'absolute', left:0, right:0, bottom:0, height: TAB_H + safeBottom, zIndex:10, elevation:10 }}>
          {/* 👇 pon el routeName según como lo registres en tu navegación */}
          <FooterTabs navigation={navigation} routeName="CalendarConcacaf" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex:1, backgroundColor:'#f7f7f7', minHeight:0, position:'relative' },

  stickyHeader: {
    zIndex: 10,
    elevation: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  tabBtn:{
    height:28, paddingHorizontal: 10, borderRadius:20, borderWidth:1,
    marginRight:8, minWidth:40, alignItems:'center', justifyContent:'center', marginBottom: 10,
  },
  tabText:{
    fontSize:13, lineHeight:16, fontWeight:'700', color:'#111111',
    includeFontPadding:false, textAlignVertical:'center',
    fontFamily: Platform.OS==='android' ? 'Roboto' : 'System',
  },

  center:{ alignItems:'center', paddingVertical:16 },
  muted:{ opacity:0.7, marginTop:6 },
  error:{ color:'#c00' },
  cardWrap:{ marginTop:0, marginBottom:0 },

  footerFixed: { backgroundColor: '#0b1220' },
});
