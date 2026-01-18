import React, { Component } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from './Header';
import AdFooter from '../ads/AdFooter';
import TeamSearchModal from './TeamSearchModal'; // 👈 modal de búsqueda
import { changeName } from '../utils/changeName';
import { API_CUSTOM_DIGITAL } from '@env';
import { logos } from '../utils/logos';
import { withTheme } from '../utils/ThemeContext';

const { width } = Dimensions.get('window');

// Altura del banner (ajústalo si usas otro formato)
const BANNER_H = 60; // 320x50
// Elevación del AdFooter por encima de la barra/gestos (igual que en Match/Scorers)
const FOOTER_LIFT = Platform.OS === 'android' ? 48 : 10;

const NAVY = '#0b1f3b';

class Teams extends Component {
  constructor(props) {
    super(props);
    this.state = {
      teams: [],
      refreshing: true,
      icons: logos,
      showTeamSearch: false, // 👈 controla el modal de búsqueda
    };
  }

  // ============= Carga de equipos =============

  getTeams() {
    this.setState({ refreshing: true });

    fetch(`${API_CUSTOM_DIGITAL}/positions`)
      .then(response => response.json())
      .then(result => {
        let teams = [];
        if (result?.posiciones?.equipo) {
          for (let i = 0; i < result.posiciones.equipo.length; i++) {
            teams.push(result.posiciones.equipo[i]);
          }
        }

        // Orden alfabético por nombre
        const len = teams.length;
        for (let i = 0; i < len; i++) {
          for (let j = 0; j < len - i - 1; j++) {
            const t1 = teams[j];
            const t2 = teams[j + 1];
            const op1 = (t1?.nombre?.[0] || '') > (t2?.nombre?.[0] || '');
            if (op1) {
              const temp = teams[j];
              teams[j] = teams[j + 1];
              teams[j + 1] = temp;
            }
          }
        }

        this.setState({ teams, refreshing: false });
      })
      .catch(error => {
        alert('Ha ocurrido un error en la conexión.');
        this.setState({ refreshing: false });
      });
  }

  componentDidMount() {
    this.getTeams();
  }

  refresh = () => {
    this.getTeams();
  };

  // ============= Render de cada equipo =============

  renderTeam = ({ item }) => {
    const logoSource = this.state.icons[item.id];
    const teamName = changeName(item?.nombre?.[0] || '');

    const { theme } = this.props;
    const colors = theme?.colors ?? {};

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          this.props.navigation.navigate('TeamScreen', {
            team: item,
            scope: 'guatemala',
          });
        }}
      >
        <View
          style={[
            styles.row,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {/* Logo del equipo */}
          {logoSource && (
            <Image
              source={logoSource}
              style={styles.teamLogo}
              resizeMode="contain"
            />
          )}

          {/* Nombre */}
          <View style={{ flex: 1 }}>
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {teamName}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ============= Render principal =============

  render() {
    const { teams, refreshing, showTeamSearch } = this.state;
    const { navigation, theme } = this.props;
    const colors = theme?.colors ?? {};

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.screenBg }]}
        edges={['bottom']}
      >
        {/* Header con título y lupa FUNCIONAL */}
        <Header
          navigation={navigation}
          title="Equipos"
          showSearch
          onSearchPress={() => this.setState({ showTeamSearch: true })}
        />

        <FlatList
          data={teams}
          keyExtractor={(item, index) => index.toString()}
          renderItem={this.renderTeam}
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

        {/* Modal de búsqueda de equipos */}
        <TeamSearchModal
          visible={showTeamSearch}
          onClose={() => this.setState({ showTeamSearch: false })}
          onSelect={(team) => {
            this.setState({ showTeamSearch: false });
            if (!team) return;
            navigation.navigate('TeamScreen', {
              teamId: team.id,
              scope: team.scope,
            });
          }}
        />

        {/* Ad fijo elevado sobre la zona de gestos */}
        <View
          pointerEvents="box-none"
          style={[styles.footerFixed, { bottom: FOOTER_LIFT }]}
        >
          <AdFooter />
        </View>
      </SafeAreaView>
    );
  }
}

// ============= Estilos =============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },

  scroll: {
    flex: 1,
    width,
  },

  // Tarjeta de equipo (mismo estilo que Goleadores)
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 10,
    borderRadius: 10,
  },

  sep: {
    height: 10,
  },

  teamLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 10,
  },

  name: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },

  sub: {
    fontSize: 12,
    color: '#555',
    marginTop: 2,
  },

  // Footer fijo elevado (mismo patrón que Scorers/Player)
  footerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});

export default withTheme(Teams);
