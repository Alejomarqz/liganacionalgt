// components/Home.js
import React, { Component } from 'react';
import {
  StatusBar, Alert, Image, StyleSheet, Text, View,
  SectionList, TouchableOpacity, AppState, Animated, Easing,
} from 'react-native';
import Header from './Header';
import FooterTabs from './FooterTabs';
import AdFooter from '../ads/AdFooter';
import InlineAd from '../ads/InlineAd'; // ajusta la ruta
import Card from './Card';
import { setStartedFromPush } from '../services/notifications';
import { isFollowingMatch } from '../services/notifications';
import { getBellIcon } from '../utils/bell';
import TeamSearchModal from './TeamSearchModal'; // o '../components/TeamSearchModal'
import { withSafeAreaInsets } from 'react-native-safe-area-context';
import { withTheme } from '../utils/ThemeContext';
import analytics from '@react-native-firebase/analytics';
import { API_WEB_DEPORT_URL, API_HOME_WEEK_URL } from '@env';

import { CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
import { shouldShowGuide, markGuideDone } from '../utils/onboarding';

import { followersDb, toggleFollowTeam, ensureAnonUser } from "../services/firestore";





const WalkthroughableView = walkthroughable(View);



// === DEBUG HOME ===
const DEBUG_HOME = true; // pon en false para silenciar
const homeLog = (...args) => {
  if (!DEBUG_HOME) return;
  const ts = new Date().toISOString().split('T').join(' ').slice(0, 19);
  // También exponemos un flag global por si quieres activarlo en runtime: window.__HOME_DEBUG = true/false
  if (typeof window !== 'undefined' && window.__HOME_DEBUG === false) return;
  console.log(`[HOME ${ts}]`, ...args);
};


const SAFEImage = Image;

/* ========= Constantes / helpers ========= */
const GT_OFFSET = -6; // America/Guatemala
const SEP = '\u202F\u00B7\u202F';
const LIVE_SET = new Set([1, 5, 6, 7, 8, 9, 10, 11, 12]); // sin ET (5). Si quieres badge también en 5, agrégalo aquí.
const isLive = id => LIVE_SET.has(Number(id));
const dlog = (...a) => { if (__DEV__) console.log('[Home]', ...a); };

// helper: te dice si en este index va anuncio
function shouldShowInlineAd(index, total) {
  if (total <= 7) return false;          // 5–7: nada
  const marks = total >= 12 ? [2, 8]     : [2]; // posiciones “antes de renderizar el card”
  // evita que caiga en últimos 2
  const safeMarks = marks.filter(m => m < total - 2);
  return safeMarks.includes(index);
}

// === DataFactory: extraer marcador desde scoreStatus ===
function readScoreFromEventDF(v) {
  const homeId = Number(v?.match?.homeTeamId);
  const awayId = Number(v?.match?.awayTeamId);
  const s = v?.scoreStatus || null;

  if (!s || !Number.isFinite(homeId) || !Number.isFinite(awayId)) return null;

  const hNode = s[String(homeId)] || s[homeId];
  const aNode = s[String(awayId)] || s[awayId];

  const H = Number(hNode?.score);
  const A = Number(aNode?.score);

  if (Number.isFinite(H) && Number.isFinite(A)) {
    return { homeId, awayId, H, A };
  }
  return null;
}


// "deportes.futbol.guatemala.784700" -> { id:"784700", scope:"guatemala" }
function parseMatchRef(raw, fallbackScope = 'guatemala') {
  const s = String(raw || '');
  if (/^\d+$/.test(s)) return { id: s, scope: fallbackScope };
  const parts = s.split('.');
  const id = parts[parts.length - 1] && /^\d+$/.test(parts[parts.length - 1]) ? parts[parts.length - 1] : null;
  const scope = s.includes('guatemala') ? 'guatemala'
              : s.includes('concacaf')   ? 'concacaf'
              : s.includes('nations')    ? 'nationsleague'
              : fallbackScope;
  return { id, scope };
}


function adjustTimeToGuatemala(hhmm, gmt) {
  if (!hhmm) return { hhmm: '--:--', shift: 0 };
  const [h, m] = hhmm.split(':').map(n => parseInt(n, 10));
  const g = Number.isFinite(+gmt) ? +gmt : GT_OFFSET;
  const delta = GT_OFFSET - g;
  let total = h * 60 + m + delta * 60, shift = 0;
  while (total < 0) { total += 1440; shift -= 1; }
  while (total >= 1440) { total -= 1440; shift += 1; }
  const HH = String(Math.floor(total / 60)).padStart(2, '0');
  const MM = String(total % 60).padStart(2, '0');
  return { hhmm: `${HH}:${MM}`, shift };
}
function shiftYmd(ymd, shift) {
  const s = String(ymd || '');
  if (!shift || s.length < 8) return s || '';
  const y = +s.slice(0, 4), mo = +s.slice(4, 6) - 1, d = +s.slice(6, 8);
  const dt = new Date(Date.UTC(y, mo, d));
  dt.setUTCDate(dt.getUTCDate() + shift);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}
function toDateUTC(ymd) {
  const s = String(ymd || '');
  if (s.length < 8) return null;
  const y = +s.slice(0, 4), mo = +s.slice(4, 6) - 1, d = +s.slice(6, 8);
  return new Date(Date.UTC(y, mo, d));
}
function getHomeAwayIds(m) {
  const homeId = m?.teams?.homeTeamId ?? m?.homeTeamId ?? m?.home?.id ?? null;
  const awayId = m?.teams?.awayTeamId ?? m?.awayTeamId ?? m?.away?.id ?? null;
  return { homeId, awayId };
}

/* ========= near-KO ========= */
const NEAR_KO_MIN = 30, GRACE_AFTER_MIN = 5;
function minutesToKickoffGT(m) {
  if (!m) return null;
  let ymd = String(m._dateAdj || m.date || '').replace(/-/g, '');
  let hhmm = String(m._timeGT || m.hora || '').slice(0, 5);
  if (!ymd || !hhmm) {
    const raw = ((m?.scheduledStart || '').slice(0, 5) || '00:00');
    const { hhmm: timeGT, shift } = adjustTimeToGuatemala(raw, Number(m?.gmt));
    hhmm = timeGT;
    ymd = (shift ? shiftYmd(m.date, shift) : m.date) || '';
    ymd = String(ymd).replace(/-/g, '');
  }
  if (ymd.length !== 8 || hhmm.length < 4) return null;
  const y = +ymd.slice(0,4), mo = +ymd.slice(4,6)-1, d = +ymd.slice(6,8);
  const [H,M] = hhmm.split(':').map(Number);
  const nowUTC = Date.now();
  const schedUTC = Date.UTC(y, mo, d, H - GT_OFFSET, M);
  return Math.round((schedUTC - nowUTC)/60000);
}
function isNearKickoffGT(m) {
  if (!m || Number(m.statusId) !== 0) return false;
  const mins = minutesToKickoffGT(m);
  return mins !== null && mins <= NEAR_KO_MIN && mins >= -GRACE_AFTER_MIN;
}

/* ========= semana GT (lun-dom) ========= */
function weekBoundsGT() {
  const gtNowMs = Date.now() + GT_OFFSET * 3600000;
  const gtNow = new Date(gtNowMs);
  const y = gtNow.getUTCFullYear(), m = gtNow.getUTCMonth(), d = gtNow.getUTCDate();
  const dow = new Date(Date.UTC(y, m, d)).getUTCDay();
  const mon = new Date(Date.UTC(y, m, d));
  mon.setUTCDate(mon.getUTCDate() - ((dow === 0 ? 7 : dow) - 1));
  mon.setUTCHours(0,0,0,0);
  const sun = new Date(mon);
  sun.setUTCDate(sun.getUTCDate() + 6);
  sun.setUTCHours(23,59,59,999);
  return { mon, sun };
}

/* ========= status label ========= */
const statusLabel = (id) => ({
  0:'Programado',1:'Primer Tiempo',2:'Finalizado',3:'Suspendido',4:'Postergado',
  5:'Entretiempo',6:'Segundo Tiempo',7:'Fin de Tiempo Reglamentario',
  8:'1er. Tiempo Extra',9:'Fin 1er. Tiempo Extra',10:'2do. Tiempo Extra',11:'Fin 2do. Tiempo Extra',12:'Penales'
}[Number(id)] || '—');

/* ========= torneo corto ========= */
const SCOPE_LABEL = { guatemala: 'Liga Nacional', concacaf: 'Eliminatorias', nationsleague: 'Nations' };
const tourneyShort = (scope, competition) =>
  (competition && competition.trim()) ? competition : (SCOPE_LABEL[String(scope).toLowerCase()] || String(scope || ''));

/* ========= UI ========= */
const S = { screenPadH: 10, cardMT: 8, cardPadV: 8, cardPadH: 12, cardRadius: 12, cardShadow: 3,
  logo: 34, teamFont: 10.5, centerFS: 20, smallFS: 10, sideW: 120 };

class Home extends Component {
  state = { matchs: [], sections: [{ data: [] }], refreshing: false, livePulse: new Animated.Value(1), showTourneyBadge: false, showTeamSearch: false, };
  mounted = false; pollInterval = null; liveLoop = null;
  guideEligible = false;
  guideStarted = false;


  componentDidMount() {
    this.mounted = true; this.loadData();
    // ✅ Onboarding Home (solo 1 vez) — esperar a que existan partidos
try {
  shouldShowGuide('guide_home_v2').then((ok) => {
    if (!ok) return;

    this.guideEligible = true;

    // Cuando termine/salten, marcar como visto
    this.props.copilotEvents?.on?.('stop', async () => {
      await markGuideDone('guide_home_v2');
    });

    // ⚠️ NO llamamos start() aquí. Lo haremos cuando ya haya data.
  });
} catch (e) {}


    // ⭐ PRE-LOAD de interstitial al abrir Home
  try { initInterstitial(); } catch(e) {}
    this.focusUnsub = this.props.navigation?.addListener?.('focus', () => {
      setStartedFromPush(false);     // ya estamos en Home “normal”
      this.startPolling();
      // ⭐ Cada vez que Home vuelve a foco, nos aseguramos de tener interstitial listo
    try { initInterstitial(); } catch(e) {}
    });
    this.blurUnsub = this.props.navigation?.addListener?.('blur', () => setTimeout(() => {
      if (!this.props.navigation?.isFocused?.()) this.stopPolling();
    }, 1500));
    this.appStateSub = AppState.addEventListener('change', st => { if (st==='active') this.startPolling(); else this.stopPolling(); });
    this.liveLoop = Animated.loop(Animated.sequence([
      Animated.timing(this.state.livePulse, { toValue: 1.12, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(this.state.livePulse, { toValue: 1.00, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ])); this.liveLoop.start();
  }

  componentDidUpdate(prevProps, prevState) {
  const prevLen = prevState?.sections?.[0]?.data?.length || 0;
  const currLen = this.state?.sections?.[0]?.data?.length || 0;

  // Si antes no había partidos y ahora sí, iniciamos el tour (solo una vez)
  if (this.guideEligible && !this.guideStarted && prevLen === 0 && currLen > 0) {
    this.guideStarted = true;

    // Un pequeño delay para asegurar que el item 0 ya se montó
    setTimeout(() => {
      this.props.start?.('home-first-match');
    }, 300);
  }
}



  componentWillUnmount() {
    this.mounted = false; this.stopPolling();
    this.focusUnsub?.(); this.blurUnsub?.(); this.appStateSub?.remove?.(); try{this.liveLoop?.stop?.();}catch{}
  }
  refresh = () => { this.setState({ refreshing: true }); this.loadData(); };

  /* ======= Calendario (semanal) ======= */
  loadData = () => {
    const calURL = (API_HOME_WEEK_URL || '').trim();
    const fetchCalendario = () => {
      if (!calURL || calURL === 'undefined') return Promise.reject(new Error('no-cal-url'));
      return fetch(calURL, { headers: { 'Cache-Control':'no-cache, no-store, must-revalidate','Pragma':'no-cache','Expires':'0' } })
        .then(r => { if (!r.ok) throw new Error('cal-http-' + r.status); return r.json(); });
    };

    // ---- adapta UNA fila del feed semanal (acepta varias formas) ----
    const adaptCalRow = it => {
      if (!it) return null;
      const rawDate = it.dateAdj || it._dateAdj || it.matchDate || it.date || '';
      const rawTime = it.timeGT || it._timeGT || (it.scheduledStart ? String(it.scheduledStart).slice(0,5) : (it.hora || ''));
      return {
        matchId: it.matchId ?? it.id ?? null,
        scope: (it.scope || 'guatemala').toLowerCase(),
        date: String(rawDate).replace(/-/g, ''),                // YYYYMMDD
        scheduledStart: rawTime ? `${rawTime}:00` : (it.scheduledStart || null),
        statusId: Number(it.statusId ?? it.intStatusId ?? 0),
        statusObj: it.status || null,
        gmt: it.gmt ?? null,
        competition: it.competition ?? null,
        teams: {
          homeTeamId: it.homeTeamId ?? it.teams?.homeTeamId ?? it.homeId ?? null,
          awayTeamId: it.awayTeamId ?? it.teams?.awayTeamId ?? it.awayId ?? null,
          homeTeamName: it.homeTeamName ?? it.teams?.homeTeamName ?? it.homeName ?? '',
          awayTeamName: it.awayTeamName ?? it.teams?.awayTeamName ?? it.awayName ?? '',
        },
      };
    };

    const useCalendario = () => fetchCalendario().then(res => {
      // acepta {items:[…]} | {data:[…]} | arreglo directo
      let base = [];

if (res && res.events && Array.isArray(res.order)) {
  const scopeDefault = (res.scope || 'guatemala').toLowerCase();
  base = res.order.map(key => {
    const ev = res.events[key];
    if (!ev) return null;
    const { id, scope } = parseMatchRef(key, scopeDefault);
    return {
      matchId: id,
      scope,
      date: String(ev.date),                 // viene 20250928 (num) -> lo normaliza adaptCalRow
      scheduledStart: String(ev.scheduledStart || '').slice(0, 5),
      gmt: ev.gmt ?? 0,
      statusId: Number(ev.statusId ?? 0),
      teams: ev.teams || {},
      competition: ev.roundTitle || ev.competition || '',
    };
  }).filter(Boolean);
} else {
  // formatos anteriores: {items:[…]} | {data:[…]} | {matchs:[…]} | array
  base = Array.isArray(res?.items) ? res.items
       : Array.isArray(res?.data)  ? res.data
       : Array.isArray(res?.matchs)? res.matchs
       : Array.isArray(res)        ? res : [];
}

base = base.map(adaptCalRow).filter(Boolean);

      // normaliza hora/fecha GT para ordenar y filtros
      base = base.map(m => {
        const timeRaw = ((m?.scheduledStart || '').slice(0, 5) || '00:00');
        const { hhmm: timeGT, shift } = adjustTimeToGuatemala(timeRaw, Number(m?.gmt));
        const dateAdj = (shift ? shiftYmd(m.date, shift) : m.date) || m.date || '';
        return { ...m, _dateAdj: String(dateAdj).replace(/-/g, ''), _timeGT: timeGT };
      });

 // --- filtra semana GT (preferir actual; si no, la más cercana) ---
const { mon, sun } = weekBoundsGT();

// 1) normalizar a Date UTC desde yyyymmdd (ya en GT por _dateAdj/ajuste)
const toDay = (m) => toDateUTC((m?._dateAdj || m?.date || '').replace(/-/g, ''));

// 2) agrupar por semana GT (lun–dom)
const toWeekKey = (d) => {
  // lunes de esa semana (GT)
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = base.getUTCDay(); // 0=dom..6=sáb
  base.setUTCDate(base.getUTCDate() - ((dow === 0 ? 7 : dow) - 1));
  base.setUTCHours(0,0,0,0);
  const y = base.getUTCFullYear();
  const m = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${y}${m}${dd}`; // clave = lunes de esa semana (GT)
};

const itemsWithDate = base
  .map(m => ({ m, d: toDay(m) }))
  .filter(x => x.d instanceof Date && !isNaN(x.d));

// 3) ¿hay partidos en la semana actual?
const hasCurrentWeek = itemsWithDate.some(x => x.d >= mon && x.d <= sun);

let weekKeyToUse;
if (hasCurrentWeek) {
  // usar la semana actual
  const monKey = toWeekKey(mon);
  weekKeyToUse = monKey;
} else {
  // elegir la semana MÁS CERCANA A HOY (GT)
  const now = new Date(Date.now() + (-6) * 3600000); // GT
  const byWeek = new Map();
  itemsWithDate.forEach(({ m, d }) => {
    const key = toWeekKey(d);
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key).push({ m, d });
  });

  let bestKey = null, bestDist = Infinity;
  byWeek.forEach((arr, key) => {
    // centro de la semana (jueves ~ mitad)
    const [y, mo, dd] = [key.slice(0,4), key.slice(4,6), key.slice(6,8)].map(Number);
    const monGT = new Date(Date.UTC(y, mo - 1, dd));
    const center = new Date(monGT); center.setUTCDate(center.getUTCDate() + 3);
    const dist = Math.abs(center - now);
    if (dist < bestDist) { bestDist = dist; bestKey = key; }
  });
  weekKeyToUse = bestKey;
}

// 4) recortar a la semana elegida
if (weekKeyToUse) {
  const [y, mo, dd] = [weekKeyToUse.slice(0,4), weekKeyToUse.slice(4,6), weekKeyToUse.slice(6,8)].map(Number);
  const wMon = new Date(Date.UTC(y, mo - 1, dd)); wMon.setUTCHours(0,0,0,0);
  const wSun = new Date(wMon); wSun.setUTCDate(wSun.getUTCDate() + 6); wSun.setUTCHours(23,59,59,999);
  base = base.filter(m => {
    const dt = toDay(m);
    return dt && dt >= wMon && dt <= wSun;
  });
} else {
  // si por alguna razón no hay fechas válidas, no recortes
}



      // orden
      base.sort((a, b) => {
        const ka = `${(a._dateAdj || a.date || '')} ${(a._timeGT || '00:00')} ${String(a.matchId).padStart(9,'0')}`;
        const kb = `${(b._dateAdj || b.date || '')} ${(b._timeGT || '00:00')} ${String(b.matchId).padStart(9,'0')}`;
        return ka.localeCompare(kb);
      });

      const scopes = new Set(base.map(x => (x.scope || 'guatemala').toLowerCase()));
      const showTourneyBadge = scopes.size > 1;

      // 1) Hidratar TODOS los partidos desde events/{id}.json (no filtrar solo live/near-KO)
const targets = (base || []).filter(m => m && m.matchId);
homeLog('hydrate:start', { totalTargets: targets.length });

Promise.allSettled(
  targets.map(t => {
    const bust = Number(t.statusId) === 1; // si el weekly ya lo marca en vivo, bust cache
    return this.getMatchInfo(t.matchId, t.scope || 'guatemala', bust);
  })
).then(results => {
  const byId = new Map();
  results.forEach((r, i) => {
    const matchId = String(targets[i].matchId);
    if (r.status === 'fulfilled' && r.value) {
      const v = r.value;
      const nextStatus = Number(v?.status?.statusId);
      const vH = Number(v?.score?.home ?? v?.score?.H ?? v?.intScoreHome);
      const vA = Number(v?.score?.away ?? v?.score?.A ?? v?.intScoreAway);
      homeLog('hydrate:event-json', { matchId, nextStatus, score: `${Number.isFinite(vH)?vH:'-'}:${Number.isFinite(vA)?vA:'-'}` });
      byId.set(matchId, v);
    } else {
      homeLog('hydrate:event-json:FAILED', { matchId, reason: r.reason?.message || String(r.reason) });
    }
  });

  // 2) MERGE **sobre base** (NO usar this.state.matchs aquí)
  const merged = (base || []).map(m => {
    const v = byId.get(String(m.matchId));
    if (!v) return m;

    const prevStatus = Number(m.statusId);
    const nextStatus = Number(v?.status?.statusId ?? prevStatus);

    const updated = {
      ...m,
      scheduledStart: v?.match?.scheduledStart || m.scheduledStart,
      statusId: nextStatus,
      statusObj: v?.status || m.statusObj || null,
      scoreStatus: v?.scoreStatus ?? m.scoreStatus,
    };

    const s = readScoreFromEventDF(v);
if (s) {
  // Usa exactamente lo que trae el evento
  updated.scoreStatus = v.scoreStatus || {
    [s.homeId]: { score: s.H },
    [s.awayId]: { score: s.A },
  };
  updated.score = { H: s.H, A: s.A };
  homeLog('score:update', {
    matchId: String(m.matchId),
    homeId: s.homeId,
    awayId: s.awayId,
    score: `${s.H}:${s.A}`,
  });
}

    return updated;
  });

  homeLog('hydrate:done', { merged: merged.length });

  if (this.mounted) {
    // ✅ NUEVO: limpiamos nulos y forzamos sections=[] cuando está vacío
    const clean = (merged || []).filter(Boolean);

    this.setState({
      matchs: clean,
      sections: clean.length ? [{ data: clean }] : [], // ✅ NUEVO
      refreshing: false,
      showTourneyBadge, // aquí sí existe en este scope
    });
    this.refreshFollowed(base);
  }
}).catch(err => {
  homeLog('hydrate:catch', { error: err?.message || String(err) });
});

    });

    useCalendario().catch(err => {
      dlog('ERROR loadData:', err?.message || err);
      // ✅ NUEVO: forzamos sections=[] en error
      this.setState({ matchs: [], sections: [], refreshing: false, showTourneyBadge: false }); // ✅ NUEVO
      Alert.alert('Error', 'No se pudo cargar el calendario.');
    });
  };

  // bust=true solo en vivo (evitar cache)
  getMatchInfo(matchId, scope = 'guatemala', bust = false) {
    const tsQ = bust ? `?t=${Date.now()}` : '';
    const url = `${API_WEB_DEPORT_URL}/${scope}/events/${matchId}.json${tsQ}`;
    return fetch(url, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache', 'Expires': '0' },
    }).then(r => r.json());
  }

  /* ======= Poll EN VIVO ======= */
  startPolling = () => {
    if (this.pollInterval || !this.mounted) return;
    this.pollScores();
    this.pollInterval = setInterval(this.pollScores, 20000);
  };
  stopPolling = () => { if (this.pollInterval) { clearInterval(this.pollInterval); this.pollInterval = null; } };

  refreshFollowed = (list = []) => {
  const ids = Array.from(new Set(
    list.map(it => String(it?.matchId || '')).filter(Boolean)
  ));
  if (!ids.length) {
    if (this.mounted) this.setState({ followedById: {} });
    return;
  }
  Promise.all(ids.map(id =>
    isFollowingMatch(id).then(v => [id, !!v]).catch(() => [id, false])
  )).then(pairs => {
    const map = {};
    for (const [id, v] of pairs) map[id] = v;
    if (this.mounted) this.setState({ followedById: map });
  });
};


  pollScores = () => {
    if (!this.mounted) return;
    const { matchs } = this.state;
    if (!Array.isArray(matchs) || !matchs.length) return;

    const targets = matchs.filter(m => m?.matchId && (isLive(Number(m.statusId)) || isNearKickoffGT(m)));
    if (!targets.length) return;

    Promise.allSettled(
  targets.map(t => this.getMatchInfo(t.matchId, t.scope || 'guatemala', true))
).then(results => {
  homeLog('poll:start', { totalTargets: targets.length });

  const byId = new Map();
  results.forEach((r, i) => {
    const matchId = String(targets[i].matchId);
    if (r.status === 'fulfilled' && r.value) {
      const v = r.value;
      const nextStatus = Number(v?.status?.statusId);
      const vH = Number(v?.score?.home ?? v?.score?.H ?? v?.intScoreHome);
      const vA = Number(v?.score?.away ?? v?.score?.A ?? v?.intScoreAway);
      homeLog('poll:event-json', {
        matchId,
        nextStatus,
        score: (Number.isFinite(vH) ? vH : '-') + ':' + (Number.isFinite(vA) ? vA : '-'),
      });
      byId.set(matchId, v);
    } else {
      const reason = r.reason?.message || String(r.reason || '');
      homeLog('poll:event-json:FAILED', { matchId, reason });
    }
  });

  const next = (this.state.matchs || []).map(m => {
    const v = byId.get(String(m.matchId));
    if (!v) return m;

    const prevStatus = Number(m.statusId);
    const updatedStatus = Number(v?.status?.statusId ?? prevStatus);

    const updated = {
      ...m,
      scheduledStart: v?.match?.scheduledStart || m.scheduledStart,
      statusId: updatedStatus,
      statusObj: v?.status || m.statusObj || null,
      scoreStatus: v?.scoreStatus ?? m.scoreStatus,
    };

    const s = readScoreFromEventDF(v);
if (s) {
  // Usa exactamente lo que trae el evento
  updated.scoreStatus = v.scoreStatus || {
    [s.homeId]: { score: s.H },
    [s.awayId]: { score: s.A },
  };
  updated.score = { H: s.H, A: s.A };
  homeLog('score:update', {
    matchId: String(m.matchId),
    homeId: s.homeId,
    awayId: s.awayId,
    score: `${s.H}:${s.A}`,
  });
}


    return updated;
  });

  homeLog('poll:done', { merged: next.length });

  if (this.mounted) {
    // ✅ NUEVO: limpiamos nulos y forzamos sections=[] cuando está vacío también en poll
    const clean = (next || []).filter(Boolean);

    this.setState({
      matchs: clean,
      sections: clean.length ? [{ data: clean }] : [], // ✅ NUEVO
      refreshing: false,
      showTourneyBadge: this.state.showTourneyBadge, // ✅ seguro en poll
      followedById: {},
    });
    this.refreshFollowed(clean);
  }
}).catch(err => {
  homeLog('poll:catch', { error: err?.message || String(err) });
});
  };

  /* ======= UI ======= */
  renderTitleBar = () => (
    <View style={styles.titleBar}><Text style={styles.screenTitle}>Calendario completo</Text></View>
  );

// ⬇️ Dentro de la clase Home (class Home extends Component { ... })
safeShowInterstitial = async (timeoutMs = 900) => {
  try {
    // Intento no bloqueante: si no está listo en ~900ms, seguimos.
    const showPromise = (async () => {
      const ok = await tryShowInterstitial(); // true si se mostró
      return ok;
    })();

    const timer = new Promise(resolve => setTimeout(() => resolve(false), timeoutMs));
    const didShow = await Promise.race([showPromise, timer]);

    // Si no se mostró (no estaba listo o timeout), intentamos precargar para la próxima
    if (!didShow) { try { initInterstitial(); } catch(e) {} }
    return didShow;
  } catch {
    try { initInterstitial(); } catch(e) {}
    return false;
  }
};

  goMatch = async (item) => {
  if (!item?.matchId) return;

  // 🔹 Analytics: clic a partido desde Home
  try {
    analytics().logEvent('open_match_from_home', {
      origin: 'home',
      match_id: String(item?.matchId ?? ''),
      home_team: String(item?.teams?.homeTeamName ?? item?.homeTeamName ?? ''),
      away_team: String(item?.teams?.awayTeamName ?? item?.awayTeamName ?? ''),
      scope: String(item?.scope ?? ''),
    });
  } catch {}

  // ⭐ Mostrar interstitial (si está listo) sin bloquear más de ~900ms
  await this.safeShowInterstitial(900);

  // ➜ Luego navegar
  this.props.navigation.push('Match', {
    matchId: String(item.matchId),
    channel: item.scope || 'guatemala',
    pre: {
      id: String(item.matchId),
      teams: {
        homeTeamId: String(item?.teams?.homeTeamId ?? item.homeTeamId ?? ''),
        awayTeamId: String(item?.teams?.awayTeamId ?? item.awayTeamId ?? ''),
        homeTeamName: item?.teams?.homeTeamName ?? item.homeTeamName ?? '',
        awayTeamName: item?.teams?.awayTeamName ?? item.awayTeamName ?? '',
      },
      date: item._dateAdj || item.date || null,
      scheduledStart: item.scheduledStart ?? null,
      gmt: item.gmt ?? null,
    },
  });
};



  renderItem = ({ item, index, section }) => {
    const statusId = Number(item?.statusId ?? 0);
    const { homeId, awayId } = getHomeAwayIds(item);
    const homeNm = item?.teams?.homeTeamName ?? item.homeTeamName ?? '';
    const awayNm = item?.teams?.awayTeamName ?? item.awayTeamName ?? '';
    const live = isLive(statusId);
    const total = section.data.length; // o el array que uses para esa sección
    const showInline = shouldShowInlineAd(index, total);

    const isDarkTheme = this.props.theme?.mode === 'dark';

    const dateL1 = (() => {
      const s = String(item._dateAdj || item.date || '');
      if (s.length < 8) return '--/--/----';
      const y = +s.slice(0, 4), mo = +s.slice(4, 6) - 1, d = +s.slice(6, 8);
      const dt = new Date(Date.UTC(y, mo, d));
      const wd = dt.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');
      return `${wd}, ${item._timeGT || '--:--'}`;
    })();
    const dateL2 = (() => {
      const s = String(item._dateAdj || item.date || '');
      if (s.length < 8) return '';
      const y = +s.slice(0, 4), mo = +s.slice(4, 6) - 1, d = +s.slice(6, 8);
      const dt = new Date(y, mo, d);
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yy = dt.getFullYear();
      return `${dd}/${mm}/${yy}`;
    })();

    let scoreText = '—';
    const ss = item?.scoreStatus;
    if (ss && homeId != null && awayId != null && ss[homeId]?.score != null && ss[awayId]?.score != null) {
      scoreText = `${ss[homeId].score} ${SEP} ${ss[awayId].score}`;
    } else if (item?.score?.H != null && item?.score?.A != null) {
      scoreText = `${item.score.H} ${SEP} ${item.score.A}`;
    }

    const showBadge = this.state.showTourneyBadge;
    const tourney = tourneyShort(item.scope, item.competition);
    const isFollowed = !!this.state.followedById?.[String(item?.matchId || '')];
    const showBell = isFollowed && Number(item?.statusId ?? 0) !== 2; // oculta en finalizados

    return (
    <>
      {showInline && <InlineAd />}
      <View style={{ position: 'relative' }}>
        {index === 0 ? (
  <CopilotStep
    name="home-first-match"
    order={1}
    text="Toca un partido para ver el EN VIVO, alineaciones, estadísticas y posiciones."
  >
    <WalkthroughableView
      collapsable={false}
      style={{ width: '100%', alignSelf: 'stretch' }}   // ✅ CLAVE
    >
      <View
        collapsable={false}
        style={{ width: '100%' }}                        // ✅ CLAVE
      >
        <Card
          match={item}
          onPress={() => this.goMatch(item)}
          showTourneyBadge={this.state.showTourneyBadge}
          tourneyText={tourneyShort(item.scope, item.competition)}
          livePulse={this.state.livePulse}
        />
      </View>
    </WalkthroughableView>
  </CopilotStep>
) : (

  <Card
    match={item}
    onPress={() => this.goMatch(item)}
    showTourneyBadge={this.state.showTourneyBadge}
    tourneyText={tourneyShort(item.scope, item.competition)}
    livePulse={this.state.livePulse}
  />
)}

        {showBell && (
          <View
            pointerEvents="none"
            style={{ position: 'absolute', right: 12, bottom: 10 }}
            accessibilityElementsHidden
            importantForAccessibility="no"
          >
            <SAFEImage
             source={getBellIcon({ on: true, dark: isDarkTheme })}
             style={{ width: 16, height: 16, resizeMode: 'contain' }}
            />
          </View>
        )}
      </View>
    </>
  );

  };

  keyExtractor = (item, idx) => `${item?.matchId || 'm'}_${idx}`;

    render() {
    const TAB_H = 58;                                  // alto visual del FooterTabs
    const BANNER_H = 0;
    const safeBottom = Math.max(this.props.insets?.bottom || 0, 8); // barra de gestos

    // 👇 ESTO ES NUEVO: tomamos colores del tema
    const { theme } = this.props;
    const colors = theme.colors;

    // ✅ NUEVO: empty “a prueba de balas”
    const empty = (this.state.sections?.[0]?.data?.length || 0) === 0; // ✅ NUEVO

    return (
      <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
        <StatusBar barStyle={theme.statusBarStyle} />

        <View style={styles.headerFixed}>
  <Header
    navigation={this.props.navigation}
    showSearch
    title="Partidos de hoy"
    onSearchPress={() => this.setState({ showTeamSearch: true })}

    showSettings
    onSettingsPress={() => this.props.navigation.navigate('Settings')}

    disableBack
  />
</View>

        <View style={styles.content}>

          {/* ✅ NUEVO: mostramos mensaje cuando no hay partidos (sin depender de ListEmptyComponent) */}
          {empty ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: 58 + 0 + Math.max(this.props.insets?.bottom || 0, 8) }}>

              <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: '700' }}>
                No hay partidos programados
              </Text>
            </View>
          ) : (
            <SectionList
              sections={this.state.sections}
              keyExtractor={this.keyExtractor}
              renderItem={this.renderItem}
              renderSectionHeader={null}
              contentContainerStyle={{
                paddingHorizontal: S.screenPadH,
                paddingTop: 6,
                paddingBottom: 10,
                flexGrow: 1, // ✅ NUEVO (evita recortes raros)
              }}
              ListFooterComponent={() => <View style={{ height: TAB_H + 6 }} />}
              scrollIndicatorInsets={{ bottom: TAB_H + 6 }}
              onRefresh={this.refresh}
              refreshing={this.state.refreshing}
              initialNumToRender={12}
              windowSize={15}
              removeClippedSubviews={false} // ✅ NUEVO (evita que se recorte)
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted }}>
                    No hay partidos programados
                  </Text>
                </View>
              }
            />
          )}
        </View>

        <View
          style={[
            styles.footerFixed, // ✅ NUEVO: era S.footerFixed y NO existe, usamos el original del StyleSheet
            { height: TAB_H + BANNER_H + safeBottom },
          ]}
        >
          {/* Banner ENCIMA de los tabs */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: TAB_H + safeBottom,
              zIndex: 20,
              elevation: 20,
            }}
          >
            <AdFooter />
          </View>
          

          {/* Tabs pegados al borde inferior */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: TAB_H + safeBottom,
              zIndex: 10,
              elevation: 10,
            }}
          >
            <FooterTabs
              navigation={this.props.navigation}
              routeName="Home"
            />
          </View>
        </View>

                <TeamSearchModal
          visible={this.state.showTeamSearch}
          onClose={() => this.setState({ showTeamSearch: false })}
          onSelect={(team) =>
            this.props.navigation.navigate('TeamScreen', {
              teamId: team.id,
              scope: team.scope,
            })
          }
        />

      </View>
    );
  }
}


/* ========= Estilos ========= */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f7f7', position:'relative' },
  headerFixed: {}, content: { flex: 1 }, footerFixed: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    pointerEvents: 'box-none',
  },
  titleBar: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 6 },
  screenTitle: { fontWeight: '600', fontSize: 16, color: '#111827' },

  card: {
    marginTop: S.cardMT, paddingVertical: S.cardPadV, paddingHorizontal: S.cardPadH,
    backgroundColor: '#fff', borderRadius: S.cardRadius,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: S.cardShadow, elevation: 1,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tourneyText: { fontSize: 10, color: '#0ea5e9', fontWeight: '700' },

  live: { color: '#ef4444', fontWeight: '800', fontSize: 11, letterSpacing: 0.3 },

  middleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamCol: { width: S.sideW, alignItems: 'center' },
  teamName: { fontSize: S.teamFont, color: '#111827', width: S.sideW, textAlign: 'center' },

  centerCol: { flex: 1, alignItems: 'center' },
  centerScore: { fontSize: S.centerFS, fontWeight: '800', color: '#111827' },
  dateL1: { fontSize: 12, fontWeight: '600', color: '#111826' },
  dateL2: { fontSize: 12, fontWeight: '600', color: '#111826' },

  statusUnder: { marginTop: 6, fontSize: 12, color: '#64748b', textAlign: 'center' },
});
function HomeCopilotWrapper(props) {
  const { start, copilotEvents } = useCopilot();

  // Le pasamos start y copilotEvents al class Home
  return <Home {...props} start={start} copilotEvents={copilotEvents} />;
}

export default withSafeAreaInsets(withTheme(HomeCopilotWrapper));
