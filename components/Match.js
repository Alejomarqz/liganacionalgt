// components/Match.js — Match con fixes de Animated.Text + driver JS
import React, { Component, memo  } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
  InteractionManager
} from 'react-native';

import Header from './Header';
import AdFooter from '../ads/AdFooter';
import { showInterstitialIfReady } from '../ads/AdManager';
import { API_WEB_DEPORT_URL, API_CUSTOM_DIGITAL,  } from '@env';
import { logos } from '../utils/logos';
import { withTheme } from '../utils/ThemeContext';
import { changeName } from '../utils/changeName';
import LineupsTeamBlock from './LineupsTeamBlock';
import DetallesBlock from './DetallesBlock';
import StatsBox from './StatsBox';
import LogoImg from './LogoImg';
import { formatPitchLabel } from '../utils/formatPitchName';
import MatchCard from './MatchCard';
import {
  followMatch,
  unfollowMatch,
  isFollowingMatch,
} from '../services/notifications';
import TeamSearchModal from './TeamSearchModal';
import { withSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import NotificationPrompt from './NotificationPrompt';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { CopilotStep, walkthroughable, useCopilot } from 'react-native-copilot';


import { shouldShowGuide, markGuideDone } from '../utils/onboarding';


const { width } = Dimensions.get('window');
const RED = '#d32f2f';

// === Helpers para pestaña inicial desde notificaciones ===
const __norm = (s = '') =>
  s.toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '');

const __TAB_ALIAS = {
  alineacion: 'Alineaciones',
  alineaciones: 'Alineaciones',
  detalle: 'Detalles',
  detalles: 'Detalles',
  estadistica: 'Estadísticas',
  estadisticas: 'Estadísticas',
  tabla: 'Posiciones',
  posicion: 'Posiciones',
  posiciones: 'Posiciones',
  live: 'En vivo',
  envivo: 'En vivo',
  'en-vivo': 'En vivo',
  'en_vivo': 'En vivo',
};

function __mapInitialTab(raw) {
  if (!raw) return null;
  const key = __norm(raw);
  return __TAB_ALIAS[key] || raw;
}

// Intenta obtener el arreglo de tabs que usa tu pantalla
function __getTabs(ctx) {
  // Preferencias por si tu componente las declara de distintas formas
  if (Array.isArray(ctx?.TABS)) return ctx.TABS;
  if (typeof TABS !== 'undefined' && Array.isArray(TABS)) return TABS;
  if (Array.isArray(ctx?.state?.tabs)) return ctx.state.tabs;
  // Fallback al set estándar
  return ['Detalles', 'Alineaciones', 'Estadísticas', 'Posiciones', 'En vivo'];
}

function __findTabIndexByName(ctx, nameLike) {
  if (!nameLike) return null;
  const tabs = __getTabs(ctx);
  const want = __norm(nameLike);
  // match flexible por includes para tolerar pequeñas variaciones
  const idx = tabs.findIndex(t => __norm(t).includes(want));
  return idx >= 0 ? idx : null;
}


// Asegúrate de tener estas constantes arriba del archivo:
const POLL_FAST_MS = 20000;      // 20s
const POLL_HALFTIME_MS = 60000;  // 60s
const POLL_SLOW_MS = 90000;      // 90s
const NEAR_KO_MIN = 30;            // minutos antes del KO
const GRACE_AFTER_KO_MIN = 5;      // minutos de gracia después del KO (si el estado tarda en cambiar)
const GRACE_AFTER_FINAL_MIN = 5;   // minutos de gracia post-final
// === DEV ONLY (quítalo al terminar la prueba) ===
// Fuente preparseada en tu servidor (ya la tienes andando)
const CC_STANDINGS_ENDPOINT = 'https://futbolchapin.net/edit/concacaf-standings.php';



let __timerSeq = 0;   // id del timer creado
let __tickSeq  = 0;   // contador de ticks del timer actual


// DEBUG (temporal)
const DEBUG_POLL = true;
const nowms = () => (global?.performance?.now ? Math.round(performance.now()) : Date.now());
const dbg = (...a) => console.log('[MATCH]', ...a); // <- sin if

// --- helpers finales ---
function finalAgeMin(state) {
  // intenta con anchors.ft (segundos), o finalAt si lo tienes
  const ft = Number(state?.anchors?.ft ?? state?.statusObj?.finalAt ?? state?.match?.finalAt);
  if (!Number.isFinite(ft)) return null;
  return Math.floor((Date.now()/1000 - ft)/60); // minutos desde FT
}

// -------- Tabs ----------
const TABS = ['Detalles','Alineaciones','Estadísticas','Posiciones','En vivo'];
const DETAILS_TAB_INDEX = Math.max(0, TABS.findIndex(t => /detall/i.test(t)));
const STATS_TAB_INDEX   = Math.max(0, TABS.findIndex(t => /estad/i.test(t)));
const POS_TAB_INDEX     = Math.max(0, TABS.findIndex(t => /posiciones/i.test(t)));
const LIVE_TAB_INDEX    = Math.max(0, TABS.findIndex(t => /en vivo/i.test(t)));

// ---------------- Helpers de estado ----------------
const LIVE_SET  = new Set([1,6,8,10,12]);
const BREAK_SET = new Set([5,7,9,11]);
const HALFTIME  = 5;
const isLiveNow  = s => LIVE_SET.has(Number(s));
const isHalftime = s => Number(s) === HALFTIME;
const isBreak    = s => BREAK_SET.has(Number(s));
const statusLabel = s => ({
  0:'Sin iniciar',1:'En juego',2:'Finalizado',3:'Suspendido',4:'Postergado',
  5:'Medio Tiempo',6:'En juego',7:'Fin 90′',8:'Alargue 1',9:'Fin ET1',
  10:'Alargue 2',11:'Fin ET2',12:'Penales'
})[Number(s)] ?? '—';

// ---------------- Cronómetro ----------------
const emptyAnchors = () => ({ ko:null, ht:null, sh:null, et1:null, et2:null, ft90:null, et1End:null, et2End:null, pens:null });
function getStatusTsFromCommentary(data, type){
  const comm = data?.commentary || {};
  const incS = data?.incidences?.status || {};
  for (const [id, meta] of Object.entries(comm)){
    if (meta?.t === 'status'){
      const ev = incS[id];
      if (ev && Number(ev.type) === Number(type)){
        const ts = Number(meta?.ts);
        if (Number.isFinite(ts)) return ts;
      }
    }
  }
  return null;
}
function buildAnchors(data){
  const t = (data.timing || data.status || {}) || {};
  return {
    ko:  t.startTs   ?? getStatusTsFromCommentary(data, 1),
    ht:  t.htTs      ?? getStatusTsFromCommentary(data, 17),
    sh:  t.shTs      ?? getStatusTsFromCommentary(data, 18),
    et1: t.et1Ts     ?? getStatusTsFromCommentary(data, 50),
    et2: t.et2Ts     ?? getStatusTsFromCommentary(data, 52),
    ft90:t.ft90Ts    ?? getStatusTsFromCommentary(data, 49),
    et1End: t.et1EndTs ?? getStatusTsFromCommentary(data, 51),
    et2End: t.et2EndTs ?? getStatusTsFromCommentary(data, 53),
    pens:  t.pensTs    ?? getStatusTsFromCommentary(data, 54),
  };
}
function mmssFromAnchors(statusObj, anchors){
  const sid = Number(statusObj?.statusId);
  if ([0,2,3,4,12].includes(sid) || isBreak(sid)) return '';
  const now = Math.floor(Date.now()/1000);
  let base=0, start=null;
  if (sid===1){ start = anchors.ko;  base = 0; }
  else if (sid===6){ start = anchors.sh;  base = 45*60; }
  else if (sid===8){ start = anchors.et1; base = 90*60; }
  else if (sid===10){start = anchors.et2; base = 105*60;}
  if (!start) return '';
  const elapsed = Math.max(0, now - start) + base;
  const m = Math.floor(elapsed/60), s = elapsed%60;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

// --------- Hora local ----------
function parseStadiumTZ(s){
  if (s == null) return null;
  if (typeof s === 'number' && Number.isFinite(s)) return Math.round(s * 60);
  const txt = String(s).trim().replace('−','-');
  const m = /^([+-]?)(\d{1,2}):(\d{2})$/.exec(txt);
  if (m){
    const sign = m[1] === '-' ? -1 : 1;
    return sign * (parseInt(m[2],10)*60 + parseInt(m[3],10));
  }
  const n = Number(txt.replace(',', '.'));
  if (Number.isFinite(n)) return Math.round(n*60);
  return null;
}
const deviceOffsetMinutes = () => -new Date().getTimezoneOffset();
function formatLocalKickoff(match){
  const raw = match?.scheduledStart;
  let H = 0, M = 0;
  if (typeof raw === 'string'){
    const mm = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
    if (mm){ H = parseInt(mm[1],10)||0; M = parseInt(mm[2],10)||0; }
  } else if (typeof raw === 'number' && Number.isFinite(raw)){
    H = Math.floor(raw/60)%24; M = raw%60;
  }
  const srcOffMin = Number.isFinite(match?.gmt) ? Math.round(match.gmt*60) : null;
  let dstOffMin = parseStadiumTZ(match?.stadiumGMT);
  if (dstOffMin == null) dstOffMin = deviceOffsetMinutes();
  if (srcOffMin != null && dstOffMin != null){
    const minutes = H*60 + M;
    const corrected = minutes + (dstOffMin - srcOffMin);
    const mm = ((corrected % 1440) + 1440) % 1440;
    const h2 = String(Math.floor(mm/60)).padStart(2,'0');
    const m2 = String(mm%60).padStart(2,'0');
    return `${h2}:${m2}`;
  }
  return `${String(H).padStart(2,'0')}:${String(M).padStart(2,'0')}`;
}

// Devuelve minutos (puede ser negativo) hasta el kickoff, calculando en UTC con el GMT del estadio
function minutesToKickoffUTC(m) {
  try {
    if (!m) return null;
    const ymd = String(m.date || '').replace(/-/g, '');
    const hhmm = String(((m?.scheduledStart || '').slice(0, 5)) || m?.hora || '').slice(0, 5);
    if (ymd.length < 8 || hhmm.length < 4) return null;

    const y  = +ymd.slice(0, 4);
    const mo = +ymd.slice(4, 6) - 1;
    const d  = +ymd.slice(6, 8);
    const [H, M] = hhmm.split(':').map(Number);

    // Offset de origen (horario del partido): usa m.gmt si viene en horas, si no stadiumGMT; fallback = offset del dispositivo
    let srcOffMin = Number.isFinite(m?.gmt) ? Math.round(m.gmt * 60) : parseStadiumTZ(m?.stadiumGMT);
    if (srcOffMin == null) srcOffMin = deviceOffsetMinutes();

    // Construimos el instante UTC del kickoff: local - offset = UTC
    const kickoffUtcMs = Date.UTC(y, mo, d, H, M) - (srcOffMin * 60000);
    return Math.round((kickoffUtcMs - Date.now()) / 60000);
  } catch { return null; }
}

// ¿Estamos a ≤30 min del kickoff (o dentro de 5 min después)?
function isNearKickoff(m) {
  console.log('[MATCH] nearKO?', { sid: m?.statusId, diff: minutesToKickoffUTC(m), NEAR_KO_MIN });

  if (!m || Number(m.statusId) !== 0) return false; // solo aplica a Programado
  const diff = minutesToKickoffUTC(m);
  if (diff == null) return false;
  return diff <= NEAR_KO_MIN && diff >= -GRACE_AFTER_KO_MIN;
  
}

// --------------- Íconos incidencias ---------------
const BALL_ICON    = require('../resources/ball.png');
const YELLOW_ICON  = require('../resources/yellow.png');
const RED_ICON     = require('../resources/red.png');
const CARDS_ICON   = require('../resources/cards.png');
const WHISTLE_ICON = require('../resources/silbato.png');
const SUB_ICON     = require('../resources/sustitucion.png');

// ================== Pitch helpers (resumen) ==================
const POSN = { 1:'GK', 2:'DF', 3:'MF', 4:'FW' };
const PITCH_RATIO = 105 / 68;
const HALF_PITCH_FACTOR = 0.60;
const halfPitchHeight = (w) => Math.round(w * PITCH_RATIO * HALF_PITCH_FACTOR);
function HalfPitchGreen({ width, side='top' }) {
  const h = halfPitchHeight(width);
  const stripeH = h / 10;
  const isTop = (side === 'top');
  const R = (9.15 / 52.5) * h;
  return (
    <View style={{ width, height: h }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <View key={i} style={{ position:'absolute', left:0, right:0, top:i*stripeH, height: stripeH, backgroundColor: i%2 ? '#277947' : '#2f8d4e' }} />
      ))}
      <View style={[pitchStyles.perimeter, { width, height: h }]} />
      <View style={[pitchStyles.hLine, { top: isTop ? h - 2 : 0, width }]} />
      {isTop ? (
        <>
          <View style={[pitchStyles.goal, { top:-2, left: width*0.4, width: width*0.2 }]} />
          <View style={[pitchStyles.box,  { top:0, left: width*0.10, width: width*0.80, height: h*0.36 }]} />
          <View style={[pitchStyles.box,  { top:0, left: width*0.32, width: width*0.36, height: h*0.12 }]} />
        </>
      ) : (
        <>
          <View style={[pitchStyles.goal, { bottom:-2, left: width*0.4, width: width*0.2 }]} />
          <View style={[pitchStyles.box,  { bottom:0, left: width*0.10, width: width*0.80, height: h*0.36 }]} />
          <View style={[pitchStyles.box,  { bottom:0, left: width*0.32, width: width*0.36, height: h*0.12 }]} />
        </>
      )}
      <View style={[pitchStyles.centerArc, { left: (width / 2) - R, width: R * 2, height: R * 2, borderRadius: R, top: isTop ? (h - R) : -R }]} />
    </View>
  );
}
const pitchStyles = StyleSheet.create({
  perimeter:{ position:'absolute', left:0, top:0, borderWidth:2, borderColor:'#fff' },
  hLine:    { position:'absolute', left:0, right:0, height:2, backgroundColor:'#fff' },
  goal:     { position:'absolute', height:3, backgroundColor:'#fff' },
  box:      { position:'absolute', borderWidth:2, borderColor:'#fff', backgroundColor:'transparent' },
  centerArc:{ position:'absolute', borderWidth:2, borderColor:'#fff', backgroundColor:'transparent' },
});

