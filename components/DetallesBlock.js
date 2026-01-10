// components/DetallesBlock.js
import React from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity,  } from 'react-native';
import StadiumImg from './StadiumImg';
import Avatar from './Avatar';
import LogoImg from './LogoImg';
import { ratingColor as rcUtil } from '../utils/ratingColors';
import { formatSubName } from '../utils/formatNames';
import { formatPitchLabel } from '../utils/formatPitchName';
import { useTheme } from '../utils/ThemeContext';
import InlineAd from '../ads/InlineAd';
import { API_HIGHLIGHTS_BASE } from '@env';
import YoutubePlayer from 'react-native-youtube-iframe';



const NAVY = '#0b1f3b';
const SCREEN_W = Dimensions.get('window').width;
const STADIUM_H = Math.round(SCREEN_W * 9 / 16);

// Recursos
const BALL_ICON    = require('../resources/ball.png');
const YELLOW_ICON  = require('../resources/yellow.png');
const RED_ICON     = require('../resources/red.png');
const CARDS_ICON   = require('../resources/cards.png');   // doble amarilla
const WHISTLE_ICON = require('../resources/silbato.png');

// Helpers
const isSecondYType = (t) => Number(t) === 4; // 2ª amarilla (según feed)
const isRedType     = (t) => Number(t) === 5;

const ratingColor = (n) => {
  if (typeof rcUtil === 'function') {
    try { return rcUtil(n); } catch {}
  }
  const r = Number(n);
  if (!Number.isFinite(r)) return '#CBD5E1';
  if (r >= 8.0) return '#22c55e';
  if (r >= 7.0) return '#16a34a';
  if (r >= 6.5) return '#eab308';
  if (r >= 6.0) return '#f59e0b';
  return '#ef4444';
};

function minuteLabel(t = {}) {
  const m = Number(t?.m ?? t?.minute ?? 0);
  const half = Number(t?.half ?? 0);
  const mm = Math.max(0, m);
  const extra = (mm > 90 && half >= 2) ? `90+${mm - 90}` : (mm > 45 && half === 1) ? `45+${mm - 45}` : null;
  return `${extra || mm}′`;
}

function buildPlayersMap(playersObj = {}) {
  const map = {};
  for (const [id, p] of Object.entries(playersObj || {})) {
    const pid = String(id);
    map[pid] = {
      ...p,
      id: pid,           // variantes de id para Avatar
      playerId: pid,
      imageId: pid,
      photoId: pid,
    };
  }
  return map;
}

// Prefija "Estadio " si el nombre no lo trae
function withEstadioPrefix(name = '') {
  const s = String(name || '').trim();
  if (!s) return 'Estadio';
  const lower = s.toLowerCase();
  const alreadyHas =
    lower.startsWith('estadio') ||
    lower.startsWith('estádio') ||
    lower.startsWith('stadium');
  return alreadyHas ? s : `Estadio ${s}`;
}

function normalizeEvents(data) {
  const match = data?.match || {};
  const homeId = String(match.homeTeamId || data?.match?.homeTeam?.teamId || data?.homeTeamId || '');
  const awayId = String(match.awayTeamId || data?.match?.awayTeam?.teamId || data?.awayTeamId || '');
  const players = buildPlayersMap(data?.players || {});
  const out = [];

  const pushEv = (ev, kind, icon, team) => {
    if (!ev) return;
    out.push({
      teamId: String(team),
      kind, icon,
      minute: minuteLabel(ev.t || ev.time || {}),
      plyrId: String(ev.plyrId || ev.playerId || ''),
      type:   Number(ev.type),
    });
  };

  // === Goles ===
  for (const ev of Object.values(data?.incidences?.goals || {})) pushEv(ev, 'goal', BALL_ICON, ev.team);

  // === Tarjetas ===
  for (const ev of Object.values(data?.incidences?.yellowCards || {})) {
    const icon = isSecondYType(ev.type) ? CARDS_ICON : YELLOW_ICON;
    pushEv(ev, 'card', icon, ev.team);
  }
  for (const ev of Object.values(data?.incidences?.redCards || {})) {
    const icon = isSecondYType(ev.type) ? CARDS_ICON : RED_ICON;
    pushEv(ev, 'card', icon, ev.team);
  }
  // Compatibilidad (algunos feeds antiguos)
  const legacyCards = data?.incidences?.cards || data?.incidences?.bookings || {};
  for (const ev of Object.values(legacyCards)) {
    let icon = YELLOW_ICON;
    if (isSecondYType(ev.type)) icon = CARDS_ICON;
    if (isRedType(ev.type))     icon = RED_ICON;
    pushEv(ev, 'card', icon, ev.team);
  }

  // Nombres (usa tu util)
  out.forEach(e => {
    const p = players[e.plyrId];
    e.playerName = p?.name ? formatSubName(p.name) : null;
  });

  // Orden cronológico
  const numMinute = (e) => Number((e.minute || '0').replace(/[^\d]/g,'') || 0);
  out.sort((a, b) => numMinute(a) - numMinute(b));

  return { list: out, homeId, awayId, players };
}

