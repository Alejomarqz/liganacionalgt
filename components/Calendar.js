// Calendar.js — SOLO Liga Nacional GT Guatemala (Jornadas) + overlay 20s (tabs sticky + cards pegadas)
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
const GT_OFFSET = -6;
const POLL_MS   = 20000;
const LIVE_SET  = new Set([1, 5, 6, 8, 10, 12]);
const FINALS_ORDER = ['Repechaje','Play-In','Cuartos de final','Cuartos','Semifinales','Semifinal','Final'];

const BASE = String(API_WEB_DEPORT_URL || '').replace(/\/+$/,'');
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

function msFromYmdHHmmGT(ymd, hhmm) {
  const s = String(ymd || '').replace(/-/g, '');
  if (s.length !== 8) return NaN;
  const y = +s.slice(0, 4), mo = +s.slice(4, 6) - 1, d = +s.slice(6, 8);

  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  const H = m ? Math.max(0, Math.min(23, +m[1])) : 23;
  const M = m ? Math.max(0, Math.min(59, +m[2])) : 59;

  return Date.UTC(y, mo, d, H - GT_OFFSET, M);
}

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

  const [loadingLN, setLoadingLN] = useState(true);
  const [errLN, setErrLN] = useState('');
  const [tabsLN, setTabsLN] = useState([]);
  const [activeLN, setActiveLN] = useState('');
  const [byRoundLN, setByRoundLN] = useState(new Map());

  const tabsScrollRefLN = useRef(null);
  const [tabPositionsLN, setTabPositionsLN] = useState({});
  const didInitialAlignLN = useRef(false);
  const pendingScrollKeyLN = useRef('');

  const scrollActiveTabLN = useCallback((key, animated=true) => {
    const k = key || activeLN;
    if (!k || !tabsScrollRefLN.current) return;

    const info = tabPositionsLN[k];
    if (!info) { pendingScrollKeyLN.current = k; return; }

    const x = Math.max(0, info.x - 16);
    tabsScrollRefLN.current.scrollTo({ x, y: 0, animated });
    pendingScrollKeyLN.current = '';
  }, [tabPositionsLN, activeLN]);

  const [livePulse] = useState(new Animated.Value(1));
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(livePulse, { toValue: 1.12, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(livePulse, { toValue: 1.00, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    loop.start();
    return () => { try{loop.stop();}catch{} };
  }, [livePulse]);

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

  useEffect(() => {
    if (!activeLN) return;
    const info = tabPositionsLN[activeLN];
    if (!info || !tabsScrollRefLN.current) return;

    const x = Math.max(0, info.x - 16);
    tabsScrollRefLN.current.scrollTo({
      x, y: 0,
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
          tourneyText="Liga Nacional GT"
          livePulse={livePulse}
        />
      </View>
    );
  }, [applyOverlay, navigation, livePulse]);

  const isLoading = loadingLN;
  const err = errLN;

  const glassBg =
    theme.mode === 'dark'
      ? 'rgba(12, 18, 32, 0.86)'
      : 'rgba(255, 255, 255, 0.94)';

  const pillBg =
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(0,0,0,0.04)';

  const tabIdleBg =
    theme.mode === 'dark'
      ? 'rgba(255,255,255,0.04)'
      : 'rgba(255,255,255,0.90)';

  return (
    <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
      <Header
        title="CALENDARIO"
        navigation={navigation}
        showSearch
        onSearchPress={() => setShowTeamSearch(true)}
      />

      {/* ✅ Chip Liga Nacional GT */}
      <View style={styles.leaguePillWrap}>
        <View style={[styles.leaguePill, { borderColor: colors.cardBorder, backgroundColor: pillBg }]}>
          <View style={[styles.leagueDot, { backgroundColor: colors.accent }]} />
          <Text style={[styles.leaguePillText, { color: colors.text }]}>Liga Nacional GT</Text>
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.muted, { color: colors.textMuted }]}>Cargando calendario…</Text>
        </View>
      )}

      {!isLoading && !!err && (
        <View style={styles.center}>
          <Text style={[styles.errorTitle, { color: colors.error || '#c00' }]}>
            No se pudo cargar la agenda
          </Text>
          <Text style={[styles.errorBody, { color: colors.textMuted }]}>{String(err)}</Text>
        </View>
      )}

      {!isLoading && !err && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: (58 + safeBottom) + 18 }}
          scrollIndicatorInsets={{ bottom: (58 + safeBottom) }}
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
          {/* ✅ Tabs sticky premium */}
          <View style={[styles.stickyHeader, { backgroundColor: glassBg, borderBottomColor: colors.cardBorder }]}>
            <ScrollView
              ref={tabsScrollRefLN}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
            >
              {tabsLN.map(t=>{
                const isA = t.key === activeLN;

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
                    activeOpacity={0.9}
                    style={[
                      styles.tabBtn,
                      isA
                        ? styles.tabBtnActive
                        : [styles.tabBtnIdle, { borderColor: colors.cardBorder, backgroundColor: tabIdleBg }],
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
                    {/* ✅ “Gradient fake” SOLO cuando está activo */}
                    {isA ? (
                      <>
                        <View style={styles.activeBase} />
                        <View style={styles.activeSheen} />
                      </>
                    ) : null}

                    <Text
                      style={[
                        styles.tabText,
                        { color: isA ? '#fff' : colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {t.label}
                    </Text>

                    {/* ✅ Punto rojo (se queda) */}
                    {isA ? <View style={styles.activeDot} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Lista partidos */}
          <View style={styles.listWrap}>
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
      <View style={[styles.footerFixed, { height: 58 + safeBottom }]}>
        <View style={{ position:'absolute', left:0, right:0, bottom: 58 + safeBottom, zIndex:20, elevation:20 }}>
          <AdFooter />
        </View>
        <View style={{ position:'absolute', left:0, right:0, bottom:0, height: 58 + safeBottom, zIndex:10, elevation:10 }}>
          <FooterTabs navigation={navigation} routeName="Calendar" />
        </View>
      </View>
    </View>
  );
}

/* ==================== Estilos (tabs 2026 con “gradient fake”) ==================== */
const styles = StyleSheet.create({
  screen: { flex:1, minHeight:0, position:'relative' },

  stickyHeader: {
    zIndex: 50,
    elevation: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
      },
      android: {},
    }),
  },

  leaguePillWrap: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  leaguePill: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leagueDot: { width: 8, height: 8, borderRadius: 99, marginRight: 8 },
  leaguePillText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlignVertical: 'center',
    fontFamily: Platform.OS === 'android' ? 'Roboto' : 'System',
  },

  tabsContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: 'center',
  },

  tabBtn:{
    minHeight: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 10,
    alignItems:'center',
    justifyContent:'center',
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative', // 👈 importante para las capas
  },

  tabBtnIdle: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
    },
    android: { elevation: 1 },
    default: {},
  }),

  // ✅ Activo: sin borde feo, “gradient fake”
  tabBtnActive: Platform.select({
    ios: {
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 10 },
    },
    android: {
      borderColor: 'transparent',
      elevation: 3,
    },
    default: { borderColor: 'transparent' },
  }),

  // Capa base (color 1)
  activeBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#3572fd',
  },
  // Capa “sheen” diagonal (color 2) para simular degradado
  activeSheen: {
    position: 'absolute',
    top: -18,
    bottom: -18,
    left: -40,
    width: 140,
    backgroundColor: '#3679fe',
    opacity: 0.95,
    transform: [{ rotate: '18deg' }],
  },

  tabText:{
    fontSize: 13.5,
    lineHeight: 16,
    fontWeight:'900',
    includeFontPadding:false,
    textAlignVertical:'center',
    fontFamily: Platform.OS==='android' ? 'Roboto' : 'System',
  },

  // Punto rojo (como pediste)
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 99,
    marginLeft: 8,
    opacity: 0.98,
    backgroundColor: '#fc2729',
  },

  listWrap: { paddingHorizontal: 10, marginTop: 2, alignItems: 'stretch' },

  center:{ alignItems:'center', paddingVertical:18, paddingHorizontal: 16 },
  muted:{ opacity:0.75, marginTop:8, fontSize: 13.5 },
  errorTitle:{ fontSize: 14.5, fontWeight: '900' },
  errorBody:{ marginTop: 6, fontSize: 13, opacity: 0.85 },

  cardWrap:{ marginTop: 0, marginBottom: 0 },

  footerFixed: { backgroundColor: '#0b1220' },
});