const CopilotView = walkthroughable(View);
const CopilotTouchable = walkthroughable(TouchableOpacity);

const COPILOT_MATCH_KEY = 'copilot_match_v1_seen';

// ================== Componente principal ==================
class Match extends Component {
  HEADER_MAX = 188;
  HEADER_MIN = 70;

  constructor(props){
  super(props);
  
  // 1) Lee el snapshot que mandamos desde Home
  const pre = this.props?.route?.params?.pre || null;

  // ✅ única instancia de scrollY
  this.scrollY = new Animated.Value(0);

  this.tabMeta = {};
  this.tabsScrollRef = null;
  this.detailsTimer = null; // ⬅️ arriba o al final del constructor

  this.state = {
    // 2) Usa el snapshot 'pre' para pintar al instante (y si no hay, cae a lo que ya traías)
    cardData: null,
    icons: logos,                 // (opcional; si ya no usas logos locales, lo limpiamos luego)
    statusObj: null,
    anchors: emptyAnchors(),
    livePulse: new Animated.Value(1),

    scorersHome: [],
    scorersAway: [],

    // En vivo
    events: [],
    playersObject: null,

    // 3) Saca IDs iniciales del snapshot (si vino), así la UI ya sabe quién es local/visitante
    match: pre || this.props.route?.params?.match || {},
    homeId: pre?.teams?.homeTeamId ? Number(pre.teams.homeTeamId) : 0,
    awayId: pre?.teams?.awayTeamId ? Number(pre.teams.awayTeamId) : 0,

    activeTab: 0,
    tabsH: 44,

    headerMax: this.HEADER_MAX,
    headerOffset: 0,
    overlayH: 0,

    refreshing: false,
    isFetching: false,

    // Posiciones
    standings: [],
    standingsCum: [],

    // Estadísticas
    stats: null,
    statsLoading: false,

    didFetchPositionsInitial: false, // ← nuevo
    didFetchPositionsFinal: false,   // ya lo tienes

    // Alineaciones
    playersHome: [], playersHomeSub: [],
    playersAway: [], playersAwaySub: [],
    dtHome: null, dtAway: null,
    formationHome: '', formationAway: '',
    showDetailsLoading: false, // controla si mostramos el skeleton
    lastDetails: null,         // guardamos el último contenido de detalles para no vaciar
    positionsLoading: false,
    didFetchPositionsForTab: false, // evita llamadas repetidas al cambiar a Posiciones
    ccGroupName: null,
    followLoading: false,
    isFollowingMatch: false,
    
    loop: null,
    poll: null,
    finalGraceTimer: null,
    finalSeenAt: null,     // para la “gracia” post-final
    
    showTeamSearch: false,
    guideEligible: false,
    guideStarted: false,
    headerBarH: 0,
    guideRunning: false,

  };

  // === Aplicar pestaña inicial si viene en params (deep-link / notificación) ===
try {
  const raw = this?.props?.route?.params?.initialTab;
  const mapped = __mapInitialTab(raw); // normaliza alias: "envivo" -> "En vivo", etc.
  const idx = __findTabIndexByName(this, mapped);
  if (idx != null) {
    // Fuerza la pestaña inicial respetando tu estado
    this.state.activeTab = idx;
  }
} catch (e) {
  // no-op
}

  // ======= collapse (igual que tuyo) =======
  const TABS_H = this.state.tabsH ?? 44;
  const HDR_MX = this.state.headerMax ?? 188;
  const COLLAPSE_DIST = Math.max(0, HDR_MX - TABS_H);

  this.collapse  = Animated.diffClamp(this.scrollY, 0, COLLAPSE_DIST);
  this.collapseP = this.collapse.interpolate({
    inputRange: [0, COLLAPSE_DIST],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  this.LOGO_MAX = 48;
  this.LOGO_MIN = 26;

  this.logoScale = this.collapseP.interpolate({
    inputRange: [0, 1],
    outputRange: [1, this.LOGO_MIN / this.LOGO_MAX],
    extrapolate: 'clamp',
  });
  this.logoTranslateY = this.collapseP.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
    extrapolate: 'clamp',
  });
  this.scoreScale = this.collapseP.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.88],
    extrapolate: 'clamp',
  });
}
// 🔴 Animación del pulso "EN VIVO"
startPulse = () => {
  this.loop?.stop?.();
  this.loop = Animated.loop(
    Animated.sequence([
      Animated.timing(this.state.livePulse, {
        toValue: 1.12,
        duration: 650,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      }),
      Animated.timing(this.state.livePulse, {
        toValue: 1.00,
        duration: 650,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true
      }),
    ])
  );
  this.loop.start();
};

  getMatchId = () => {
    const p = this.props.route?.params || {};
    return p.matchId ?? p.match?.matchId ?? this.state.match?.matchId ?? null;
  };
  getScope = () => {
    const p = this.props.route?.params || {};
    const s = p.channel ?? p.scope ?? this.state.match?.scope;
    return String(s || 'guatemala').toLowerCase();
  };

  goTeam = (tid, tname) => {
  const id = Number(tid);
  if (!Number.isFinite(id)) return;
  const scope = this.getScope();
  this.props.navigation?.push?.('TeamScreen', {
    teamId: id,
    scope,
    teamName: changeName(tname || ''),
  });
};

  collapseDistance = () => {
    const headerMax = this.state.headerMax ?? this.HEADER_MAX;
    return Math.max(12, headerMax - this.HEADER_MIN);
  };
  snapPositionsAtEnd = (y) => {
  const sid = Number(this.state.match?.statusId);
  if (sid === 0) return; // 👈 sin colapso cuando status=0

  if (![POS_TAB_INDEX, DETAILS_TAB_INDEX].includes(this.state.activeTab)) return;
  const COLLAPSE = this.collapseDistance();
  const EPS = 8;
  if (y >= COLLAPSE - EPS && y <= COLLAPSE + EPS) {
    this.contentRef?.scrollTo?.({ y: COLLAPSE, animated: false });
  }
};

  componentDidMount() {
  // Listeners existentes
  this.focusSub = this.props.navigation?.addListener?.('focus', this.resumeLoops);
  this.blurSub  = this.props.navigation?.addListener?.('blur',  this.pauseLoops);

  // 🔔 Cargar estado de "seguir partido" al montar
  try {
    const matchId = String(this.props?.route?.params?.matchId || '');
    if (matchId) {
      isFollowingMatch(matchId).then(v => {
        this.setState({ isFollowingMatch: !!v });
        console.log('[Bell] initial isFollowingMatch =', v);
      });
    }
  } catch (e) {}

  // 📢 INTERSTITIAL AL ENTRAR A MATCH
  const fromPush = !!this.props?.route?.params?.fromPush;
  if (!fromPush) {
    showInterstitialIfReady('enter_match');
  }

  // 📢 INTERSTITIAL AL SALIR DE MATCH
  this._beforeRemoveSub = this.props.navigation.addListener('beforeRemove', () => {
    showInterstitialIfReady('exit_match');
  });

  // 🧭 Aplicar pestaña inicial si viene en params (notificación / navigate)
  try {
    const rawTab = this?.props?.route?.params?.initialTab;
    const mapped = __mapInitialTab(rawTab);
    const idx    = __findTabIndexByName(this, mapped);

    if (idx != null) {
      this.setState({ activeTab: idx }, () => this.centerActiveTab());
    } else {
      const sid0 = Number(this.state.match?.statusId);
      if (isLiveNow(sid0) && !isHalftime(sid0)) {
        this.setState({ activeTab: LIVE_TAB_INDEX }, () => this.centerActiveTab());
      }
    }
  } catch (e) {
    const sid0 = Number(this.state.match?.statusId);
    if (isLiveNow(sid0) && !isHalftime(sid0)) {
      this.setState({ activeTab: LIVE_TAB_INDEX }, () => this.centerActiveTab());
    }
  }

  // 🔁 Mantén tus comportamientos existentes
  this.resumeLoops();
  this.fetchAllParallel();

    // ✅ Onboarding Match (solo 1 vez) — iniciarlo cuando ya hay UI montada
try {
  shouldShowGuide('guide_match_v1').then((ok) => {
    if (!ok) return;

    this.guideEligible = true;

    // ✅ cuando arranca el tour
    this.props.copilotEvents?.on?.('start', () => {
      this.setState({ guideRunning: true });
    });

    // ✅ cuando termina / se salta
    this.props.copilotEvents?.on?.('stop', async () => {
      await markGuideDone('guide_match_v1');

      // 🔥 IMPORTANTE: liberar bloqueo
      this.guideEligible = false;
      this.guideStarted = false;

      // deja que el UI “respire” y luego muestra prompt
      setTimeout(() => {
        this.setState({ guideRunning: false });
      }, 300);
    });
  });
} catch (e) {}

}
  componentWillUnmount(){ 
  
  this.pauseLoops(true); 
  this.focusSub?.(); 
  this.blurSub?.(); 
  this._beforeRemoveSub?.(); // 👈 LIMPIA LISTENER DEL INTERSTITIAL
  clearInterval(this._hb);
  
}
  
  componentDidUpdate(prevProps, prevState) {
  // 1) Tu lógica existente: centrar tab activo y cargar posiciones
  if (prevState.activeTab !== this.state.activeTab) {
    this.centerActiveTab();
  }
  if (this.state.activeTab === POS_TAB_INDEX) {
    this.ensurePositionsLoaded();
  }

  // 2) NUEVO: si cambió initialTab en la ruta (por push o navigate), saltar a esa pestaña
  try {
    const prevTab = prevProps?.route?.params?.initialTab || '';
    const currTab = this?.props?.route?.params?.initialTab || '';
    if (prevTab !== currTab && currTab) {
      // Normaliza alias (envivo → En vivo, alineacion → Alineaciones, etc.)
      const mapped = __mapInitialTab(currTab);
      const idx = __findTabIndexByName(this, mapped);
      if (idx != null && idx !== this.state.activeTab) {
        this.setState({ activeTab: idx });
      }
    }
  } catch (e) {
    // no-op
  }

  // ✅ Iniciar tour cuando ya está renderizado el header/card (una sola vez)
if (
  this.guideEligible &&
  !this.guideStarted &&
  this.measuredOnce &&
  this.state.activeTab === DETAILS_TAB_INDEX // ✅ SOLO en Detalles
) {
  this.guideStarted = true;

  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        this.props.start?.('home-first-match');
      });
    }, 350);
  });
}


}

