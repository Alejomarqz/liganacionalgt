import React, { Component } from "react";

import Splash from "./Splash";

export default class Welcome extends Component {
  constructor(props) {
    super(props);
    this.state = { timePassed: false };
  }

  componentDidMount() {
    setTimeout(() => {
      this.setTimePassed();
    }, 1500);
  }

  setTimePassed() {
    this.setState({ timePassed: true }, () => {
      this.props.navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    });
  }

  render() {
    if (!this.state.timePassed) {
      return <Splash />;
    } else {
      return null;
    }
  }
}