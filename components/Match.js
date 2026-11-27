
import React, { Component } from 'react';

import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  useWindowDimensions,
  Image,
  ImageBackground,
  Share,
  StatusBar,
  Platform,
} from 'react-native';

import {
  SafeAreaView,
  withSafeAreaInsets,
} from 'react-native-safe-area-context';

import LinearGradient from 'react-native-linear-gradient';

import {
  ArrowLeft,
  Bell,
  BellRinging,
  ShareNetwork,
  FileText,
  UsersThree,
  ChartBar,
  Broadcast,
  MapPin,
} from 'phosphor-react-native';

import AdFooter from '../ads/AdFooter';
import FooterTabs from './FooterTabs';
import DetallesBlock from './DetallesBlock';
import LineupsTeamBlock from './LineupsTeamBlock';
import PositionsBlock from './PositionsBlock';
import LiveMatchBlock from './LiveMatchBlock';

import { showInterstitialIfReady } from '../ads/AdManager';
import { getMatchCenter } from '../services/ligaNacionalApi';

import {
  followMatch,
  unfollowMatch,
  isFollowingMatch,
} from '../services/notifications';

import { withTheme } from '../utils/ThemeContext';

const HERO_BG = require('../resources/home/featured-match-bg.jpg');

const BLUE = '#285FFF';
const WHITE = '#FFFFFF';
const NAVY = '#101936';
const GREEN = '#08C879';

const REG = 'Poppins-Regular';
const SEMI = 'Poppins-SemiBold';
const BOLD = 'Poppins-Bold';

const FOOTER_HEIGHT = 72;

const TABS = [
  { label: 'Detalles', icon: FileText },
  { label: 'Alineaciones', icon: UsersThree },
  { label: 'Posiciones', icon: ChartBar },
  { label: 'En vivo', icon: Broadcast },
];

const LIVE_STATUSES = new Set([
  'first_half',
  'second_half',
  'extra_first',
  'extra_second',
  'penalties',
]);

const BREAK_STATUSES = new Set([
  'halftime',
  'end_90',
  'extra_break',
  'end_extra',
]);

const TERMINAL_STATUSES = new Set([
  'finished',
  'fulltime',
  'cancelled',
  'suspended',
]);

function safeText(value, fallback = '') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return safeText(
      value.label ??
      value.display ??
      value.title ??
      value.name ??
      value.shortName,
      fallback
    );
  }

  return fallback;
}

