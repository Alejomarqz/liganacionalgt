import React, {Component} from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, RefreshControl, Image, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Header from './Header';
import AdFooter from '../ads/AdFooter';
import {API_WEB_DEPORT_URL} from '@env';
import {logos} from '../utils/logos';

const {width} = Dimensions.get('window');
// Altura del anuncio y elevación del AdFooter (como en Match)
const BANNER_H   = 60;                            // usa 50 si aquí siempre es 320x50
const FOOTER_LIFT = Platform.OS === 'android' ? 48 : 10;  // 48 Android / 10 iOS


export default class Players extends Component {
  constructor(props) {
    super(props);
    this.state = {
      players: [],
      matchs: [],
      refreshing: true,
      team: {},
      icons: logos,
    };
  }

  getTeam() {
    let team = this.props.route.params.team;
    this.setState({team}, () => {
      fetch(`${API_WEB_DEPORT_URL}/guatemala/statsCenter/teams/${team.id}.json`)
        .then(response => response.json())
        .then(response => {
          let playersJson = response.players;
          let players = [];

          for (let prop in playersJson) {
            playersJson[prop].playerId = prop;
            players.push(playersJson[prop]);
          }

          let len = players.length;

          for (let i = 0; i < len; i++) {
            for (let j = 0; j < len - i - 1; j++) {
              let t1 = players[j];
              let t2 = players[j + 1];

              op1 = t1.info.name.last > t2.info.name.last;

              if (op1) {
                let temp = players[j];
                players[j] = players[j + 1];
                players[j + 1] = temp;
              }
            }
          }

          this.setState({players, refreshing: false});
        })
        .catch(error => {
          alert('Aún no contamos con información de este equipo.');
          this.setState({refreshing: false});
        });
    });
  }

  UNSAFE_componentWillMount() {
    this.getTeam();
  }

  renderPlayer(item, index) {
    return (
      <View>
        <View style={styles.player}>
          <View style={styles.infoTable}>
            <Text style={styles.infoText}>
              {item.info.squadNo == null ? '-' : item.info.squadNo}
            </Text>
          </View>

          <View style={styles.playerNameTable}>
            <Text style={styles.infoText}>
              {item.info.name.first.split(' ')[0] +
                ' ' +
                item.info.name.last.split(' ')[0] +
                ' '}
            </Text>
          </View>

          <View style={styles.infoTable}>
            <Text style={styles.infoText}>
              {item.info.age == null ? '-' : item.info.age}
            </Text>
          </View>

          <View style={styles.infoTable}>
            <Text style={styles.infoText}>{item.summary.goals.qty}</Text>
          </View>

          <View style={styles.infoTable}>
            <Text style={styles.infoText}>
              {item.summary.minutesPlayed.qty}
            </Text>
          </View>
        </View>

        <View style={{width: width, height: 1, backgroundColor: '#0f1235'}} />
      </View>
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <Header navigation={this.props.navigation} />

        <View style={styles.title}>
          <Text style={styles.titleText}>PLANTILLAS</Text>
        </View>

        <View style={styles.team}>
          <Image
            style={{
              width: 40,
              height: 40,
              alignSelf: 'center',
              marginRight: 10,
            }}
            source={this.state.icons[this.state.team.id]}
          />

          <Text style={styles.teamNameText}>
            {this.state.team.nombre[0].substr(0, 5) == 'Xelaj'
              ? 'Xelajú'
              : this.state.team.nombre[0].substr(0, 8) == 'Siquinal'
              ? 'Siquinalá'
              : this.state.team.nombre[0].substr(0, 3) == 'Cob'
              ? 'Cobán Imperial'
              : this.state.team.nombre[0].substr(0, 5) == 'Santa'
              ? 'Santa Lucía'
              : this.state.team.nombre[0].substr(0, 5) == 'Nueva'
              ? 'Nueva Concepción'
              : this.state.team.nombre[0].substr(0, 5) == 'Solol'
              ? 'Sololá'
              : this.state.team.nombre[0].substr(0, 5) == 'Mictl'
              ? 'Mictlán'
              : this.state.team.nombre[0]}
          </Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.info}>No.</Text>

          <Text style={styles.playerName}>NOMBRE</Text>

          <Text style={styles.info}>EDAD</Text>

          <Text style={styles.info}>GOLES</Text>

          <Text style={styles.info}>MJ</Text>
        </View>

        <FlatList
          refreshing={this.state.refreshing}
          onRefresh={this.refresh}
          data={this.state.players}
          renderItem={({item, index}) => this.renderPlayer(item, index)}
          keyExtractor={(item, index) => index.toString()}
          style={styles.scroll}
          contentContainerStyle={{
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}></FlatList>

        <AdFooter />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },

  scroll: {
    flex: 1,
    width: width,
  },

  text: {
    color: 'black',
  },

  header: {
    height: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
  },

  title: {
    marginTop: 10,
    height: 35,
    backgroundColor: '#0f1235',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
  },

  titleText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },

  team: {
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    width: width * 0.95,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0f1235',
    paddingHorizontal: 10,
  },

  player: {
    width: width,
    flexDirection: 'row',
    paddingVertical: 5,
  },

  teamNameText: {
    fontSize: 20,
    color: 'black',
    textAlign: 'center',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f1235',
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },

  playerName: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 4,
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  info: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  playerNameTable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 4,
    fontSize: 15,
  },

  infoTable: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoText: {
    color: 'black',
    fontSize: 15,
    textAlign: 'center',
  },
});
