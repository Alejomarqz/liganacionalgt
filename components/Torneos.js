// components/Torneos.js
import React, { Component } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  Dimensions,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from './Header';
import AdFooter from '../ads/AdFooter';
import { withTheme } from '../utils/ThemeContext';

const { width } = Dimensions.get('window');

// Altura del banner (igual patrón que Teams)
const BANNER_H = 60;
const FOOTER_LIFT = Platform.OS === 'android' ? 48 : 10;

class Torneos extends Component {
  constructor(props) {
    super(props);
    this.state = {
      refreshing: false,
      tournaments: [
        {
          id: 'liga-nacional',
          title: 'Liga Nacional',
          enabled: true,
          routeName: 'Calendar',
          params: { scope: 'guatemala' },
        },
        {
          id: 'eliminatorias',
          title: 'Eliminatorias',
          enabled: true,
          routeName: 'CalendarConcacaf',
          params: { scope: 'concacaf' },
        },
        {
          id: 'amistosos',
          title: 'Partidos amistosos',
          enabled: false,
          routeName: null,
          params: null,
        },
        {
          id: 'nations-league',
          title: 'Liga de Naciones de Concacaf',
          enabled: false,
          routeName: null,
          params: null,
        },
      ],
    };
  }

  refresh = () => {
    this.setState({ refreshing: true }, () => {
      setTimeout(() => this.setState({ refreshing: false }), 350);
    });
  };

  goToTournament = (t) => {
    const { navigation } = this.props;

    if (!t?.enabled || !t?.routeName) {
      Alert.alert('Próximamente', 'Este calendario aún no está disponible.');
      return;
    }

    navigation.navigate(t.routeName, t.params || {});
  };

  renderTournament = ({ item }) => {
    const { theme } = this.props;
    const colors = theme?.colors ?? {};
    const disabled = !item?.enabled;

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => this.goToTournament(item)}
        disabled={disabled}
      >
        <View
          style={[
            styles.row,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
              opacity: disabled ? 0.55 : 1,
            },
          ]}
        >
          {/* SOLO título */}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {item.title}
            </Text>
          </View>

          {/* Chip derecha */}
          <View
            style={[
              styles.chip,
              {
                backgroundColor: disabled ? 'transparent' : (colors.screenBg ?? '#f3f4f6'),
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                { color: disabled ? (colors.textMuted ?? '#64748b') : (colors.text ?? '#0b1f3b') },
              ]}
            >
              {disabled ? 'Próx.' : 'Ver'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  render() {
    const { tournaments, refreshing } = this.state;
    const { navigation, theme } = this.props;
    const colors = theme?.colors ?? {};

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.screenBg }]}
        edges={['bottom']}
      >
        <Header navigation={navigation} title="Torneos" />

        <FlatList
          data={tournaments}
          keyExtractor={(it) => it.id}
          renderItem={this.renderTournament}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          style={styles.scroll}
          contentContainerStyle={{
            paddingHorizontal: 10,
            paddingTop: 8,
            paddingBottom: BANNER_H + 20,
            backgroundColor: colors.screenBg,
          }}
          scrollIndicatorInsets={{ bottom: BANNER_H }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={this.refresh}
              colors={['#e53935']}
              tintColor="#e53935"
              progressBackgroundColor={colors.cardBg}
            />
          }
          showsVerticalScrollIndicator={false}
        />

        {/* Ad fijo elevado sobre la zona de gestos */}
        <View pointerEvents="box-none" style={[styles.footerFixed, { bottom: FOOTER_LIFT }]}>
          <AdFooter />
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
  scroll: {
    flex: 1,
    width,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
  },
  sep: { height: 10 },

  title: {
    fontSize: 14,
    fontWeight: '800',
  },

  chip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginLeft: 10,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '900',
    includeFontPadding: false,
  },

  footerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

export default withTheme(Torneos);
