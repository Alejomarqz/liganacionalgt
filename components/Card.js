// components/Card.js
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
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

const S = { logo: 32, sideW: 104 }; // 👈 menos ancho para jalar al centro

function centerLines(item) {
  const statusId = Number(item?.statusId ?? 0);
  const cand = (item?.scheduledStart || item?.hora || '').slice(0, 5);
  const valid = /^\d{2}:\d{2}$/.test(cand);

  const { hhmm: timeGT, shift } = valid
    ? adjustTimeToGuatemala(cand, Number(item?.gmt))
    : { hhmm: 'Por definir', shift: 0 };

  const dateYmdAdj = shift ? shiftYmd(item.date, shift) : item.date;
  const d = parseYmd(dateYmdAdj);

  return {
    d,
    dateStr: d ? ddmmyyyy(d) : '',
    timeGT,
    l1: d ? ddmmyyyy(d) : '',
    l2: d ? weekdayTimeES(d, timeGT) : '',
    smallTop:
      statusId !== 0 && d && timeGT ? `${ddmmyyyy(d)}${SEP}${timeGT}` : '',
  };
}

const Card = memo(function Card({
  match = {},
  onPress,
  showTourneyBadge = false,
  tourneyText = '',
  livePulse,
  colors: _deprecatedColors,
  variant = 'raised',
  style,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const statusId = Number(match?.statusId ?? 0);
  const live = isLive(statusId);

  const homeId = match?.teams?.homeTeamId ?? match?.homeTeamId;
  const awayId = match?.teams?.awayTeamId ?? match?.awayTeamId;

  const homeNm = match?.teams?.homeTeamName ?? match?.homeTeamName ?? '';
  const awayNm = match?.teams?.awayTeamName ?? match?.awayTeamName ?? '';

  const { dateStr, timeGT, l1, l2 } = centerLines(match);

  const scoreText =
    match?.scoreStatus && homeId != null && awayId != null
      ? `${match.scoreStatus?.[homeId]?.score ?? 0} - ${
          match.scoreStatus?.[awayId]?.score ?? 0
        }`
      : '—';

  const stadiumName =
    match?.stadiumName ||
    match?.stadium ||
    match?.stadium?.name ||
    match?.venue ||
    match?.venueName ||
    '';

  const leagueName =
    (showTourneyBadge && tourneyText) ||
    match?.competitionName ||
    match?.tournamentName ||
    match?.leagueName ||
    match?.competition?.name ||
    match?.tournament ||
    'Liga nacional de Guatemala';

  const cardBg = colors.cardBg ?? '#FFFFFF';
  const cardBorder = colors.cardBorder ?? 'rgba(0,0,0,0.10)';
  const textMain = colors.text ?? '#111111';
  const textMuted = colors.textMuted ?? 'rgba(0,0,0,0.55)';

  const leftHeader = dateStr || l1 || '--/--/----';
  const rightHeader = timeGT || (l2?.split(', ')?.[1] || '') || '--:--';

  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress}>
      <View
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: cardBorder },
          variant === 'flat' && styles.cardFlat,
          style,
        ]}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.headerText, { color: textMuted }]} numberOfLines={1}>
            {leftHeader}
          </Text>
          <Text style={[styles.headerText, { color: textMuted }]} numberOfLines={1}>
            {rightHeader}
          </Text>
        </View>

        {/* Middle */}
        <View style={styles.middleRow}>
          {/* Local */}
          <View style={styles.teamLeft}>
            <LogoImg teamId={homeId} style={{ width: S.logo, height: S.logo, marginRight: 8 }} />
            <Text numberOfLines={1} style={[styles.teamName, { color: textMain }]}>
              {homeNm}
            </Text>
          </View>

          {/* Centro */}
          <View style={styles.centerCol}>
            {statusId === 0 ? (
              <>
                <Text style={[styles.preLine1, { color: textMain }]} numberOfLines={1}>
                  {l1 || leftHeader}
                </Text>
                <Text style={[styles.preLine2, { color: textMuted }]} numberOfLines={1}>
                  {l2 || rightHeader}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.centerScore, { color: textMain }]} numberOfLines={1}>
                  {scoreText}
                </Text>

                {/* EN VIVO debajo del marcador */}
                {live && livePulse ? (
                  <Animated.Text
                    style={[
                      styles.liveUnderScore,
                      { color: colors.accent ?? '#d32f2f', transform: [{ scale: livePulse }] },
                    ]}
                    numberOfLines={1}
                  >
                    EN VIVO
                  </Animated.Text>
                ) : null}
              </>
            )}
          </View>

          {/* Visita */}
          <View style={styles.teamRight}>
            <Text numberOfLines={1} style={[styles.teamName, { color: textMain, textAlign: 'right' }]}>
              {awayNm}
            </Text>
            <LogoImg teamId={awayId} style={{ width: S.logo, height: S.logo, marginLeft: 8 }} />
          </View>
        </View>

        {/* Bottom */}
        <View style={styles.bottomRow}>
          <Text style={[styles.statusLeft, { color: textMain }]} numberOfLines={1}>
            {statusLabel(statusId)}
          </Text>

          <View style={styles.bottomRight}>
            {!!stadiumName && (
              <Text style={[styles.stadiumRight, { color: textMuted }]} numberOfLines={1}>
                {stadiumName}
              </Text>
            )}
            <Text style={[styles.leagueRight, { color: textMuted }]} numberOfLines={1}>
              {leagueName}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: 10,
    marginHorizontal: 30,
    paddingHorizontal: 60,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderRadius: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 3 },
      },
      android: { elevation: 0.01 },
      default: {},
    }),
  },
  cardFlat: {
    marginTop: 0,
    marginHorizontal: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12.5,
    fontWeight: '600',
  },

  middleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  teamLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: S.sideW, // 👈 ya más pequeño para centrar
  },
  teamRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: S.sideW,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '700',
    maxWidth: '100%',
  },

  centerCol: {
    width: 150, // 👈 un poco más ancho para atraer el contenido al centro
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerScore: {
    fontSize: 22,
    fontWeight: '900',
  },
  liveUnderScore: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '800',
  },

  preLine1: { fontSize: 12, fontWeight: '800' },
  preLine2: { fontSize: 11.5, fontWeight: '700' },

  bottomRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },

  // 👇 MENOS GRUESO
  statusLeft: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '400', // antes 500
  },

  bottomRight: {
    flex: 1,
    alignItems: 'flex-end',
  },

  stadiumRight: {
    fontSize: 12.5,
    fontWeight: '500', // antes 600
  },

  // 👇 MENOS GRUESO
  leagueRight: {
    marginTop: 4,
    fontSize: 12.5,
    fontWeight: '400', // antes 600
  },
});

export default Card;
