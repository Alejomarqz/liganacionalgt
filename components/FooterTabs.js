// components/FooterTabs.js
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../utils/ThemeContext';
import { BRAND } from '../utils/theme';

const Item = ({ label, icon, onPress, active, colors }) => (
  <TouchableOpacity
    style={S.item}
    onPress={onPress}
    activeOpacity={0.75}
  >
    {/* Píldora activa detrás del icono */}
    <View style={[S.iconWrap, active && { backgroundColor: `${BRAND.primary}18` }]}>
      <Image
        source={icon}
        style={[
          S.icon,
          { tintColor: active ? BRAND.primary : colors.navInactive },
        ]}
      />
    </View>

    <Text
      style={[
        S.txt,
        { color: active ? BRAND.primary : colors.navInactive },
        active && S.txtActive,
      ]}
    >
      {label}
    </Text>

    {/* Punto indicador abajo */}
    {active && <View style={S.dot} />}
  </TouchableOpacity>
);

export default function FooterTabs({ navigation, routeName = '', refreshKey }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;

  const safeBottom = Math.max(insets.bottom || 0, 0);

  return (
    <View
      key={refreshKey}
      style={[
        S.container,
        {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.tabBarBorder,
          paddingBottom: safeBottom,
        },
      ]}
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
  container: {
    borderTopWidth: 1,
  },
  barInner: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    position: 'relative',
  },

  // Píldora detrás del ícono (activo)
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  icon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },

  txt: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 13,
  },
  txtActive: {
    fontFamily: 'Poppins-SemiBold',
  },

  // Punto indicador en el tab activo
  dot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BRAND.primary,
  },
});