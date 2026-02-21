// components/PlayerScreen.js — BioPlayer claro con ficha (3 col), "Temporada actual" horizontal y cancha
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  Image, ActivityIndicator, SafeAreaView
} from 'react-native';
import { API_WEB_DEPORT_URL } from '@env';
import Header from './Header';
import AdFooter from '../ads/AdFooter';
import Avatar from './Avatar';
import LogoImg from './LogoImg';
import analytics from '@react-native-firebase/analytics'; // 🔹 Analytics
import { withTheme, useTheme } from '../utils/ThemeContext';



const RED   = '#d32f2f';
const INK   = '#1b2733';
const GRAY  = '#6e7a86';
const GRAY_LINE = 'rgba(0,0,0,0.06)';
const CARD_BG   = '#ffffff';
const SURFACE   = '#f4f6f8';
const GREEN = '#2e7d32';
const BLUE  = '#1976d2';
const YELL  = '#f9a825';
// Altura del banner (ajusta 50 si aquí siempre sale 320x50; 60 si 468x60)
const BANNER_H = 60;
const FOOTER_LIFT = Platform.OS === 'android' ? 48 : 10; // mismo lift que en Match


const ICONS = {
  games:   require('../resources/people.png'),        // usa el que prefieras
  mins:    require('../resources/clock.png'),
  goals:   require('../resources/ball.png'),
  cards:   require('../resources/cards.png'),         // si no existe, usa yellow.png
  yellow:  require('../resources/yellow.png'),
  red:     require('../resources/red.png'),
};

const POSN = { 1:'Portero', 2:'Defensa', 3:'Mediocampo', 4:'Delantero' };
const POS_LETTER = { 1:'P', 2:'D', 3:'M', 4:'DEL' };

const toNum = (v) => (v==null||v==='') ? 0 : Number(v)||0;
const qty   = (x) => toNum(x?.qty ?? x);

// ---------- helpers nombre/fecha ----------
const nameFrom = (n={}) => {
  const nick = (n?.nick||'').trim();
  if (nick) return nick;
  const f = (n?.first||n?.given||'').split(/\s+/).filter(Boolean)[0] || '';
  const l = (n?.last||n?.family||n?.surname||'').split(/\s+/).filter(Boolean)[0] || '';
  return [f,l].filter(Boolean).join(' ') || '—';
};
const parseDate = (s) => {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.test(s) ? s : s.replace(/(\d{2})[\/.-](\d{2})[\/.-](\d{4})/, '$3-$2-$1');
  const d = new Date(iso);
  return Number.isNaN(+d) ? null : d;
};
const fmtDateShort = (d) => {
  if (!d) return '';
  const dd = d.getDate().toString().padStart(2,'0');
  const m  = d.toLocaleString('es', { month:'short' });
  const yy = d.getFullYear();
  return `${dd} ${m} ${yy}`;
};
const age = (d) => {
  if (!d) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const mdiff = (now.getMonth() - d.getMonth())*31 + (now.getDate() - d.getDate());
  if (mdiff < 0) a -= 1;
  return a;
};

// ---------- parsers ht/wt ----------
const parseHeightCm = (h) => {
  if (h == null) return null;
  const txt = String(h).toLowerCase().trim();
  if (!txt) return null;
  let m = txt.match(/^(\d+(?:\.\d+)?)\s*cm$/);
  if (m) return Math.round(parseFloat(m[1]));
  m = txt.match(/^(\d+(?:\.\d+)?)\s*m$/);
  if (m) return Math.round(parseFloat(m[1]) * 100);
  if (/^\d+(\.\d+)?$/.test(txt)) {
    const n = parseFloat(txt);
    return n > 3 ? Math.round(n) : Math.round(n*100);
  }
  return null;
};
const parseWeightKg = (w) => {
  if (w == null) return null;
  const txt = String(w).toLowerCase().trim();
  if (!txt) return null;
  const m = txt.match(/^(\d+(?:\.\d+)?)\s*kg$/);
  if (m) return Math.round(parseFloat(m[1]));
  if (/^\d+(\.\d+)?$/.test(txt)) return Math.round(parseFloat(txt));
  return null;
};