// 🔔 Seguir / dejar de seguir ESTE partido (topics FCM)
toggleFollowMatch = async () => {
  const matchId = String(this.props?.route?.params?.matchId || '');
  console.log('[Bell] toggle match', matchId, this.state.isFollowingMatch);
  if (!matchId) return;
  this.setState({ followLoading: true });
  try {
    if (this.state.isFollowingMatch) {
      await unfollowMatch(matchId);
      this.setState({ isFollowingMatch: false });
    } else {
      await followMatch(matchId);
      this.setState({ isFollowingMatch: true });
    }
  } finally {
    this.setState({ followLoading: false });
  }
};
  
  pauseLoops = (dispose = false) => {
  this.loop?.stop?.();
  clearInterval(this.poll);
  this.poll = null;
  clearTimeout(this.finalGraceTimer);
  this.finalGraceTimer = null;
  if (dispose) this.loop = null;
};
  // Reemplaza tu método actual por este (Match.js)
// Guarda estos campos a nivel de instancia (no hace falta declararlos antes):
// this._phase, this._every, this.finalGraceTimer

resumeLoops = () => {
  const sid = Number(this.state.match?.statusId);
  const live = isLiveNow(sid) && !isHalftime(sid);
  const isScheduled = (sid === 0 || sid === 4);

  const preWindow = isScheduled
    ? (typeof isNearKickoff === 'function' ? !!isNearKickoff(this.state.match) : false)
    : false;

  const phase =
    live         ? 'LIVE'  :
    isBreak(sid) ? 'BREAK' :
    preWindow    ? 'PRE'   :
    (sid === 2)  ? 'FINAL' : 'SLOW';

  console.log('[MATCH] resumeLoops:', { sid, preWindow, phase });

  // 1️⃣ Gracia post-final
  let alreadyOverGrace = false;
  const ftAge = finalAgeMin(this.state);

  if (Number.isFinite(ftAge) && ftAge >= GRACE_AFTER_FINAL_MIN) {
    alreadyOverGrace = true;
  } else if (sid === 2) {
    if (!this.finalSeenAt) this.finalSeenAt = Date.now();
    const seenMin = (Date.now() - this.finalSeenAt) / 60000;
    if (seenMin >= GRACE_AFTER_FINAL_MIN) alreadyOverGrace = true;
  } else {
    this.finalSeenAt = null;
  }

  if (sid === 2 && alreadyOverGrace) {
    this.pauseLoops();
    this._phase = 'FINAL_STOPPED';
    this._every = 0;
    return;
  }

  // 2️⃣ Intervalos por fase
  let every = POLL_SLOW_MS; // 90s
  if (phase === 'LIVE' || phase === 'PRE') every = POLL_FAST_MS;      // 20s
  else if (phase === 'BREAK')              every = POLL_HALFTIME_MS;  // 60s
  else if (phase === 'FINAL')              every = POLL_FAST_MS;

  // 3️⃣ Timer de gracia post-final
  if (phase === 'FINAL') {
    if (!this.finalGraceTimer) {
      this.finalGraceTimer = setTimeout(() => this.pauseLoops(), GRACE_AFTER_FINAL_MIN * 60000);
    }
  } else if (this.finalGraceTimer) {
    clearTimeout(this.finalGraceTimer);
    this.finalGraceTimer = null;
  }

  // 4️⃣ Fase PRE — siempre reprogramar
  if (phase === 'PRE') {
    clearInterval(this.poll);
    this.poll = null;
    this._phase = phase;
    this._every = every;

    console.log('[MATCH] timer PRE create every=', every);
    this.poll = setInterval(() => {
      if (!this.state.isFetching) this.fetchAllParallel();
    }, every);

    this.loop?.stop?.(); // sin pulso en previa
    return;
  }

  // 5️⃣ Debounce normal para las demás fases
  if (this.poll && this._phase === phase && this._every === every) {
    if (phase === 'LIVE') this.startPulse(); else this.loop?.stop?.();
    return;
  }

  // 6️⃣ (Re)programa intervalos normales
  clearInterval(this.poll);
  this.poll = null;
  this._phase = phase;
  this._every = every;

  this.poll = setInterval(() => {
    if (phase === 'FINAL') {
      const nowMin = Number.isFinite(ftAge)
        ? finalAgeMin(this.state)
        : ((Date.now() - (this.finalSeenAt || Date.now())) / 60000);
      if (nowMin >= GRACE_AFTER_FINAL_MIN) { this.pauseLoops(); return; }
    }
    if (!this.state.isFetching) this.fetchAllParallel();
  }, every);

  // 7️⃣ Pulso en vivo
  if (phase === 'LIVE') this.startPulse(); else this.loop?.stop?.();
};

// 🔄 Pull-to-refresh manual
handleRefresh = () => {
  if (this.state.refreshing) return;
  this.setState({ refreshing: true }, () => {
    this.fetchAllParallel().finally(() => this.setState({ refreshing: false }));
  });
};

