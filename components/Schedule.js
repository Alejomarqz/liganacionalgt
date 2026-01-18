import React, {Component} from 'react';
import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Header from './Header';
import AdFooter from '../ads/AdFooter';
import {API_CUSTOM_DIGITAL, API_WEB_DEPORT_URL} from '@env';
import {logos} from '../utils/logos';
import {
  InterstitialAd,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads'; // 👈 NUEVO

const {width, height} = Dimensions.get('window');

// 👇 Interstitial (usa test en debug y tu ID real en release)
const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-3710973902746391/2280373125';

// clave en storage para controlar frecuencia
const LAST_INTERSTITIAL_KEY = 'last_interstitial_ts';
const INTERSTITIAL_COOLDOWN_MS = 60 * 1000; // 60s mínimo entre impresiones

export default class Schedule extends Component {
  mounted = false;
  interstitial = null;      // 👈 NUEVO
  interstitialSubs = [];    // 👈 NUEVO

  constructor(props) {
    super(props);
    this.state = {
      timePassed: false,
      matchs: [],
      refreshing: true,
      icons: logos,
    };
  }

  // =========================
  // 👇 Interstitial al entrar
  // =========================
  setupInterstitial = async () => {
    // crea instancia
    this.interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID);

    // cuando cargue, mostramos si respeta el cooldown
    const subLoaded = this.interstitial.addAdEventListener(
      AdEventType.LOADED,
      async () => {
        if (await this.canShowInterstitial()) {
          this.interstitial?.show();
        }
      },
    );

    // al cerrar, guardamos timestamp y pre‑cargamos para la próxima
    const subClosed = this.interstitial.addAdEventListener(
      AdEventType.CLOSED,
      async () => {
        await this.markInterstitialShown();
        this.interstitial?.load();
      },
    );

    const subError = this.interstitial.addAdEventListener(
      AdEventType.ERROR,
      () => {
        // puedes loguear si quieres
      },
    );

    this.interstitialSubs = [subLoaded, subClosed, subError];

    // carga inicial
    this.interstitial.load();
  };

  canShowInterstitial = async () => {
    try {
      const last = await AsyncStorage.getItem(LAST_INTERSTITIAL_KEY);
      const now = Date.now();
      if (last && now - Number(last) < INTERSTITIAL_COOLDOWN_MS) {
        return false;
      }
      return true;
    } catch {
      return true;
    }
  };

  markInterstitialShown = async () => {
    try {
      await AsyncStorage.setItem(LAST_INTERSTITIAL_KEY, String(Date.now()));
    } catch {}
  };
  // =========================

  refresh = () => {
    this.setState({refreshing: true}, () => {
      this.setState({refreshing: false});
    });
  };

  getMatchs() {
    return new Promise((resolve, reject) => {
      fetch(`${API_CUSTOM_DIGITAL}/calendar`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })
        .then(response => response.json())
        .then(result => {
          let fechas = result.fixture.fecha;
          let arr = [];
          let promisesArr = [];

          for (let i = 0; i < fechas.length; i++) {
            let partidos = fechas[i].partido;

            for (let j = 0; j < partidos.length; j++) {
              partidos[j].scheduledStart = partidos[j].hora;
              partidos[j].date = partidos[j].fecha;
              partidos[j].levelName = fechas[i].nombrenivel;
              partidos[j].level = fechas[i].nivel;
              partidos[j].matchId = partidos[j].id;

              let dateString = partidos[j].fecha.toString();
              let year = dateString.substring(0, 4);
              let month = dateString.substring(4, 6);
              let day = dateString.substring(6, 8);
              let date = new Date(year, month - 1, day, 0, 0, 0);

              arr.push(partidos[j]);
              promisesArr.push(
                new Promise((resolve, reject) => {
                  fetch(
                    `${API_WEB_DEPORT_URL}/guatemala/events/${partidos[j].id}.json`,
                  )
                    .then(response => response.json())
                    .then(response => {
                      resolve(response);
                    })
                    .catch(error => {
                      reject(error);
                    });
                }),
              );
            }
          }

          Promise.all(promisesArr).then(values => {
            for (let i = 0; i < values.length; i++) {
              arr[i].venueInformation = values[i].venueInformation;
              arr[i].scoreStatus = values[i].scoreStatus;
              arr[i].teams = values[i].match;
            }
            resolve({matchs: arr, refreshing: false});
          });
        })
        .catch(error => {
          console.log(error);
        });
    });
  }

  async componentDidMount() {
    this.mounted = true;

    // 👇 Inicializa el interstitial al entrar a Calendario
    await this.setupInterstitial();

    this.getMatchs()
      .then(data => {
        if (this.mounted) {
          this.setState(data);
        }
      })
      .catch(err => {
        console.log(err);
        alert('Ha ocurrido un error en la conexión.');
      });
  }

  componentWillUnmount() {
    this.mounted = false;
    // limpia listeners del interstitial
    try {
      this.interstitialSubs.forEach(u => u && u());
    } catch {}
  }

  formatDate(date) {
    var monthNames = [
      'Enero',
      'Febrero',
      'Marzo',
      'Abril',
      'Mayo',
      'Junio',
      'Julio',
      'Agosto',
      'Septiembre',
      'Octubre',
      'Noviembre',
      'Diciembre',
    ];

    var day = date.getDate();
    var monthIndex = date.getMonth();
    var year = date.getFullYear();

    return monthNames[monthIndex] + ' ' + day + ' del ' + year;
  }

  renderMatch(item, index) {
    const formatDate = dateString => {
      const year = dateString.substring(0, 4);
      const month = dateString.substring(4, 6);
      const day = dateString.substring(6, 8);
      return new Date(year, month - 1, day);
    };

    const formatTime = scheduledStart => {
      let hours, minutes;

      if (
        Array.isArray(scheduledStart) &&
        scheduledStart.length === 1 &&
        scheduledStart[0] === ''
      ) {
        hours = '-';
        minutes = '-';
      } else {
        const timeString = Array.isArray(scheduledStart)
          ? scheduledStart[0]
          : scheduledStart;
        const [h, m] = timeString.split(':');
        hours = h ? h : '-';
        minutes = m ? m : '-';
      }
      const now = new Date();
      now.setHours(hours);
      now.setMinutes(minutes);

      const utcOffset = -3;
      const utcOffsetMs = utcOffset * 60 * 60 * 1000;
      const utcTimeZone = new Date(now.getTime() + utcOffsetMs);

      const hourUtc = utcTimeZone.getHours().toString().padStart(2, '0');
      const minuteUtc = utcTimeZone.getMinutes().toString().padStart(2, '0');

      return `${hourUtc}:${minuteUtc}`;
    };

    const dateString = item.date.toString();
    const date = formatDate(dateString || '20200101');

    const formattedTime = formatTime(
      item.scheduledStart[0] || item.scheduledStart || '00:00',
    );

    let actualHomeTeamValue =
      typeof item.scoreStatus[item.teams.homeTeamId] === 'undefined' ||
      item.scoreStatus[item.teams.homeTeamId].score == null ||
      typeof item.scoreStatus[item.teams.homeTeamId].score === 'undefined'
        ? '-'
        : item.scoreStatus[item.teams.homeTeamId].score;
    let actualAwayTeamValue =
      typeof item.scoreStatus[item.teams.awayTeamId] === 'undefined' ||
      item.scoreStatus[item.teams.awayTeamId].score == null ||
      typeof item.scoreStatus[item.teams.awayTeamId].score === 'undefined'
        ? '-'
        : item.scoreStatus[item.teams.awayTeamId].score;
    return (
      <View>
        {item.level != 1 ? (
          <View style={styles.time}>
            <Text style={styles.timeText}>{item.levelName}</Text>
          </View>
        ) : index % 6 == 0 ? (
          <View style={styles.time}>
            <Text style={styles.timeText}>{'Jornada ' + (index / 6 + 1)}</Text>
          </View>
        ) : null}
        {}

        <TouchableOpacity
          style={{alignSelf: 'center'}}
          onPress={() => {
            if (date <= new Date())
              this.props.navigation.push('Match', {match: item});
          }}>
          <View style={[styles.match, {marginBottom: 5, marginTop: 5}]}>
            <Text style={styles.dateText}>{this.formatDate(date)}</Text>
            <Text style={styles.hourText}>
              {!item?.scheduledStart ? 'Hora no definida' : formattedTime}
            </Text>

            <View style={{flexDirection: 'row', flex: 1}}>
              <View style={styles.team1}>
                <View style={styles.infoTeam}>
                  <Image
                    style={{width: 30, height: 30, alignSelf: 'center'}}
                    source={this.state.icons[item.teams.homeTeamId]}
                  />
                  <Text style={styles.nameTeam}>{item.teams.homeTeamName}</Text>
                </View>
              </View>

              <View style={styles.score}>
                <Text style={styles.scoreTeam}>{actualHomeTeamValue}</Text>
                <Text style={styles.separator}>-</Text>
                <Text style={styles.scoreTeam}>{actualAwayTeamValue}</Text>
              </View>

              <View style={styles.team2}>
                <View style={styles.infoTeam}>
                  <Image
                    style={{width: 30, height: 30, alignSelf: 'center'}}
                    source={this.state.icons[item.teams.awayTeamId]}
                  />
                  <Text style={styles.nameTeam}>{item.teams.awayTeamName}</Text>
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  render() {
    return (
      <View style={styles.container}>
        <Header navigation={this.props.navigation} />

        <View style={styles.title}>
          <Text style={styles.titleText}>CALENDARIO</Text>
        </View>

        <FlatList
          onRefresh={this.refresh}
          refreshing={this.state.refreshing}
          data={this.state.matchs}
          renderItem={({item, index}) => this.renderMatch(item, index)}
          keyExtractor={(item, index) => index.toString()}
          style={styles.scroll}
          contentContainerStyle={{
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        />

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

  time: {
    marginTop: 10,
    marginBottom: 5,
    height: 35,
    backgroundColor: '#0f1235',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
  },

  timeText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: 'bold',
  },

  match: {
    paddingTop: 5,
    width: width * 0.95,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#0f1235',
  },

  dateText: {
    alignSelf: 'center',
    color: 'black',
    fontSize: 14,
  },

  hourText: {
    alignSelf: 'center',
    color: 'black',
    fontSize: 12,
  },

  team1: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  team2: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },

  infoTeam: {
    alignContent: 'center',
    justifyContent: 'center',
  },

  nameTeam: {
    textAlign: 'center',
    alignSelf: 'center',
    color: '#000',
    fontSize: 16,
  },

  separator: {
    marginLeft: 5,
    marginRight: 5,
    color: '#000',
    fontSize: 20,
  },

  scoreTeam: {
    color: '#000',
    fontSize: 20,
  },

  score: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },

  matchfooter: {
    flexDirection: 'row',
    backgroundColor: '#0f1235',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    marginTop: 5,
    paddingRight: 10,
    paddingLeft: 10,
  },

  stadium: {
    flex: 1,
    alignItems: 'flex-start',
  },

  status: {
    alignItems: 'flex-end',
  },

  statusText: {
    color: 'white',
    fontSize: 12,
  },

  stadiumText: {
    color: 'white',
    fontSize: 12,
  },
});
