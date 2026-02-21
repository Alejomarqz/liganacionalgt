// Scorers.js — Goleadores del torneo (Top 10, con ranking, Avatar y PlayerScreen, footer elevado)
import React, { Component } from 'react';
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from './Header';
import AdFooter from '../ads/AdFooter';
import TeamSearchModal from './TeamSearchModal';
import { API_CUSTOM_DIGITAL, API_WEB_DEPORT_URL } from '@env';
import { logos } from '../utils/logos';
import Avatar from './Avatar';
import { withTheme } from '../utils/ThemeContext';


global.Buffer = global.Buffer || require('buffer').Buffer;

const { width } = Dimensions.get('window');
const RED  = '#d32f2f';
const NAVY = '#0b1f3b';

// Altura del banner y lift sobre la barra de gestos (igual patrón que PlayerScreen)
const BANNER_H    = 60; // 320x50
const FOOTER_LIFT = Platform.OS === 'android' ? 48 : 10;

class Scorers extends Component {
  constructor(props) {
    super(props);
    this.state = {
      teams: [],
      scorers: [],
      refreshing: true,
      icons: logos,
      showTeamSearch: false, // 👈 para la lupita
    };
  }

  // ==================== Carga de datos ====================

  getTeams() {
    return new Promise((resolve, reject) => {
      fetch(`${API_CUSTOM_DIGITAL}/positions`)
        .then(response => response.json())
        .then(result => {
          const teams = result?.posiciones?.equipo || [];
          resolve({ teams, refreshing: false });
        })
        .catch(error => {
          reject('Error en la conexión: ' + error);
        });
    });
  }

