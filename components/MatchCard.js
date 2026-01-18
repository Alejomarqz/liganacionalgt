// components/MatchCard.js
import React, { memo, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import LogoImg from './LogoImg';
import LiveClock from '../utils/LiveClock';
import { statusLabel, isLive as isLiveNow } from '../utils/status';
import { useTheme } from '../utils/ThemeContext';

const BALL_ICON = require('../resources/ball.png');
const ATouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

/* ========= Helpers de fecha (idénticos a Home) ========= */
const GT_OFFSET = -6; // America/Guatemala
const DOW_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const pad2 = (n) => String(n ?? 0).padStart(2, '0');

// YYYYMMDD -> Date (local)
const parseYmdLocal = (ymd) => {
  const s = String(ymd || '');
  if (s.length < 8) return null;
  const y = +s.slice(0, 4),
    m = +s.slice(4, 6) - 1,
    d = +s.slice(6, 8);
  const dt = new Date(y, m, d, 0, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
};
const ddmmyyyy = (d) =>
  `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;

// Ajuste de hora a GT
function adjustTimeToGuatemala(hhmm, gmt) {
  if (!hhmm) return { hhmm: '--:--', shift: 0 };
  const [h, m] = hhmm.split(':').map((n) => parseInt(n, 10));
  const g = Number.isFinite(Number(gmt)) ? Number(gmt) : GT_OFFSET;
  const delta = GT_OFFSET - g;
  let total = h * 60 + m + delta * 60;
  let shift = 0;
  while (total < 0) {
    total += 1440;
    shift -= 1;
  }
  while (total >= 1440) {
    total -= 1440;
    shift += 1;
  }
  const HH = String(Math.floor(total / 60)).padStart(2, '0');
  const MM = String(total % 60).padStart(2, '0');
  return { hhmm: `${HH}:${MM}`, shift };
}
function shiftYmd(ymd, shift) {
  const s = String(ymd || '');
  if (!shift || s.length < 8) return s || '';
  const y = +s.slice(0, 4),
    mo = +s.slice(4, 6) - 1,
    d = +s.slice(6, 8);
  const dt = new Date(Date.UTC(y, mo, d));
  dt.setUTCDate(dt.getUTCDate() + shift);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
}

// reloj fallback
const simpleClockFromStatus = (statusObj) => {
  const m = Number(statusObj?.minute ?? statusObj?.min);
  const s = Number(statusObj?.second ?? statusObj?.sec);
  if (Number.isFinite(m) || Number.isFinite(s)) {
    return `${pad2(Number.isFinite(m) ? m : 0)}:${pad2(
      Number.isFinite(s) ? s : 0
    )}`;
  }
  return '';
};

function MatchCard({
  match,
  homeId,
  awayId,
  homeName,
  awayName,

  timeLabel,
  dateTimeLabel,

  isPre,
  live,

  logoScale,
  logoTranslateY,
  namesOpacity,
  contentTranslateY,
  scoreScale,
  scoreTranslateY,
  topBarHeight,
  topBarOpacity,
  logosShiftToCenter,
  livePulse,

  statusObj,
  anchors,

  scorersHome = [],
  scorersAway = [],

  embedded = false,
  clockLabel,

  onPressHomeTeam,
  onPressAwayTeam,
}) {
  const { theme } = useTheme();
  const COLORS = theme.colors;

  const cardStyle = embedded
    ? [
        styles.card,
        {
          marginHorizontal: 0,
          borderWidth: 0,
          paddingHorizontal: 60, // ✅ como pediste
          paddingTop: 0,
          paddingBottom: 0,
          borderRadius: 0,
          shadowOpacity: 0,
          elevation: 0,
        },
      ]
    : [styles.card];

  // ===== Fecha/hora igual que antes (misma lógica) =====
  const sid = Number(match?.statusId);
  const isPreStatus = isPre || sid === 0;

  const rawTime = String(match?.scheduledStart || '').slice(0, 5);
  const gmt = Number(match?.gmt ?? match?.stadiumGMT ?? GT_OFFSET);
  const { hhmm: timeGT, shift } = adjustTimeToGuatemala(
    rawTime || timeLabel || '',
    gmt
  );

  const baseYmd = match?.date || null;
  const ymdAdj = baseYmd ? shiftYmd(baseYmd, shift) : baseYmd;
  const dObj = ymdAdj ? parseYmdLocal(ymdAdj) : null;

  const dateStr = dObj ? ddmmyyyy(dObj) : '';
  const dowShort = dObj ? DOW_ES[dObj.getDay()] : '';

  // En vivo real (excluye medio tiempo = 5)
  const liveNow = !isPreStatus && isLiveNow(sid) && sid !== 5;

  const clockLabelFn =
    typeof clockLabel === 'function'
      ? clockLabel
      : () => simpleClockFromStatus(statusObj) || '';

  const _livePulse = livePulse || useRef(new Animated.Value(1)).current;

  const logosShiftToCenterNeg = useMemo(
    () => Animated.multiply(logosShiftToCenter, -1),
    [logosShiftToCenter]
  );

  // ✅ SUBIR LOGOS CUANDO COLAPSA (namesOpacity -> 0)
  const logoLiftOnCollapse = useMemo(() => {
    if (!namesOpacity?.interpolate) return 0;
    return namesOpacity.interpolate({
      inputRange: [0, 1],
      outputRange: [-30, 0], // 👈 sube 12px cuando colapsa (ajusta -8/-14 si querés)
      extrapolate: 'clamp',
    });
  }, [namesOpacity]);

  // ✅ SUBIR MARCADOR CUANDO COLAPSA (namesOpacity -> 0)
const scoreLiftOnCollapse = useMemo(() => {
  if (!namesOpacity?.interpolate) return 0;
  return namesOpacity.interpolate({
    inputRange: [0, 1],
    outputRange: [-10, 0], // 👈 sube 10px al colapsar (ajusta -6/-14)
    extrapolate: 'clamp',
  });
}, [namesOpacity]);

const scoreTranslateYFixed = useMemo(() => {
  try {
    return Animated.add(scoreTranslateY, scoreLiftOnCollapse);
  } catch {
    return scoreTranslateY;
  }
}, [scoreTranslateY, scoreLiftOnCollapse]);


  const logoTranslateYFixed = useMemo(() => {
    try {
      return Animated.add(logoTranslateY, logoLiftOnCollapse);
    } catch {
      return logoTranslateY;
    }
  }, [logoTranslateY, logoLiftOnCollapse]);

  // ===== Stadium / Liga (solo UI, no rompe lógica) =====
  const stadiumName =
    match?.stadiumName ||
    match?.stadium ||
    match?.stadium?.name ||
    match?.venue ||
    match?.venueName ||
    '';

  const leagueName =
    match?.competitionName ||
    match?.tournamentName ||
    match?.leagueName ||
    match?.competition?.name ||
    match?.tournament ||
    'Liga nacional de Guatemala';

  return (
    <Animated.View
      style={[
        cardStyle,
        {
          backgroundColor: COLORS.cardBg,
          borderColor: COLORS.cardBorder ?? 'rgba(0,0,0,0.08)',
        },
      ]}
    >
      {/* ===== HEADER: fecha izq / hora der ===== */}
      <Animated.View
        style={{
          height: topBarHeight,
          opacity: topBarOpacity,
          overflow: 'hidden',
        }}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.headerText, { color: COLORS.textMuted }]}>
            {dateStr || '--/--/----'}
          </Text>

          <Text style={[styles.headerText, { color: COLORS.textMuted }]}>
            {timeGT || timeLabel || '--:--'}
          </Text>
        </View>
      </Animated.View>

      {/* ===== MIDDLE: (Logo+Nombre) - Score - (Nombre+Logo) ===== */}
      <Animated.View
        style={[
          styles.middleRow,
          { transform: [{ translateY: contentTranslateY }] },
        ]}
      >
        {/* Local */}
        <ATouchableOpacity
          activeOpacity={0.7}
          onPress={onPressHomeTeam}
          style={[
            styles.teamLeft,
            { transform: [{ translateX: logosShiftToCenter }] },
          ]}
          collapsable={false}
        >
          <Animated.View
            style={[
              styles.logoWrapLeft,
              {
                transform: [
                  { scale: logoScale },
                  { translateY: logoTranslateYFixed }, // ✅ lift en colapso
                ],
              },
            ]}
          >
            <LogoImg teamId={homeId} size={56} style={styles.logoLeft} />
          </Animated.View>

          <Animated.Text
            style={[
              styles.teamNameLeft,
              { opacity: namesOpacity, color: COLORS.text },
            ]}
            numberOfLines={1}
          >
            {homeName}
          </Animated.Text>
        </ATouchableOpacity>

        {/* Centro */}
        <Animated.View
          style={[
            styles.centerCol,
            {
              transform: [{ translateY: scoreTranslateYFixed }, { scale: scoreScale }],
            },
          ]}
        >
          {isPreStatus ? (
            <>
              <Text
                style={[styles.preLine1, { color: COLORS.text }]}
                numberOfLines={1}
              >
                {dateStr || '--/--/----'}
              </Text>
              <Text
                style={[styles.preLine2, { color: COLORS.textMuted }]}
                numberOfLines={1}
              >
                {dowShort
                  ? `${dowShort}, ${timeGT || timeLabel || '--:--'}`
                  : timeGT || timeLabel || '--:--'}
              </Text>
            </>
          ) : (
            <>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreNum, { color: COLORS.text }]}>
                  {match?.scoreStatus?.[homeId]?.score ?? '-'}
                </Text>
                <Text style={[styles.scoreDash, { color: COLORS.textMuted }]}>
                  -
                </Text>
                <Text style={[styles.scoreNum, { color: COLORS.text }]}>
                  {match?.scoreStatus?.[awayId]?.score ?? '-'}
                </Text>
              </View>

              {live ? (
                <Animated.Text
                  style={[
                    styles.liveUnderScore,
                    {
                      color: COLORS.accent ?? '#d32f2f',
                      transform: [{ scale: _livePulse }],
                    },
                  ]}
                  numberOfLines={1}
                >
                  EN VIVO
                </Animated.Text>
              ) : liveNow ? (
                <LiveClock
                  live
                  style={[styles.statusUnderScore, { color: COLORS.textMuted }]}
                  label={clockLabelFn}
                  statusObj={statusObj}
                  anchors={anchors}
                  color={COLORS.text}
                  mutedColor={COLORS.textMuted}
                />
              ) : (
                <Text
                  style={[styles.statusUnderScore, { color: COLORS.textMuted }]}
                  numberOfLines={1}
                >
                  {statusLabel(sid)}
                </Text>
              )}
            </>
          )}
        </Animated.View>

        {/* Visitante */}
        <ATouchableOpacity
          activeOpacity={0.7}
          onPress={onPressAwayTeam}
          style={[
            styles.teamRight,
            { transform: [{ translateX: logosShiftToCenterNeg }] },
          ]}
          collapsable={false}
        >
          <Animated.Text
            style={[
              styles.teamNameRight,
              { opacity: namesOpacity, color: COLORS.text },
            ]}
            numberOfLines={1}
          >
            {awayName}
          </Animated.Text>

          <Animated.View
            style={[
              styles.logoWrapRight,
              {
                transform: [
                  { scale: logoScale },
                  { translateY: logoTranslateYFixed }, // ✅ lift en colapso
                ],
              },
            ]}
          >
            <LogoImg teamId={awayId} size={56} style={styles.logoRight} />
          </Animated.View>
        </ATouchableOpacity>
      </Animated.View>

      {/* ===== BOTTOM: estado izq / estadio+liga der ===== */}
      {!embedded ? (
        <View style={styles.bottomRow}>
          <Text
            style={[styles.statusLeft, { color: COLORS.text }]}
            numberOfLines={1}
          >
            {statusLabel(sid)}
          </Text>

          <View style={styles.bottomRight}>
            {!!stadiumName && (
              <Text
                style={[styles.stadiumRight, { color: COLORS.textMuted }]}
                numberOfLines={1}
              >
                {stadiumName}
              </Text>
            )}
            <Text
              style={[styles.leagueRight, { color: COLORS.textMuted }]}
              numberOfLines={1}
            >
              {leagueName}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ===== Goleadores ===== */}
      {(Array.isArray(scorersHome) && scorersHome.length > 0) ||
      (Array.isArray(scorersAway) && scorersAway.length > 0) ? (
        <View className="scorersRow" style={styles.scorersRow}>
          <View style={styles.scorerColLeft}>
            {(scorersHome || []).map((t, i) => (
              <Text
                key={`h-${i}`}
                style={[styles.scorerText, { color: COLORS.text }]}
                numberOfLines={1}
              >
                {t}
              </Text>
            ))}
          </View>

          <Image
            source={BALL_ICON}
            style={{
              width: 16,
              height: 16,
              opacity: 0.95,
              marginHorizontal: 6,
              tintColor: COLORS.text,
            }}
          />

          <View style={styles.scorerColRight}>
            {(scorersAway || []).map((t, i) => (
              <Text
                key={`a-${i}`}
                style={[
                  styles.scorerText,
                  { color: COLORS.text, textAlign: 'right' },
                ]}
                numberOfLines={1}
              >
                {t}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    marginHorizontal: 20,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',

    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
      },
      android: { elevation: 3 },
      default: {},
    }),
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  // ✅ minHeight + paddingVertical para que no se recorte al colapsar
  middleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 74,
    paddingVertical: 6,
  },

  // ✅ Centrado vertical/horizontal estable (aunque el texto desaparezca)
  teamLeft: {
    flex: 1,
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamRight: {
    flex: 1,
    minWidth: 104,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoWrapLeft: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLeft: { marginRight: 8 },
  logoRight: { marginLeft: 8 },

  teamNameLeft: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '100%',
  },
  teamNameRight: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '100%',
    textAlign: 'right',
  },

  centerCol: {
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreNum: { fontSize: 22, fontWeight: '900' },
  scoreDash: { fontSize: 18, fontWeight: '700' },

  liveUnderScore: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
  },
  statusUnderScore: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },

  preLine1: { fontSize: 12, fontWeight: '800' },
  preLine2: { fontSize: 11.5, fontWeight: '600' },

  bottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  statusLeft: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '400',
  },
  bottomRight: { flex: 1, alignItems: 'flex-end' },
  stadiumRight: { fontSize: 12.5, fontWeight: '500' },
  leagueRight: { marginTop: 4, fontSize: 12.5, fontWeight: '400' },

  scorersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    paddingBottom: 12,
    borderTopWidth: 0,
  },
  scorerColLeft: { flex: 1, paddingRight: 6 },
  scorerColRight: { flex: 1, paddingLeft: 6, alignItems: 'flex-end' },
  scorerText: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
});

export default memo(MatchCard);