/* =================== HIGHLIGHT =================== */

function getMatchIdFromData(data) {
  // 1) Si ya viene en data como matchId/eventId
  const direct =
    data?.matchId ||
    data?.eventId ||
    data?.match?.matchId ||
    data?.match?.eventId ||
    data?.id;

  if (direct) return String(direct);

  // 2) Fallback: algunos feeds traen "match" con una key tipo deportes.futbol...
  // Si vos ya lo pasás desde Match.js, este fallback ni se usa.
  return null;
}


/* =================== ÁRBITRO =================== */
function OfficialRow({ data }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const off = Object.values(data?.officials || {}).find(o => String(o?.type || '').toLowerCase() === 'arbitro');
  if (!off) return null;
  const name = off?.name ? formatSubName(off.name) : formatSubName(off);
  const country = (off?.country || '').trim();

  return (
    <View
      style={[
        styles.refCard,
        { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
      ]}
    >
      <View style={styles.refIconWrap}>
        <Image
  source={WHISTLE_ICON}
  style={[styles.refIcon, { tintColor: colors.text }]}
/>

      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.refLabel, { color: colors.textMuted }]}>ÁRBITRO</Text>
        <Text style={[styles.refName, { color: colors.text }]} numberOfLines={1}>
          {name}
        </Text>
      </View>
      {country ? (
        <View
          style={[
            styles.refChip,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
          ]}
        >
          <Text style={[styles.refChipTxt, { color: colors.text }]} numberOfLines={1}>
            {country}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* =============== Chips / filas de rating =============== */
function RatingChip({ value, small = false }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return (
    <View style={[styles.rateChip, small && styles.rateChipSm, { backgroundColor: ratingColor(n) }]}>
      <Text style={[styles.rateChipText, small && styles.rateChipTextSm]}>{n.toFixed(1)}</Text>
    </View>
  );
}

// Línea compacta para "Mejor valorados"
function PlayerLine({ player, align = 'left', onPress }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  if (!player) return null;
  const isLeft = align === 'left';
  const name = formatPitchLabel(player?.name, null); // “J. Apellido”

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.prRow, { justifyContent: isLeft ? 'flex-start' : 'flex-end' }]}
    >
      {isLeft && <RatingChip value={player.ratingNum ?? player.rating} small />}
      <View style={[styles.prInfoWrap, { flexDirection: isLeft ? 'row' : 'row-reverse' }]}>
        <Avatar
          key={`av-${player.id}`}
          id={player.id}
          playerId={player.playerId}
          imageId={player.imageId}
          photoId={player.photoId}
          teamId={player.teamId}
          name={player?.name ? formatSubName(player.name) : undefined}
          size={24}
          borderRadius={12}
        />
        <Text
          style={[
            styles.prName,
            { textAlign: isLeft ? 'left' : 'right', color: colors.text },
          ]}
          numberOfLines={1}
        >
          {name}
        </Text>
      </View>
      {!isLeft && <RatingChip value={player.ratingNum ?? player.rating} small />}
    </TouchableOpacity>
  );
}

