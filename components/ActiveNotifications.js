import React, { Component } from "react";
import { StackActions } from "@react-navigation/native";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
} from "react-native";
//import PushNotification from 'react-native-push-notification';

const { width, height } = Dimensions.get("window");

// const resetAction = this.props.navigation.dispatch(StackActions.popToTop());

export default class ActiveNotifications extends Component {
  constructor(props) {
    super(props);
    this.state = { timePassed: false, notificationsActive: false };
    //this.configureNotification = this.configureNotification.bind(this);
  }
  /*
    configureNotification(){
        new Promise(resolve => {
            if (Platform.OS === 'ios') {
            PushNotification.checkPermissions(({ alert, badge, sound }) => {
                if (!alert || !badge || !sound) {
                    PushNotification.requestPermissions().then((grant) => {
                        if (grant.alert && grant.badge && grant.sound) {
                            this.setState({ notificationsActive: true });
                            resolve();
                          } else {
                            this.setState({ notificationsActive: false });
                            resolve();
                          }
                    });
                }else{
                    this.setState({notificationsActive: true})
                    resolve();
                }
            });
            } else {
            this.setState({notificationsActive: true})
            resolve();
            }
        }).then(() => {
            if(this.state.notificationsActive){
                this.props.navigation.dispatch(resetAction);
            }
        });
    }
    */

  render() {
    return (
      <View style={styles.container}>
        <TouchableOpacity style={styles.buttonActive}>
          <Text style={styles.textButton}>Activar notificaciones</Text>
        </TouchableOpacity>
        <Text style={styles.later}>Activar luego</Text>
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

  buttonActive: {
    backgroundColor: "#0054a9",
    width: width * 0.6,
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 10,
    marginBottom: 10,
  },

  later: {
    textDecorationLine: "underline",
    color: "#000",
  },

  textButton: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
});
