// components/TourneyBadge.js
import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { tourneyLabel } from '../utils/tournamentsMeta';

export default function TourneyBadge({ scope, competition, show = true, style }) {
  if (!show) return null;
  const meta = tourneyLabel(scope, competition); // usa competition si viene, si no el short por scope
  return (
    <Text style={[styles.txt, style]} numberOfLines={1}>
      {meta.short}
    </Text>
  );
}

const styles = StyleSheet.create({
  // letra pequeña, neutra, sin fondo ni borde
  txt: {
    fontSize: 9,         // 👈 más pequeño
    fontWeight: '700',
    color: '#6B7280',    // gris discreto; cámbialo si quieres
    includeFontPadding: false,
  },
});
