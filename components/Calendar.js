// Calendar.js — SOLO Liga Nacional Guatemala (Jornadas) + overlay 20s (tabs sticky + cards pegadas)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  StyleSheet, Animated, Easing, Platform, RefreshControl, AppState,
} from 'react-native';
import { API_WEB_DEPORT_URL, API_JORNADAS_URL } from '@env';
import Header from './Header';
import AdFooter from '../ads/AdFooter';
import Card from './Card';
import TeamSearchModal from './TeamSearchModal';
import FooterTabs from './FooterTabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import analytics from '@react-native-firebase/analytics';
import { useTheme } from '../utils/ThemeContext';

/* ==================== Constantes / helpers ==================== */
const GT_OFFSET = -6;                 // Hora de Guatemala
const POLL_MS   = 20000;              // Overlay: 20s
const LIVE_SET  = new Set([1, 5, 6, 8, 10, 12]); // status en vivo
const FINALS_ORDER = ['Repechaje','Play-In','Cuartos de final','Cuartos','Semifinales','Semifinal','Final'];

const BASE = String(API_WEB_DEPORT_URL || '').replace(/\/+$/,'');
const buildEventUrl = (scope, id) => `${BASE}/${scope}/events/${id}.json`;

const isLive = (statusId) => LIVE_SET.has(Number(statusId));

/** Convierte HH:mm desde gmtOrigen a Guatemala (-6) cuando mode='convert'.
 *  Si mode='trustLocal' devuelve la hora tal cual (sin convertir).
 */
function hourToGT(hhmm, gmtOrigen, mode='trustLocal') {
  const s = String(hhmm || '').slice(0,5);
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return { hhmm: 'Por definir', shift: 0 };

  let H = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  let M = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  if (mode === 'convert' && Number.isFinite(+gmtOrigen)) {
    const delta = GT_OFFSET - Number(gmtOrigen); // ej: gmtOrigen=-3 => delta=-3
    let total = H*60 + M + delta*60;
    let shift = 0;
    while (total < 0)    { total += 1440; shift -= 1; }
    while (total >=1440) { total -= 1440; shift += 1; }
    H = Math.floor(total/60); M = total%60;
    return { hhmm: `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`, shift };
  }
  return { hhmm: `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`, shift: 0 };
}

// Convierte un YYYYMMDD + HH:mm (hora local de Guatemala) a epoch ms absoluto (UTC).
// Si la hora es inválida o "Por definir", usamos 23:59 para no adelantar artificialmente esa fecha.
function msFromYmdHHmmGT(ymd, hhmm) {
  const s = String(ymd || '').replace(/-/g, '');
  if (s.length !== 8) return NaN;
  const y = +s.slice(0, 4), mo = +s.slice(4, 6) - 1, d = +s.slice(6, 8);

  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  const H = m ? Math.max(0, Math.min(23, +m[1])) : 23;
  const M = m ? Math.max(0, Math.min(59, +m[2])) : 59;

  // GT_OFFSET = -6, así que UTC = horaGT - (-6) = horaGT + 6
  return Date.UTC(y, mo, d, H - GT_OFFSET, M);
}

// Devuelve el próximo inicio (>= ahora) en ms para una lista de partidos de una jornada.
function nextStartMsForRound(items) {
  const now = Date.now();
  let best = Infinity;
  for (const ev of (items || [])) {
    const ymd  = ev?._dateAdj || ev?.date;
    const hhmm = ev?.scheduledStart;
    const t = msFromYmdHHmmGT(ymd, hhmm);
    if (Number.isFinite(t) && t >= now && t < best) best = t;
  }
  return Number.isFinite(best) ? best : Infinity;
}

function shiftYmd(ymd, shift) {
  const s = String(ymd || '');
  if (!shift || s.length !== 8) return s || '';
  const y = +s.slice(0,4), mo = +s.slice(4,6)-1, d = +s.slice(6,8);
  const dt = new Date(Date.UTC(y, mo, d));
  dt.setUTCDate(dt.getUTCDate()+shift);
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
  const rx=/^Jornada\s+(\d+)$/i, ma=a.match(rx), mb=b.match(rx);
  if (ma&&mb) return Number(ma[1])-Number(mb[1]);
  if (ma&&!mb) return -1; if (!ma&&mb) return 1;
  const ia=FINALS_ORDER.findIndex(t=>a.toLowerCase().includes(t.toLowerCase()));
  const ib=FINALS_ORDER.findIndex(t=>b.toLowerCase().includes(t.toLowerCase()));
  if (ia!==-1&&ib!==-1) return ia-ib; if (ia!==-1) return 1; if (ib!==-1) return -1;
  return a.localeCompare(b);
}

