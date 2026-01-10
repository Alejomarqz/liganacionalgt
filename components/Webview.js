import React, { Component } from 'react';
import { WebView } from 'react-native-webview';
import Header from './Header';
import {
  StatusBar,
  Platform,
  StyleSheet,
  View,
  Text,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { BackHandler } from 'react-native';

import {
  InterstitialAd,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';
import { logos } from '../utils/logos';

const { width } = Dimensions.get('window');

export default class Webview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      timePassed: false,
      loaded: false,
      icons: logos,
      canGoBack: false,
    };
    this.WEBVIEW_REF = React.createRef();
  }

  componentDidMount() {
    // Agregar el evento al presionar el botón de "Atrás"
    this.backHandlerListener = BackHandler.addEventListener('hardwareBackPress', this.handleBackButton);

    // Configuración de los anuncios de Google
    let adUnitId =
      Platform.OS === 'ios'
        ? 'ca-app-pub-3710973902746391/7881605041'
        : 'ca-app-pub-3710973902746391/2280373125';
    if (__DEV__) {
      adUnitId = TestIds.INTERSTITIAL;
    }

    const interstitial = InterstitialAd.createForAdRequest(adUnitId);

    const unsubscribeLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      e => {
        this.setState({ loaded: true });
      },
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      e => {
        this.setState({ loaded: false });
      },
    );

    interstitial.load();
    setTimeout(() => {
      if (this.state.loaded) {
        interstitial.show();
      }
    }, 3000);

    // Limpiar los eventos cuando el componente se desmonta
    this.cleanupAdEvents = () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }

  componentWillUnmount() {
    // Eliminar el listener cuando el componente se desmonte
    if (this.backHandlerListener) {
      this.backHandlerListener.remove();
    }

    // Limpiar los eventos de anuncios
    this.cleanupAdEvents();
  }

  handleBackButton = () => {
    if (this.state.canGoBack) {
      this.WEBVIEW_REF.current.goBack();
      return true; // Prevenir la acción de ir a la pantalla anterior
    }
    return false; // Permitir la acción predeterminada
  };

  onNavigationStateChange = navState => {
    this.setState({
      canGoBack: navState.canGoBack,
    });
  };

  render() {
    return (
      <SafeAreaView style={styles.webview}>
        <View style={styles.container}>
          {Platform.OS === 'android' ? (
            <StatusBar backgroundColor="#0f1235" barStyle="light-content" />
          ) : null}
          <Header navigation={this.props.navigation} />
        </View>
        <View style={styles.title}>
          <Text style={styles.titleText}>TORNEOS</Text>
        </View>
        <WebView
          source={{ uri: 'https://cd.futbolchapin.app/' }}
          startInLoadingState={true}
          originWhitelist={['*']}
          ref={this.WEBVIEW_REF}
          onNavigationStateChange={this.onNavigationStateChange}
        />
        <View></View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 20 : 0,
  },
  webview: {
    flex: 1,
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
});