  getTeam(id) {
    return new Promise((resolve, reject) => {
      fetch(`${API_WEB_DEPORT_URL}/guatemala/statsCenter/teams/${id}.json`)
        .then(response => response.json())
        .then(response => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  getScorers() {
    this.setState({ refreshing: true });

    fetch(`${API_CUSTOM_DIGITAL}/players`)
      .then(response => response.json())
      .then(result => {
        const list = result?.goleadores?.persona || [];
        this.setState({
          scorers: list,
          refreshing: false,
        });
      })
      .catch(error => {
        alert('Ha ocurrido un error en la conexión.' + error);
        this.setState({ refreshing: false });
      });
  }

  componentDidMount() {
    // Goleadores
    this.getScorers();

    // Equipos + plantilla para sacar nombre y foto del jugador
    this.getTeams()
      .then(data => {
        let teams = data.teams;
        let promises = [];

        for (let i = 0; i < teams.length; i++) {
          promises.push(this.getTeam(teams[i].id));
        }

        Promise.all(promises)
          .then(values => {
            for (let i = 0; i < teams.length; i++) {
              teams[i].players = values[i].players;
              teams[i].name = values[i].info?.name;
            }
            this.setState({ teams, refreshing: false });
          })
          .catch(err => {
            alert('Ha ocurrido un error en la conexión.');
            this.setState({ refreshing: false });
          });
      })
      .catch(err => {
        alert('Ha ocurrido un error en la conexión.');
        this.setState({ refreshing: false });
      });
  }

  refresh = () => {
    this.getScorers();
  };

  // ==================== Helpers ====================

  getPlayerData(item) {
    // id jugador (API_CUSTOM_DIGITAL)
    const playerId = parseInt(item.id?.[0], 10);
    const teamIdFromItem = item.equipo?.[0]?.id?.[0] ?? item.equipo?.[0]?.id;

    for (let i = 0; i < this.state.teams.length; i++) {
      const t = this.state.teams[i];
      const tid = t?.id?.[0] ?? t?.id;

      if (teamIdFromItem === tid && t?.players) {
        const playerWrap = t.players[playerId];
        if (playerWrap && playerWrap.info && playerWrap.info.name) {
          const first =
            (playerWrap.info.name.first || '').split(' ')[0] || '';
          const last =
            (playerWrap.info.name.last || '').split(' ')[0] || '';
          const nombre = `${first} ${last}`.trim();

          // Nombre equipo
          let teamName = t.name;
          if (Array.isArray(teamName)) teamName = teamName[0];
          if (teamName && typeof teamName === 'object') {
            teamName =
              teamName.short ||
              teamName.official ||
              teamName.common ||
              '';
          }

          return {
            nombre,
            teamName: teamName || '',
            playerData: playerWrap,
            teamId: teamIdFromItem,
          };
        }
      }
    }

    return {
      nombre: '',
      teamName: '',
      playerData: null,
      teamId: teamIdFromItem,
    };
  }

  // ==================== Render de cada tarjeta ====================

  renderPlayer = ({ item, index }) => {
  const { icons } = this.state;
  const { navigation, theme } = this.props;
  const colors = theme?.colors ?? {};
  const isDark = theme.mode === 'dark';

  const goleador = this.getPlayerData(item);

  const nombre   = goleador.nombre || 'Jugador';
  const teamName = goleador.teamName || (item.equipo?.[0]?.nombre?.[0] || '');
  const goals    = Number(item.goles || 0);
  const teamId   = goleador.teamId;

  const logoSource = icons[teamId];

  const playerId = String(item.id?.[0] || '');
  const scope = 'guatemala';


    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          if (!playerId) return;
          navigation?.navigate('Player', {
            playerId,
            teamId,
            scope,
            player: goleador.playerData,
          });
        }}
      >
        <View style={[styles.row, {backgroundColor: colors.cardBg, borderColor: colors.cardBorder, },
    index === 0 && {
      backgroundColor: isDark ? '#064e3b' : '#e8f5e9', // ligero verde para el #1
    },
  ]}
>

          {/* Número 1–10 */}
          <View style={styles.rankWrap}>
            <Text style={[styles.rankText, { color: colors.text }]}>
  {index + 1}
</Text>

          </View>

          {/* Avatar del jugador */}
          <Avatar
            id={playerId}
            player={goleador.playerData}
            size={44}
            rounded
            borderColor="#e7e7e7"
            style={{ marginRight: 10 }}
          />

          {/* Nombre + equipo */}
          <View style={{ flex: 1 }}>
            {index === 0 && (
  <Text
    style={[
      styles.leaderLabel,
      { color: isDark ? '#fbbf24' : '#b45309' },
    ]}
  >
    Máximo goleador
  </Text>
)}


            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1} > {nombre} </Text>


            <View style={styles.teamRow}>
              {logoSource && (
                <Image
                  source={logoSource}
                  style={styles.teamLogo}
                  resizeMode="contain"
                />
              )}
              <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1} >
                {teamName}
              </Text>
            </View>
          </View>

          {/* 👟 Bota de oro en medio, solo para el #1 */}
          {index === 0 && (
            <Image
              source={require('../resources/golden_boot.png')}
              style={styles.bootIconMiddle}
              resizeMode="contain"
            />
          )}

          {/* Goles */}
          <View style={styles.goalsWrap}>
            <Text style={[styles.goalsNum, { color: RED }]}>{goals}</Text>
            <Text style={[styles.goalsLabel, { color: colors.textMuted }]}>
              {goals === 1 ? 'Gol' : 'Goles'}
            </Text>

          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== Render principal ====================

  render() {
    const { refreshing, scorers, showTeamSearch } = this.state;
    const { navigation, theme } = this.props;      // 👈 AÑADIDO
    const colors = theme?.colors ?? {};            // 👈 AÑADIDO
    const isDark = theme?.mode === 'dark';         // (por si lo quisieras usar aquí luego)

    // Ordenamos por goles desc y tomamos solo Top 10
    const sorted = [...scorers].sort((a, b) => {
      const gA = Number(a.goles || 0);
      const gB = Number(b.goles || 0);
      return gB - gA;
    });
    const top10 = sorted.slice(0, 10);

    const loadingInitial = refreshing && scorers.length === 0;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.screenBg }]} edges={['bottom']} >

        {/* Header tipo TeamScreen: flecha, título y lupita FUNCIONAL */}
        <Header
          navigation={navigation}
          title="Goleadores"
          showSearch
          onSearchPress={() => this.setState({ showTeamSearch: true })}
        />

        {loadingInitial ? (
          <View style={styles.center}>
            <ActivityIndicator color={RED} />
            <Text style={[styles.muted, { color: colors.textMuted }]}>
              Cargando goleadores…
            </Text>
          </View>

        ) : (
          <FlatList
            data={top10}
            keyExtractor={(item, index) => index.toString()}
            renderItem={this.renderPlayer}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            contentContainerStyle={{
              paddingHorizontal: 10,
              paddingTop: 8,
              // espacio para que la lista no choque con el banner fijo
              paddingBottom: BANNER_H + 10,
              backgroundColor: colors.screenBg,
            }}
            scrollIndicatorInsets={{ bottom: BANNER_H }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={this.refresh}
                colors={[RED]}
                tintColor={RED}
                progressBackgroundColor={colors.cardBg}

              />
            }
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !refreshing && !top10.length ? (
                <View style={styles.center}>
                  <Text style={[styles.muted, { color: colors.textMuted }]}>
                    ⚽ Aún no hay datos de goleadores.
                  </Text>

                </View>
              ) : null
            }
          />
        )}

        {/* Modal de búsqueda de equipos, igual que en TeamScreen */}
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

// ==================== Estilos ====================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },

  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  muted: {
    color: '#666',
    fontSize: 13,
    marginTop: 6,
  },

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

  // Top 1 destacado
  firstPlace: {
    backgroundColor: '#e8f5e9',
  },
  leaderLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: 2,
  },

  // Rank 1–10
  rankWrap: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  rankText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f1235',
  },

  name: {
    fontSize: 14,
    fontWeight: '700',
    color: NAVY,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  teamLogo: {
    width: 20,
    height: 20,
    marginRight: 4,
  },
  sub: {
    fontSize: 12,
    color: '#555',
  },

  goalsWrap: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 4,
    minWidth: 48,
  },
  goalsNum: {
    fontSize: 18,
    fontWeight: '800',
    color: RED,
  },
  goalsLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },

  // Footer fijo elevado (patrón PlayerScreen)
  footerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  bootIconMiddle: {
    width: 40,
    height: 40,
    marginHorizontal: 6,
    alignSelf: 'center',
  },
});
export default withTheme(Scorers);
