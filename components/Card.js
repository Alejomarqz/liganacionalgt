// components/Card.js
import React, { memo } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import LogoImg from './LogoImg';
import { isLive, statusLabel, SEP } from '../utils/status'; // usa tu status.js
import {
  adjustTimeToGuatemala,
  shiftYmd,
  parseYmd,
  ddmmyyyy,
  weekdayTimeES,
} from '../utils/datetime';
import { useTheme } from '../utils/ThemeContext'; // 👈 NUEVO

const S = { logo: 34, sideW: 80, smallFS: 11 };

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
  livePulse, // Animated.Value opcional
  // colors prop queda por compat, pero ahora usamos el tema
  colors: _deprecatedColors,
  variant = 'raised', // 'raised' | 'flat'
  style, // overrides puntuales
}) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const statusId = Number(match?.statusId ?? 0);
  const live = isLive(statusId);
  const homeId = match?.teams?.homeTeamId ?? match?.homeTeamId;
  const awayId = match?.teams?.awayTeamId ?? match?.awayTeamId;
  const homeNm = match?.teams?.homeTeamName ?? match?.homeTeamName ?? '';
  const awayNm = match?.teams?.awayTeamName ?? match?.awayTeamName ?? '';
  const { l1, l2, smallTop } = centerLines(match);

  const scoreText =
    match?.scoreStatus && homeId != null && awayId != null
      ? `${match.scoreStatus?.[homeId]?.score ?? 0} - ${
          match.scoreStatus?.[awayId]?.score ?? 0
        }`
      : '—';

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
          },
          variant === 'flat' && styles.cardFlat,
          style,
        ]}
      >
        <View style={styles.topRow}>
          <View style={{ width: S.sideW, alignItems: 'flex-start' }}>
            {live && livePulse ? (
              <Animated.Text
                style={[
                  styles.liveBadge,
                  { color: colors.accent, transform: [{ scale: livePulse }] },
                ]}
              >
                EN VIVO
              </Animated.Text>
            ) : null}
          </View>

          <View style={{ flex: 1, alignItems: 'center' }}>
            {!!smallTop && (
              <Text
                style={[styles.smallDate, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {smallTop}
              </Text>
            )}
          </View>

          <View style={{ width: S.sideW, alignItems: 'flex-end' }}>
            {showTourneyBadge && !!tourneyText && (
              <Text
                style={[styles.tourneyText, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                {tourneyText}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.middleRow}>
          <View style={styles.teamCol}>
            <LogoImg
              teamId={homeId}
              style={{ width: S.logo, height: S.logo, marginBottom: 4 }}
            />
            <Text
              numberOfLines={1}
              style={[styles.teamName, { color: colors.text }]}
            >
              {homeNm}
            </Text>
          </View>

          <View style={styles.centerCol}>
            {statusId === 0 ? (
              <>
                <Text
                  style={[styles.dateL1, { color: colors.text }]}
                >
                  {l1}
                </Text>
                <Text
                  style={[styles.dateL2, { color: colors.textMuted }]}
                >
                  {l2}
                </Text>
              </>
            ) : (
              <Text
                style={[styles.centerScore, { color: colors.text }]}
              >
                {scoreText}
              </Text>
            )}
          </View>

          <View style={styles.teamCol}>
            <LogoImg
              teamId={awayId}
              style={{ width: S.logo, height: S.logo, marginBottom: 4 }}
            />
            <Text
              numberOfLines={1}
              style={[styles.teamName, { color: colors.text }]}
            >
              {awayNm}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.statusUnder,
            { color: colors.textMuted },
          ]}
        >
          {statusLabel(statusId)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff', // se sobreescribe con theme
    borderWidth: 1,
    borderColor: '#e5e7eb', // se sobreescribe con theme
    elevation: 1,
  },
  cardFlat: {
    marginTop: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    elevation: 0,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  liveBadge: {
    fontSize: 11,
    fontWeight: '800',
    color: '#dc2626', // se sobreescribe con theme.accent
  },
  smallDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155', // se sobreescribe con theme
    includeFontPadding: false,
    lineHeight: 15,
  },
  tourneyText: {
    fontSize: 11,
    color: '#6b7280', // se sobreescribe
    fontWeight: '700',
  },
  middleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  teamCol: { flex: 1, alignItems: 'center' },
  teamName: {
    maxWidth: '100%',
    fontSize: 12,
    color: '#0f172a', // se sobreescribe
    fontWeight: '700',
    textAlign: 'center',
  },
  centerCol: {
    marginRight: 10,
    marginTop: 10,
    width: 100,
    alignItems: 'center',
  },
  dateL1: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a', // se sobreescribe
  },
  dateL2: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155', // se sobreescribe
  },
  centerScore: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a', // se sobreescribe
  },
  statusUnder: {
    textAlign: 'center',
    marginTop: 4,
    fontSize: 12,
    color: '#6b7280', // se sobreescribe
    fontWeight: '600',
  },
});

export default Card;