// 📡 Fetch paralelo de datos
fetchAllParallel = () => {
  if (this.state.isFetching) return Promise.resolve();

  const sid = Number(this.state.match?.statusId);
  const live = isLiveNow(sid) && !isHalftime(sid);
  const isSched = (sid === 0 || sid === 4);

  const preWindow = (isSched && typeof isNearKickoff === 'function')
    ? !!isNearKickoff(this.state.match)
    : false;

  console.log('[MATCH] fetchAllParallel:start', { sid, live, preWindow });

  const onBreak = isBreak(sid);
  const id = this.getMatchId?.() ?? this.state.match?.matchId ?? null;

  const hasCard = !!this.state.cardData;
  const wantCard  = (live || preWindow || onBreak || sid === 2 || this.state.refreshing || !hasCard);
  const wantStats = (id && (live || preWindow || onBreak || sid === 2 || this.state.refreshing));
  const wantPos =
    (sid === 2 && !this.state.didFetchPositionsFinal) ||
    this.state.refreshing ||
    (isSched && !this.state.didFetchPositionsInitial);

  this.setState({ isFetching: true });

  const pCard  = wantCard  ? this.fetchCard()    : Promise.resolve();
  const pStats = wantStats ? this.fetchStats(id) : Promise.resolve();
  const pPos   = wantPos   ? this.fetchPositions().then(() => {
    const patch = {};
    if (sid === 2) patch.didFetchPositionsFinal = true;
    if (isSched)   patch.didFetchPositionsInitial = true;
    if (Object.keys(patch).length) this.setState(patch);
  }) : Promise.resolve();

  return Promise.all([pCard, pStats, pPos])
    .catch(() => {})
    .finally(() => this.setState({ isFetching: false }));
};


  // ===================== FETCH CARD =====================
  fetchCard = () => {
  // 🔹 Delay: solo mostramos skeleton si la carga tarda >350ms
  clearTimeout(this.detailsTimer);
  this.detailsTimer = setTimeout(() => {
    this.setState({ showDetailsLoading: true });
  }, 350);

  const id    = this.getMatchId() || this.state.match?.matchId;
  const scope = this.getScope();
  if (!id || !scope) return Promise.resolve(); // guard simple

  return fetch(`${API_WEB_DEPORT_URL}/${scope}/events/${id}.json`, { cache: 'no-store' })
    .then(r => r.json())
    .then(data => {
      // ----- estado previo / nuevo -----
      const prevSid = Number(this.state.match?.statusId);
      const status  = data?.status || {};
      const nextSid = Number(status?.statusId ?? prevSid);

      if (prevSid !== nextSid) {
        dbg('status change', { prevSid, prev: statusLabel(prevSid), nextSid, next: statusLabel(nextSid) });
      }

      const anchors = buildAnchors(data);

      const homeId  = data?.match?.homeTeamId ?? this.state.match?.teams?.homeTeamId;
      const awayId  = data?.match?.awayTeamId ?? this.state.match?.teams?.awayTeamId;
      const players = data?.players || {};
      const inc     = data?.incidences || {};

      // ===== En vivo (eventos ordenados) =====
      const eventsLive = [];
      const seenLive = new Set();
      Object.keys(inc).forEach(typeName => {
        const bucket = inc[typeName] || {};
        Object.keys(bucket).forEach(k => {
          const ev0  = bucket[k];
          const ev   = { ...ev0, typeName };
          const team = ev.team ?? players?.[ev.plyrId]?.teamId ?? '';
          const half = ev?.t?.half || 0;
          const min  = ev?.t?.m    || 0;
          const sec  = ev?.t?.s    || 0;
          const ttype = Number(ev.type) || 0;
          const key = [ev.id || k, ttype, team, ev.plyrId || '', ev.inId || '', ev.offId || '', half, min, sec].join('|');
          if (seenLive.has(key)) return;
          seenLive.add(key);
          eventsLive.push(ev);
        });
      });
      eventsLive.sort((a,b)=>{
        const ha=a?.t?.half||0, hb=b?.t?.half||0; if (ha!==hb) return ha-hb;
        const ma=a?.t?.m||0,   mb=b?.t?.m||0;     if (ma!==mb) return ma-mb;
        const sa=a?.t?.s||0,   sb=b?.t?.s||0;     return sa-sb;
      });

      // ===== Alineaciones =====
      const toNum   = v => (v==null || v==='') ? NaN : Number(v);
      const isField = p => [1,2,3,4].includes(toNum(p.posnId));
      const byOrder = (a, b) => {
        const toN = v => (v==null || v==='') ? NaN : Number(v);
        const oa = toN(a.order), ob = toN(b.order);
        if (Number.isFinite(oa) || Number.isFinite(ob)) return (oa || 999) - (ob || 999);
        const na = toN(a.squadNo), nb = toN(b.squadNo);
        return (na || 999) - (nb || 999);
      };

      const entries  = Object.entries(players).map(([pid,p]) => ({ ...p, _pid: String(pid) }));
      const H = String(homeId ?? '');
      const A = String(awayId ?? '');

      const homeAll = entries.filter(p => String(p.teamId) === H);
      const awayAll = entries.filter(p => String(p.teamId) === A);

      const playersHome     = homeAll.filter(p => isField(p) && !p.substitute).sort(byOrder);
      const playersHomeSub  = homeAll.filter(p => isField(p) &&  p.substitute).sort(byOrder);
      const dtHome          = homeAll.find(p => toNum(p.posnId) === 5) || null;

      const playersAway     = awayAll.filter(p => isField(p) && !p.substitute).sort(byOrder);
      const playersAwaySub  = awayAll.filter(p => isField(p) &&  p.substitute).sort(byOrder);
      const dtAway          = awayAll.find(p => toNum(p.posnId) === 5) || null;

      // ===== Goleadores =====
      const seen = new Set(); const all = [];
      Object.keys(inc).forEach(type => {
        Object.values(inc[type] || {}).forEach(ev => {
          const t = Number(ev.type);
          if (![9,10,11,12,13].includes(t)) return;  // goles (no tanda penales)
          if ([55,56,57].includes(t)) return;        // excluye tanda
          const team = ev.team ?? players?.[ev.plyrId]?.teamId;
          const half = ev?.t?.half || 0;
          const min  = ev?.t?.m    || 0;
          const sec  = ev?.t?.s    || 0;
          const key  = `${team}|${ev.plyrId}|${half}|${min}|${sec}|${t}`;
          if (seen.has(key)) return; seen.add(key);
          all.push({ ...ev, _team: team });
        });
      });
      all.sort((a,b)=>{
        const ha=a?.t?.half||0, hb=b?.t?.half||0; if (ha!==hb) return ha-hb;
        const ma=a?.t?.m||0, mb=b?.t?.m||0;       if (ma!==mb) return ma-mb;
        const sa=a?.t?.s||0, sb=b?.t?.s||0;       return sa-sb;
      });

      const scHome = [], scAway = [];
      for (const ev of all) {
        const plyr = players[ev.plyrId];
        const nameLabel = plyr
          ? formatPitchLabel(plyr.name || {}, /*number*/ undefined)
          : (ev.name || ev.player || `#${ev.plyrId||''}`);
        const minute = (ev?.t?.m != null) ? `${ev.t.m}′` : '';
        const t = Number(ev.type);
        const suffix = t===13 ? ' (P)' : (t===10 ? ' (AG)' : '');
        const label = `${nameLabel} ${minute}${suffix}`.trim();

        if (String(ev._team) === String(homeId)) scHome.push(label);
        else if (String(ev._team) === String(awayId)) scAway.push(label);
      }

      // ===== Patch del match para la ficha y detalles =====
      const mPatch = {
        ...this.state.match,
        matchId: data?.match?.matchId ?? this.state.match?.matchId, // <-- asegura matchId
        statusId: status?.statusId ?? this.state.match?.statusId,
        scheduledStart: data?.match?.scheduledStart ?? this.state.match?.scheduledStart,
        gmt: data?.match?.gmt ?? this.state.match?.gmt,
        stadiumGMT: data?.match?.stadiumGMT ?? this.state.match?.stadiumGMT,
        date: data?.match?.date ?? this.state.match?.date,
        scoreStatus: data?.scoreStatus ?? this.state.match?.scoreStatus,
        teams: data?.match ? {
          homeTeamId: data.match.homeTeamId,
          awayTeamId: data.match.awayTeamId,
          homeTeamName: data.match.homeTeamName,
          awayTeamName: data.match.awayTeamName,
        } : this.state.match?.teams
      };

      const live    = isLiveNow(mPatch?.statusId) && !isHalftime(mPatch?.statusId);
      const nextTab = live ? LIVE_TAB_INDEX : this.state.activeTab;

      // 🔹 Un solo setState con todo + lastDetails para no “vaciar” la pestaña
      this.setState({
        statusObj: status,
        anchors,
        match: mPatch,
        lastDetails: mPatch, // mantener contenido mientras refresca
        scorersHome: scHome,
        scorersAway: scAway,
        events: eventsLive,
        playersObject: data.players ?? this.state.playersObject ?? {},
        homeId, awayId,
        activeTab: nextTab,
        cardData: data,

        playersHome, playersHomeSub, dtHome,
        playersAway, playersAwaySub, dtAway,
        formationHome: String(data?.match?.homeFormation || ''),
        formationAway: String(data?.match?.awayFormation || ''),
      }, () => {
        this.centerActiveTab();

        const sidNow = Number(this.state.match?.statusId);
        // ⛔️ Importante: en FINAL, si ya corre la gracia, NO reprogramar (evita bucles infinitos)
        if (sidNow === 2 && this.finalGraceTimer) return;

        // Reprograma solo si cambió el estado (optimiza rebotes)
        if (sidNow !== prevSid) this.resumeLoops();
      });
    })
    .catch(() => {})
    .finally(() => {
      // 🔹 Apaga skeleton y limpia el timer
      clearTimeout(this.detailsTimer);
      this.setState({ showDetailsLoading: false });
    });
};

  // ===================== POSICIONES =====================
  num = (v) => (v==null || v==='') ? 0 : parseInt(v,10) || 0;
  a = (row, key) => this.num(row?.[key]?.[0]);
  computePTS = (row) => {
    const pa = row?.puntosactual?.[0];
    if (pa != null && pa !== '') return this.num(pa);
    const w = this.a(row,'ganadosactual');
    const d = this.a(row,'empatadosactual');
    return w*3 + d;
  };
