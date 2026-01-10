import React, { Component } from "react";
import {
  Platform,
  StatusBar,
  Image,
  StyleSheet,
  Dimensions,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export default class Welcome extends Component {
  constructor(props) {
    super(props);
    this.state = { timePassed: false };
  }

  render() {
    return (
      <View style={styles.container}>
        {Platform.OS === "android" ? (
          <StatusBar backgroundColor="#0f1235" barStyle="light-content" />
        ) : null}
        <Image
          style={{ width: width * 0.6, height: width * 0.6 }}
          source={require("../resources/logogrande.png")}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
