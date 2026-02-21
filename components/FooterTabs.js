// components/FooterTabs.js
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';

const Item = ({ label, icon, onPress, active, colors }) => (
  <TouchableOpacity style={S.item} onPress={onPress} activeOpacity={0.9}>
    <Image
      source={icon}
      style={[
        S.icon,
        {
          tintColor: active ? colors.accent : colors.textMuted,
          opacity: active ? 1 : 0.9,
        },
      ]}
    />
    <Text
      style={[
        S.txt,
        {
          color: active ? colors.accent : colors.textMuted,
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default function FooterTabs({ navigation, routeName = '', refreshKey }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;

  const safeBottom = Math.max(insets.bottom || 0, 0);

  return (
    <View
      key={refreshKey} // por si quieres forzar rerender desde fuera
      style={{
        backgroundColor: colors.tabBarBg,
        borderTopWidth: 1,
        borderTopColor: colors.tabBarBorder,
        paddingBottom: safeBottom, // respeta la zona de gestos
      }}
    >
      <View style={S.barInner}>
        <Item
          label="Partidos"
          icon={require('../resources/partidos.png')}
          active={routeName === 'Home'}
          onPress={() => navigation.navigate('Home')}
          colors={colors}
        />
        <Item
          label="Posiciones"
          icon={require('../resources/chart.png')}
          active={routeName === 'Positions'}
          onPress={() => navigation.navigate('Positions')}
          colors={colors}
        />
        <Item
          label="Calendario"
          icon={require('../resources/calendar.png')}
          active={routeName === 'Calendar'}
          onPress={() => navigation.navigate('Calendar')}
          colors={colors}
        />
        <Item
          label="Más"
          icon={require('../resources/more.png')}
          active={routeName === 'More'}
          onPress={() => navigation.navigate('More')}
          colors={colors}
        />
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  barInner: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    // nada de position absolute aquí 👇
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 22,
    height: 22,
    opacity: 0.85,
    marginBottom: 2,
    resizeMode: 'contain',
  },
  txt: {
    fontSize: 10,
    fontWeight: '700',
  },
});