// ---------- buscar jugador dentro de team file ----------
function findPlayerWrap(teamJson, playerId) {
  const obj = teamJson || {};
  let entries = [];

  if (obj.players && typeof obj.players === 'object') {
    entries = Object.entries(obj.players);
  } else if (Array.isArray(obj.plantilla)) {
    entries = obj.plantilla.map((wrap, i) => [String(wrap?.info?.id ?? wrap?.id ?? i), wrap]);
  } else if (Array.isArray(obj.roster)) {
    entries = obj.roster.map((wrap, i) => [String(wrap?.info?.id ?? wrap?.id ?? i), wrap]);
  }

  const pidStr = String(playerId);
  for (const [key, wrap] of entries) {
    const info = wrap?.info || wrap || {};
    const pid  = String(info?.id ?? info?.playerId ?? wrap?.playerId ?? wrap?.id ?? key);
    if (pid === pidStr) {
      const summary = wrap?.summary || {};
      return { info, summary, team: obj?.team || obj?.info || {} };
    }
  }
  return null;
}

// === Dorsales desde events (mini versión de TeamSquad) ===
const toStr = (v) => (v==null) ? '' : String(v);
const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : NaN;
};

// extrae { playerId -> dorsal } para un team dado
function numbersFromEventJSON(evt, teamId){
  const map = new Map();
  const tid = teamId!=null ? String(teamId) : null;
  if(evt && evt.players && typeof evt.players==='object'){
    for(const [pidKey,p] of Object.entries(evt.players)){
      if(!p) continue;
      const pid = toStr(p.playerId || p.id || p._id || pidKey);
      const belongs = !tid || (p.teamId!=null && String(p.teamId)===tid);
      const num = toInt(p.squadNo ?? p.shirt ?? p.number ?? p.dorsal);
      if(pid && belongs && Number.isFinite(num) && !map.has(pid)) map.set(pid,num);
    }
  }
  return map;
}

async function fetchByTeamEventIds({ base, scope, teamId, limit=12 }){
  try{
    const url = `${base}/${scope}/events/byTeam/${teamId}.json?ts=${Date.now()}`;
    const r = await fetch(url, { cache:'no-store' });
    if(!r.ok) return [];
    const j = await r.json();
    const arr = Array.isArray(j) ? j : Object.values(j||{});
    const ids = [];
    for(const it of arr){
      const id = (it && (it.id||it.eventId||it.matchId||it.eid)) ?? (typeof it==='number'||typeof it==='string'?it:null);
      if(id!=null){ ids.push(String(id)); if(ids.length>=limit) break; }
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


function PlayerScreen({ route, navigation, theme }) {
  const colors = theme.colors;
  const isDark = theme.mode === 'dark';

  const { playerId, teamId, scope='guatemala', player: passed } = route.params || {};
  const base = String(API_WEB_DEPORT_URL || '').replace(/\/+$/, '');
  const sc   = String(scope).toLowerCase();

  const [refreshing, setRefreshing] = useState(false);
  const [data, setData]             = useState(null);     // {info, summary, team}
  const [loading, setLoading]       = useState(!passed);
  const [err, setErr]               = useState(null);
  const [numCache, setNumCache] = useState(null);


  const merged = useMemo(() => {
    if (data && (data.info || data.summary)) return data;
    if (passed) {
      const info    = passed?.info || passed;
      const summary = passed?.summary || {};
      return { info, summary, team: {} };
    }
    return { info: {}, summary: {}, team: {} };
  }, [data, passed]);

  const fetchFromTeam = useCallback(async (bust=false) => {
    const urls = [
      `${base}/${sc}/statsCenter/teams.${teamId}.json`,
      `${base}/${sc}/statsCenter/teams/${teamId}.json`,
    ];
    const opts = bust ? { headers:{ 'Cache-Control':'no-cache' } } : { cache:'default' };

    setErr(null);
    let lastErr = null;
    for (const raw of urls) {
      const url = bust ? `${raw}?t=${Date.now()}` : raw;
      try {
        const r = await fetch(url, opts);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const found = findPlayerWrap(j, playerId);
        if (found) { setData(found); return; }
        lastErr = new Error('Jugador no encontrado en team file');
      } catch (e) {
        lastErr = e;
      }
    }
    setErr(String(lastErr?.message || lastErr || 'Error de red'));
  }, [base, sc, teamId, playerId]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try { setLoading(true); await fetchFromTeam(false); }
      finally { if (!cancel) setLoading(false); }
    })();
    return () => { cancel = true; };
  }, [fetchFromTeam]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetchFromTeam(true); } finally { setRefreshing(false); }
  }, [fetchFromTeam]);

  // Si no vino el dorsal en info.squadNo, intenta deducirlo desde events/byTeam