function sortMatches(a,b){
  const ka = `${a?._dateAdj||a?.date||''}${a?.scheduledStart||''}${String(a?.matchId||'').padStart(9,'0')}`;
  const kb = `${b?._dateAdj||b?.date||''}${b?.scheduledStart||''}${String(b?.matchId||'').padStart(9,'0')}`;
  return ka.localeCompare(kb);
}

// Evita “— —” si ya viene score en JSON (primer render)
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

// Transforma events {} → array para Card
function eventsToArray(eventsObj, scope='guatemala'){
  const out=[];
  for (const key in (eventsObj||{})){
    if (!Object.prototype.hasOwnProperty.call(eventsObj,key)) continue;
    const ev=eventsObj[key]||{};
    const matchId=key.split('.').pop();

    const teams=ev.teams||{};
    const homeTeamId=teams.homeTeamId??teams.homeId??null;
    const awayTeamId=teams.awayTeamId??teams.awayId??null;

    const mode = 'trustLocal';
    const { hhmm, shift } = hourToGT(String(ev.scheduledStart||''), ev.gmt, mode);
    const dateAdj = shift ? shiftYmd(ev.date, shift) : ev.date;

    out.push({
      channelKey:key,
      matchId:Number(matchId),
      scope,
      jornada: typeof ev.jornada==='number' ? ev.jornada
             : (typeof ev.jornada==='string' && /^\d+$/.test(ev.jornada) ? Number(ev.jornada) : null),
      roundTitle: normalizeRoundTitle(ev.roundTitle, ev.jornada),

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

/* === Jornada activa con semana Lun–Dom y jornadas entre semana (GT, time-aware) === */
function pickMostRecentRound(map) {
  const rounds = Array.from(map.values());
  if (!rounds.length) return '';

  const ymdNum = s => Number(String(s || '').slice(0, 8));
  const todayLocal = new Date();
  const todayGT_YMD = (() => {
    const d = new Date(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return Number(`${y}${m}${day}`);
  })();

  const meta = rounds.map(r => {
    const items = (r.items || []).slice();
    const ymds = items.map(ev => ymdNum(ev?._dateAdj || ev?.date)).filter(n => Number.isFinite(n));
    const startYmd = ymds.length ? Math.min(...ymds) : Infinity;
    const endYmd   = ymds.length ? Math.max(...ymds) : -Infinity;
    const nextMs = nextStartMsForRound(items);
    return { key: r.key, startYmd, endYmd, nextMs };
  });

  const futureByTime = meta
    .filter(m => Number.isFinite(m.nextMs) && m.nextMs >= Date.now())
    .sort((a, b) => a.nextMs - b.nextMs);

  if (futureByTime.length) return futureByTime[0].key;

  const futByDate = meta
    .filter(m => m.startYmd >= todayGT_YMD)
    .sort((a, b) => a.startYmd - b.startYmd);
  if (futByDate.length) return futByDate[0].key;

  const pastByDate = meta
    .filter(m => m.endYmd <= todayGT_YMD)
    .sort((a, b) => b.endYmd - a.endYmd);
  if (pastByDate.length) return pastByDate[0].key;

  return rounds[0].key;
}

/* ==================== Componente ==================== */
export default function Calendar({ navigation }) {
  // 🔹 Analytics: screen_view de Calendar
  useEffect(() => {
    (async () => {
      try { await analytics().logScreenView({ screen_name: 'Calendar', screen_class: 'Calendar' }); } catch {}
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

  // LN
  const [loadingLN, setLoadingLN] = useState(true);
  const [errLN, setErrLN] = useState('');
  const [tabsLN, setTabsLN] = useState([]); // [{key,label}]
  const [activeLN, setActiveLN] = useState('');
  const [byRoundLN, setByRoundLN] = useState(new Map());

  // refs tabs scroll (auto-align)
  const tabsScrollRefLN = useRef(null);
  const [tabPositionsLN, setTabPositionsLN] = useState({});
  const didInitialAlignLN = useRef(false);

  const pendingScrollKeyLN = useRef(''); // si no hay layout aún, lo guardamos

const scrollActiveTabLN = useCallback((key, animated=true) => {
  const k = key || activeLN;
  if (!k || !tabsScrollRefLN.current) return;

  const info = tabPositionsLN[k];
  if (!info) {
    pendingScrollKeyLN.current = k; // espera a que onLayout lo mida
    return;
  }

  const x = Math.max(0, info.x - 12);
  tabsScrollRefLN.current.scrollTo({ x, y: 0, animated });
  pendingScrollKeyLN.current = '';
}, [tabPositionsLN, activeLN]);


  // Anim sutil
  const [livePulse] = useState(new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(livePulse, { toValue: 1.12, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(livePulse, { toValue: 1.00, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { try{loop.stop();}catch{} };
  }, [livePulse]);

  /* ==================== Fetch LN ==================== */
  const fetchLN = useCallback(async (silent=false) => {
    if (!silent) setLoadingLN(true);
    setErrLN('');
    try{
      const url = `${String(API_JORNADAS_URL||'').trim()}?t=${Date.now()}`;
      const res = await fetch(url,{ headers:{'Cache-Control':'no-cache, no-store, must-revalidate','Pragma':'no-cache','Expires':'0'} });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const arr = eventsToArray(data?.events||{}, 'guatemala').map(normalizeScoreForFirstRender);

      const temp=new Map();
      for (const m of arr){
        const label=normalizeRoundTitle(m.roundTitle,m.jornada);
        const key=/^Jornada\s+\d+$/i.test(label)?label:(label||'Jornada');
        if (!temp.has(key)) temp.set(key,{key,label,items:[]});
        temp.get(key).items.push(m);
      }
      for (const [,obj] of temp) obj.items.sort(sortMatches);

      const metaRounds=Array.isArray(data?.meta?.rounds)?data.meta.rounds.map(String):[];
      for (const label of metaRounds){
        const key=/^Jornada\s+\d+$/i.test(label)?label:(label||'Jornada');
        if (!temp.has(key)) temp.set(key,{key,label:key,items:[]});
      }

      const ordered=Array.from(temp.values()).sort((a,b)=>sortRounds(a.label,b.label));
      const map=new Map();
      const tabsArr=ordered.map(o=>{ map.set(o.key,o); return {key:o.key,label:o.label}; });

      setByRoundLN(map);
      setTabsLN(tabsArr);

      const preferred=pickMostRecentRound(map);
      setActiveLN(prev => (prev && map.has(prev)) ? prev : (preferred || tabsArr[0]?.key || ''));
    }catch(e){ setErrLN(e?.message||'Error'); }
    finally{ if(!silent) setLoadingLN(false); }
  },[]);

  useEffect(()=>{ fetchLN(false); },[fetchLN]);

  const onRefresh = useCallback(async ()=>{
    setRefreshing(true);
    try{ await fetchLN(true); }
    finally{ setRefreshing(false); }
  },[fetchLN]);

  const activeListLN = useMemo(()=> byRoundLN.get(activeLN)?.items || [], [byRoundLN,activeLN]);

  /* ==================== OVERLAY en vivo (guatemala) ==================== */
  const [overlay, setOverlayState] = useState(new Map());
  const overlayAbortRef2 = useRef(null);

  const applyOverlay = useCallback((m) => {
    if (!m) return m;
    const patch = overlay.get(String(m.matchId));
    if (!patch) return m;
    const merged = { ...m };
    if (patch.statusId != null) merged.statusId = Number(patch.statusId);
    if (patch.statusObj != null) merged.statusObj = patch.statusObj;
    if (patch.score != null) merged.score = patch.score;
    if (patch.scoreStatus != null) merged.scoreStatus = patch.scoreStatus;
    return normalizeScoreForFirstRender(merged);
  }, [overlay]);

  const minutesToKO = useCallback((m)=>{
    if (!m || Number(m.statusId)!==0) return null;
    const ymd=String((m._dateAdj||m.date)||'').slice(0,8);
    const hhmm=String(m.scheduledStart||'').slice(0,5);
    if (ymd.length!==8 || hhmm.length<4) return null;
    const y=+ymd.slice(0,4), mo=+ymd.slice(4,6)-1, d=+ymd.slice(6,8);
    const [H,M]=hhmm.split(':').map(Number);
    const schedLocal=new Date(y,mo,d,H,M).getTime();
    return Math.round((schedLocal-Date.now())/60000);
  },[]);
  const isNearKO = useCallback((m) => {
    const mins=minutesToKO(m); return mins!==null && mins<=30 && mins>=-5;
  },[minutesToKO]);

  const buildTargetIds = useCallback(() => {
    const list = activeListLN;
    const liveFirst = list.filter(m => isLive(m.statusId));
    const nearKOList = list.filter(m => !isLive(m.statusId) && isNearKO(m));
    const rest   = list.filter(m => !liveFirst.includes(m) && !nearKOList.includes(m));
    const ordered = [...liveFirst, ...nearKOList, ...rest].slice(0, 12);
    return { scope: 'guatemala', ids: ordered.map(m => String(m.matchId)) };
  }, [activeListLN, isNearKO]);

  const fetchOverlayOnce = useCallback(async () => {
    if (overlayAbortRef2.current) { try { overlayAbortRef2.current.abort(); } catch {} }
    const { scope, ids } = buildTargetIds();
    if (!ids.length) return;

    const controller = new AbortController();
    overlayAbortRef2.current = controller;
    try {
      const patches = await Promise.all(ids.map(async (id) => {
        const url = `${buildEventUrl(scope, id)}?t=${Date.now()}`;
        const res = await fetch(url, { signal: controller.signal, headers: { 'Cache-Control': 'no-cache' } });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const statusId = Number(data?.statusId ?? data?.status?.statusId ?? data?.status?.id ?? 0);
        const statusObj = data?.status || data?.statusObj || null;
        const score = data?.score ?? null;
        const scoreStatus = data?.scoreStatus ?? null;
        return [id, { statusId, statusObj, score, scoreStatus }];
      }));
      setOverlayState(prev => {
        const next = new Map(prev);
        for (const [id, patch] of patches) next.set(String(id), patch);
        return next;
      });
    } catch {}
  }, [buildTargetIds]);

  const pollRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);

  const startOverlayPolling = useCallback(() => {
    if (pollRef.current) return;
    fetchOverlayOnce();
    pollRef.current = setInterval(fetchOverlayOnce, POLL_MS);
  }, [fetchOverlayOnce]);

  const stopOverlayPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (overlayAbortRef2.current) { try { overlayAbortRef2.current.abort(); } catch {} }
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', st => {
      appStateRef.current = st;
      if (st === 'active') startOverlayPolling(); else stopOverlayPolling();
    });
    startOverlayPolling();
    return () => { stopOverlayPolling(); sub?.remove?.(); };
  }, [startOverlayPolling, stopOverlayPolling]);

  useEffect(() => {
    if (appStateRef.current === 'active') { stopOverlayPolling(); startOverlayPolling(); }
  }, [activeLN, startOverlayPolling, stopOverlayPolling]);

  /* ==================== Auto-scroll tabs LN ==================== */
useEffect(() => {
  if (!activeLN) return;

  const info = tabPositionsLN[activeLN];
  if (!info || !tabsScrollRefLN.current) return;

  const x = Math.max(0, info.x - 12);
  tabsScrollRefLN.current.scrollTo({
    x,
    y: 0,
    animated: !!didInitialAlignLN.current,
  });

  if (!didInitialAlignLN.current) didInitialAlignLN.current = true;
}, [activeLN, tabPositionsLN]);


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
                origin: 'calendar',
                comp: 'LIGA',
                match_id: String(merged.matchId),
                home_team: String(merged?.teams?.homeTeamName ?? ''),
                away_team: String(merged?.teams?.awayTeamName ?? ''),
                scope: String(merged?.scope ?? 'guatemala'),
              });
            } catch {}

            navigation?.push?.('Match', {
              matchId:String(merged.matchId),
              channel:'guatemala',
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
          tourneyText="Liga Nacional"
          livePulse={livePulse}
        />
      </View>
    );
  }, [applyOverlay, navigation, livePulse]);

  const isLoading = loadingLN;
  const err = errLN;

  return (
    <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
      <Header
        title="Calendario completo"
        navigation={navigation}
        showSearch
        onSearchPress={() => setShowTeamSearch(true)}
      />

      {/* ✅ Pill/título “Liga Nacional” */}
      <View style={styles.leaguePillWrap}>
        <View
          style={[
            styles.leaguePill,
            {
              borderColor: colors.cardBorder,
              backgroundColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            },
          ]}
        >
          <Text style={[styles.leaguePillText, { color: colors.text }]}>Liga Nacional</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.muted, { color: colors.textMuted }]}>Cargando…</Text>
        </View>
      )}

      {!isLoading && !!err && (
        <View style={styles.center}>
          <Text style={[styles.error, { color: colors.error || '#c00' }]}>
            No se pudo cargar la agenda ({String(err)})
          </Text>
        </View>
      )}

      {/* ✅ MISMO FLUJO que CalendarConcacaf: tabs sticky + cards pegadas */}
      {!isLoading && !err && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: padBottom + 20 }}
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
              ref={tabsScrollRefLN}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal:10, paddingTop: 4, paddingBottom: 6 }}
            >
              {tabsLN.map(t=>{
                const isA=t.key===activeLN;
                return (
                  <TouchableOpacity
                    key={t.key}
                    onPress={async ()=>{
                      setActiveLN(t.key);
                      scrollActiveTabLN(t.key, true);
                      try {
                        await analytics().logEvent('calendar_round_tab', {
                          comp: 'LIGA',
                          round_key: String(t.key),
                          round_label: String(t.label || ''),
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
                      const { x, width } = e.nativeEvent.layout;

                      setTabPositionsLN(prev => (
                        (prev[t.key] && prev[t.key].x === x && prev[t.key].w === width)
                          ? prev
                          : { ...prev, [t.key]: { x, w: width } }
                      ));

                      if (pendingScrollKeyLN.current === t.key) {
                        requestAnimationFrame(() => scrollActiveTabLN(t.key, false));
                      }
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
            {activeListLN.length === 0 ? (
              <Text style={[styles.muted, { color: colors.textMuted }]}>
                No hay partidos en “{tabsLN.find(x=>x.key===activeLN)?.label || activeLN}”.
              </Text>
            ) : (
              activeListLN.map((item, i) => (
                <View key={`${item.channelKey}-${i}`} style={styles.cardWrap}>
                  {renderCard(item)}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal de búsqueda de equipos */}
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
        {/* Banner */}
        <View style={{ position:'absolute', left:0, right:0, bottom: TAB_H + safeBottom, zIndex:20, elevation:20 }}>
          <AdFooter />
        </View>

        {/* Tabs */}
        <View style={{ position:'absolute', left:0, right:0, bottom:0, height: TAB_H + safeBottom, zIndex:10, elevation:10 }}>
          <FooterTabs navigation={navigation} routeName="Calendar" />
        </View>
      </View>
    </View>
  );
}

/* ==================== Estilos ==================== */
const styles = StyleSheet.create({
  screen: { flex:1, backgroundColor:'#f7f7f7', minHeight:0, position:'relative' },

  stickyHeader: {
    zIndex: 10,
    elevation: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Pill “Liga Nacional”
  leaguePillWrap: {
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
  },
  leaguePill: {
    alignSelf: 'center',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  leaguePillText: {
    fontSize: 14,
    fontWeight: '800',
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontFamily: Platform.OS === 'android' ? 'Roboto' : 'System',
  },

  tabBtn:{
    height:28,
    paddingHorizontal: 10,
    borderRadius:20,
    borderWidth:1,
    marginRight:8,
    minWidth:40,
    alignItems:'center',
    justifyContent:'center',
    marginBottom: 10,
  },

  tabText:{
    fontSize:13, lineHeight:16, fontWeight:'700',
    includeFontPadding:false, textAlignVertical:'center',
    fontFamily: Platform.OS==='android' ? 'Roboto' : 'System',
  },

  center:{ alignItems:'center', paddingVertical:16 },
  muted:{ opacity:0.7, marginTop:6 },
  error:{ color:'#c00' },

  cardWrap:{ marginTop:0, marginBottom:0 },

  footerFixed: { backgroundColor: '#0b1220' },
});
