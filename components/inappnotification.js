// components/inappnotification.js
// Banner/Toast animado para notificaciones in-app
// Liga Nacional GT

import React, {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  useCallback,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
} from 'react-native';

import { registerInAppBanner } from '../services/notifications';
import {
  EVENT_ICONS,
  EVENT_COLORS,
  BANNER_DURATION,
} from '../utils/notificationconfig';

import { useTheme } from '../utils/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const InAppNotifContext = createContext({ show: () => {} });

export function useInAppNotification() {
  return useContext(InAppNotifContext);
}

export default function InAppNotificationProvider({ children }) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);

  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const dismissTimer = useRef(null);
  const isShowing = useRef(false);

  const show = useCallback((notif) => {
    if (!notif) return;
    setQueue((prev) => [...prev, notif]);
  }, []);

  useEffect(() => {
    registerInAppBanner(show);
  }, [show]);

  useEffect(() => {
    if (isShowing.current || queue.length === 0) return;

    const next = queue[0];
    setQueue((prev) => prev.slice(1));
    showBanner(next);
  }, [queue]);

  const showBanner = (notif) => {
    isShowing.current = true;
    setCurrent(notif);

    const duration = notif.duration || BANNER_DURATION[notif.priority] || 4000;

    slideAnim.setValue(-120);
    opacityAnim.setValue(0);
    progressAnim.setValue(1);

    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(progressAnim, {
      toValue: 0,
      duration,
      useNativeDriver: false,
    }).start();

    clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(dismissBanner, duration);
  };

  const dismissBanner = () => {
    clearTimeout(dismissTimer.current);

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrent(null);
      isShowing.current = false;
    });
  };

  const handlePress = () => {
    dismissBanner();
  };

  return (
    <InAppNotifContext.Provider value={{ show }}>
      {children}

      {current && (
        <Animated.View
          style={[
            styles.container,
            {
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={handlePress}
            style={styles.touchable}
          >
            <NotificationBanner
              notification={current}
              progressAnim={progressAnim}
              onDismiss={dismissBanner}
              colors={colors}
            />
          </TouchableOpacity>
        </Animated.View>
      )}
    </InAppNotifContext.Provider>
  );
}

function NotificationBanner({ notification, progressAnim, onDismiss, colors }) {
  const {
    type = 'news',
    title = '',
    body = '',
    score,
    minute,
    priority = 'medium',
    teamId,
    homeTeamId,
    awayTeamId,
  } = notification;

  const fallbackIcon = EVENT_ICONS[type] || '📢';
  const accentColor = EVENT_COLORS[type] || '#3498DB';
  const isHigh = priority === 'high';

  const displayBody = body || buildAutoBody(notification);

  const logoId = teamId || homeTeamId || awayTeamId;
  const logoUrl = logoId
    ? `https://futbolchapin.net/edit/logos/${logoId}.webp`
    : null;

  const cardBg = colors.card || colors.surface || colors.appBg || '#FFFFFF';
  const titleColor = colors.text || '#111827';
  const bodyColor = colors.textSecondary || colors.mutedText || '#6B7280';
  const trackColor = colors.border || '#E5E7EB';

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderLeftColor: accentColor }]}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: accentColor + '18' }]}>
          {logoUrl ? (
            <Image
              source={{ uri: logoUrl }}
              style={styles.teamLogo}
              resizeMode="contain"
            />
          ) : (
            <Text style={styles.iconText}>{fallbackIcon}</Text>
          )}
        </View>

        <View style={styles.content}>
          {minute ? (
            <View style={styles.minuteRow}>
              <View style={[styles.minuteBadge, { backgroundColor: accentColor + '20' }]}>
                <Text style={[styles.minuteText, { color: accentColor }]}>
                  {minute}'
                </Text>
              </View>

              {isHigh && (
                <View style={[styles.liveDot, { backgroundColor: accentColor }]} />
              )}
            </View>
          ) : null}

          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title || 'Liga Nacional GT'}
          </Text>

          {score && (
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreText, { color: titleColor }]}>
                {score.home} - {score.away}
              </Text>
            </View>
          )}

          <Text style={[styles.body, { color: bodyColor }]} numberOfLines={2}>
            {displayBody}
          </Text>
        </View>

        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
        >
          <Text style={[styles.closeText, { color: bodyColor }]}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              backgroundColor: accentColor,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

function buildAutoBody(notif) {
  const { type, playerName, minute } = notif;

  switch (type) {
    case 'goal':
      return playerName
        ? `Gol de ${playerName}${minute ? ` al minuto ${minute}` : ''}`
        : 'Gol en el partido';
    case 'red_card':
      return playerName ? `Tarjeta roja para ${playerName}` : 'Tarjeta roja';
    case 'yellow_card':
      return playerName ? `Tarjeta amarilla para ${playerName}` : 'Tarjeta amarilla';
    case 'match_start':
    case 'start':
      return 'El partido ha comenzado';
    case 'match_end':
    case 'end':
      return 'Partido finalizado';
    case 'halftime':
      return 'Medio tiempo';
    case 'lineup':
    case 'lineups':
      return 'Alineación confirmada';
    case 'substitution':
      return playerName ? `Cambio: ${playerName}` : 'Cambio en el partido';
    case 'penalty':
      return 'Penal señalado';
    case 'var_decision':
      return 'Revisión VAR';
    case 'standings':
      return 'Tabla de posiciones actualizada';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 12,
    right: 12,
    width: SCREEN_WIDTH - 24,
    zIndex: 9999,
    elevation: 9999,
  },
  touchable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  card: {
    borderRadius: 16,
    borderLeftWidth: 4,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  teamLogo: {
    width: 34,
    height: 34,
  },
  iconText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  minuteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 6,
  },
  minuteBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  minuteText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
    marginBottom: 2,
  },
  scoreRow: {
    marginBottom: 2,
  },
  scoreText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 22,
    letterSpacing: 2,
  },
  body: {
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
  },
  progressTrack: {
    height: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
});