useEffect(() => {
  const n = Number.parseInt(merged?.info?.squadNo, 10);
  if (Number.isFinite(n) && n > 0) return; // ya hay dorsal

  let cancel = false;
  (async () => {
    try{
      const ids = await fetchByTeamEventIds({ base, scope: sc, teamId, limit: 12 });
      if(!ids.length) return;
      const cache = await buildNumbersCache({ base, scope: sc, eventIds: ids, teamId });
      if(!cancel) setNumCache(cache);
    }catch{}
  })();
  return () => { cancel = true; };
}, [base, sc, teamId, merged?.info?.squadNo]);


  // ---------- datos UI ----------
  const info    = merged?.info || {};
  const summary = merged?.summary || {};
  const teamObj = merged?.team || {};

  const fullName  = nameFrom(info?.name || {});
  const teamName  = info?.teamName || teamObj?.name || teamObj?.teamName || '';
  // 🔹 Analytics: pantalla de jugador y evento de vista
useEffect(() => {
  (async () => {
    try {
      await analytics().logScreenView({
        screen_name: 'PlayerScreen',
        screen_class: 'PlayerScreen',
      });
      await analytics().logEvent('view_player', {
        player_id: String(playerId ?? ''),
        player_name: String(fullName ?? ''),
        team_id: String(teamId ?? teamObj?.id ?? ''),
        team_name: String(teamName ?? ''),
      });
    } catch {}
  })();
  // Dependencias: si cambia el jugador/equipo, registramos nuevamente
}, [playerId, teamId, fullName, teamName]);

  const posId     = toNum(info?.posnId);
  // dorsal: primero el del JSON; si no hay, busca en cache de events
const dorsalFromInfo  = Number.parseInt(info?.squadNo, 10);
const dorsalFromCache = numCache?.get(String(playerId));
const dorsal          = Number.isFinite(dorsalFromInfo) && dorsalFromInfo > 0
  ? dorsalFromInfo
  : (Number.isFinite(dorsalFromCache) ? dorsalFromCache : NaN);

  const nat       = info?.nationality || info?.country || info?.nation || info?.pais || null;

  const dobRaw    = info?.birthdate || info?.birthDate || info?.dob || info?.born || info?.birth_date || null;
  const dob       = parseDate(dobRaw);
  const years     = age(dob);

  const heightCm  = parseHeightCm(info?.ht ?? info?.height ?? info?.heightCm ?? info?.estatura);
  const weightKg  = parseWeightKg(info?.wt ?? info?.weight ?? info?.weightKg ?? info?.peso);

  const k = {
    matches: qty(summary?.matches),
    minutes: qty(summary?.minutesPlayed),
    goals:   qty(summary?.goals),
    yellow:  qty(summary?.yellowCards),
    red:     qty(summary?.redCards),
    secondY: qty(summary?.secondYellowCards || summary?.yellowRed || summary?.doubleYellow),
  };
  const expelled   = k.red + k.secondY;
  const cards90    = k.minutes > 0 ? +( ((k.yellow + expelled) / (k.minutes/90)).toFixed(2) ) : 0;

  // ---- posición en cancha ----
  const marker = (() => {
    const base = { leftPct: 50, topPct: 0 };
    switch (posId) {
      case 1: return { ...base, topPct: 8,  letter: POS_LETTER[1] };
      case 2: return { ...base, topPct: 25, letter: POS_LETTER[2] };
      case 3: return { ...base, topPct: 50, letter: POS_LETTER[3] };
      case 4: return { ...base, topPct: 78, letter: POS_LETTER[4] };
      default:return { ...base, topPct: 50, letter: '?' };
    }
  })();

  // layout dinámico para el pitch
