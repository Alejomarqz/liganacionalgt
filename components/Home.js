// components/Home.js
import React, { Component } from 'react';
import {
  StatusBar, Alert, Image, StyleSheet, Text, View,
  SectionList, TouchableOpacity, AppState, Animated, Easing,
} from 'react-native';
import Header from './Header';
import FooterTabs from './FooterTabs';
import AdFooter from '../ads/AdFooter';
import InlineAd from '../ads/InlineAd';
import Card from './Card';
import { setStartedFromPush } from '../services/notifications';
import { isFollowingMatch } from '../services/notifications';
import { getBellIcon } from '../utils/bell';
import TeamSearchModal from './TeamSearchModal';
import { withSafeAreaInsets } from 'react-native-safe-area-context';
import { withTheme } from '../utils/ThemeContext';
import { BRAND } from '../utils/theme';
import analytics from '@react-native-firebase/analytics';
import { API_WEB_DEPORT_URL, API_HOME_WEEK_URL } from '@env';

import { CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';
import { shouldShowGuide, markGuideDone } from '../utils/onboarding';
import { followersDb, toggleFollowTeam, ensureAnonUser } from "../services/firestore";

const WalkthroughableView = walkthroughable(View);

// === DEBUG HOME ===
const DEBUG_HOME = true;
const homeLog = (...args) => {
  if (!DEBUG_HOME) return;
  const ts = new Date().toISOString().split('T').join(' ').slice(0, 19);
  if (typeof window !== 'undefined' && window.__HOME_DEBUG === false) return;
  console.log(`[HOME ${ts}]`, ...args);
};

const SAFEImage = Image;

/* ========= Constantes / helpers ========= */
const GT_OFFSET = -6;
const SEP = '\u202F\u00B7\u202F';
const LIVE_SET = new Set([1, 5, 6, 7, 8, 9, 10, 11, 12]);
const isLive = id => LIVE_SET.has(Number(id));
const dlog = (...a) => { if (__DEV__) console.log('[Home]', ...a); };

function shouldShowInlineAd(index, total) {
  if (total <= 7) return false;
  const marks = total >= 12 ? [2, 8] : [2];
  const safeMarks = marks.filter(m => m < total - 2);
  return safeMarks.includes(index);
}

function readScoreFromEventDF(v) {
  const homeId = Number(v?.match?.homeTeamId);
  const awayId = Number(v?.match?.awayTeamId);
  const s = v?.scoreStatus || null;
  if (!s || !Number.isFinite(homeId) || !Number.isFinite(awayId)) return null;
  const hNode = s[String(homeId)] || s[homeId];
  const aNode = s[String(awayId)] || s[awayId];
  const H = Number(hNode?.score);
  const A = Number(aNode?.score);
  if (Number.isFinite(H) && Number.isFinite(A)) return { homeId, awayId, H, A };
  return null;
}

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

/* ========= semana GT ========= */
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

/* ========= torneo corto ========= */
const SCOPE_LABEL = { guatemala: 'Liga Nacional', concacaf: 'Eliminatorias', nationsleague: 'Nations' };
const tourneyShort = (scope, competition) =>
  (competition && competition.trim()) ? competition : (SCOPE_LABEL[String(scope).toLowerCase()] || String(scope || ''));

/* ========= UI ========= */
const S = { screenPadH: 0, cardMT: 8, cardPadV: 8, cardPadH: 12, cardRadius: 12, cardShadow: 3,
  logo: 34, teamFont: 10.5, centerFS: 20, smallFS: 10, sideW: 120 };

/* ─────────────────────────────────────────────
   buildSections — lógica de agrupación por día
   ─────────────────────────────────────────── */
function buildSections(matchs) {
  if (!matchs || !matchs.length) return [];

  const gtNowMs = Date.now() + GT_OFFSET * 3600000;
  const gtNow   = new Date(gtNowMs);

  const ymdOf = (dt) =>
    `${dt.getUTCFullYear()}${String(dt.getUTCMonth()+1).padStart(2,'0')}${String(dt.getUTCDate()).padStart(2,'0')}`;

  const todayYmd    = ymdOf(gtNow);
  const tomorrowDt  = new Date(gtNow); tomorrowDt.setUTCDate(tomorrowDt.getUTCDate() + 1);
  const tomorrowYmd = ymdOf(tomorrowDt);

  const getYmd = (m) => String(m._dateAdj || m.date || '').replace(/-/g,'').slice(0,8);
  const DONE   = new Set([2,3,4,7,9,11]);

  // ── 1. Separar pasados vs. hoy/futuro ─────
  const past   = matchs.filter(m => getYmd(m) < todayYmd);
  const todayOn = matchs.filter(m => getYmd(m) >= todayYmd);

  // ── 2. Decidir qué mostrar ────────────────
  // Si hay partidos hoy o en adelante → mostrar solo esos (ignorar pasados)
  // Si NO hay nada hoy/futuro → mostrar pasados como "Finalizados"
  const useList = todayOn.length > 0 ? todayOn : past;
  const forcePast = todayOn.length === 0;

  // ── 3. Agrupar por fecha ──────────────────
  const byDate = new Map();
  for (const m of useList) {
    const ymd = getYmd(m);
    if (!byDate.has(ymd)) byDate.set(ymd, []);
    byDate.get(ymd).push(m);
  }
  const sortedDates = [...byDate.keys()].sort();

  // ── 4. Contexto ───────────────────────────
  const allFinished = useList.every(m => DONE.has(Number(m.statusId)));
  const hasTodayOrTomorrow = sortedDates.some(y => y === todayYmd || y === tomorrowYmd);

  // ¿Cuántos días faltan para la primera fecha futura?
  const firstFutureYmd = sortedDates.find(y => y > todayYmd);
  let daysUntilNext = null;
  if (firstFutureYmd) {
    const y=+firstFutureYmd.slice(0,4), mo=+firstFutureYmd.slice(4,6)-1, d=+firstFutureYmd.slice(6,8);
    const todayMs = Date.UTC(gtNow.getUTCFullYear(), gtNow.getUTCMonth(), gtNow.getUTCDate());
    daysUntilNext = Math.round((Date.UTC(y,mo,d) - todayMs) / 86400000);
  }

  // Modo "Próxima Jornada": todos finalizados Y faltan ≥ 3 días
  const showNextJornada = allFinished && daysUntilNext !== null && daysUntilNext >= 2;

  // ── 5. Formato de fecha ───────────────────
  const fmtDate = (ymd) => {
    const y=+ymd.slice(0,4), mo=+ymd.slice(4,6)-1, d=+ymd.slice(6,8);
    const dt = new Date(Date.UTC(y, mo, d));
    const dayNum   = dt.getUTCDate();
    const monthStr = dt.toLocaleDateString('es-ES', { month: 'long', timeZone: 'UTC' });
    const weekday  = dt.toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'UTC' });
    const cap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    return { subtitle: `${dayNum} de ${monthStr}`, weekday: cap };
  };

  // ── 6. Construir secciones ────────────────
  const sections = [];

  if (forcePast || (allFinished && !firstFutureYmd)) {
    // Todos pasados/finalizados sin próxima fecha → una sola sección "Finalizados"
    const allItems = useList; // ya ordenados por fecha
    const firstYmd = sortedDates[0];
    const lastYmd  = sortedDates[sortedDates.length - 1];
    const { subtitle } = fmtDate(lastYmd);
    sections.push({ title: 'Finalizados', subtitle, data: allItems, ymd: lastYmd });

  } else if (showNextJornada) {
    // Próxima jornada (≥ 3 días) → una sección por cada fecha futura
    for (const ymd of sortedDates) {
      const { subtitle } = fmtDate(ymd);
      sections.push({ title: 'Próxima Jornada', subtitle, data: byDate.get(ymd), ymd });
    }

  } else if (!hasTodayOrTomorrow) {
    // Fechas futuras dentro de los 3 días → nombre del día
    for (const ymd of sortedDates) {
      const { subtitle, weekday } = fmtDate(ymd);
      sections.push({ title: weekday, subtitle, data: byDate.get(ymd), ymd });
    }

  } else {
    // MODO NORMAL: Hoy / Finalizados / Mañana / días extra
    for (const ymd of sortedDates) {
      const items = byDate.get(ymd);
      const { subtitle, weekday } = fmtDate(ymd);
      const isToday    = ymd === todayYmd;
      const isTomorrow = ymd === tomorrowYmd;

      let title;
      if (isToday) {
        const todayAllDone = items.every(m => DONE.has(Number(m.statusId)));
        title = todayAllDone ? 'Finalizados' : 'Hoy';
      } else if (isTomorrow) {
        title = 'Mañana';
      } else {
        title = weekday;
      }

      sections.push({ title, subtitle, data: items, ymd });
    }
  }

  return sections;
}


