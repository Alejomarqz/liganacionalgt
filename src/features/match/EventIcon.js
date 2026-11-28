// src/features/match/EventIcon.js
import React, { memo } from 'react';
import { View } from 'react-native';
import { SoccerBall, ArrowsDownUp, MonitorPlay, XCircle } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';

const Card = ({ color, size, second }) => (
  <View style={{ width: size * 0.68, height: size * 0.92 }}>
    {second ? <View style={{ position: 'absolute', left: 3, top: -2, width: size * 0.62, height: size * 0.86, borderRadius: 2, backgroundColor: '#FFD23F' }} /> : null}
    <View style={{ width: size * 0.62, height: size * 0.86, borderRadius: 2, backgroundColor: color, transform: [{ rotate: '8deg' }] }} />
  </View>
);

function EventIcon({ kind, size = 16 }) {
  const { colors } = useDesign();
  switch (kind) {
    case 'goal':
    case 'penalty_goal':
      return <SoccerBall size={size} weight="fill" color={colors.text} />;
    case 'own_goal':
      return <SoccerBall size={size} weight="fill" color={colors.danger} />;
    case 'penalty_miss':
      return <XCircle size={size} weight="fill" color={colors.danger} />;
    case 'yellow':
      return <Card color="#FFD23F" size={size} />;
    case 'red':
      return <Card color="#E8324A" size={size} />;
    case 'second_yellow':
      return <Card color="#E8324A" size={size} second />;
    case 'sub':
    case 'sub_in':
    case 'sub_out':
      return <ArrowsDownUp size={size} weight="bold" color={kind === 'sub_out' ? colors.danger : colors.success} />;
    case 'var':
      return <MonitorPlay size={size} weight="fill" color={colors.primary} />;
    default:
      return <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.textMuted }} />;
  }
}

export default memo(EventIcon);