// Adapta filas CONCACAF (teamId, team, pts, pj, ...) al formato de PositionsBlock de Guatemala
ccRowsToDF = (rows = []) => {
  return rows.map((r, i) => ({
    id:                [String(r.teamId)],
    nombre:            [String(r.team)],
    puntosactual:      [String(r.pts)],
    jugadosactual:     [String(r.pj)],
    ganadosactual:     [String(r.pg)],
    empatadosactual:   [String(r.pe)],
    perdidosactual:    [String(r.pp)],
    golesfavoractual:  [String(r.gf)],
    golescontraactual: [String(r.gc)],
    difgolactual:      [String(r.df)],
  }));
};

  fetchPositions = async () => {
  try {
    const scope = (this.getScope?.() || 'guatemala').toLowerCase();

    // === CONCACAF / NATIONS (no-Guatemala) ===
    if (scope !== 'guatemala') {
      // 1) pedir JSON preparseado de tu PHP
      const url = `${CC_STANDINGS_ENDPOINT}?t=${Date.now()}`; // evita cache navegador
      const res = await fetch(url, { cache: 'no-store' });
      const j = await res.json();

      const groups = j?.groups || {};
      const teamGroup = j?.teamGroup || {};

      // 2) elegir teamId de referencia (local y si no, visitante)
      const homeId = String(this.state.homeId || this.state.match?.teams?.homeTeamId || '');
      const awayId = String(this.state.awayId || this.state.match?.teams?.awayTeamId || '');

      const groupName =
        teamGroup[homeId] ||
        teamGroup[awayId] ||
        Object.keys(groups)[0] || null;

      const rows = groupName ? (groups[groupName] || []) : [];

      // 3) adaptar al formato que ya usa tu tabla
      const dfRows = this.ccRowsToDF(rows);

      // (opcional) también arma "standingsCum" ordenado con tu comparador actual
      const teamsCum = [...dfRows].sort((A,B) => {
        const p1 = this.computePTS(A), p2 = this.computePTS(B);
        if (p1 !== p2) return p2 - p1;
        const dg1 = this.a(A,'difgolactual'), dg2 = this.a(B,'difgolactual');
        if (dg1 !== dg2) return dg2 - dg1;
        const w1 = this.a(A,'ganadosactual'), w2 = this.a(B,'ganadosactual');
        if (w1 !== w2) return w2 - w1;
        const gf1 = this.a(A,'golesfavoractual'), gf2 = this.a(B,'golesfavoractual');
        return gf2 - gf1;
      });

      this.setState({
        standings: dfRows,
        standingsCum: teamsCum,
        ccGroupName: groupName, // para rotular “Grupo A”, etc.
      });
      return;
    }

    // === GUATEMALA (como ya lo tenías) ===
    const r = await fetch(`${API_CUSTOM_DIGITAL}/positions`);
    const result = await r.json();
    const teams = result?.posiciones?.equipo || [];

    const teamsCum = [...teams].sort((A,B) => {
      const p1 = this.computePTS(A), p2 = this.computePTS(B);
      if (p1 !== p2) return p2 - p1;
      const dg1 = this.a(A,'difgolactual'), dg2 = this.a(B,'difgolactual');
      if (dg1 !== dg2) return dg2 - dg1;
      const w1 = this.a(A,'ganadosactual'), w2 = this.a(B,'ganadosactual');
      if (w1 !== w2) return w2 - w1;
      const gf1 = this.a(A,'golesfavoractual'), gf2 = this.a(B,'golesfavoractual');
      return gf2 - gf1;
    });

    this.setState({ standings: teams, standingsCum: teamsCum, ccGroupName: null });
  } catch (e) {
    // silencioso como ya tenías
  }
};

  ensurePositionsLoaded = () => {
  if (this.state.didFetchPositionsForTab || this.state.positionsLoading) return;
  this.setState({ positionsLoading: true }, () => {
    this.fetchPositions()
      .finally(() => this.setState({
        positionsLoading: false,
        didFetchPositionsForTab: true
      }));
  });
};

  renderStandings = () => {
  const COL = { RANK: 32, PTS: 40, NUM: 28, DIF: 38, ICON: 25, GAP: 6, HPAD: 16 };
  const TEAM_GUTTER = 20;
  const W = Dimensions.get('window').width;
  const RIGHT_W = COL.PTS + (4 * COL.NUM) + COL.DIF;

  const data = this.state.standingsCum?.length ? this.state.standingsCum : this.state.standings;

  // 🎨 Colores desde el tema (igual que Positions.js)
  const { theme } = this.props;
  const colors = theme?.colors || COLORS;
  const isDark = theme?.mode === 'dark';
  const rowDangerBg = isDark ? 'rgba(220,38,38,0.16)' : '#FEF2F2';

  if (this.state.positionsLoading) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={[styles.noInfo, { textAlign: 'center', color: colors.textMuted }]}>
          Cargando posiciones…
        </Text>
      </View>
    );
  }

  if (!data?.length) {
    return (
      <Text style={[styles.noInfo, { color: colors.textMuted }]}>
        No hay posiciones
      </Text>
    );
  }

  const total = data.length;
  const scope = (this.getScope?.() || 'guatemala').toLowerCase();

  return (
    <View style={{ marginTop: 8, marginBottom: 4 }}>
      {/* ===== Encabezado de grupo (solo para CONCACAF/Nations) ===== */}
      {(scope !== 'guatemala' && this.state.ccGroupName) ? (
        <>
          <View style={styles.groupHeader}>
            <Text
              style={[
                styles.groupHeaderText,
                { color: colors.text },
              ]}
            >
              {this.state.ccGroupName}
            </Text>
          </View>
          <View
            style={[
              styles.groupDivider,
              { backgroundColor: colors.cardBorder },
            ]}
          />
        </>
      ) : null}

      {/* ===== Cabecera de la tabla ===== */}
      <View
        style={[
          styles.tableHeader,
          { backgroundColor: colors.cardBg },
        ]}
      >
        <View style={[styles.thCol, { width: COL.RANK }]}>
          <Text style={[styles.thText, { color: colors.text }]}>#</Text>
        </View>
        <View style={{ flex: 1, paddingRight: TEAM_GUTTER }}>
          <Text style={[styles.thTextLeft, { color: colors.text }]}>
            Equipo
          </Text>
        </View>
        <View style={{ width: RIGHT_W, flexDirection: 'row' }}>
          <View style={[styles.thCol, { width: COL.PTS }]}>
            <Text style={[styles.thText, { color: colors.text }]}>
              Pts
            </Text>
          </View>
          <View style={[styles.thCol, { width: COL.NUM }]}>
            <Text style={[styles.thText, { color: colors.text }]}>
              J
            </Text>
          </View>
          <View style={[styles.thCol, { width: COL.NUM }]}>
            <Text style={[styles.thText, { color: colors.text }]}>
              G
            </Text>
          </View>
          <View style={[styles.thCol, { width: COL.NUM }]}>
            <Text style={[styles.thText, { color: colors.text }]}>
              E
            </Text>
          </View>
          <View style={[styles.thCol, { width: COL.NUM }]}>
            <Text style={[styles.thText, { color: colors.text }]}>
              P
            </Text>
          </View>
          <View style={[styles.thCol, { width: COL.DIF }]}>
            <Text style={[styles.thText, { color: colors.text }]}>
              Dif
            </Text>
          </View>
        </View>
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: colors.cardBorder,
          width: W,
        }}
      />

      {/* Filas */}
      {data.map((item, index) => {
        const id   = String(item.id?.[0] ?? index);
        const name = changeName((item.nombre?.[0] || '').trim());
        const PTS  = this.computePTS(item);
        const J    = this.a(item, 'jugados');
        const G    = this.a(item, 'ganados');
        const E    = this.a(item, 'empatados');
        const P    = this.a(item, 'perdidos');
        const DIF  = this.a(item, 'difgol');

        const rank = index + 1;

        // === REGLA RONDA FINAL EN MATCH: verde solo 1°, sin rojo en selecciones ===
        const scopeLower = (this.getScope?.() || 'guatemala').toLowerCase();

        // Clasificados (verde)
        const qualifyTop = scopeLower === 'guatemala' ? 8 : 1; // Selecciones = 1 (Ronda Final), Liga = tu valor
        const isTop = rank <= qualifyTop;

        // Descenso (rojo) SOLO para Liga Guatemala; en selecciones queda 0
        const dangerBottomCount = scopeLower === 'guatemala' ? 2 : 0;
        const total = data.length;
        const isBottom = dangerBottomCount > 0 && rank > (total - dangerBottomCount);

        // 🎨 círculos con colores de tema para el estado "neutro"
        const circleStyle = isTop
          ? [styles.rankCircle, styles.rankCircleQual]
          : isBottom
          ? [styles.rankCircle, styles.rankCircleDanger]
          : [
              styles.rankCircle,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder,
              },
            ];

        const circleTextStyle = isTop
          ? [styles.rankText, styles.rankTextQual]
          : isBottom
          ? [styles.rankText, styles.rankTextDanger]
          : [
              styles.rankText,
              styles.rankTextDefault,
              { color: colors.text },
            ];

        return (
          <View key={id}>
            <View
              style={[
                styles.teamRow,
                {
                  backgroundColor: isBottom
                    ? rowDangerBg
                    : colors.cardBg,
                },
              ]}
            >
              {/* Columna de posición */}
              <View
                style={{
                  width: COL.RANK,
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                }}
              >
                <View style={circleStyle}>
                  <Text style={circleTextStyle}>{rank}</Text>
                </View>
              </View>

              {/* Equipo (logo + nombre) */}
              <TouchableOpacity
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  overflow: 'hidden',
                  paddingRight: TEAM_GUTTER,
                }}
                activeOpacity={0.8}
                onPress={() => {
                  const idNum = Number(id);
                  if (!Number.isFinite(idNum)) return;
                  this.props.navigation?.push?.('TeamScreen', {
                    teamId: idNum,
                    scope: this.getScope(), // ya existe en este componente
                    tab: 'Resumen',
                    teamName: name,         // 👈 pásale el nombre calculado
                  });
                }}
              >
                <View>
                  <LogoImg
                    teamId={id}
                    size={COL.ICON}
                    style={{ marginRight: COL.GAP }}
                  />
                </View>
                <Text
                  style={[
                    styles.tdTeamName,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {name}
                </Text>
              </TouchableOpacity>

              {/* Números (Pts, J, G, E, P, Dif) */}
              <View style={{ width: RIGHT_W, flexDirection: 'row' }}>
                <Text
                  style={[
                    styles.colNum,
                    styles.colPts,
                    { width: COL.PTS, color: colors.text },
                  ]}
                >
                  {PTS}
                </Text>
                <Text
                  style={[
                    styles.colNum,
                    { width: COL.NUM, color: colors.text },
                  ]}
                >
                  {J}
                </Text>
                <Text
                  style={[
                    styles.colNum,
                    { width: COL.NUM, color: colors.text },
                  ]}
                >
                  {G}
                </Text>
                <Text
                  style={[
                    styles.colNum,
                    { width: COL.NUM, color: colors.text },
                  ]}
                >
                  {E}
                </Text>
                <Text
                  style={[
                    styles.colNum,
                    { width: COL.NUM, color: colors.text },
                  ]}
                >
                  {P}
                </Text>
                <Text
                  style={[
                    styles.colNum,
                    { width: COL.DIF, color: colors.text },
                  ]}
                >
                  {DIF}
                </Text>
              </View>
            </View>

            <View
              style={{
                height: 1,
                backgroundColor: colors.cardBorder,
                width: W,
              }}
            />
          </View>
        );
      })}

      {/* Leyenda Ronda Final — solo selecciones */}
      {(() => {
        const scopeLower = (this.getScope?.() || 'guatemala').toLowerCase();
        if (scopeLower === 'guatemala') return null;
        return (
          <View style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 2 }}>
            <Text style={{ fontSize: 12, color: colors.text }}>
              El <Text style={{ fontWeight: '700', color: colors.text }}>1°</Text> clasifica al Mundial. Los
              <Text style={{ fontWeight: '700', color: colors.text }}> dos mejores segundos</Text> van a repechaje.
            </Text>
          </View>
        );
      })()}
    </View>
  );
};

  // ===================== EN VIVO =====================
  getImageByType = (type) => {
    const t = Number(type);
    if ([9,10,11,12,13].includes(t)) return BALL_ICON;
    if (t === 3) return YELLOW_ICON;
    if (t === 4) return CARDS_ICON;
    if (t === 5) return RED_ICON;
    if ([1,17,18,50,51,52,2,49,53,54].includes(t)) return WHISTLE_ICON;
    if ([6,7].includes(t)) return SUB_ICON;
    return BALL_ICON;
  };
  fullName = (P) => {
    if (!P) return '';
    const f = (P?.name?.first || '').trim();
    const m = (P?.name?.middle || '').trim();
    const l = (P?.name?.last || '').trim();
    const nick = (P?.nick || '').trim();
    return (nick || [f,m,l].filter(Boolean).join(' ')).trim();
  };
  eventSide = (ev, homeId, awayId, players) => {
    const teamId = ev.team ?? ev.teamId ?? players?.[ev.plyrId]?.teamId;
    if (String(teamId) === String(homeId)) return 'home';
    if (String(teamId) === String(awayId)) return 'away';
    return 'home';
  };
  getMessage = (ev) => {
    try {
      const players = this.state.playersObject || {};
      const homeId = this.state.homeId || this.state.match?.teams?.homeTeamId;
      const awayId = this.state.awayId || this.state.match?.teams?.awayTeamId;
      const side   = this.eventSide(ev, homeId, awayId, players);

      const homeName = this.state.match?.teams?.homeTeamName || 'Local';
      const awayName = this.state.match?.teams?.awayTeamName || 'Visitante';
      const team     = side === 'home' ? homeName : awayName;

      const hScore = this.state.match?.scoreStatus?.[homeId]?.score ?? '-';
      const aScore = this.state.match?.scoreStatus?.[awayId]?.score ?? '-';

      const P   = players?.[ev.plyrId];
      const IN  = players?.[ev.inId];
      const OUT = players?.[ev.offId];
      const pName  = this.fullName(P);
      const inName = this.fullName(IN);
      const outName= this.fullName(OUT);

      const t = Number(ev.type);
      const tName = ev.typeName;

      switch (t) {
        case 1:  return `Inicia el partido. Bienvenido a la narración entre ${homeName} vs ${awayName}.`;
        case 17: return 'Final del primer tiempo';
        case 18: return 'Comienza el segundo tiempo';
        case 2:
        case 49:
        case 53: return `Terminó el encuentro: ${homeName} ${hScore} - ${aScore} ${awayName}.`;
        case 50: return 'Inicia el primer alargue';
        case 51: return 'Finaliza el primer alargue';
        case 52: return 'Inicia el segundo alargue';
        case 54: return 'Comienza la tanda de penales';
        case 8:  return 'Partido suspendido';
        case 9:  return `¡GOL de ${team}! anota ${pName}`;
        case 10: return `¡Autogol! ${pName} en contra de ${team}`;
        case 11: return `¡GOL de ${team}! anota ${pName} de cabeza`;
        case 12: return `¡GOL de ${team}! anota ${pName} de tiro libre`;
        case 13: return `¡GOL de ${team}! anota ${pName} de penal`;
        case 3:  return `Tarjeta amarilla para ${pName || team} (${team})${ev.reason ? ' — ' + ev.reason : ''}`;
        case 4:  return `Doble amarilla y roja para ${pName || team} (${team})`;
        case 5:  return `Tarjeta roja para ${pName || team} (${team})`;
        case 6:
        case 7:  return `Cambio en ${team}: sale ${outName || ''}${outName && inName ? ', ' : ''}entra ${inName || ''}`;
        case 28: return `Tiro de esquina para ${team}`;
        case 33: return `Remate desviado de ${team}`;
        case 34: return `¡Remate al palo de ${team}!`;
        case 35: return `Remate al arco de ${team}`;
        case 42:
        case 43: return `¡Penal atajado de ${team}!`;
        case 44: return `Penal desviado de ${team}`;
        case 45: return `¡Penal al palo de ${team}!`;
        default:
          if (tName === 'offsides') return `Fuera de juego de ${pName || team}`;
          if (tName === 'fouls')    return `Falta de ${pName || team}`;
          if (tName === 'var')      return 'Revisión VAR en curso';
          if (tName === 'status')   return '';
          return `${tName ?? 'Incidencia'} — ${team}`;
      }
    } catch {
      return 'Evento';
    }
  };
  renderLiveRow = (ev, key) => {
  const { theme } = this.props;
  const colors = theme?.colors || {};
  const isDark = theme?.mode === 'dark';

  const minuteLabel = (ev?.t?.m != null) ? `${ev.t.m}′` : '';

  const t = Number(ev.type);
  const iconSource = this.getImageByType(t);

  const isBallIcon = [9, 10, 11, 12, 13].includes(t);
  const isWhistleIcon = [1, 17, 18, 50, 51, 52, 2, 49, 53, 54].includes(t);
  const tintForIcon =
    isDark && (isBallIcon || isWhistleIcon) ? '#E5E7EB' : undefined;

  return (
    <View key={key}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingBottom: 8,
          borderColor: colors.cardBorder,
          backgroundColor: colors.cardBg,
        }}
      >
        <View
          style={{
            width: 34,
            alignItems: 'flex-end',
            paddingRight: 12,
          }}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: '800',
              color: colors.textMuted,
            }}
          >
            {minuteLabel}
          </Text>
        </View>

        <View style={{ width: 24, alignItems: 'center' }}>
          <Image
            source={iconSource}
            style={{
              width: 16,
              height: 16,
              opacity: isDark && (isBallIcon || isWhistleIcon) ? 1 : 0.9,
              tintColor: tintForIcon,
              resizeMode: 'contain',
            }}
          />
        </View>

        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors.text,
            }}
            numberOfLines={3}
          >
            {this.getMessage(ev)}
          </Text>
        </View>
      </View>

      <View
        style={{
          height: 1,
          backgroundColor: colors.tabBarBorder,
          marginLeft: 10,
          marginRight: 10,
        }}
      />
    </View>
  );
};


  renderLiveEmpty = (key = 'live-empty') => {
  const { theme } = this.props;
  const colors = theme?.colors || {};
  const isDark = theme?.mode === 'dark';

  return (
    <View
      key={key}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 24,
        alignItems: 'center',
      }}
    >
      <View
        style={{
          borderWidth: 1,
          borderColor: colors.cardBorder,
          backgroundColor: colors.cardBg,
          borderRadius: 12,
          paddingVertical: 20,
          paddingHorizontal: 16,
          alignItems: 'center',
          width: Dimensions.get('window').width - 24,
        }}
      >
        <Image
          source={WHISTLE_ICON}
          style={{
            width: 40,
            height: 40,
            marginBottom: 10,
            opacity: isDark ? 1 : 0.4,
            tintColor: isDark ? '#E5E7EB' : undefined,
            resizeMode: 'contain',
          }}
        />
        <Text
          style={{
            fontSize: 14,
            fontWeight: '800',
            color: colors.text,
            marginBottom: 4,
          }}
        >
          Narración en vivo
        </Text>
        <Text
          style={{
            fontSize: 13,
            fontWeight: '600',
            color: colors.textMuted,
            textAlign: 'center',
          }}
        >
          Todavía no hay incidencias en este partido
        </Text>
      </View>
    </View>
  );
};



  // ===================== DETALLES =====================
  renderDetails = () => {
  const { showDetailsLoading, lastDetails, cardData } = this.state;

  // Usa el último contenido disponible (evita "pantalla vacía")
  const data = cardData || lastDetails;

  // Si aún no hay datos y la carga ya superó el delay, muestra un skeleton limpio
  if (!data && showDetailsLoading) {
    return (
      <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
        <View style={{ height: 16, backgroundColor: '#EEF1F4', borderRadius: 6, marginBottom: 10, width: '60%' }} />
        <View style={{ height: 14, backgroundColor: '#EEF1F4', borderRadius: 6, marginBottom: 8,  width: '80%' }} />
        <View style={{ height: 14, backgroundColor: '#EEF1F4', borderRadius: 6, marginBottom: 8,  width: '50%' }} />
        <View style={{ height: 14, backgroundColor: '#EEF1F4', borderRadius: 6,                     width: '65%' }} />
      </View>
    );
  }

  // Si no hay datos ni siquiera tras el delay, no "parpadees" un mensaje; devuelve un espacio mínimo
  if (!data) {
    return <View style={{ height: 12 }} />;
  }

  // Con datos (actuales o cacheados), renderiza normalmente
  return <DetallesBlock data={data} navigation={this.props.navigation} scope={this.getScope()} />;

};


  // ===================== ESTADÍSTICAS =====================
  fetchStats = async (id) => {
    try {
      this.setState({ statsLoading: true });
      const scope = this.getScope();
      const res = await fetch(`${API_WEB_DEPORT_URL}/${scope}/events/${id}.json`, { cache: 'no-store' });
      const data = await res.json();
      const sum = data?.summary || {};

      const H = (obj) => Number(obj?.homeQty ?? 0);
      const A = (obj) => Number(obj?.awayQty ?? 0);

      const possHome = Number(sum?.ballPossesion?.homeQty ?? 0);
      const possAway = Number(sum?.ballPossesion?.awayQty ?? (possHome ? 100 - possHome : 0));

      const stats = {
        poss:            { home: possHome, away: possAway },
        shots:           { home: H(sum?.shots),            away: A(sum?.shots) },
        shotsOnTarget:   { home: H(sum?.shotsOnTarget),    away: A(sum?.shotsOnTarget) },
        shotsOffTarget:  { home: H(sum?.shotsOffTarget),   away: A(sum?.shotsOffTarget) },
        shotsOnWoodwork: { home: H(sum?.shotsOnWoodwork),  away: A(sum?.shotsOnWoodwork) },
        saves:           { home: H(sum?.saves),            away: A(sum?.saves) },
        cornerKicks:     { home: H(sum?.cornerKicks),      away: A(sum?.cornerKicks) },
        offsides:        { home: H(sum?.offsides),         away: A(sum?.offsides) },
        fouls:           { home: H(sum?.fouls),            away: A(sum?.fouls) },
        yellowCards:     { home: H(sum?.yellowCards),      away: A(sum?.yellowCards) },
        redCards:        { home: H(sum?.redCards),         away: A(sum?.redCards) },
      };

      this.setState({ stats, statsLoading: false });
    } catch (e) {
      this.setState({ stats: null, statsLoading: false });
    }
  };

  // ========================= Tabs / Router =========================
  buildRowsForCurrentTab = () => {
    const tab = this.state.activeTab;
    if (tab === LIVE_TAB_INDEX) {
      if (!this.state.events || this.state.events.length === 0) return [{ type: 'liveEmpty' }];
      return this.state.events.map(ev => ({ type: 'live', ev }));
    }
    if (tab === POS_TAB_INDEX)   return [{ type: 'positions' }];
    if (tab === STATS_TAB_INDEX) return [{ type: 'stats' }];
    if (tab === DETAILS_TAB_INDEX) return [{ type: 'details' }];
    if (TABS[tab] && /alineac/i.test(TABS[tab])) return [{ type: 'lineups' }];
    return [{ type: 'content' }];
  };

  // ===================== Ficha / Header =====================