class Home extends Component {
  state = {
    matchs: [],
    sections: [],
    refreshing: false,
    livePulse: new Animated.Value(1),
    showTourneyBadge: false,
    showTeamSearch: false,
  };
  mounted = false; pollInterval = null; liveLoop = null;
  guideEligible = false;
  guideStarted = false;

  componentDidMount() {
    this.mounted = true; this.loadData();
    try {
      shouldShowGuide('guide_home_v2').then((ok) => {
        if (!ok) return;
        this.guideEligible = true;
        this.props.copilotEvents?.on?.('stop', async () => {
          await markGuideDone('guide_home_v2');
        });
      });
    } catch (e) {}

    try { initInterstitial(); } catch(e) {}
    this.focusUnsub = this.props.navigation?.addListener?.('focus', () => {
      setStartedFromPush(false);
      this.startPolling();
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
    if (this.guideEligible && !this.guideStarted && prevLen === 0 && currLen > 0) {
      this.guideStarted = true;
      setTimeout(() => { this.props.start?.('home-first-match'); }, 300);
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

    const adaptCalRow = it => {
      if (!it) return null;
      const rawDate = it.dateAdj || it._dateAdj || it.matchDate || it.date || '';
      const rawTime = it.timeGT || it._timeGT || (it.scheduledStart ? String(it.scheduledStart).slice(0,5) : (it.hora || ''));
      return {
        matchId: it.matchId ?? it.id ?? null,
        scope: (it.scope || 'guatemala').toLowerCase(),
        date: String(rawDate).replace(/-/g, ''),
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
      let base = [];
      if (res && res.events && Array.isArray(res.order)) {
        const scopeDefault = (res.scope || 'guatemala').toLowerCase();
        base = res.order.map(key => {
          const ev = res.events[key];
          if (!ev) return null;
          const { id, scope } = parseMatchRef(key, scopeDefault);
          return {
            matchId: id, scope,
            date: String(ev.date),
            scheduledStart: String(ev.scheduledStart || '').slice(0, 5),
            gmt: ev.gmt ?? 0,
            statusId: Number(ev.statusId ?? 0),
            teams: ev.teams || {},
            competition: ev.roundTitle || ev.competition || '',
          };
        }).filter(Boolean);
      } else {
        base = Array.isArray(res?.items) ? res.items
             : Array.isArray(res?.data)  ? res.data
             : Array.isArray(res?.matchs)? res.matchs
             : Array.isArray(res)        ? res : [];
      }

      base = base.map(adaptCalRow).filter(Boolean);
      base = base.map(m => {
        const timeRaw = ((m?.scheduledStart || '').slice(0, 5) || '00:00');
        const { hhmm: timeGT, shift } = adjustTimeToGuatemala(timeRaw, Number(m?.gmt));
        const dateAdj = (shift ? shiftYmd(m.date, shift) : m.date) || m.date || '';
        return { ...m, _dateAdj: String(dateAdj).replace(/-/g, ''), _timeGT: timeGT };
      });

      const { mon, sun } = weekBoundsGT();
      const toDay = (m) => toDateUTC((m?._dateAdj || m?.date || '').replace(/-/g, ''));
      const toWeekKey = (d) => {
        const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        const dow = base.getUTCDay();
        base.setUTCDate(base.getUTCDate() - ((dow === 0 ? 7 : dow) - 1));
        base.setUTCHours(0,0,0,0);
        const y = base.getUTCFullYear();
        const m = String(base.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(base.getUTCDate()).padStart(2, '0');
        return `${y}${m}${dd}`;
      };

      const itemsWithDate = base.map(m => ({ m, d: toDay(m) })).filter(x => x.d instanceof Date && !isNaN(x.d));
      const hasCurrentWeek = itemsWithDate.some(x => x.d >= mon && x.d <= sun);
      let weekKeyToUse;

      if (hasCurrentWeek) {
        weekKeyToUse = toWeekKey(mon);
      } else {
        const now = new Date(Date.now() + GT_OFFSET * 3600000);
        const byWeek = new Map();
        itemsWithDate.forEach(({ m, d }) => {
          const key = toWeekKey(d);
          if (!byWeek.has(key)) byWeek.set(key, []);
          byWeek.get(key).push({ m, d });
        });
        let bestKey = null, bestDist = Infinity;
        byWeek.forEach((arr, key) => {
          const [y, mo, dd] = [key.slice(0,4), key.slice(4,6), key.slice(6,8)].map(Number);
          const monGT = new Date(Date.UTC(y, mo - 1, dd));
          const center = new Date(monGT); center.setUTCDate(center.getUTCDate() + 3);
          const dist = Math.abs(center - now);
          if (dist < bestDist) { bestDist = dist; bestKey = key; }
        });
        weekKeyToUse = bestKey;
      }

      if (weekKeyToUse) {
        const [y, mo, dd] = [weekKeyToUse.slice(0,4), weekKeyToUse.slice(4,6), weekKeyToUse.slice(6,8)].map(Number);
        const wMon = new Date(Date.UTC(y, mo - 1, dd)); wMon.setUTCHours(0,0,0,0);
        const wSun = new Date(wMon); wSun.setUTCDate(wSun.getUTCDate() + 6); wSun.setUTCHours(23,59,59,999);
        base = base.filter(m => { const dt = toDay(m); return dt && dt >= wMon && dt <= wSun; });
      }

      base.sort((a, b) => {
        const ka = `${(a._dateAdj || a.date || '')} ${(a._timeGT || '00:00')} ${String(a.matchId).padStart(9,'0')}`;
        const kb = `${(b._dateAdj || b.date || '')} ${(b._timeGT || '00:00')} ${String(b.matchId).padStart(9,'0')}`;
        return ka.localeCompare(kb);
      });

      const scopes = new Set(base.map(x => (x.scope || 'guatemala').toLowerCase()));
      const showTourneyBadge = scopes.size > 1;

      const targets = (base || []).filter(m => m && m.matchId);
      homeLog('hydrate:start', { totalTargets: targets.length });

      Promise.allSettled(
        targets.map(t => {
          const bust = Number(t.statusId) === 1;
          return this.getMatchInfo(t.matchId, t.scope || 'guatemala', bust);
        })
      ).then(results => {
        const byId = new Map();
        results.forEach((r, i) => {
          const matchId = String(targets[i].matchId);
          if (r.status === 'fulfilled' && r.value) byId.set(matchId, r.value);
        });

        const merged = (base || []).map(m => {
          const v = byId.get(String(m.matchId));
          if (!v) return m;
          const nextStatus = Number(v?.status?.statusId ?? Number(m.statusId));
          const updated = {
            ...m,
            scheduledStart: v?.match?.scheduledStart || m.scheduledStart,
            statusId: nextStatus,
            statusObj: v?.status || m.statusObj || null,
            scoreStatus: v?.scoreStatus ?? m.scoreStatus,
          };
          const s = readScoreFromEventDF(v);
          if (s) {
            updated.scoreStatus = v.scoreStatus || { [s.homeId]: { score: s.H }, [s.awayId]: { score: s.A } };
            updated.score = { H: s.H, A: s.A };
          }
          return updated;
        });

        homeLog('hydrate:done', { merged: merged.length });

        if (this.mounted) {
          const clean = (merged || []).filter(Boolean);
          this.setState({
            matchs: clean,
            sections: buildSections(clean),  // ← agrupado por día
            refreshing: false,
            showTourneyBadge,
          });
          this.refreshFollowed(base);
        }
      }).catch(err => {
        homeLog('hydrate:catch', { error: err?.message || String(err) });
      });
    });

    useCalendario().catch(err => {
      dlog('ERROR loadData:', err?.message || err);
      this.setState({ matchs: [], sections: [], refreshing: false, showTourneyBadge: false });
      Alert.alert('Error', 'No se pudo cargar el calendario.');
    });
  };

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
    const ids = Array.from(new Set(list.map(it => String(it?.matchId || '')).filter(Boolean)));
    if (!ids.length) { if (this.mounted) this.setState({ followedById: {} }); return; }
    Promise.all(ids.map(id => isFollowingMatch(id).then(v => [id, !!v]).catch(() => [id, false]))).then(pairs => {
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
      const byId = new Map();
      results.forEach((r, i) => {
        const matchId = String(targets[i].matchId);
        if (r.status === 'fulfilled' && r.value) byId.set(matchId, r.value);
      });

      const next = (this.state.matchs || []).map(m => {
        const v = byId.get(String(m.matchId));
        if (!v) return m;
        const updatedStatus = Number(v?.status?.statusId ?? Number(m.statusId));
        const updated = {
          ...m,
          scheduledStart: v?.match?.scheduledStart || m.scheduledStart,
          statusId: updatedStatus,
          statusObj: v?.status || m.statusObj || null,
          scoreStatus: v?.scoreStatus ?? m.scoreStatus,
        };
        const s = readScoreFromEventDF(v);
        if (s) {
          updated.scoreStatus = v.scoreStatus || { [s.homeId]: { score: s.H }, [s.awayId]: { score: s.A } };
          updated.score = { H: s.H, A: s.A };
        }
        return updated;
      });

      if (this.mounted) {
        const clean = (next || []).filter(Boolean);
        this.setState({
          matchs: clean,
          sections: buildSections(clean),  // ← agrupado por día
          refreshing: false,
          showTourneyBadge: this.state.showTourneyBadge,
        });
        this.refreshFollowed(clean);
      }
    }).catch(err => {
      homeLog('poll:catch', { error: err?.message || String(err) });
    });
  };

  safeShowInterstitial = async (timeoutMs = 900) => {
    try {
      const showPromise = (async () => { const ok = await tryShowInterstitial(); return ok; })();
      const timer = new Promise(resolve => setTimeout(() => resolve(false), timeoutMs));
      const didShow = await Promise.race([showPromise, timer]);
      if (!didShow) { try { initInterstitial(); } catch(e) {} }
      return didShow;
    } catch {
      try { initInterstitial(); } catch(e) {}
      return false;
    }
  };

  goMatch = async (item) => {
    if (!item?.matchId) return;
    try {
      analytics().logEvent('open_match_from_home', {
        origin: 'home',
        match_id: String(item?.matchId ?? ''),
        home_team: String(item?.teams?.homeTeamName ?? item?.homeTeamName ?? ''),
        away_team: String(item?.teams?.awayTeamName ?? item?.awayTeamName ?? ''),
        scope: String(item?.scope ?? ''),
      });
    } catch {}
    await this.safeShowInterstitial(900);
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
    const isDarkTheme = this.props.theme?.mode === 'dark';
    const total = section.data.length;
    const showInline = shouldShowInlineAd(index, total);
    const isFollowed = !!this.state.followedById?.[String(item?.matchId || '')];
    const showBell = isFollowed && Number(item?.statusId ?? 0) !== 2;

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
                style={{ width: '100%', alignSelf: 'stretch' }}
              >
                <View collapsable={false} style={{ width: '100%' }}>
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

  /* ── Section header ── */
  renderSectionHeader = ({ section }) => {
    const { theme } = this.props;
    const colors = theme.colors;
    const hasLive = section.data.some(m => isLive(Number(m.statusId)));

    return (
      <View style={[styles.sectionHeader, { backgroundColor: colors.screenBg }]}>
        <View style={styles.sectionHeaderInner}>
          <View style={styles.sectionTitleRow}>
            {hasLive && <View style={styles.liveIndicator} />}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
          </View>
          {!!section.subtitle && (
            <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
              {section.subtitle}
            </Text>
          )}
        </View>
        <View style={[styles.sectionDivider, { backgroundColor: colors.cardBorder }]} />
      </View>
    );
  };

  keyExtractor = (item, idx) => `${item?.matchId || 'm'}_${idx}`;

  render() {
    const TAB_H = 58;
    const BANNER_H = 0;
    const safeBottom = Math.max(this.props.insets?.bottom || 0, 8);
    const { theme } = this.props;
    const colors = theme.colors;
    const empty = !this.state.sections || this.state.sections.length === 0 ||
                  this.state.sections.every(s => !s.data || s.data.length === 0);

    return (
      <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
        <StatusBar barStyle={theme.statusBarStyle} />

        <View style={styles.headerFixed}>
          <Header
            navigation={this.props.navigation}
            showLogo
            showSearch
            onSearchPress={() => this.setState({ showTeamSearch: true })}
            showSettings
            onSettingsPress={() => this.props.navigation.navigate('Settings')}
            disableBack
          />
        </View>

        <View style={styles.content}>
          {empty ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, paddingBottom: TAB_H + safeBottom }}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No hay partidos programados
              </Text>
            </View>
          ) : (
            <SectionList
              sections={this.state.sections}
              keyExtractor={this.keyExtractor}
              renderItem={this.renderItem}
              renderSectionHeader={this.renderSectionHeader}
              contentContainerStyle={{ paddingTop: 0, paddingBottom: 140, flexGrow: 1 }}
              ListFooterComponent={() => <View style={{ height: TAB_H + 6 }} />}
              scrollIndicatorInsets={{ bottom: TAB_H + 6 }}
              onRefresh={this.refresh}
              refreshing={this.state.refreshing}
              initialNumToRender={12}
              windowSize={15}
              removeClippedSubviews={false}
              stickySectionHeadersEnabled={false}
            />
          )}
        </View>

        <View style={[styles.footerFixed, { height: TAB_H + BANNER_H + safeBottom }]}>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: TAB_H + safeBottom, zIndex: 20, elevation: 20 }}>
            <AdFooter />
          </View>
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: TAB_H + safeBottom, zIndex: 10, elevation: 10 }}>
            <FooterTabs navigation={this.props.navigation} routeName="Home" />
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
  screen: { flex: 1, backgroundColor: '#f7f7f7', position: 'relative' },
  headerFixed: {},
  content: { flex: 1 },
  footerFixed: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    pointerEvents: 'box-none',
  },

  // ── Section headers ──
  sectionHeader: {
    paddingTop: 20,
  },
  sectionHeaderInner: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.red,
  },
  sectionTitle: {
    fontFamily: 'Poppins-Bold',
    fontSize: 20,
    lineHeight: 26,
  },
  sectionSubtitle: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    marginTop: 1,
  },
  sectionDivider: {
    height: 1,
  },

  // ── Empty ──
  emptyText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 15,
    textAlign: 'center',
  },
});

function HomeCopilotWrapper(props) {
  const { start, copilotEvents } = useCopilot();
  return <Home {...props} start={start} copilotEvents={copilotEvents} />;
}

export default withSafeAreaInsets(withTheme(HomeCopilotWrapper));