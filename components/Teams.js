// components/Teams.js
import React, { Component } from 'react';
import {
  Platform, StyleSheet, Text, View,
  FlatList, TouchableOpacity, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView }  from 'react-native-safe-area-context';
import { withTheme }     from '../utils/ThemeContext';
import Header            from './Header';
import AdFooter          from '../ads/AdFooter';
import FooterTabs        from './FooterTabs';
import TeamSearchModal   from './TeamSearchModal';
import LogoImg           from './LogoImg';
import { changeName }    from '../utils/changeName';
import { API_CUSTOM_DIGITAL } from '@env';

/* ─── Layout ─────────────────────────────────────────────── */
const BANNER_H   = 60;
const TAB_H      = 58;
const FOOTER_LIFT = Platform.OS === 'android' ? 48 : 10;
// Espacio total abajo: banner + tabs + safe area buffer
const PAD_BOTTOM = BANNER_H + TAB_H + FOOTER_LIFT + 16;

/* ─── TeamRow animada ────────────────────────────────────── */
class TeamRow extends Component {
  anim = new Animated.Value(0);

  componentDidMount() {
    Animated.timing(this.anim, {
      toValue: 1,
      duration: 280,
      delay: Math.min(this.props.index * 40, 400),
      useNativeDriver: true,
    }).start();
  }

  render() {
    const { item, colors, onPress } = this.props;
    const teamName = changeName(item?.nombre?.[0] || item?.name || '');
    const teamId   = String(item?.id || item?.teamId || '');

    const opacity    = this.anim;
    const translateY = this.anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

    return (
      <Animated.View style={{ opacity, transform: [{ translateY }] }}>
        <TouchableOpacity
          activeOpacity={0.72}
          onPress={onPress}
          style={[styles.row, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}
        >
          {/* Logo */}
          <LogoImg teamId={teamId} size={40} style={styles.logo} />

          {/* Nombre */}
          <View style={styles.nameWrap}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {teamName}
            </Text>
          </View>

          {/* Chevron */}
          <Text style={[styles.chev, { color: colors.textMuted }]}>›</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }
}

/* ══════════════════════════════════════════════════════════
   TEAMS
══════════════════════════════════════════════════════════ */
class Teams extends Component {
  constructor(props) {
    super(props);
    this.state = {
      teams:          [],
      refreshing:     true,
      error:          false,
      showTeamSearch: false,
    };
  }

  componentDidMount() {
    this.fetchTeams();
  }

  fetchTeams = () => {
    this.setState({ refreshing: true, error: false });
    fetch(`${API_CUSTOM_DIGITAL}/positions`)
      .then(r => r.json())
      .then(result => {
        let teams = result?.posiciones?.equipo ?? [];
        // Orden alfabético con sort nativo (más eficiente que bubble sort)
        teams = [...teams].sort((a, b) => {
          const na = (a?.nombre?.[0] || a?.name || '').toLowerCase();
          const nb = (b?.nombre?.[0] || b?.name || '').toLowerCase();
          return na.localeCompare(nb, 'es');
        });
        this.setState({ teams, refreshing: false });
      })
      .catch(() => {
        this.setState({ refreshing: false, error: true });
      });
  };

  renderItem = ({ item, index }) => {
    const { navigation, theme } = this.props;
    const colors = theme?.colors ?? {};
    return (
      <TeamRow
        item={item}
        index={index}
        colors={colors}
        onPress={() => navigation.navigate('TeamScreen', {
          team: item,
          scope: 'guatemala',
        })}
      />
    );
  };

  renderEmpty = () => {
    const { theme } = this.props;
    const colors = theme?.colors ?? {};
    if (this.state.refreshing) return null;
    if (this.state.error) {
      return (
        <View style={styles.stateWrap}>
          <Text style={styles.stateEmoji}>📡</Text>
          <Text style={[styles.stateTitle, { color: colors.text }]}>Sin conexión</Text>
          <Text style={[styles.stateSub, { color: colors.textMuted }]}>
            No se pudieron cargar los equipos
          </Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: '#d32f2f' }]}
            onPress={this.fetchTeams}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.stateWrap}>
        <Text style={styles.stateEmoji}>🏟️</Text>
        <Text style={[styles.stateTitle, { color: colors.text }]}>Sin equipos</Text>
      </View>
    );
  };

  render() {
    const { teams, refreshing, showTeamSearch } = this.state;
    const { navigation, theme } = this.props;
    const colors = theme?.colors ?? {};

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.screenBg }]}
        edges={['bottom']}
      >
        <Header
          navigation={navigation}
          title="Equipos"
          showSearch
          onSearchPress={() => this.setState({ showTeamSearch: true })}
        />

        <FlatList
          data={teams}
          keyExtractor={(item, i) => String(item?.id ?? i)}
          renderItem={this.renderItem}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={this.renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { backgroundColor: colors.screenBg, paddingBottom: PAD_BOTTOM },
          ]}
          scrollIndicatorInsets={{ bottom: BANNER_H + TAB_H }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={this.fetchTeams}
              colors={['#d32f2f']}
              tintColor="#d32f2f"
              progressBackgroundColor={colors.cardBg}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        <TeamSearchModal
          visible={showTeamSearch}
          onClose={() => this.setState({ showTeamSearch: false })}
          onSelect={team => {
            this.setState({ showTeamSearch: false });
            if (!team) return;
            navigation.navigate('TeamScreen', { teamId: team.id, scope: team.scope });
          }}
        />

        {/* Anuncio fijo */}
        <View pointerEvents="box-none" style={[styles.footerFixed, { bottom: FOOTER_LIFT }]}>
          <AdFooter />
        </View>

        {/* Footer tabs */}
        <FooterTabs navigation={navigation} routeName="Teams" />
      </SafeAreaView>
    );
  }
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container:   { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingTop: 10 },
  sep:         { height: 8 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 12,
  },
  logo:     { borderRadius: 8 },
  nameWrap: { flex: 1 },
  name:     { fontFamily: 'Poppins-SemiBold', fontSize: 14 },
  chev:     { fontFamily: 'Poppins-Regular', fontSize: 22, lineHeight: 26 },

  /* Estados */
  stateWrap:  { alignItems: 'center', paddingVertical: 48, gap: 8 },
  stateEmoji: { fontSize: 32, marginBottom: 4 },
  stateTitle: { fontFamily: 'Poppins-SemiBold', fontSize: 15 },
  stateSub:   { fontFamily: 'Poppins-Regular',  fontSize: 13, textAlign: 'center' },
  retryBtn:   { marginTop: 8, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 50 },
  retryText:  { fontFamily: 'Poppins-SemiBold', fontSize: 13, color: '#fff' },

  footerFixed: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});

export default withTheme(Teams);