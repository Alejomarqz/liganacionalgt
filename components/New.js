import React, { Component } from "react";
import {
  Linking,
  SafeAreaView,
  Platform,
  StyleSheet,
  Text,
  View,
  Dimensions,
  WebView,
} from "react-native";
import Header from "./Header";

const { width, height } = Dimensions.get("window");

export default class New extends Component {
  constructor(props) {
    super(props);
    this.state = { teams: [], matchs: [], refreshing: true, notice: "" };
  }

  UNSAFE_componentWillMount() {
    let notice = this.props.route.params.notice;
    this.setState({ notice: notice });
  }

  render() {
    try {
      return (
        <View style={styles.container}>
          <Header navigation={this.props.navigation} />

          <SafeAreaView style={styles.safeArea}>
            <View style={styles.title}>
              <Text style={styles.titleText}>
                {this.state.notice.title.rendered}
              </Text>
            </View>

            <WebView
              ref={(c) => {
                this.WebView = c;
              }}
              onNavigationStateChange={(event) => {
                if (event.url !== this.state.notice.link) {
                  this.WebView.stopLoading();
                  Linking.openURL(event.url);
                }
              }}
              source={{ uri: this.state.notice.link }}
              style={{ marginTop: 20, flex: 1, height: height, width: width }}
            />
          </SafeAreaView>
        </View>
      );
    } catch (error) {
      return (
        <View>
          <Text>error</Text>
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: Platform.OS === "ios" ? 20 : 0,
  },

  scroll: {
    flex: 1,
    width: width,
  },

  title: {
    marginTop: 10,
    backgroundColor: "#0f1235",
    justifyContent: "center",
    alignItems: "center",
    width: width,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  titleText: {
    fontSize: 15,
    color: "#fff",
    fontWeight: "bold",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
});
