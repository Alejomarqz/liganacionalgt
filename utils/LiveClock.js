// utils/LiveClock.js
import React, {PureComponent} from 'react';
import {Text} from 'react-native';

export default class LiveClock extends PureComponent {
  state = { t: 0 };

  componentDidMount(){ if (this.props.live) this.start(); }
  componentDidUpdate(p){
    if (!p.live && this.props.live) this.start();
    if (p.live && !this.props.live) this.stop();
  }
  componentWillUnmount(){ this.stop(); }

  start(){ this.stop(); this.id = setInterval(() => this.setState(s => ({t: s.t + 1})), 1000); }
  stop(){ if (this.id){ clearInterval(this.id); this.id = null; } }

  render(){
    const { style, label } = this.props;
    const txt = (typeof label === 'function' ? label() : '') || '';
    return <Text style={style}>{txt}</Text>;
  }
}