renderCard = () => {

  const { theme } = this.props;
  const colors = theme?.colors || {};

  const m = this.state.match || {};
  const homeId   = m?.teams?.homeTeamId;
  const awayId   = m?.teams?.awayTeamId;
  const homeName = changeName(m?.teams?.homeTeamName || '—');
  const awayName = changeName(m?.teams?.awayTeamName || '—');

  // Hora ya con tu helper actual (el que usas en este archivo)
  const time = formatLocalKickoff({
    scheduledStart: m?.scheduledStart,
    gmt:           m?.gmt,
    stadiumGMT:    m?.stadiumGMT,
  });

  const live = (new Set([1,6,8,10,12])).has(Number(m?.statusId)) && Number(m?.statusId) !== 5;

  // Animaciones ya definidas en tu componente
  const headerMax = this.state.headerMax ?? this.HEADER_MAX;
  const COLLAPSE  = Math.max(12, headerMax - this.HEADER_MIN);

  const cardH = this.scrollY.interpolate({
    inputRange: [0, COLLAPSE],
    outputRange: [headerMax, this.HEADER_MIN],
    extrapolate: 'clamp',
  });

  const logoScale = this.scrollY.interpolate({
    inputRange: [0, COLLAPSE],
    outputRange: [0.95, 0.70],
    extrapolate: 'clamp',
  });

  const namesOpacity = this.scrollY.interpolate({
    inputRange: [0, COLLAPSE * 0.4, COLLAPSE],
    outputRange: [1, 0.4, 0],
    extrapolate: 'clamp',
  });

  const contentTranslateY = this.scrollY.interpolate({
    inputRange: [0, COLLAPSE],
    outputRange: [0, -6],
    extrapolate: 'clamp',
  });

  const topBarHeight = this.scrollY.interpolate({
    inputRange: [0, COLLAPSE * 0.4, COLLAPSE],
    outputRange: [28, 10, 0],
    extrapolate: 'clamp',
  });

  const topBarOpacity = this.scrollY.interpolate({
    inputRange: [0, COLLAPSE * 0.3, COLLAPSE],
    outputRange: [1, 0.2, 0],
    extrapolate: 'clamp',
  });

  const logosShiftToCenter = this.scrollY.interpolate({
    inputRange: [0, COLLAPSE],
    outputRange: [0, 35],
    extrapolate: 'clamp',
  });

  const scoreScale = this.scrollY.interpolate({
    inputRange: [0, COLLAPSE],
    outputRange: [1.0, 0.88],
    extrapolate: 'clamp',
  });

  const scoreTranslateY = this.scrollY.interpolate({
    inputRange: [0, COLLAPSE],
    outputRange: [0, -10],
    extrapolate: 'clamp',
  });

  const hasScorers =
    (this.state.scorersHome.length + this.state.scorersAway.length) > 0;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          height: cardH,
          backgroundColor: colors.cardBg,
          borderColor: colors.cardBorder,
          paddingBottom: hasScorers ? 0 : 8,
          position: 'relative', 
        },
      ]}
    >

    <CopilotStep name="home-first-match" order={1} text="Tocá el logo de un equipo para ver su perfil, plantel y estadísticas">
  <CopilotView collapsable={false}>
    <View
      collapsable={false}
      onLayout={(e) => {
        const inner = Math.round(e.nativeEvent.layout.height || this.HEADER_MAX);
        const PAD_TOP = 8;
        const PAD_BOTTOM = hasScorers ? 0 : 8;
        const h = Math.max(this.HEADER_MIN + 20, inner + PAD_TOP + PAD_BOTTOM);

        const prev = this.state.headerMax || 0;
        const THRESH = 6;
        if (!this.measuredOnce || Math.abs(h - prev) > THRESH || this.lastHasScorers !== hasScorers) {
          this.measuredOnce = true;
          this.lastHasScorers = hasScorers;
          this.setState({ headerMax: h });
        }
      }}
    > 

    <MatchCard
      match={m}
      homeId={homeId}
      awayId={awayId}
      homeName={homeName}
      awayName={awayName}
      timeLabel={time}
      isPre={Number(m?.statusId) === 0}
      live={live}
      clockLabel={() => mmssFromAnchors(this.state.statusObj, this.state.anchors) || ''}
      logoScale={logoScale}
      logoTranslateY={0}
      namesOpacity={namesOpacity}
      contentTranslateY={contentTranslateY}
      scoreScale={scoreScale}
      scoreTranslateY={scoreTranslateY}
      topBarHeight={topBarHeight}
      topBarOpacity={topBarOpacity}
      logosShiftToCenter={logosShiftToCenter}
      livePulse={this.state.livePulse}
      scorersHome={this.state.scorersHome}
      scorersAway={this.state.scorersAway}
      statusObj={this.state.statusObj}
      anchors={this.state.anchors}
      onPressHomeTeam={() => this.goTeam(homeId, homeName)}
      onPressAwayTeam={() => this.goTeam(awayId, awayName)}
      embedded
    />
    </View>
  </CopilotView>
