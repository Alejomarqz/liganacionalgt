// components/Header.js
import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import BellToggle from './BellToggle';
import { useTheme } from '../utils/ThemeContext';

export default function Header({
  navigation,
  title = '',
  showSearch = false,
  showBell = false,
  bellProps = {},
  onSearchPress,

  // ⚙️ NUEVOS
  showSettings = false,
  onSettingsPress,
  disableBack = false,       // 👈 nuevo prop
}) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const canGoBackNav = navigation?.canGoBack?.();
  const showBack = !disableBack && canGoBackNav;   // 👈 aquí aplicamos el flag

  const handleBack = () => {
    if (showBack) {
      navigation.goBack();
      return;
    }
    // fallback por si algún día lo usas en otro contexto
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      })
    );
  };

  return (
    <View
      style={[
        S.wrap,
        {
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.tabBarBorder,
        },
      ]}
    >
      <View style={S.left}>
        {showBack ? (
          <TouchableOpacity
            hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
            onPress={handleBack}
          >
            <Image
              source={require('../resources/back.png')}
              style={[S.icon24, { tintColor: colors.headerText }]}
            />
          </TouchableOpacity>
        ) : (
          // ocupa el espacio para que el título quede centrado
          <View style={{ width: 18, height: 18 }} />
        )}
      </View>

      <View style={S.center}>
        {!!title && (
          <Text
            numberOfLines={1}
            style={[S.title, { color: colors.headerText }]}
          >
            {title}
          </Text>
        )}
      </View>

      <View style={S.right}>
        {showBell && <BellToggle {...bellProps} />}

        {showSearch && (
          <TouchableOpacity style={S.action} onPress={() => onSearchPress?.()}>
            <Image
              source={require('../resources/search.png')}
              style={[S.icon22, { tintColor: colors.headerText }]}
            />
          </TouchableOpacity>
        )}

        {showSettings && (
          <TouchableOpacity
            style={S.action}
            onPress={() => onSettingsPress?.()}
          >
            <Image
              source={require('../resources/settings.png')}
              style={[S.icon22, { tintColor: colors.headerText }]}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    height: 52,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  left: { width: 52, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  right: {
    width: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 8,
  },
  icon24: { width: 18, height: 18, resizeMode: 'contain' },
  icon22: { width: 22, height: 22, opacity: 0.95, resizeMode: 'contain' },
  action: { paddingHorizontal: 6, paddingVertical: 6 },
  title: { fontSize: 17, fontWeight: '800', color: '#0f1235' },
});