// Jugador del partido (logo junto al NOMBRE DEL EQUIPO)
function PlayerOfMatch({ player, teamName, onPress }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  if (!player) return null;
  const teamId = String(player.teamId || '');

  return (
    <View
      style={[
        styles.pomCard,
        { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
      ]}
    >

    
      <View style={styles.pomTitleRow}>
        <View style={styles.pomStar}><Text style={styles.pomStarTxt}>★</Text></View>
        <Text style={[styles.pomTitle, { color: colors.text }]}>Jugador del partido</Text>
      </View>

      <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={styles.pomBody}>
        <Avatar
          key={`av-pom-${player.id}`}
          id={player.id}
          playerId={player.playerId}
          imageId={player.imageId}
          photoId={player.photoId}
          teamId={player.teamId}
          name={player?.name ? formatSubName(player.name) : undefined}
          size={44}
          borderRadius={22}
        />
        <View style={{ flex:1, marginHorizontal:10 }}>
          <Text style={[styles.pomName, { color: colors.text }]} numberOfLines={1}>
            {formatSubName(player?.name)}
          </Text>
          {(!!teamName || !!teamId) && (
            <View style={styles.pomTeamRow}>
              {!!teamId && <LogoImg teamId={teamId} size={16} />}
              {!!teamName && (
                <Text style={[styles.pomTeam, { color: colors.textMuted }]} numberOfLines={1}>
                  {teamName}
                </Text>
              )}
            </View>
          )}
        </View>
        <RatingChip value={player.ratingNum ?? player.rating} />
      </TouchableOpacity>
    </View>
  );
}

function TopRated({ homeTop = [], awayTop = [], onPressPlayer }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  if (!homeTop.length && !awayTop.length) return null;
  return (
    <View
      style={[
        styles.topCard,
        { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
      ]}
    >
      <Text style={[styles.topTitle, { color: colors.text }]}>Mejor valorados</Text>
      <View style={styles.topCols}>
        <View style={styles.topCol}>
          {homeTop.map((p, i) => (
            <PlayerLine key={`h-${p.id || i}`} player={p} align="left" onPress={() => onPressPlayer?.(p)} />
          ))}
        </View>
        <View style={styles.topCol}>
          {awayTop.map((p, i) => (
            <PlayerLine key={`a-${p.id || i}`} player={p} align="right" onPress={() => onPressPlayer?.(p)} />
          ))}
        </View>
      </View>
    </View>
  );
}

/* ===== Separador “— Incidencias —” ===== */
function SectionDivider({ label = 'Incidencias' }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
      <Text style={[styles.dividerLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: colors.cardBorder }]} />
    </View>
  );
}

/* =============== Fila de incidencia (1 columna) =============== */
function EventItem({ side = 'left', icon, minute, text }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const isLeft = side === 'left';
  return (
    <View style={[styles.detRow2, { justifyContent: isLeft ? 'flex-start' : 'flex-end' }]}>
      {isLeft && !!minute && (
        <View
          style={[
            styles.detMinuteBadge,
            { borderColor: colors.cardBorder, backgroundColor: colors.cardBg },
          ]}
        >
          <Text style={[styles.detMinuteText, { color: colors.textMuted }]}>{minute}</Text>
        </View>
      )}
      {icon ? (
  <Image
    source={icon}
    style={[
      styles.detBubbleIcon,
      // balón o silbato → se tiñen del color del texto (blanco en dark)
      (icon === BALL_ICON || icon === WHISTLE_ICON) && {
        tintColor: colors.text,
      },
    ]}
  />
) : null}

      <View
        style={[
          styles.detBubble,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        ]}
      >
        <Text style={[styles.detBubbleText, { color: colors.text }]} numberOfLines={1}>
          {text}
        </Text>
      </View>
      {!isLeft && !!minute && (
        <View
          style={[
            styles.detMinuteBadge,
            { borderColor: colors.cardBorder, backgroundColor: colors.cardBg },
          ]}
        >
          <Text style={[styles.detMinuteText, { color: colors.textMuted }]}>{minute}</Text>
        </View>
      )}
    </View>
  );
}



