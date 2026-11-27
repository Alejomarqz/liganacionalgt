// components/Feeds.js
import React, { Component } from 'react';
import {
  Linking, Platform, StyleSheet, Text, View,
  FlatList, TouchableOpacity, ActivityIndicator,
  Animated, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header          from './Header';
import AdFooter        from '../ads/AdFooter';
import FooterTabs      from './FooterTabs';
import TeamSearchModal from './TeamSearchModal';
import { withTheme }   from '../utils/ThemeContext';
import { BRAND }       from '../utils/theme';
import { API_WEB_ROOT_URL } from '@env';
import {
  ArrowRight,
  Newspaper,
  WifiSlash,
  ArrowClockwise,
} from 'phosphor-react-native';

/* ─── Constantes ─────────────────────────────────────────── */
const TAB_H       = 58;
const BANNER_H    = 52;
const FOOTER_LIFT = Platform.OS === 'android' ? 48 : 10;

/* ─── Helpers ────────────────────────────────────────────── */
function formatDate(raw) {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d)) return String(raw).slice(0, 10);
    return d.toLocaleDateString('es-GT', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return String(raw).slice(0, 10);
  }
}

function stripHtml(html = '') {
  return String(html || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

/* ─── NewsCard animada ───────────────────────────────────── */
class NewsCard extends Component {
  anim = new Animated.Value(0);

  componentDidMount() {
    Animated.timing(this.anim, {
      toValue: 1,
      duration: 340,
      delay: Math.min(this.props.index * 55, 440),
      useNativeDriver: true,
    }).start();
  }

  render() {
    const { item, index, colors, isDark, onPress } = this.props;
    const title   = stripHtml(item?.title?.rendered   || item?.title   || '');
    const excerpt = stripHtml(item?.excerpt?.rendered || item?.excerpt || '');
    const date    = formatDate(item?.date || item?.fecha || '');

    const opacity    = this.anim;
    const translateY = this.anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <TouchableOpacity
          activeOpacity={0.72}
          onPress={onPress}
          style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          {/* Barra de acento — azul royal */}
          <View style={[styles.cardAccent, { backgroundColor: BRAND.primary }]} />

          <View style={styles.cardBody}>

            {!!date && (
              <Text style={[styles.cardDate, { color: colors.textMuted }]}>
                {date}
              </Text>
            )}

            <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={3}>
              {title}
            </Text>

            {!!excerpt && (
              <Text style={[styles.cardExcerpt, { color: colors.textMuted }]} numberOfLines={2}>
                {excerpt}
              </Text>
            )}

            <View style={styles.cardFooter}>
              <View style={[
                styles.readMorePill,
                { backgroundColor: isDark ? `${BRAND.primaryLight}18` : `${BRAND.primary}12` },
              ]}>
                <Text style={[styles.readMoreText, { color: isDark ? BRAND.primaryLight : BRAND.primary }]}>
                  Leer más
                </Text>
                <ArrowRight size={12} color={isDark ? BRAND.primaryLight : BRAND.primary} weight="bold" />
              </View>
            </View>

          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  }
}

/* ══════════════════════════════════════════════════════════
   FEEDS
══════════════════════════════════════════════════════════ */
class Feeds extends Component {
  constructor(props) {
    super(props);
    this.state = {
      news: [], refreshing: true, error: false, showTeamSearch: false,
    };
  }

  componentDidMount() { this.fetchNews(); }

  fetchNews = () => {
    this.setState({ refreshing: true, error: false });
    fetch(`${API_WEB_ROOT_URL}/wp-json/wp/v2/posts?tags=87&per_page=20`)
      .then(r => r.json())
      .then(data => this.setState({ news: Array.isArray(data) ? data : [], refreshing: false }))
      .catch(() => this.setState({ refreshing: false, error: true }));
  };

  keyExtractor = (_, i) => String(i);

  renderItem = ({ item, index }) => {
    const { theme, navigation } = this.props;
    return (
      <NewsCard
        item={item}
        index={index}
        colors={theme.colors}
        isDark={theme.mode === 'dark'}
        onPress={() => navigation.navigate('New', { notice: item })}
      />
    );
  };

  renderSeparator = () => <View style={styles.sep} />;

  renderEmpty = () => {
    const { theme } = this.props;
    const colors = theme.colors;
    const isDark = theme.mode === 'dark';
    if (this.state.refreshing) return null;

    if (this.state.error) {
      return (
        <View style={styles.stateWrap}>
          <View style={[styles.stateIconWrap, { backgroundColor: isDark ? '#2A2D3E' : '#F0F2F7' }]}>
            <WifiSlash size={32} color={colors.textMuted} weight="regular" />
          </View>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Sin conexión</Text>
          <Text style={[styles.stateSub, { color: colors.textMuted }]}>
            No se pudo cargar las noticias
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: BRAND.primary }]}
            onPress={this.fetchNews}
            activeOpacity={0.82}
          >
            <ArrowClockwise size={15} color="#fff" weight="bold" />
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.stateWrap}>
        <View style={[styles.stateIconWrap, { backgroundColor: isDark ? '#2A2D3E' : '#F0F2F7' }]}>
          <Newspaper size={32} color={colors.textMuted} weight="regular" />
        </View>
        <Text style={[styles.stateTitle, { color: colors.text }]}>Sin noticias</Text>
        <Text style={[styles.stateSub, { color: colors.textMuted }]}>
          No hay noticias disponibles por el momento
        </Text>
      </View>
    );
  };

  render() {
    const { navigation, theme } = this.props;
    const colors  = theme?.colors ?? {};
    const isDark  = theme?.mode === 'dark';
    const { news, refreshing, showTeamSearch } = this.state;
    const loading     = refreshing && news.length === 0;
    const safeBottom  = TAB_H + BANNER_H + FOOTER_LIFT;

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.screenBg }]}
        edges={['bottom']}
      >
        <Header
          navigation={navigation}
          title="Noticias"
          showSearch
          onSearchPress={() => this.setState({ showTeamSearch: true })}
        />

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={BRAND.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>
              Cargando noticias…
            </Text>
          </View>
        ) : (
          <FlatList
            data={news}
            keyExtractor={this.keyExtractor}
            renderItem={this.renderItem}
            ItemSeparatorComponent={this.renderSeparator}
            ListEmptyComponent={this.renderEmpty}
            contentContainerStyle={[styles.listContent, { paddingBottom: safeBottom + 16 }]}
            scrollIndicatorInsets={{ bottom: safeBottom }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this.fetchNews}
                colors={[BRAND.primary]}
                tintColor={BRAND.primary}
                progressBackgroundColor={colors.cardBg}
              />
            }
            showsVerticalScrollIndicator={false}
            ListFooterComponent={
              news.length > 0 ? (
                <TouchableOpacity
                  style={[styles.seeMoreBtn, { borderColor: colors.cardBorder }]}
                  activeOpacity={0.75}
                  onPress={() => Linking.openURL(`${API_WEB_ROOT_URL}/tag/noticias/`)}
                >
                  <Text style={[styles.seeMoreText, { color: isDark ? BRAND.primaryLight : BRAND.primary }]}>
                    Ver más noticias en la web
                  </Text>
                  <ArrowRight size={14} color={isDark ? BRAND.primaryLight : BRAND.primary} weight="bold" />
                </TouchableOpacity>
              ) : null
            }
          />
        )}

        <TeamSearchModal
          visible={showTeamSearch}
          onClose={() => this.setState({ showTeamSearch: false })}
          onSelect={team => {
            this.setState({ showTeamSearch: false });
            if (!team) return;
            navigation.navigate('TeamScreen', { teamId: team.id, scope: team.scope });
          }}
        />

        {/* Footer fijo — Banner + FooterTabs */}
        <View style={styles.footerFixed}>
          <AdFooter />
          <FooterTabs navigation={navigation} routeName="Feeds" />
        </View>

      </SafeAreaView>
    );
  }
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container:   { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: 'Poppins-Regular', fontSize: 13 },

  listContent: { paddingHorizontal: 12, paddingTop: 10 },
  sep:         { height: 10 },

  /* Card */
  card:        { borderRadius: 14, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  cardAccent:  { width: 4 },
  cardBody:    { flex: 1, padding: 13 },
  cardDate: {
    fontFamily: 'Poppins-Regular', fontSize: 10,
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.6,
  },
  cardTitle:   { fontFamily: 'Poppins-SemiBold', fontSize: 15, lineHeight: 22, marginBottom: 6 },
  cardExcerpt: { fontFamily: 'Poppins-Regular',  fontSize: 12, lineHeight: 18, marginBottom: 10 },
  cardFooter:  { alignItems: 'flex-start' },

  readMorePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  readMoreText: { fontFamily: 'Poppins-SemiBold', fontSize: 11 },

  /* Ver más */
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginHorizontal: 12, marginTop: 4, marginBottom: 16,
    borderWidth: 1, borderRadius: 14, paddingVertical: 14,
  },
  seeMoreText: { fontFamily: 'Poppins-SemiBold', fontSize: 13 },

  /* Empty / error */
  stateWrap:     { alignItems: 'center', paddingVertical: 56, gap: 10 },
  stateIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 4,
  },
  stateTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 15 },
  stateSub:   {
    fontFamily: 'Poppins-Regular', fontSize: 13,
    textAlign: 'center', lineHeight: 20, paddingHorizontal: 32,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 8, paddingHorizontal: 24, paddingVertical: 11, borderRadius: 50,
  },
  retryText: { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#fff' },

  /* Footer fijo */
  footerFixed: { position: 'absolute', left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
});

export default withTheme(Feeds);