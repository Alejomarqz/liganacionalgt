// components/MatchCard.js
import React, { memo, useRef, useMemo } from 'react';
import { View, Text, Image, Animated, StyleSheet, TouchableOpacity } from 'react-native';
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
  const y = +s.slice(0, 4), m = +s.slice(4, 6) - 1, d = +s.slice(6, 8);
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
  let shift = 0; // -1: día anterior, +1: día siguiente
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
// YYYYMMDD + shift -> YYYYMMDD
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
// separador igual a Home: narrow NBSP + middle dot + narrow NBSP
const SEP = '\u202F\u00B7\u202F';

/* ========= Fallback de reloj sencillo (mm:ss) ========= */
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

  // Etiquetas
  timeLabel,
  dateTimeLabel,

  // Estados
  isPre,
  live,

  // Animations
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

  // Reloj
  statusObj,
  anchors,

  // Goleadores
  scorersHome = [],
  scorersAway = [],

  // Embebido
  embedded = false,
  clockLabel,

  onPressHomeTeam,
  onPressAwayTeam,
}) {
  // 🔹 Tomamos los colores desde el tema
  const { theme } = useTheme();
  const COLORS = theme.colors;

  const cardStyle = embedded
    ? [
        styles.card,
        {
          marginHorizontal: 0,
          borderWidth: 0,
          paddingHorizontal: 0,
          paddingTop: 0,
        },
      ]
    : [styles.card];

  // ===== Datos base: fecha y hora calculadas igual que en Home =====
  const sid = Number(match?.statusId);
  const isPreStatus = isPre || sid === 0;

  const rawTime = String(match?.scheduledStart || '').slice(0, 5); // "HH:mm" si viene "HH:mm:ss"
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

  // Chip superior (solo en NO-PRE): fecha•hora
  let chipLabel =
    dateStr && (timeGT || timeLabel)
      ? `${dateStr}${SEP}${timeGT || timeLabel}`
      : timeLabel || timeGT || '';
  if (dateTimeLabel != null && dateTimeLabel !== '') chipLabel = dateTimeLabel;

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

  return (
    <Animated.View
      style={[
        cardStyle,
        {
          backgroundColor: COLORS.cardBg,
          borderColor: COLORS.cardBorder,
        },
      ]}
    >
      {/* ===== Top bar: EN VIVO + chip de fecha/hora (chip oculto en PRE) ===== */}
      <Animated.View
        style={{
          height: topBarHeight,
          opacity: topBarOpacity,
          overflow: 'hidden',
        }}
      >
        <View style={styles.topRow}>
          <View style={{ width: 90, alignItems: 'flex-start' }}>
            {live ? (
              <Animated.View
                style={[
                  styles.liveChip,
                  {
                    transform: [{ scale: _livePulse }],
                    backgroundColor: COLORS.liveBg,
                    borderColor: COLORS.liveBorder,
                  },
                ]}
              >
                <View
                  style={[
                    styles.liveDot,
                    { backgroundColor: COLORS.liveText },
                  ]}
                />
                <Text style={[styles.liveText, { color: COLORS.liveText }]}>
                  EN VIVO
                </Text>
              </Animated.View>
            ) : null}
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            {!isPreStatus && (
              <Text style={[styles.timeText, { color: COLORS.text }]}>
                {chipLabel}
              </Text>
            )}
          </View>

          <View style={{ width: 90 }} />
        </View>
      </Animated.View>

      {/* ===== Logos + marcador / PRE ===== */}
      <Animated.View
        style={[
          styles.midRow,
          { transform: [{ translateY: contentTranslateY }] },
        ]}
      >
        {/* Local */}
        <ATouchableOpacity
          activeOpacity={0.7}
          onPress={onPressHomeTeam}
          style={[
            styles.teamSide,
            { transform: [{ translateX: logosShiftToCenter }] },
          ]}
          collapsable={false}
        >
          <Animated.View
            style={{
              transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
            }}
          >
            <LogoImg teamId={homeId} size={56} style={{ marginBottom: 4 }} />
          </Animated.View>
          <Animated.Text
            style={[
              styles.teamName,
              { opacity: namesOpacity, color: COLORS.text },
            ]}
            numberOfLines={1}
          >
            {homeName}
          </Animated.Text>
        </ATouchableOpacity>

        {/* Centro */}
        <Animated.View
          style={{
            alignItems: 'center',
            transform: [
              { translateY: scoreTranslateY },
              { scale: scoreScale },
            ],
          }}
        >
          {isPreStatus ? (
            // ===== PRE: dos líneas como en Home =====
            <View style={{ alignItems: 'center' }}>
              <Text
                style={[styles.preDate, { color: COLORS.text }]}
                numberOfLines={1}
              >
                {dateStr || '--/--/----'}
              </Text>
              <Text
                style={[styles.preDowTime, { color: COLORS.text }]}
                numberOfLines={1}
              >
                {dowShort
                  ? `${dowShort}, ${timeGT || timeLabel || '--:--'}`
                  : timeGT || timeLabel || '--:--'}
              </Text>
            </View>
          ) : (
            // ===== NO-PRE: marcador + reloj/status =====
            <>
              <View style={styles.scoreRow}>
                <Text style={[styles.scoreNum, { color: COLORS.text }]}>
                  {match?.scoreStatus?.[homeId]?.score ?? '-'}
                </Text>
                <Text
                  style={[styles.scoreDash, { color: COLORS.textMuted }]}
                >
                  –
                </Text>
                <Text style={[styles.scoreNum, { color: COLORS.text }]}>
                  {match?.scoreStatus?.[awayId]?.score ?? '-'}
                </Text>
              </View>

              {liveNow ? (
                <LiveClock
                  live
                  style={[styles.statusText, { color: '#d32f2f' }]}
                  label={clockLabelFn}
                  statusObj={statusObj}
                  anchors={anchors}
                  color={COLORS.text}
                  mutedColor={COLORS.textMuted}
                />
              ) : (
                <Text
                  style={[styles.statusText, { color: COLORS.textMuted }]}
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
            styles.teamSide,
            { transform: [{ translateX: logosShiftToCenterNeg }] },
          ]}
          collapsable={false}
        >
          <Animated.View
            style={{
              transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
            }}
          >
            <LogoImg teamId={awayId} size={56} style={{ marginBottom: 4 }} />
          </Animated.View>
          <Animated.Text
            style={[
              styles.teamName,
              { opacity: namesOpacity, color: COLORS.text },
            ]}
            numberOfLines={1}
          >
            {awayName}
          </Animated.Text>
        </ATouchableOpacity>
      </Animated.View>

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
    marginHorizontal: 8,
    marginTop: 0,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  liveDot: { width: 8, height: 8, borderRadius: 999, marginRight: 6 },
  liveText: { fontSize: 12, fontWeight: '800' },

  timeText: { fontSize: 12.5, fontWeight: '800' },

  midRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 4,
  },
  teamSide: { flex: 1, alignItems: 'center' },
  teamName: {
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },

  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scoreNum: { fontSize: 28, fontWeight: '900' },
  scoreDash: { fontSize: 20, fontWeight: '800' },
  statusText: { fontSize: 12, fontWeight: '800' },

  preDate: { fontSize: 12, fontWeight: '900' },
  preDowTime: { fontSize: 11, fontWeight: '800' },

  scorersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
    paddingBottom: 5,
    borderTopWidth: 0,
  },
  scorerColLeft: { flex: 1, paddingRight: 6 },
  scorerColRight: { flex: 1, paddingLeft: 6, alignItems: 'flex-end' },
  scorerText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
});

export default memo(MatchCard);