const [pitchW, setPitchW] = useState(0);



  return (
    <SafeAreaView
  style={{ flex: 1, backgroundColor: colors.screenBg }}
  edges={['bottom']}
>

      <Header navigation={navigation} title="Jugador" />

      <ScrollView
        style={{ flex:1 }}
        contentContainerStyle={{ padding: 10, paddingBottom: BANNER_H, backgroundColor: colors.screenBg }}  // el contenido llega justo al ad
        scrollIndicatorInsets={{ bottom: BANNER_H }} 
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#e53935']}
            tintColor="#e53935"
            progressBackgroundColor={colors.cardBg}

          />
        }
      >
        {/* Encabezado */}
        <View
  style={[
    styles.cardHeader,
    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
  ]}
>

          <Avatar id={playerId} player={info} size={70} rounded borderColor="#e7e7e7" style={{ marginRight: 12 }} />
          <View style={{ flex:1 }}>
           <Text style={[styles.playerName, { color: colors.text }]} numberOfLines={1} > {fullName} </Text>

            {!!teamName && (
              <View style={{ flexDirection:'row', alignItems:'center', marginTop: 4 }}>
                <LogoImg teamId={teamObj?.id || teamId} size={18} style={styles.teamLogo} />
                <Text
  style={[styles.teamText, { color: colors.textMuted }]}
  numberOfLines={1}
>
  {teamName}
</Text>

              </View>
            )}
          </View>
        </View>

        {/* FICHA CLARA (3 columnas x 2 filas) */}
        <View
  style={[
    styles.lightCard,
    { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
  ]}
>

          <View style={styles.grid3}>
            <FichaItem titulo="Edad" valor={years!=null?`${years}`:'—'} sub={dob?fmtDateShort(dob):''} />
            <FichaItem titulo="País" valor={nat || '—'} />
            <FichaItem titulo="Posición" valor={POSN[posId] || '—'} />

            <FichaItem titulo="Dorsal" valor={Number.isFinite(dorsal) ? `${dorsal}` : '—'} />

            <FichaItem titulo="Estatura" valor={heightCm ? `${heightCm} cm` : '—'} />
            <FichaItem titulo="Peso" valor={weightKg ? `${weightKg} kg` : '—'} />
          </View>
        </View>

        {/* Temporada actual (estilo horizontal, fondo blanco) */}
        <View style={[ styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, ]} >

          <Text style={[styles.sectionTitle, { color: colors.text }]}>
  Temporada actual
</Text>
<Text style={[styles.sectionSub, { color: colors.textMuted }]}>
  Partidos oficiales
</Text>


          <View style={[styles.hRow, { borderColor: colors.cardBorder }]}>

            <StatHItem
              icon={ICONS.games}
              label="Partidos"
              value={k.matches}
            />
            <SeparatorV />
            <StatHItem
              icon={ICONS.mins}
              label="Minutos"
              value={k.minutes}
            />
            <SeparatorV />
            <StatHItem
              icon={ICONS.goals}
              label="Goles"
              value={k.goals}
            />
            <SeparatorV />
            <StatHItem
              icon={ICONS.yellow}
              label="Tarjetas"
              value={cards90}
              cards={{ y: k.yellow, r: expelled }}
            />
          </View>

          {loading && (
            <View style={{ marginTop:10, flexDirection:'row', alignItems:'center', gap:8 }}>
              <ActivityIndicator size="small" color={RED} />
              <Text style={[styles.noteText,{color:RED}]}>Actualizando…</Text>
            </View>
          )}
          {err ? <Text style={[styles.noteText,{marginTop:6,color:RED}]}>({err})</Text> : null}
        </View>

        {/* Posición en la cancha (nuevo pitch) */}
<View style={[ styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }, ]}>

  <Text style={[styles.sectionTitle, { color: colors.text }]}>
  Posición en la cancha