</CopilotStep>



      
        {/* 🔔 Overlay de campana, arriba-derecha */}
  <Animated.View
    pointerEvents="box-none"
    style={{
      position: 'absolute',
      top: 10,
      right: 12,
      zIndex: 100,     // iOS
      elevation: 12,   // Android (asegura que quede arriba)
    }}
  >
    
  </Animated.View>

    </Animated.View>
  );
};

  // ===================== Tabs visual =====================
  centerActiveTab = (retries = 8) => {
    const idx  = this.state.activeTab;
    const meta = this.tabMeta[idx];
    if (meta && this.tabsScrollRef?.scrollTo) {
      const targetX = Math.max(0, meta.x - (width/2 - meta.w/2));
      this.tabsScrollRef.scrollTo({ x: targetX, y: 0, animated: true });
    } else if (retries > 0) {
      requestAnimationFrame(() => this.centerActiveTab(retries - 1));
    }
  };
  renderTabs = () => {
  const { theme } = this.props;
  const colors = theme?.colors || {};

  return (
  
      <View 
        style={[
          styles.tabsWrap,
          styles.tabsZ,
          {
            // fondo y borde según tema
            backgroundColor: colors.cardBg,
            borderBottomColor: colors.cardBorder,
          },
        ]}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height || 0);
          if (h && h !== this.state.tabsH) this.setState({ tabsH: h });
          this.centerActiveTab(1);
        }}
      >
        <ScrollView
          horizontal
          nestedScrollEnabled
          directionalLockEnabled
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.tabsRow, { paddingRight: 1 }]}
          ref={r=>{ this.tabsScrollRef = r; }}
          onContentSizeChange={() => this.centerActiveTab(1)}
        >
          {TABS.map((t, i) => {
  const on = this.state.activeTab === i;

  const TabBtn = (
    <TouchableOpacity
      key={t}
      onPress={() => {
        this.setState({ activeTab: i }, () => {
          this.centerActiveTab(1);
          if (i === POS_TAB_INDEX || i === DETAILS_TAB_INDEX) {
            this.scrollY.setValue(0);
            this.contentRef?.scrollTo?.({ y: 0, animated: false });
          }
        });
      }}
      activeOpacity={0.8}
      onLayout={(e) => {
        const { x, width: w } = e.nativeEvent.layout;
        this.tabMeta[i] = { x, w };
      }}
      style={[
        styles.tabTouch,
        { borderBottomColor: 'transparent' },
        on && {
          borderBottomWidth: 3,
          borderBottomColor: colors.accent || '#d32f2f',
          paddingBottom: 5,
        },
      ]}
    >
      <Text
        style={[
          styles.tabText,
          { color: colors.textMuted || '#9CA3AF' },
          on && { color: colors.accent || '#d32f2f' },
        ]}
      >
        {t}
      </Text>
    </TouchableOpacity>
  );

  // ✅ Paso 3: SOLO “Alineaciones”
  if (/alineac/i.test(t)) {
    return (
      <CopilotStep
        key={t}
        name="match-step-3-lineups-tab"
        order={3}
        text="Tocá aquí para ver las alineaciones. Luego podés tocar la foto de un jugador para ver su perfil."
      >
        <CopilotTouchable collapsable={false}>
          {TabBtn}
        </CopilotTouchable>
      </CopilotStep>
    );
  }

  return TabBtn;
})}

        </ScrollView>
      </View>
);

};


  // ===================== Render principal =====================
  render(){
    
    
const headerMax = this.state.headerMax ?? this.HEADER_MAX;
const EXTRA_LIFT = Platform.OS === 'android' ? 8 : 6;

// ✅ Altura de tu <Header /> (ajústalo si tu Header es más alto)
const TOP_BAR_H = 56;
const topInset = this.props?.insets?.top || 0;

// 👇 donde empieza tu overlay (MatchCard + Tabs) para que NO quede debajo del Header
const headerTop = this.state.headerBarH || 0;


// overlayH = altura del bloque (card + tabs)
const overlayH = this.state.overlayH || (headerMax + this.state.tabsH);

// ✅ paddingTop del scroll = Header + (card+tabs)
const refreshOffset = headerTop + overlayH;


    const isLiveTab = this.state.activeTab === LIVE_TAB_INDEX;

    const { theme } = this.props;
    const colors = theme?.colors || {};



return (
  <SafeAreaView
    style={[styles.container, { backgroundColor: colors.screenBg }]}
    edges={['bottom']}
  >
<View
  onLayout={(e) => {
    const h = Math.round(e.nativeEvent.layout.height || 0);
    if (h && h !== this.state.headerBarH) this.setState({ headerBarH: h });
  }}
>
  
      <Header
        navigation={this.props.navigation}
        title="Eventos del Partido"
        showBell
        bellProps={{
          on: this.state.isFollowingMatch,
          loading: this.state.followLoading,
          onPress: this.toggleFollowMatch,
          size: 22,
        }}
        showSearch
        onSearchPress={() => this.setState({ showTeamSearch: true })}
      />
    </View>


        <Animated.View style={[styles.absolute, { top: headerTop }]} pointerEvents="auto">

          <View collapsable={false}>

            {this.renderCard()}

            
            <CopilotStep
  name="match-step-2-card"
  order={2}
  text="Usá estas pestañas para ver Detalles, Alineaciones, Estadísticas, Posiciones y En vivo."
>
  <CopilotView collapsable={false}>
    {this.renderTabs()}
  </CopilotView>
</CopilotStep>
          </View> 
        </Animated.View>

        <Animated.ScrollView
          ref={r => { this.contentRef = r; }}
          contentContainerStyle={{
  paddingTop: refreshOffset,
  
  paddingBottom: 60,

          }}
          // 👇 driver en JS para evitar "node with tag does not exist"
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: this.scrollY } } }],
            { useNativeDriver: false, isInteraction: false }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          scrollIndicatorInsets={{ bottom: 60 }} // usa 50 si tu banner es 320x50
          bounces={false}
          overScrollMode="never"
          decelerationRate="fast"
          onScrollEndDrag={e => this.snapPositionsAtEnd(e.nativeEvent.contentOffset.y)}
          onMomentumScrollEnd={e => this.snapPositionsAtEnd(e.nativeEvent.contentOffset.y)}
          refreshControl={
            <RefreshControl
              refreshing={this.state.refreshing}
              onRefresh={this.handleRefresh}
              colors={[RED]}
              tintColor={RED}
              progressViewOffset={refreshOffset}
            />
          }
        >
          <View
            style={[
              isLiveTab ? styles.liveWrap : null,
              { marginTop: -(Math.max(0, (this.state.tabsH || 40) + (Platform.OS === 'android' ? 8 : 6))) },
            ]}
          >
            {this.buildRowsForCurrentTab().map((it, i) => {
  if (it.type === 'live')      return this.renderLiveRow(it.ev, `live-${i}`);
  if (it.type === 'liveEmpty') return this.renderLiveEmpty(`live-empty-${i}`);

  if (it.type === 'lineups') {
    const matchId = this.getMatchId();
    const data = {
      match: {
        homeTeamId: String(this.state.homeId || this.state.match?.teams?.homeTeamId || ''),
        awayTeamId: String(this.state.awayId || this.state.match?.teams?.awayTeamId || ''),
        homeTeamName: this.state.match?.teams?.homeTeamName || '',
        awayTeamName: this.state.match?.teams?.awayTeamName || '',
        homeFormation: this.state.formationHome,
        awayFormation: this.state.formationAway,
      },
      players: this.state.playersObject || {},
    };
    return (
      <View key={`lin-${i}`}>
        <LineupsTeamBlock data={data} scope={this.getScope()} navigation={this.props.navigation} />

      </View>
    );
  }

  if (it.type === 'positions') {
    const COLLAPSE = this.collapseDistance();
    const pinY = this.scrollY.interpolate({
      inputRange: [0, COLLAPSE],
      outputRange: [0, COLLAPSE],
      extrapolate: 'clamp'
    });
    return (
      <Animated.View key={`pos-${i}`} style={{ transform: [{ translateY: pinY }] }}>
        {this.renderStandings()}
        <View style={{ height: COLLAPSE }} />
      </Animated.View>
    );
  }

  if (it.type === 'stats') {
    const matchId = this.getMatchId();
    const scope   = this.getScope();
    const { match } = this.state;
    const rawHome = match?.teams?.homeTeamName || match?.teams?.homeTeamShortName || '';
    const rawAway = match?.teams?.awayTeamName || match?.teams?.awayTeamShortName || '';
    return (
      <StatsBox
        key={`sta-${i}`}
        matchId={matchId}
        scope={scope}
        homeName={rawHome || 'Local'}
        awayName={rawAway || 'Visitante'}
      />
    );
  }

  if (it.type === 'details') {
    const sid = Number(this.state.match?.statusId);
    if (sid === 0) {
      return <View key={`det-${i}`}>{this.renderDetails()}</View>; // sin pin si no ha iniciado
    }
    const COLLAPSE = this.collapseDistance();
    const pinY = this.scrollY.interpolate({
      inputRange: [0, COLLAPSE],
      outputRange: [0, COLLAPSE],
      extrapolate: 'clamp'
    });
    return (
      <Animated.View key={`det-${i}`} style={{ transform: [{ translateY: pinY }] }}>
        {this.renderDetails()}
        <View style={{ height: COLLAPSE }} />
      </Animated.View>
    );
  }

  // fallback para tipos desconocidos
  return <View key={`c-${i}`} />;
})}

          </View>
        </Animated.ScrollView>
