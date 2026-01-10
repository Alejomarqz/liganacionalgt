import React, {Component} from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';

const {width, height} = Dimensions.get('window');

export default class Header extends Component {
  constructor(props) {
    super(props);
    this.state = {timePassed: false, events: {}};
  }

  render() {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{flex: 1, flexDirection: 'row'}}>
            {/* <TouchableOpacity
                            style={styles.button}
                            onPress={() => {
                                this.props.navigation.navigate("Webview");
                            }}
                        >
                            <Image
                                style={{ width: 40, height: 40 }}
                                source={require("../resources/logogrande.png")}
                            />

                        </TouchableOpacity> */}

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                this.props.navigation.navigate('Home');
              }}>
              <Image
                style={styles.image}
                source={require('../resources/home.png')}
              />

              <Text style={styles.textButton}>Inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                this.props.navigation.navigate('Positions');
              }}>
              <Image
                style={styles.image}
                source={require('../resources/chart.png')}
              />

              <Text style={styles.textButton}>Posiciones</Text>
            </TouchableOpacity>
          </View>

          <View style={{flex: 1, flexDirection: 'row'}}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                this.props.navigation.navigate('Teams');
              }}>
              <Image
                style={styles.image}
                source={require('../resources/people.png')}
              />

              <Text style={styles.textButton}>Equipos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                this.props.navigation.navigate('Scorers');
              }}>
              <Image
                style={styles.image}
                source={require('../resources/scorers.png')}
              />

              <Text style={styles.textButton}>Goleadores</Text>
            </TouchableOpacity>
          </View>
          <View style={{flex: 1, flexDirection: 'row'}}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                this.props.navigation.navigate('Schedule');
              }}>
              <Image
                style={styles.image}
                source={require('../resources/history.png')}
              />

              <Text style={styles.textButton}>Calendario</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => {
                this.props.navigation.navigate('Webview');
              }}>
              <Image
                style={{width: 40, height: 40}}
                source={require('../resources/Trophy.png')}
              />
            </TouchableOpacity>
          </View>
        </View>
        <View style={{height: 3, backgroundColor: '#0f1235', width: width}} />
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  header: {
    height: 50,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    flexDirection: 'row',
  },

  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  logo: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  image: {
    width: 30,
    height: 30,
  },

  textButton: {
    color: '#000',
    fontSize: 8,
  },
});