</Text>

  <View
  style={[styles.pitch, { borderColor: colors.cardBorder }]}
  onLayout={(e) => {
      const w = Math.round(e.nativeEvent.layout.width || 0);
      if (w && w !== pitchW) setPitchW(w);
    }}
  >
    {/* Fondo media cancha */}
    {pitchW > 0 && <HalfPitchGreen width={pitchW} side="top" />}

    

    {/* Marcador de posición (usa porcentajes, así no calculas píxeles) */}
    {pitchW > 0 && (
      <View style={[StyleSheet.absoluteFill]}>
        <View
          style={[
            styles.marker,
            {
              left: '50%',
              top:  `${marker.topPct}%`,
              transform: [{ translateX: -14 }, { translateY: -14 }],
              backgroundColor: posId === 1 ? '#455a64'
                               : posId === 2 ? '#1976d2'
                               : posId === 3 ? '#26a69a' : '#ef6c00',
            }
          ]}
        >
          <Text style={styles.markerText}>{marker.letter}</Text>
        </View>
      </View>
    )}
  </View>
</View>

      </ScrollView>

            {/* Ad fijo y elevado para que no choque con la barra/gestos */}
      <View
        pointerEvents="box-none"
        style={[styles.footerFixed, { bottom: FOOTER_LIFT }]}
      >
        <AdFooter screen="Player" />
      </View>
    </SafeAreaView>

  );
}

/* ========= Subcomponentes ========= */
function FichaItem({ titulo, valor, sub }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={styles.fichaItem}>
      <Text
        style={[styles.fichaTitle, { color: colors.textMuted }]}
        numberOfLines={1}
      >
        {titulo}
      </Text>
      <Text
        style={[styles.fichaValue, { color: colors.text }]}
        numberOfLines={1}
      >
        {valor ?? '—'}
      </Text>
      {!!sub && (
        <Text
          style={[styles.fichaSub, { color: colors.textMuted }]}
          numberOfLines={1}
        >
          {sub}
        </Text>
      )}
    </View>
  );
}