<TeamSearchModal
  visible={this.state.showTeamSearch}
  onClose={() => this.setState({ showTeamSearch: false })}
  onSelect={(team) => this.props.navigation.navigate('TeamScreen', {
    teamId: team.id,
    scope: team.scope,
  })}
/>

{/* 🔔 Overlay centrado para activar notificaciones de ESTE partido */}
<NotificationPrompt
  id={`match:${this.getMatchId() || ''}`}
  mode="match"
  enabled={this.state.isFollowingMatch}
  shouldShow={
    Number(this.state.match?.statusId) !== 2 &&
    !this.state.guideRunning
  }
  onActivate={async () => {
    if (!this.state.isFollowingMatch) {
      await this.toggleFollowMatch();
    }
  }}
/>






{/* AdFooter flotante sobre el borde inferior, como en Home */}
<View
  pointerEvents="box-none"
  style={[
    styles.footerFixed,
    { bottom: Platform.OS === 'android' ? 48 : 10 },
  ]}
>
  <AdFooter />
</View>


      </SafeAreaView>
    );
  }
}

// ===================== Estilos =====================
const styles = StyleSheet.create({
  container:{ flex:1 },
  absolute:{ position:'absolute', left:0, right:0, zIndex:10, elevation:10, backgroundColor:'transparent' },

  card:{
  marginHorizontal:0,
  marginTop:0,
  
  overflow:'hidden',
  
  // 👇 defaults claros, luego se sobreescriben con theme en renderCard
  backgroundColor:'#ffffff',
  borderColor:'#E5E7EB',
  shadowColor:'#000',
  shadowOpacity:0.04,
  shadowRadius:6,
  shadowOffset:{width:0, height:3},
  elevation:1,
  paddingHorizontal:14,
  paddingTop:8,
  paddingBottom:0,
},

  topRow:{ flexDirection:'row', alignItems:'center' },
  liveChip:{ flexDirection:'row', alignItems:'center', paddingHorizontal:10, paddingVertical:4, borderRadius:999, borderWidth:1, backgroundColor:'#F3F4F6' },
  liveDot:{ width:8, height:8, borderRadius:999, marginRight:6 },
  liveText:{ fontSize:12, fontWeight:'800' },
  timeChip:{ paddingHorizontal:10, paddingVertical:4, borderRadius:999, borderWidth:1, backgroundColor:'#F9FAFB' },
  timeText:{ fontSize:12.5, fontWeight:'800' },

  midRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:2 },
  teamSide:{ flex:1, alignItems:'center' },
  teamName:{ fontSize:13, fontWeight:'700', color: '#111827', textAlign:'center' },

  scoreRow:{ flexDirection:'row', alignItems:'center', gap:10 },
  scoreNum:{ fontSize:24, fontWeight:'900', color: '#111827' },
  scoreDash:{ fontSize:20, fontWeight:'800', color: '#64748b' },
  statusText:{ fontSize:12, fontWeight:'800' },

  scorersRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginTop:6, marginBottom:6, paddingBottom:5 },
  scorerColLeft:{ flex:1, paddingRight:6 },
  scorerColRight:{ flex:1, paddingLeft:6, alignItems:'flex-end' },
  scorerText:{ fontSize:12, lineHeight:15, fontWeight:'600', color: '#111827', includeFontPadding:false, paddingVertical:0, marginVertical:0 },
  ball:{ width:16, height:16, opacity:0.9, marginHorizontal:4 },

  tabsWrap:{ marginTop:0, marginBottom:0, paddingVertical:0, backgroundColor:'transparent',  borderBottomLeftRadius:8, borderBottomRightRadius:8, borderTopWidth:0 },
  tabsZ:{ zIndex:30, elevation:30 },
  tabsRow:{ paddingHorizontal:8, alignItems:'center' },
  tabTouch:{ paddingHorizontal:10, paddingVertical:8, borderBottomWidth:0, borderBottomColor:'transparent' },
  tabText:{ fontSize:13, fontWeight:'700', color: '#111827' },
  
  liveWrap: {
    marginTop:0,
    backgroundColor: 'transparent',
    marginHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingTop: 4,
    paddingBottom: 8,
  },

  // ===== Posiciones =====
  tableHeader: { flexDirection:'row', paddingHorizontal:8, paddingVertical:8, backgroundColor:'#fff' },
  thCol: { alignItems:'center', justifyContent:'center' },
  thText: { fontSize:12, fontWeight:'800', color:'#0f1235', textAlign:'center' },
  thTextLeft: { fontSize:12, fontWeight:'800', color:'#0f1235', textAlign:'left' },
  teamRow: { flexDirection:'row', alignItems:'center', paddingHorizontal:8, paddingVertical:8, backgroundColor:'#fff' },
  tdTeamName: { color: '#111827', fontSize:13, fontWeight:'700' },

  rankCircle: { width: 22, height: 22, borderRadius: 11, alignItems:'center', justifyContent:'center', borderWidth: 1 },
  rankCircleDefault: { backgroundColor: '#FFFFFF', borderColor: '#D1D5DB' },
  rankCircleQual: { backgroundColor: '#10B981', borderColor: '#059669' },
  rankCircleDanger: { backgroundColor: '#EF4444', borderColor: '#DC2626' },
  rankText: { fontSize: 12, fontWeight: '800' },
  rankTextDefault: { color: '#111827' },
  rankTextQual: { color: '#FFFFFF' },
  rankTextDanger: { color: '#FFFFFF' },

  noInfo: { textAlign:'center', fontSize:12, color: '#64748b', padding: 10 },

  colNum: { fontSize:12, color: '#111827', textAlign:'center', fontWeight:'500', minWidth: 24, ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : null) },
  colPts: { fontWeight:'900', color: '#000' },
  teamRowDanger: { backgroundColor: '#FEF2F2' },
  // Encabezado y separador para el nombre del grupo
groupHeader: {
  paddingHorizontal: 10,
  paddingTop: 0,
  paddingBottom: 4,
},
groupHeaderText: {
  fontSize: 12,
  fontWeight: '800',
  color: '#0f1235',
},
groupDivider: {
  height: 1,
  backgroundColor: '#E6E8EC',
  marginHorizontal: 8,
  marginBottom: 6,
  opacity: 0.9,
},

footerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    // el "bottom" lo damos dinámico en el render
    alignItems: 'center',
    pointerEvents: 'box-none',
  },

});

// ✅ Wrapper para poder usar useCopilot() (hooks) y pasarlo a tu clase Match
function MatchCopilotWrapper(props) {
  const { start, copilotEvents } = useCopilot();
  return <Match {...props} start={start} copilotEvents={copilotEvents} />;
}

export default withSafeAreaInsets(
  withTheme(MatchCopilotWrapper)
);