/* ============================= MAIN ============================= */
export default function DetallesBlock({ data, navigation, scope = 'guatemala' }) {
  const { theme } = useTheme();
  const colors = theme.colors;
  
  const [highlights, setHighlights] = React.useState(null);
  
    const matchId = React.useMemo(() => getMatchIdFromData(data), [data]);

  const onStateChange = React.useCallback((state) => {
  if (state === 'ended' || state === 'paused') setPlaying(false);
}, []);


  React.useEffect(() => {
    let mounted = true;

    async function load() {
  if (!matchId) {
    console.log('[HL] no matchId, skip');
    setHighlights(null);
    return;
  }

  // 1) logs base
  console.log('[HL] scope:', scope);
  console.log('[HL] matchId:', matchId);
  console.log('[HL] API_HIGHLIGHTS_BASE:', API_HIGHLIGHTS_BASE);

  // 2) url final
  const url = `${API_HIGHLIGHTS_BASE}/${encodeURIComponent(matchId)}.json`;
  console.log('[HL] url:', url);

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!mounted) return;

    console.log('[HL] res.ok:', res.ok, 'status:', res.status);

    if (!res.ok) {
      setHighlights(null);
      return;
    }

    const json = await res.json();
    console.log('[HL] json keys:', Object.keys(json || {}));
    console.log('[HL] json.active:', json?.active);

    if (json?.active) setHighlights(json);
    else setHighlights(null);
  } catch (e) {
    if (!mounted) return;
    console.log('[HL] fetch error:', String(e?.message || e));
    setHighlights(null);
  }
}




    load();
    return () => { mounted = false; };
  }, [matchId]);


  const { list, homeId, awayId } = React.useMemo(() => normalizeEvents(data || {}), [data]);

  // venue + título de estadio
  const venue = data?.venueInformation?.venue || {};
  const venueId = venue?.venueId || venue?.stadium?.stadiumId || null;
  const rawTitle = venue?.stadium?.stadiumName || venue?.venueName || '';
  const stadiumTitle = withEstadioPrefix(rawTitle);

  const homeIdStr = String(homeId);
  const awayIdStr = String(awayId);

  const openPlayer = (pid, tid) => {
    const playerId = Number(pid);
    const teamId   = Number(tid ?? homeIdStr ?? awayIdStr);
    if (!Number.isFinite(playerId) || !Number.isFinite(teamId)) return;
    navigation?.navigate?.('Player', { playerId, teamId, scope });
  };

  // ===== ratings =====
  const statusId = Number(data?.match?.statusId || data?.status?.statusId || 0);
  const finished = statusId === 2; // Finalizado

  // Conservamos id/playerId/etc. para que Avatar encuentre la foto
  const players = Object.entries(data?.players || {}).map(([id, p]) => ({
    ...p,
    id: String(id),
    playerId: String(id),
    imageId: String(id),
    photoId: String(id),
  }));

  const withRating = players
    .map(p => ({ ...p, ratingNum: Number(p?.rating) }))
    .filter(p => Number.isFinite(p.ratingNum) && p.ratingNum > 0);

  const showRatings = finished && withRating.length > 0;

  let playerOfMatch = null;
  let homeTop = [];
  let awayTop = [];

  if (showRatings) {
    playerOfMatch = withRating.slice().sort((a,b) => b.ratingNum - a.ratingNum)[0];
    homeTop = withRating.filter(p => String(p.teamId) === homeIdStr).sort((a,b)=>b.ratingNum-a.ratingNum).slice(0,3);
    awayTop = withRating.filter(p => String(p.teamId) === awayIdStr).sort((a,b)=>b.ratingNum-a.ratingNum).slice(0,3);
  }

  const renderText = (e) => e.playerName || `#${e.plyrId}`;

  // Para nombre de club en PoM
  const homeName = data?.teams?.[homeIdStr]?.name || data?.match?.homeTeamName || '';
  const awayName = data?.teams?.[awayIdStr]?.name || data?.match?.awayTeamName || '';
  const pomTeamName = playerOfMatch
    ? (String(playerOfMatch.teamId) === homeIdStr ? homeName : awayName)
    : '';

  return (
    <View style={styles.wrap}>
      {/* Detalles (ratings + mejor valorados) */}
      <View
        style={[
          styles.detListCard,
          { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
        ]}
      >
        {showRatings && playerOfMatch && (
          <PlayerOfMatch
            player={playerOfMatch}
            teamName={pomTeamName}
            onPress={() => openPlayer(playerOfMatch?.id || playerOfMatch?.playerId, playerOfMatch?.teamId)}
          />
        )}
        {showRatings && (homeTop.length || awayTop.length) ? (
          <TopRated
            homeTop={homeTop}
            awayTop={awayTop}
            onPressPlayer={(p) => openPlayer(p?.id || p?.playerId, p?.teamId)}
          />
        ) : null}

                {/* 🎬 Highlights remoto (si existe) */}
{highlights?.active &&
 String(highlights?.provider || '').toLowerCase() === 'youtube' &&
 highlights?.videoId ? (
  <View style={[styles.hlCard, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
    <Text style={[styles.hlTitle, { color: colors.text }]} numberOfLines={1}>
      {highlights?.title || 'Resumen del partido'}
    </Text>

    <View style={styles.hlVideoWrap}>
      <YoutubePlayer
        height={Math.round(SCREEN_W * 9 / 16)}
        videoId={highlights.videoId}
        play={false}
        initialPlayerParams={{
          start: Number(highlights.startSeconds || 0),
          controls: true,
          modestbranding: true,
          rel: false,
          playsinline: true,
        }}
      />
    </View>
  </View>
) : null}




        {/* Separador — Incidencias — */}
        <SectionDivider />

        {/* ✅ Native Ad (inline) */}
<View style={{ paddingHorizontal: 8, marginBottom: 8, }}>
  <InlineAd />
</View>
        
        {/* Timeline: una fila por evento (goles + tarjetas) */}
        {list.length ? (
          list.map((e, i) => {
            const side = e.teamId === homeIdStr ? 'left' : (e.teamId === awayIdStr ? 'right' : 'left');
            return (
              <EventItem
                key={`ev-${i}`}
                side={side}
                icon={e.icon}
                minute={e.minute}
                text={renderText(e)}
              />
            );
          })
        ) : (
          <Text style={[styles.emptyAll, { color: colors.textMuted }]}>
            Sin incidencias registradas
          </Text>
        )}
      </View>

      {/* Árbitro debajo de Detalles y arriba del Estadio */}
      <View style={styles.refBelow}>
        <OfficialRow data={data} />
      </View>

      {/* Estadio */}
      {!!venueId && (
        <View style={styles.stadiumSection}>
          <View style={styles.stadiumTitleWrap}>
            <Text style={styles.stadiumTitle}>{stadiumTitle}</Text>
          </View>
          <View style={styles.fullBleed}>
            <StadiumImg venueId={venueId} stadiumId={venueId} height={STADIUM_H} borderRadius={0} />
          </View>
        </View>
      )}
    </View>
  );
}

/* =============================== STYLES =============================== */
const styles = StyleSheet.create({
  // Full width
  wrap: { paddingHorizontal: 0, paddingTop: 8, paddingBottom: 20 },

  // Tarjeta (full width)
  detListCard: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },

  // ===== "Jugador del partido" =====
  pomCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 10,
  },
  pomTitleRow: { flexDirection:'row', alignItems:'center', marginBottom: 8, gap:8 },
  pomStar: { width:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center', backgroundColor:'#22c55e' },
  pomStarTxt:{ fontSize:12, color:'#fff', fontWeight:'900', lineHeight:14 },
  pomTitle: { fontWeight:'800', color:'#0f172a' },
  pomBody: { flexDirection:'row', alignItems:'center' },
  pomName: { fontSize:15, fontWeight:'800', color:'#0f172a' },
  pomTeamRow: { flexDirection:'row', alignItems:'center', gap:6, marginTop:2 },
  pomTeam: { fontSize:12, color:'#64748b' },

  // ===== "Mejor valorados" (compacto) =====
  topCard: {
    paddingVertical: 8, paddingHorizontal: 8,
    backgroundColor:'#f8fafc', borderRadius: 12, borderWidth:1, borderColor:'#e2e8f0',
    marginBottom:10,
  },
  topTitle: { textAlign:'center', fontWeight:'800', color:'#0f172a', marginBottom:8 },
  topCols: { flexDirection:'row', gap:12 },
  topCol: { flex:1, gap:6 },
  prRow: { flexDirection:'row', alignItems:'center', gap:8 },
  prInfoWrap: { alignItems:'center', gap:6, maxWidth:'72%' },
  prName: { fontWeight:'700', color:'#0f172a', fontSize:13 },
  rateChip: {
    minWidth:30, paddingHorizontal:6, height:22, borderRadius:6,
    alignItems:'center', justifyContent:'center',
  },
  rateChipSm: { minWidth:26, height:20, borderRadius:5 },
  rateChipText: { color:'#fff', fontWeight:'800', fontSize:12, lineHeight:14 },
  rateChipTextSm: { fontSize:11, lineHeight:13 },

  // ===== Separador Incidencias =====
  dividerRow: { flexDirection:'row', alignItems:'center', gap:8, paddingVertical:6, marginTop:2, marginBottom:6 },
  dividerLine: { flex:1, height:1, backgroundColor:'#e5e7eb' },
  dividerLabel: { fontWeight:'800', color:'#6b7280' },

  // Fila de evento
  detRow2: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },

  // Badge minuto
  detMinuteBadge: {
    minWidth: 34, paddingHorizontal: 8, height: 24, borderRadius: 999,
    borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center',
  },
  detMinuteText: { fontSize: 12, fontWeight: '800', color: '#64748b' },

  // Burbuja (icono + nombre)
  detBubble: {
    maxWidth: '78%', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 999,
    backgroundColor: '#F1F5F9', flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  detBubbleIcon: { width: 16, height: 16, marginRight: 8, opacity: 0.95 },
  detBubbleText: { fontSize: 13, fontWeight: '700', color: '#111827' },

  // Vacío
  emptyAll: { color:'#8a97a6', fontStyle:'italic', paddingHorizontal:8, paddingVertical:6 },

  // Árbitro (debajo de Detalles)
  refBelow: { marginTop: 8 },
  refCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(11,31,59,0.05)',
    borderWidth: 1, borderColor: 'rgba(11,31,59,0.10)',
    marginBottom: 8,
  },
  refIconWrap: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(11,31,59,0.14)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  refIcon: { width: 13, height: 13, resizeMode: 'contain', opacity: 0.95 },
  refLabel: { fontSize: 10.5, letterSpacing: 0.5, color: '#516075', fontWeight: '700' },
  refName: { fontSize: 14, color: NAVY, fontWeight: '800' },
  refChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: '#eef1f5', borderWidth: 1, borderColor: '#dde4ec', marginLeft: 8 },
  refChipTxt: { color: NAVY, fontWeight: '700', fontSize: 12 },

  // Estadio (usando tus cambios)
  stadiumSection: { marginTop: 8 },
  stadiumTitleWrap: { marginHorizontal: 0, backgroundColor: NAVY, paddingVertical: 4, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  stadiumTitle: { color: '#fff', fontWeight: '600', fontSize: 12, textAlign: 'center' },
  fullBleed: { marginHorizontal: 0 },

    // ===== Highlights =====
  hlCard: {
    borderWidth: 0,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 0,
    marginBottom: 10,
  },
  hlTitle: { fontSize: 14, fontWeight: '800' },
  hlSub: { fontSize: 12, marginTop: 4, fontWeight: '600' },

  hlVideoWrap: {
  width: '100%',
  borderRadius: 12,
  overflow: 'hidden',
  marginTop: 8,
},

hlPlayBtn: {
  marginTop: 8,
  borderWidth: 1,
  borderRadius: 10,
  paddingVertical: 10,
  alignItems: 'center',
},

hlPlayTxt: {
  fontWeight: '800',
  fontSize: 13,
},

hlModalWrap: {
  flex: 1,
  backgroundColor: '#000',
  paddingTop: 40,
  alignItems: 'center',
},
hlCloseBtn: {
  position: 'absolute',
  top: 40,
  left: 16,
  zIndex: 10,
  padding: 10,
},
hlCloseTxt: {
  color: '#fff',
  fontSize: 22,
  fontWeight: '900',
},

hlVideoWrap: {
  width: '100%',
  borderRadius: 12,
  overflow: 'hidden',
  marginTop: 8,
},


});