function normalize(value) {
  return safeText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function initials(name) {
  return safeText(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(item => item.charAt(0).toUpperCase())
    .join('');
}

function statusOf(data) {
  return safeText(data?.match?.status).toLowerCase().trim();
}

function isLive(data) {
  return LIVE_STATUSES.has(statusOf(data));
}

function isBreak(data) {
  return BREAK_STATUSES.has(statusOf(data));
}

function isTerminal(data) {
  return TERMINAL_STATUSES.has(statusOf(data));
}

function statusLabel(data) {
  const match = data?.match || {};

  const explicit = safeText(
    match.statusLabel ??
    match.status_label ??
    match.statusDisplay ??
    match.status_display
  );

  if (explicit) return explicit;

  const labels = {
    scheduled: 'Programado',
    postponed: 'Pospuesto',
    first_half: 'Primer tiempo',
    halftime: 'Medio tiempo',
    second_half: 'Segundo tiempo',
    extra_first: 'Tiempo extra',
    extra_second: 'Tiempo extra',
    penalties: 'Penales',
    finished: 'Finalizado',
    fulltime: 'Finalizado',
    cancelled: 'Cancelado',
    suspended: 'Suspendido',
  };

  return labels[statusOf(data)] || 'Partido';
}

function initialTabIndex(value) {
  const key = normalize(value);

  if (key.includes('alineacion')) return 1;

  if (key.includes('posicion') || key.includes('tabla')) {
    return 2;
  }

  if (
    key.includes('envivo') ||
    key.includes('live') ||
    key.includes('evento')
  ) {
    return 3;
  }

  return 0;
}

function nicknameForTeam(name) {
  const key = normalize(name);

  const nicknames = [
    ['antigua', 'Coloniales'],
    ['aurora', 'Aurinegros'],
    ['coban', 'Príncipes Azules'],
    ['comunicaciones', 'Cremas'],
    ['guastatoya', 'Pecho Amarillo'],
    ['malacateco', 'Toros'],
    ['marquense', 'Leones'],
    ['mixco', 'Chicharroneros'],
    ['municipal', 'Rojos'],
    ['sanpedro', 'Gallos'],
    ['suchitepequez', 'Venados'],
    ['xelaju', 'Super Chivos'],
  ];

  const found = nicknames.find(item => key.includes(item[0]));

  return found ? found[1] : '';
}

function roundLabel(match = {}) {
  const round = match.round ?? match.jornada;
  let result = '';

  if (round && typeof round === 'object') {
    const number =
      round.number ??
      round.round ??
      round.jornada;

    const stage = safeText(
      round.stageLabel ??
      round.stage_label ??
      round.name
    );

    if (number !== null && number !== undefined) {
      result = 'Jornada ' + number;
    }

    if (stage) {
      result += (result ? ' · ' : '') + stage;
    }
  } else {
    const text = safeText(round);

    result = /^\d+$/.test(text)
      ? 'Jornada ' + text
      : text;
  }

  const tournament = safeText(
    match.tournament ??
    match.tournamentName ??
    match.torneo ??
    match.season_name ??
    match.seasonName ??
    match.season?.name
  );

  if (
    tournament &&
    !normalize(result).includes(normalize(tournament))
  ) {
    result += (result ? ' · ' : '') + tournament;
  }

  return result;
}

function findTime(value) {
  const match = safeText(value).match(/(\d{1,2}):(\d{2})/);

  return match
    ? match[1].padStart(2, '0') + ':' + match[2]
    : '';
}

function kickoffInfo(match = {}) {
  const rawDate = safeText(
    match.date ??
    match.matchDate ??
    match.match_date
  );

  const rawKickoff = safeText(
    match.kickoff ??
    match.kickoff_at ??
    match.kickoffAt ??
    match.datetime ??
    match.date_time ??
    match.dateTime
  );

  const time =
    findTime(match.time) ||
    findTime(match.hour) ||
    findTime(match.hora) ||
    findTime(match.kickoff_time) ||
    findTime(match.kickoffTime) ||
    findTime(rawKickoff) ||
    '—';

  const source = rawDate || rawKickoff;
  const parts = source.match(/(\d{4})-(\d{2})-(\d{2})/);

  let day = source || '—';

  if (parts) {
    const year = Number(parts[1]);
    const month = Number(parts[2]);
    const date = Number(parts[3]);

    const today = new Date();

    if (
      year === today.getFullYear() &&
      month === today.getMonth() + 1 &&
      date === today.getDate()
    ) {
      day = 'Hoy';
    } else {
      day = new Date(year, month - 1, date)
        .toLocaleDateString('es-GT', {
          day: '2-digit',
          month: 'short',
        })
        .replace('.', '');
    }
  }

  return { day, time };
}

function stadiumInfo(data) {
  const a = data?.stadium;
  const b = data?.match?.stadium;

  const source = a && typeof a === 'object'
    ? a
    : { name: a };

  const secondary = b && typeof b === 'object'
    ? b
    : { name: b };

  return {
    name: safeText(source.name ?? secondary.name),
    city: safeText(source.city ?? secondary.city),
  };
}

function nullableScore(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function buildPrePayload(pre, matchId) {
  if (!pre) return null;

  const home = pre.home || pre.teams?.home || {};
  const away = pre.away || pre.teams?.away || {};

  return {
    match: {
      id: Number(pre.id ?? pre.matchId ?? matchId ?? 0),
      kickoff: pre.kickoff ?? null,
      date: pre.date ?? null,
      time: pre.time ?? pre.hour ?? pre.hora ?? null,
      stadium: pre.stadium ?? null,
      status: pre.status ?? 'scheduled',
      statusLabel: pre.statusLabel ?? '',
      competition: pre.competition ?? 'Liga Nacional GT',
      round: pre.round ?? pre.jornada ?? '',
      tournament: pre.tournament ?? pre.torneo ?? '',
    },
    teams: {
      home: {
        id: Number(home.id ?? pre.homeTeamId ?? 0),
        name: safeText(home.name ?? pre.homeTeamName),
        logo: home.logo ?? pre.homeLogo ?? null,
      },
      away: {
        id: Number(away.id ?? pre.awayTeamId ?? 0),
        name: safeText(away.name ?? pre.awayTeamName),
        logo: away.logo ?? pre.awayLogo ?? null,
      },
    },
    score: {
      home: nullableScore(home.score ?? pre.homeScore),
      away: nullableScore(away.score ?? pre.awayScore),
    },
    formations: { home: '', away: '' },
    lineupConfirmed: { home: false, away: false },
    lineups: {
      home: { starters: [], substitutes: [] },
      away: { starters: [], substitutes: [] },
    },
    events: [],
  };
}

function TeamLogo({ uri, name, size }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  return (
    <View
      style={[
        styles.logoFallback,
        { width: size, height: size },
      ]}
    >
      <Text style={styles.logoFallbackText}>
        {initials(name) || '?'}
      </Text>
    </View>
  );
}

class Match extends Component {
  constructor(props) {
    super(props);

    const matchId = props?.route?.params?.matchId ?? null;

    const pre = buildPrePayload(
      props?.route?.params?.pre,
      matchId
    );

    const requestedTab = props?.route?.params?.initialTab;

    this.pollTimer = null;
    this.pulseLoop = null;
    this.scrollRef = React.createRef();

    this.state = {
      data: pre,
      activeTab: requestedTab
        ? initialTabIndex(requestedTab)
        : pre && isLive(pre) ? 3 : 0,
      loading: !pre,
      refreshing: false,
      error: null,
      isFollowingMatch: false,
      followLoading: false,
      livePulse: new Animated.Value(1),
    };
  }

  componentDidMount() {
    this.focusSub = this.props.navigation?.addListener?.(
      'focus',
      this.handleFocus
    );

    this.blurSub = this.props.navigation?.addListener?.(
      'blur',
      this.handleBlur
    );

    this.beforeRemoveSub =
      this.props.navigation?.addListener?.(
        'beforeRemove',
        () => showInterstitialIfReady('exit_match')
      );

    this.loadFollowState();
    this.fetchMatchCenter();
  }

  componentWillUnmount() {
    this.stopPolling();
    this.stopPulse();
    this.focusSub?.();
    this.blurSub?.();
    this.beforeRemoveSub?.();
  }

  getMatchId = () => {
    const id = Number(
      this.props?.route?.params?.matchId ??
      this.state.data?.match?.id ??
      0
    );

    return Number.isFinite(id) && id > 0 ? id : null;
  };

  handleFocus = () => {
    this.fetchMatchCenter();
  };

  handleBlur = () => {
    this.stopPolling();
    this.stopPulse();
  };

  fetchMatchCenter = async () => {
    const matchId = this.getMatchId();

    if (!matchId) {
      this.setState({
        loading: false,
        refreshing: false,
        error: 'Partido no encontrado.',
      });
      return;
    }

    try {
      const oldStatus = statusOf(this.state.data);
      const data = await getMatchCenter(matchId);

      if (!data?.match) {
        throw new Error('Respuesta inválida');
      }

      const openedLive =
        !LIVE_STATUSES.has(oldStatus) &&
        LIVE_STATUSES.has(statusOf(data));

      this.setState(
        current => ({
          data,
          loading: false,
          refreshing: false,
          error: null,
          activeTab: openedLive ? 3 : current.activeTab,
        }),
        () => {
          this.syncPolling();
          this.syncPulse();
        }
      );
    } catch (error) {
      console.warn('[Match]', error?.message || error);

      this.setState({
        loading: false,
        refreshing: false,
        error: this.state.data
          ? null
          : 'No se pudo cargar el partido.',
      });
    }
  };

  syncPolling = () => {
    this.stopPolling();

    const data = this.state.data;
    if (!data) return;

    const interval = isLive(data)
      ? 20000
      : isBreak(data)
        ? 30000
        : statusOf(data) === 'scheduled'
          ? 60000
          : 0;

    if (interval) {
      this.pollTimer = setInterval(
        this.fetchMatchCenter,
        interval
      );
    }
  };

  stopPolling = () => {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  };

  syncPulse = () => {
    if (isLive(this.state.data)) {
      this.startPulse();
    } else {
      this.stopPulse();
    }
  };

  startPulse = () => {
    this.stopPulse();

    this.pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(this.state.livePulse, {
          toValue: 1.04,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(this.state.livePulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    this.pulseLoop.start();
  };

  stopPulse = () => {
    this.pulseLoop?.stop?.();
    this.pulseLoop = null;
  };

  handleRefresh = () => {
    this.setState(
      { refreshing: true },
      this.fetchMatchCenter
    );
  };

  loadFollowState = async () => {
    const id = this.getMatchId();
    if (!id) return;

    try {
      const following = await isFollowingMatch(String(id));

      this.setState({
        isFollowingMatch: !!following,
      });
    } catch (_) {}
  };

  toggleFollowMatch = async () => {
    const id = this.getMatchId();

    if (!id || this.state.followLoading) return;

    this.setState({ followLoading: true });

    try {
      if (this.state.isFollowingMatch) {
        await unfollowMatch(String(id));
        this.setState({ isFollowingMatch: false });
      } else {
        await followMatch(String(id));
        this.setState({ isFollowingMatch: true });
      }
    } catch (error) {
      console.warn('[Match follow]', error?.message || error);
    } finally {
      this.setState({ followLoading: false });
    }
  };

  shareMatch = async () => {
    const data = this.state.data;
    if (!data) return;

    const home = safeText(data.teams?.home?.name, 'Local');
    const away = safeText(data.teams?.away?.name, 'Visitante');
    const kickoff = kickoffInfo(data.match);

    try {
      await Share.share({
        message:
          home + ' vs ' + away + '\n' +
          kickoff.day + ' · ' + kickoff.time + '\n' +
          'Liga Nacional GT',
      });
    } catch (_) {}
  };

  openTeam = side => {
    const team = this.state.data?.teams?.[side];
    const teamId = Number(team?.id || 0);

    if (!teamId) return;

    this.props.navigation?.navigate?.('TeamScreen', {
      teamId,
      teamName: safeText(team.name),
      scope: 'guatemala',
    });
  };

  changeTab = index => {
    this.setState({ activeTab: index });

    this.scrollRef.current?.scrollTo?.({
      y: 0,
      animated: false,
    });
  };

  renderHero = (width, topInset) => {
    const data = this.state.data;
    if (!data) return null;

    const match = data.match || {};
    const home = data.teams?.home || {};
    const away = data.teams?.away || {};

    const kickoff = kickoffInfo(match);
    const stadium = stadiumInfo(data);
    const round = roundLabel(match);

    const running = isLive(data) || isBreak(data);
    const finished = isTerminal(data);

    const homeScore = nullableScore(data.score?.home);
    const awayScore = nullableScore(data.score?.away);

    const mainValue = running || finished
      ? String(homeScore ?? 0) + ' - ' + String(awayScore ?? 0)
      : kickoff.time;

    const scale = Math.min(Math.max(width / 390, 0.85), 1.12);

    const logoSize = Math.round(62 * scale);

    // El header ahora solo necesita ~194 dp + barra de estado.
    // No tiene la fila superior del título de la competición.
    const heroHeight = topInset + Math.round(194 * scale);

    const scheduled = statusOf(data) === 'scheduled';

    return (
      <ImageBackground
        source={HERO_BG}
        style={[
          styles.hero,
          {
            height: heroHeight,
            paddingTop: topInset,
          },
        ]}
        resizeMode="cover"
      >
        <LinearGradient
          colors={[
            'rgba(0,31,90,0.05)',
            'rgba(0,26,70,0.20)',
            'rgba(0,19,48,0.67)',
          ]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />

        {/* BOTONES SUPERIORES SIN TÍTULO */}

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.topButton}
            onPress={() => this.props.navigation?.goBack?.()}
          >
            <ArrowLeft
              size={Math.round(22 * scale)}
              color={WHITE}
            />
          </TouchableOpacity>

          <View style={styles.rightActions}>
            <TouchableOpacity
              style={styles.topButton}
              onPress={this.toggleFollowMatch}
              disabled={this.state.followLoading}
            >
              {this.state.isFollowingMatch ? (
                <BellRinging
                  size={Math.round(22 * scale)}
                  color="#FFD335"
                  weight="fill"
                />
              ) : (
                <Bell
                  size={Math.round(22 * scale)}
                  color={WHITE}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.topButton}
              onPress={this.shareMatch}
            >
              <ShareNetwork
                size={Math.round(22 * scale)}
                color={WHITE}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* JORNADA AL CENTRO DEL ESPACIO SUPERIOR */}

        <View style={styles.roundPosition}>
          {!!round && (
            <View style={styles.roundPill}>
              <Text
                style={styles.roundText}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {round}
              </Text>
            </View>
          )}
        </View>

        {/* CONTENIDO CENTRAL */}

        <View style={styles.matchRow}>
          <TouchableOpacity
            style={styles.teamColumn}
            onPress={() => this.openTeam('home')}
          >
            <TeamLogo
              uri={home.logo}
              name={home.name}
              size={logoSize}
            />

            <Text
              style={styles.teamName}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {safeText(home.name, 'Local')}
            </Text>

            <Text
              style={styles.teamNickname}
              numberOfLines={1}
            >
              {nicknameForTeam(home.name)}
            </Text>
          </TouchableOpacity>

          <View style={styles.centerColumn}>
            <Text
              style={styles.dayText}
              numberOfLines={1}
            >
              {kickoff.day}
            </Text>

            <Animated.View
              style={
                running
                  ? {
                      transform: [
                        { scale: this.state.livePulse },
                      ],
                    }
                  : undefined
              }
            >
              <Text
                style={styles.mainScore}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {mainValue}
              </Text>
            </Animated.View>

            <View
              style={[
                styles.statusPill,
                (scheduled || running) && styles.statusGreen,
              ]}
            >
              <Text style={styles.statusText}>
                {statusLabel(data)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.teamColumn}
            onPress={() => this.openTeam('away')}
          >
            <TeamLogo
              uri={away.logo}
              name={away.name}
              size={logoSize}
            />

            <Text
              style={styles.teamName}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {safeText(away.name, 'Visitante')}
            </Text>

            <Text
              style={styles.teamNickname}
              numberOfLines={1}
            >
              {nicknameForTeam(away.name)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ESTADIO EN LA PARTE INFERIOR, SIN RECORTAR */}

        {!!stadium.name && (
          <View style={styles.stadiumHero}>
            <MapPin
              size={19}
              color={WHITE}
              weight="fill"
            />

            <View style={styles.stadiumText}>
              <Text
                style={styles.stadiumName}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {stadium.name}
              </Text>

              {!!stadium.city && (
                <Text
                  style={styles.stadiumCity}
                  numberOfLines={1}
                >
                  {stadium.city}
                </Text>
              )}
            </View>
          </View>
        )}
      </ImageBackground>
    );
  };

  renderTabs = () => (
    <View style={styles.tabsShell}>
      <View style={styles.tabsTrack}>
        {TABS.map((item, index) => {
          const active = this.state.activeTab === index;
          const Icon = item.icon;

          return (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.tabItem,
                active && styles.tabActive,
              ]}
              onPress={() => this.changeTab(index)}
            >
              <Icon
                size={16}
                color={active ? WHITE : '#60719B'}
                weight={active ? 'fill' : 'regular'}
              />

              <Text
                style={[
                  styles.tabText,
                  active && styles.tabTextActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  renderTabContent = () => {
    const data = this.state.data;

    switch (this.state.activeTab) {
      case 0:
        return (
          <DetallesBlock
            data={data}
            navigation={this.props.navigation}
          />
        );

      case 1:
        return (
          <View style={styles.genericContent}>
            <LineupsTeamBlock
              data={data}
              navigation={this.props.navigation}
              matchId={this.getMatchId()}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.genericContent}>
            <PositionsBlock
              data={data}
              navigation={this.props.navigation}
            />
          </View>
        );

      case 3:
        return <LiveMatchBlock data={data} />;

      default:
        return null;
    }
  };

  render() {
    const data = this.state.data;

    const screenWidth = this.props.screenWidth || 390;

    const safeBottom = Math.max(
      this.props?.insets?.bottom || 0,
      0
    );

    const topInset = Math.max(
      this.props?.insets?.top || 0,
      Platform.OS === 'android'
        ? StatusBar.currentHeight || 0
        : 0
    );

    const footerHeight = FOOTER_HEIGHT + safeBottom;

    return (
      <SafeAreaView
        edges={['bottom']}
        style={styles.screen}
      >
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle="light-content"
        />

        {!data ? (
          <View style={styles.loading}>
            <Text style={styles.loadingText}>
              {this.state.error || 'Cargando partido…'}
            </Text>

            {!!this.state.error && (
              <TouchableOpacity
                style={styles.retry}
                onPress={this.fetchMatchCenter}
              >
                <Text style={styles.retryText}>
                  Reintentar
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            <View style={styles.fixedHeader}>
              {this.renderHero(screenWidth, topInset)}
              {this.renderTabs()}
            </View>

            <ScrollView
              ref={this.scrollRef}
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                paddingTop: 2,
                paddingBottom: footerHeight + 18,
              }}
              refreshControl={
                <RefreshControl
                  refreshing={this.state.refreshing}
                  onRefresh={this.handleRefresh}
                  colors={[BLUE]}
                  tintColor={BLUE}
                />
              }
            >
              {this.renderTabContent()}

              <View style={styles.adContent}>
                <AdFooter />
              </View>
            </ScrollView>
          </>
        )}

        <View
          style={[
            styles.footer,
            { height: footerHeight },
          ]}
        >
          <FooterTabs
            navigation={this.props.navigation}
            routeName="Match"
          />
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },

  fixedHeader: {
    zIndex: 10,
    elevation: 7,
    backgroundColor: '#F5F7FB',
  },

  scroll: {
    flex: 1,
  },

  hero: {
    width: '100%',
    overflow: 'hidden',
  },

  topActions: {
    height: 33,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  topButton: {
    width: 35,
    height: 33,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  roundPosition: {
    height: 31,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roundPill: {
    minHeight: 27,
    maxWidth: '78%',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3376FF',
    backgroundColor: 'rgba(0,39,103,0.65)',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  roundText: {
    color: WHITE,
    fontFamily: SEMI,
    fontSize: 10,
  },

  matchRow: {
    height: 103,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
  },

  teamColumn: {
    width: '32%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoFallback: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.40)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoFallbackText: {
    color: WHITE,
    fontFamily: BOLD,
    fontSize: 12,
  },

  teamName: {
    width: '100%',
    marginTop: 1,
    color: WHITE,
    fontFamily: BOLD,
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
  },

  teamNickname: {
    width: '100%',
    color: '#EBEEFF',
    fontFamily: REG,
    fontSize: 8,
    textAlign: 'center',
  },

  centerColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayText: {
    color: WHITE,
    fontFamily: REG,
    fontSize: 10,
  },

  mainScore: {
    color: WHITE,
    fontFamily: BOLD,
    fontSize: 32,
    lineHeight: 39,
    textAlign: 'center',
  },

  statusPill: {
    minHeight: 25,
    paddingHorizontal: 13,
    borderRadius: 15,
    backgroundColor: '#344268',
    justifyContent: 'center',
    alignItems: 'center',
  },

  statusGreen: {
    backgroundColor: GREEN,
  },

  statusText: {
    color: WHITE,
    fontFamily: SEMI,
    fontSize: 9,
  },

  stadiumHero: {
    height: 27,
    marginBottom: 0,
    paddingHorizontal: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },

  stadiumText: {
    maxWidth: '78%',
  },

  stadiumName: {
    color: WHITE,
    fontFamily: BOLD,
    fontSize: 10,
    lineHeight: 14,
  },

  stadiumCity: {
    color: '#EBEEFF',
    fontFamily: REG,
    fontSize: 8,
    lineHeight: 11,
  },

  tabsShell: {
    marginTop: -9,
    marginHorizontal: 7,
    marginBottom: 4,
    backgroundColor: WHITE,
    padding: 5,
    borderRadius: 23,
    elevation: 5,
    shadowColor: '#102348',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },

  tabsTrack: {
    height: 44,
    padding: 3,
    borderRadius: 19,
    backgroundColor: '#F0F3F9',
    flexDirection: 'row',
    alignItems: 'center',
  },

  tabItem: {
    flex: 1,
    minWidth: 0,
    height: 38,
    borderRadius: 16,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },

  tabActive: {
    backgroundColor: BLUE,
  },

  tabText: {
    color: '#60719B',
    fontFamily: SEMI,
    fontSize: 8,
    flexShrink: 1,
  },

  tabTextActive: {
    color: WHITE,
  },

  genericContent: {
    paddingHorizontal: 10,
    paddingTop: 7,
  },

  adContent: {
    minHeight: 52,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#DFE5EE',
    zIndex: 30,
    elevation: 30,
  },

  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  loadingText: {
    color: NAVY,
    fontFamily: SEMI,
    fontSize: 12,
    textAlign: 'center',
  },

  retry: {
    marginTop: 12,
    backgroundColor: BLUE,
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 12,
  },

  retryText: {
    color: WHITE,
    fontFamily: SEMI,
    fontSize: 11,
  },
});

function ResponsiveMatch(props) {
  const { width } = useWindowDimensions();

  return <Match {...props} screenWidth={width} />;
}

export default withSafeAreaInsets(
  withTheme(ResponsiveMatch)
);
