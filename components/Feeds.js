import React, {Component} from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  View,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Header from './Header';
import AdFooter from './AdFooter';
import {API_WEB_ROOT_URL} from '@env';

const {width} = Dimensions.get('window');

import {
  InterstitialAd,
  TestIds,
  AdEventType,
} from 'react-native-google-mobile-ads';

export default class Feeds extends Component {
  constructor(props) {
    super(props);
    this.state = {teams: [], matchs: [], refreshing: true, news: []};
  }

  getNews() {
    fetch(`${API_WEB_ROOT_URL}/wp-json/wp/v2/posts?tags=87`)
      .then(response => response.json())
      .then(data => {
        this.setState({news: data, refreshing: false});
      })
      .catch(err => {
        alert('Ha ocurrido un error en la conexión.');
        this.setState({refreshing: false});
      });
  }

  UNSAFE_componentWillMount() {
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
      () => {
        this.setState({loaded: true});
      },
    );

    const unsubscribeClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        this.setState({loaded: false});
      },
    );

    interstitial.load();
    setTimeout(() => {
      console.log(this.state.loaded);
      if (this.state.loaded) {
        interstitial.show();
      }
    }, 3000);
    this.getNews();

    // Unsubscribe from events on unmount
    return () => {
      unsubscribeLoaded();
      unsubscribeClosed();
    };
  }

  refresh = () => {
    this.getNews();
  };

  renderNew(item, index) {
    return (
      <View>
        <TouchableOpacity
          onPress={() => {
            this.props.navigation.navigate('New', {notice: item});
          }}
          style={[
            styles.new,
            {marginBottom: 5, marginTop: index == 0 ? 10 : 5},
          ]}>
          <View style={styles.infoNew}>
            <Text style={styles.infoNewText}>{item.date}</Text>
          </View>

          <View style={styles.titleNew}>
            <Text style={styles.titleNewText}>{item.title.rendered}</Text>
          </View>

          <View style={styles.readNew}>
            <Text style={styles.readNewText}>Leer más</Text>
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
          <Text style={styles.titleText}>NOTICIAS</Text>
        </View>

        <FlatList
          refreshing={this.state.refreshing}
          onRefresh={this.refresh}
          data={this.state.news}
          renderItem={({item, index}) => this.renderNew(item, index)}
          keyExtractor={(item, index) => index.toString()}
          style={styles.scroll}
          contentContainerStyle={{
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}></FlatList>

        <TouchableOpacity
          style={styles.seemore}
          onPress={() => {
            Linking.openURL(`${API_WEB_ROOT_URL}/tag/noticias/`);
          }}>
          <Text style={styles.seemoreText}>Ver más noticias en la web</Text>
        </TouchableOpacity>

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

  new: {
    justifyContent: 'flex-start',
    width: width * 0.95,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderRadius: 10,
    borderColor: '#0f1235',
  },

  titleNew: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  infoNew: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  readNew: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  seemore: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width,
    paddingVertical: 5,
    backgroundColor: '#0f1235',
  },

  seemoreText: {
    color: '#fff',
    fontSize: 12,
  },

  infoNewText: {
    color: '#5c5c5c',
    fontSize: 10,
  },

  readNewText: {
    color: '#0074b7',
  },

  titleNewText: {
    fontSize: 18,
    color: '#000',
  },
});