// Reemplaza tu función StatHItem por esta 👇
function StatHItem({ icon, label, value, cards }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const isDark = theme.mode === 'dark';

  // ✅ Tarjetas y Minutos conservan color original del icono
  const keepOriginalIcon = label === 'Tarjetas' || label === 'Minutos';

  return (
    <View style={styles.hItem}>
      <View
        style={[
          styles.circleIcon,
          {
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        <Image
          source={icon}
          style={[
            styles.hIcon,
            // ⚽ silbato/balón/resto en blanco en oscuro
            !keepOriginalIcon && isDark && { tintColor: '#ffffff' },
          ]}
        />
      </View>

      {cards ? (
        // Bloque especial para tarjetas
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.hValue, { color: colors.text }]}>
            <Text style={{ color: '#f9a825' }}>{cards.y ?? 0}</Text>
            <Text style={{ color: colors.text }}>{' / '}</Text>
            <Text style={{ color: '#d32f2f' }}>{cards.r ?? 0}</Text>
          </Text>
        </View>
      ) : (
        <Text style={[styles.hValue, { color: colors.text }]}>
          {value ?? 0}
        </Text>
      )}

      <Text style={[styles.hLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}



function SeparatorV() {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View
      style={[
        styles.sepV,
        { backgroundColor: colors.cardBorder },
      ]}
    />
  );
}

// === Media cancha a escala FIFA (68 m × 52.5 m) con penal, semicírculo del área y círculo central correctos
function HalfPitchGreen({ width, side = 'top' }) {
  // Alto correcto de media cancha
  const fieldH = (52.5 / 68) * width;

  // escalas px por metro (X = Y porque la proporción es correcta)
  const sx = width / 68;
  const sy = fieldH / 52.5;

  // medidas (m)
  const AREA_W = 40.32, AREA_D = 16.5; // área grande
  const BOX_W  = 18.32, BOX_D  = 5.5;  // área chica
  const GOAL_W = 7.32;                 // tramo visible de portería (travesaño)
  const PENAL  = 11;                   // punto penal
  const R      = 9.15;                 // radio para círculos/semicírculos

  // en px
  const areaW = AREA_W * sx, areaD = AREA_D * sy;
  const boxW  = BOX_W  * sx, boxD  = BOX_D  * sy;
  const goalW = GOAL_W * sx;
  const penalX = width / 2;
  const penalY = PENAL * sy;
  const circleR = R * sx;              // (sx===sy)

  const stripeH = fieldH / 10;
  const isTop = side === 'top';

  return (
    <View style={{ width, height: fieldH }}>
      {/* Franjas de césped */}
      {Array.from({ length: 10 }).map((_, i) => (
        <View key={i} style={{
          position:'absolute', left:0, right:0, top:i*stripeH, height: stripeH,
          backgroundColor: i%2 ? '#277947' : '#2f8d4f',
        }} />
      ))}

      {/* Perímetro y línea de medio */}
      <View style={[pitchStyles.perimeter, { width, height: fieldH }]} />
      <View style={[pitchStyles.hLine, { top: isTop ? fieldH - 2 : 0, width }]} />

      {/* Área grande */}
      {isTop
        ? <View style={[pitchStyles.box, { top:0, left:(width - areaW)/2, width: areaW, height: areaD }]} />
        : <View style={[pitchStyles.box, { bottom:0, left:(width - areaW)/2, width: areaW, height: areaD }]} />
      }

      {/* Área chica */}
      {isTop
        ? <View style={[pitchStyles.box, { top:0, left:(width - boxW)/2, width: boxW, height: boxD }]} />
        : <View style={[pitchStyles.box, { bottom:0, left:(width - boxW)/2, width: boxW, height: boxD }]} />
      }

      {/* Línea de gol (tramo central) */}
      {isTop
        ? <View style={[pitchStyles.goal, { top:-2, left:(width - goalW)/2, width: goalW }]} />
        : <View style={[pitchStyles.goal, { bottom:-2, left:(width - goalW)/2, width: goalW }]} />
      }

      {/* Punto penal */}
      <View style={{
        position:'absolute', width:6, height:6, borderRadius:3, backgroundColor:'#fff',
        left: penalX - 3, top:  isTop ? (penalY - 3) : undefined, bottom: !isTop ? (penalY - 3) : undefined,
      }}/>

      {/* Semicírculo del área — recortado en la LÍNEA DEL ÁREA (16.5 m) */}
      {isTop ? (
        <View style={{
          position:'absolute',
          left: penalX - circleR,
          top: areaD,                       // 👈 recorte en la línea del área
          width: circleR * 2,
          height: circleR,                  // mostramos solo la parte exterior
          overflow: 'hidden',
        }}>
          <View style={{
            position:'absolute',
            left: 0,
            top: (penalY - circleR) - areaD, // círculo completo desplazado; queda visible solo la parte externa
            width: circleR*2,
            height: circleR*2,
            borderRadius: circleR,
            borderWidth: 2,
            borderColor: '#fff',
            backgroundColor: 'transparent',
          }} />
        </View>
      ) : (
        // si dibujaras la otra mitad
        <View style={{
          position:'absolute',
          left: penalX - circleR,
          bottom: areaD,
          width: circleR * 2,
          height: circleR,
          overflow: 'hidden',
        }}>
          <View style={{
            position:'absolute',
            left: 0,
            top: -((penalY - circleR) - areaD),
            width: circleR*2,
            height: circleR*2,
            borderRadius: circleR,
            borderWidth: 2,
            borderColor: '#fff',
            backgroundColor: 'transparent',
          }} />
        </View>
      )}

      {/* Círculo central — centro en la línea de medio */}
      <View style={{
        position:'absolute',
        width: circleR*2, height: circleR*2, borderRadius: circleR,
        borderWidth: 2, borderColor:'#fff', backgroundColor:'transparent',
        left: (width/2) - circleR,
        top:  fieldH - circleR,             // 👈 medio campo
      }}/>

      {/* Punto de saque (en la línea de medio) */}
      <View style={{
        position:'absolute', width:6, height:6, borderRadius:3, backgroundColor:'#fff',
        left: (width/2) - 3, top: fieldH - 3,
      }}/>
    </View>
  );
}

const pitchStyles = StyleSheet.create({
  perimeter:{ position:'absolute', left:0, top:0, borderWidth:2, borderColor:'#fff' },
  hLine:    { position:'absolute', left:0, right:0, height:2, backgroundColor:'#fff' },
  goal:     { position:'absolute', height:3, backgroundColor:'#fff' },
  box:      { position:'absolute', borderWidth:2, borderColor:'#fff', backgroundColor:'transparent' },
});



/* ================= Estilos ================= */
const styles = StyleSheet.create({
  // Cards claras
  card: {
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: GRAY_LINE,
    borderRadius: 14, padding: 12, marginBottom: 10,
  },
  cardHeader: {
    backgroundColor: CARD_BG, borderWidth: 1, borderColor: GRAY_LINE,
    borderRadius: 14, padding: 12, marginBottom: 10, flexDirection:'row', alignItems:'center'
  },

  playerName: { fontSize: 20, fontWeight:'800', color: INK },
  teamText:   { fontSize: 13, color: INK },
  teamLogo:   { width: 20, height: 20, resizeMode:'contain', marginRight: 6 },

  sectionTitle: { fontSize: 14, fontWeight:'800', color: INK, marginBottom: 6 },
  sectionSub:   { fontSize: 12, color: GRAY, marginBottom: 8 },

  // === Ficha clara (3 columnas)
  lightCard: {
    backgroundColor: CARD_BG,
    borderColor: GRAY_LINE,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  grid3: { flexDirection:'row', flexWrap:'wrap', justifyContent: 'space-around' },
  fichaItem: { width: '30%', paddingVertical: 10 },
  fichaTitle: { fontSize: 14, color: GRAY, marginBottom: 6 },
  fichaValue: { fontSize: 14, fontWeight:'800', color: INK },
  fichaSub:   { fontSize: 12, color: GRAY, marginTop: 2 },

  // === “Temporada actual” horizontal
  hRow: {
    flexDirection:'row',
    alignItems:'stretch',
    justifyContent:'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: GRAY_LINE,
    paddingVertical: 10,
  },
  hItem: {
    flex: 1,
    alignItems:'center',
    justifyContent:'center',
    paddingVertical: 6,
  },
  sepV: { width: 1, backgroundColor: GRAY_LINE, marginVertical: 4 },
  circleIcon: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems:'center', justifyContent:'center',
    marginBottom: 6,
  },
  hIcon: { width: 20, height: 20, resizeMode:'contain' },
  hValue: { fontSize: 14, fontWeight:'800', color: INK },
  hLabel: { fontSize: 10, color: GRAY, marginTop: 2, textAlign:'center' },
  hSubValue: { fontSize: 12, fontWeight: '700' },

  noteRow: { flexDirection:'row', alignItems:'center', flexWrap:'wrap' },
  noteText: { fontSize: 11, color: GRAY },

  // ====== Cancha clara ======
  pitch: {
  marginTop: 8,
  borderRadius: 14,
  borderWidth: 1,
  borderColor: GRAY_LINE,
  overflow: 'hidden',
  // (quita height fijo si lo tienes)
},

  pitchHalfLine: {
    position: 'absolute',
    left: 0, right: 0, top: '50%',
    height: 1, backgroundColor: 'rgba(0,0,0,0.15)',
  },
  box: {
    position: 'absolute',
    left: '20%', right: '20%',
    height: 56, borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)', borderRadius: 8,
  },
  boxSmall: { left: '32%', right: '32%', height: 40, borderRadius: 6 },
  arc: {
    position: 'absolute',
    left: '35%', right: '35%',
    height: 28, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)',
  },
  marker: {
    position: 'absolute',
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#ffffff',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, elevation: 2,
  },
  markerText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});
export default withTheme(PlayerScreen);