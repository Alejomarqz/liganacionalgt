// components/Card.js — OneFootball style
import React, { memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import LogoImg from './LogoImg';
import { isLive, statusLabel, SEP } from '../utils/status';
import {
  adjustTimeToGuatemala,
  shiftYmd,
  parseYmd,
  ddmmyyyy,
  weekdayTimeES,
} from '../utils/datetime';
import { useTheme } from '../utils/ThemeContext';
import { BRAND } from '../utils/theme';

const LOGO_SIZE = 28;

/* ─── helpers ─────────────────────────────── */
function centerLines(item) {
  const cand  = (item?.scheduledStart || item?.hora || '').slice(0, 5);
  const valid = /^\d{2}:\d{2}$/.test(cand);
  const { hhmm: timeGT, shift } = valid
    ? adjustTimeToGuatemala(cand, Number(item?.gmt))
    : { hhmm: '', shift: 0 };
  const dateYmdAdj = shift ? shiftYmd(item.date, shift) : item.date;
  const d          = parseYmd(dateYmdAdj);
  return {
    dateStr:    d ? ddmmyyyy(d)              : '',
    timeStr:    timeGT || '',
    weekdayStr: d ? weekdayTimeES(d, timeGT) : '',
  };
}

/* ─── COMPONENT ───────────────────────────── */
const Card = memo(function Card({
  match            = {},
  onPress,
  showTourneyBadge = false,
  tourneyText      = '',
  livePulse,
  colors: _deprecated,
  variant = 'raised',
  style,
}) {
  const { theme } = useTheme();
  const colors    = theme.colors;
  const isDark    = theme.mode === 'dark';

  const statusId = Number(match?.statusId ?? 0);
  const live     = isLive(statusId);
  const finished = [2, 7, 9, 11].includes(statusId);
  const halftime = statusId === 5;
  const upcoming = statusId === 0;

  const homeId = match?.teams?.homeTeamId ?? match?.homeTeamId;
  const awayId = match?.teams?.awayTeamId ?? match?.awayTeamId;
  const homeNm = match?.teams?.homeTeamName ?? match?.homeTeamName ?? '';
  const awayNm = match?.teams?.awayTeamName ?? match?.awayTeamName ?? '';

  const { dateStr, timeStr } = centerLines(match);

  // Marcador
  const hasScore =
    match?.scoreStatus && homeId != null && awayId != null &&
    match.scoreStatus?.[homeId]?.score != null;
  const homeScore = hasScore ? (match.scoreStatus?.[homeId]?.score ?? 0) : null;
  const awayScore = hasScore ? (match.scoreStatus?.[awayId]?.score ?? 0) : null;

  // Color de estado
  const stateColor = live && !halftime
    ? BRAND.red
    : halftime
    ? BRAND.gold
    : finished
    ? colors.textMuted
    : BRAND.primary;

  // Etiqueta de estado
  const stateLabel = live && !halftime
    ? 'En Vivo'
    : halftime
    ? 'Medio Tiempo'
    : finished
    ? 'Finalizado'
    : timeStr || 'Por definir';

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.65 : 1}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderBottomColor: colors.cardBorder,
        },
        live && !halftime && {
          backgroundColor: isDark
            ? 'rgba(232,48,74,0.04)'
            : 'rgba(232,48,74,0.02)',
        },
        style,
      ]}
    >
      {/* Barra lateral EN VIVO */}
      {live && !halftime && (
        <View style={[styles.liveBar, { backgroundColor: BRAND.red }]} />
      )}
      {halftime && (
        <View style={[styles.liveBar, { backgroundColor: BRAND.gold }]} />
      )}

      {/* Torneo badge */}
      {showTourneyBadge && !!tourneyText && (
        <Text style={[styles.tourneyBadge, { color: colors.textMuted }]} numberOfLines={1}>
          {tourneyText}
        </Text>
      )}

      {/* Contenido */}
      <View style={styles.inner}>

        {/* Equipos */}
        <View style={styles.teamsCol}>
          <View style={styles.teamRow}>
            <LogoImg teamId={homeId} style={styles.logo} />
            <Text
              numberOfLines={1}
              style={[
                styles.teamName,
                { color: colors.text },
                finished && homeScore != null && awayScore != null &&
                  homeScore < awayScore && { color: colors.textMuted },
              ]}
            >
              {homeNm}
            </Text>
          </View>

          <View style={[styles.teamRow, { marginTop: 10 }]}>
            <LogoImg teamId={awayId} style={styles.logo} />
            <Text
              numberOfLines={1}
              style={[
                styles.teamName,
                { color: colors.text },
                finished && homeScore != null && awayScore != null &&
                  awayScore < homeScore && { color: colors.textMuted },
              ]}
            >
              {awayNm}
            </Text>
          </View>
        </View>

        {/* Divisor vertical */}
        <View style={[styles.verticalDivider, { backgroundColor: colors.cardBorder }]} />

        {/* Hora / Marcador */}
        <View style={styles.rightCol}>
          {upcoming ? (
            <View style={styles.timeWrap}>
              <Text style={[styles.timeText, { color: colors.text }]}>
                {timeStr || '--:--'}
              </Text>
            </View>
          ) : (
            <View style={styles.scoreWrap}>
              <Text style={[styles.scoreNum, { color: live && !halftime ? BRAND.red : colors.text }]}>
                {homeScore ?? '—'}
              </Text>
              <Text style={[styles.scoreSep, { color: colors.textMuted }]}>—</Text>
              <Text style={[styles.scoreNum, { color: live && !halftime ? BRAND.red : colors.text }]}>
                {awayScore ?? '—'}
              </Text>
            </View>
          )}

          {/* Estado — solo mostrar si NO es upcoming (la hora ya se ve arriba) */}
          {!upcoming && (
            <View style={styles.stateLabelWrap}>
              {live && !halftime && livePulse ? (
                <Animated.View
                  style={[styles.livePill, { transform: [{ scale: livePulse }] }]}
                >
                  <View style={styles.liveDot} />
                  <Text style={styles.livePillText}>EN VIVO</Text>
                </Animated.View>
              ) : (
                <Text style={[styles.stateLabel, { color: stateColor }]}>
                  {stateLabel}
                </Text>
              )}
            </View>
          )}
        </View>

      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    position: 'relative',
  },

  liveBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },

  tourneyBadge: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 7,
    marginLeft: 4,
  },

  inner: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },

  // Equipos
  teamsCol: {
    flex: 1,
    paddingRight: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  teamName: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    flex: 1,
  },

  // Divisor vertical
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 2,
    marginHorizontal: 0,
  },

  // Derecha
  rightCol: {
    alignItems: 'flex-end',
    minWidth: 80,
    gap: 4,
    paddingLeft: 12,
    justifyContent: 'center',
  },

  // Hora
  timeWrap: { alignItems: 'flex-end' },
  timeText: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    letterSpacing: 0,
  },
  dateSub: {
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    marginTop: 1,
  },

  // Marcador
  scoreWrap: { alignItems: 'center' },
  scoreNum: {
    fontFamily: 'Poppins-Bold',
    fontSize: 15,
    lineHeight: 18,
    textAlign: 'center',
    minWidth: 20,
  },
  scoreSep: {
    fontFamily: 'Poppins-Regular',
    fontSize: 11,
    marginVertical: 1,
  },

  // Estado
  stateLabelWrap: { marginTop: 2, alignItems: 'flex-end' },
  stateLabel: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    textAlign: 'right',
  },

  // Píldora EN VIVO
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${BRAND.red}15`,
    borderRadius: 50,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: `${BRAND.red}30`,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: BRAND.red,
  },
  livePillText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 9,
    color: BRAND.red,
    letterSpacing: 0.8,
  },
});

export default Card;