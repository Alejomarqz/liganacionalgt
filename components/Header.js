// components/Header.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  SafeAreaView,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import BellToggle from './BellToggle';
import { useTheme } from '../utils/ThemeContext';
import { BRAND } from '../utils/theme';

export default function Header({
  navigation,
  title = '',
  showSearch = false,
  showBell = false,
  bellProps = {},
  onSearchPress,
  showSettings = false,
  onSettingsPress,
  disableBack = false,

  // Modo logo (para Home) vs modo título (para pantallas internas)
  showLogo = false,

  // Texto dinámico en Home
  logoName = 'Liga Nacional GT',
  logoSub = '🇬🇹 Guatemala',
  seasonLabel = 'Temporada 2025',

  // ✅ Logo real
  logoSource = require('../resources/logos/app-logo.png'),

  // Ajustes
  height = 58,
  logoSize = 34, // ✅ tamaño del logo (solo imagen)
}) {
  const { theme } = useTheme();
  const colors = theme.colors;

  const canGoBackNav = navigation?.canGoBack?.();
  const showBack = !disableBack && canGoBackNav;

  const handleBack = () => {
    if (showBack) {
      navigation.goBack();
      return;
    }
    navigation.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] })
    );
  };

  return (
    <SafeAreaView style={{ backgroundColor: colors.headerBg }}>
      <View
        style={[
          S.wrap,
          {
            height,
            backgroundColor: colors.headerBg,
            borderBottomColor: colors.tabBarBorder,
          },
        ]}
      >
        {/* ── IZQUIERDA ── */}
        <View style={S.left}>
          {showBack ? (
            <TouchableOpacity
              hitSlop={{ top: 10, left: 10, right: 10, bottom: 10 }}
              onPress={handleBack}
              style={[S.iconBtn, { backgroundColor: colors.iconBg }]}
            >
              <Image
                source={require('../resources/back.png')}
                style={[S.icon18, { tintColor: colors.iconColor }]}
              />
            </TouchableOpacity>
          ) : showLogo ? (
            // ✅ SOLO LOGO (sin caja/fondo)
            <Image
              source={logoSource}
              style={[
                S.appLogo,
                {
                  width: logoSize,
                  height: logoSize,
                },
              ]}
              resizeMode="contain"
            />
          ) : (
            <View style={S.leftPlaceholder} />
          )}
        </View>

        {/* ── CENTRO ── */}
        <View style={S.center}>
          {showLogo ? (
            <View style={S.logoTextWrap}>
              <Text
                numberOfLines={1}
                style={[S.logoName, { color: colors.text }]}
              >
                {logoName}
              </Text>

              <Text numberOfLines={1} style={[S.logoSub, { color: BRAND.gold }]}>
                {logoSub}
                {!!seasonLabel ? ` · ${seasonLabel}` : ''}
              </Text>
            </View>
          ) : (
            !!title && (
              <Text
                numberOfLines={1}
                style={[S.title, { color: colors.headerText }]}
              >
                {title}
              </Text>
            )
          )}
        </View>

        {/* ── DERECHA ── */}
        <View style={S.right}>
          {showBell && (
            <View style={S.action}>
              <BellToggle {...bellProps} />
            </View>
          )}

          {showSearch && (
            <TouchableOpacity
              style={[S.iconBtn, { backgroundColor: colors.iconBg }, S.action]}
              onPress={() => onSearchPress?.()}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Image
                source={require('../resources/search.png')}
                style={[S.icon20, { tintColor: colors.iconColor }]}
              />
            </TouchableOpacity>
          )}

          {showSettings && (
            <TouchableOpacity
              style={[S.iconBtn, { backgroundColor: colors.iconBg }, S.action]}
              onPress={() => onSettingsPress?.()}
              hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
            >
              <Image
                source={require('../resources/settings.png')}
                style={[S.icon20, { tintColor: colors.iconColor }]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === 'android' ? 2 : 0,
    paddingBottom: Platform.OS === 'android' ? 2 : 0,
  },

  // ── Izquierda ──
  left: {
    width: 52,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  leftPlaceholder: { width: 36, height: 36 },

  // ✅ Logo sin fondo
  appLogo: {
    // Un pelín de alineación visual
    marginLeft: 1,
  },

  // ── Centro ──
  center: {
    flex: 1,
    alignItems: 'flex-start',
    paddingHorizontal: 6,
    paddingRight: 10,
    justifyContent: 'center',
    minWidth: 0,
  },

  // ── Derecha ──
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 88,
  },
  action: { marginLeft: 8 },

  // ── Icon button ──
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon18: { width: 18, height: 18, resizeMode: 'contain' },
  icon20: { width: 20, height: 20, resizeMode: 'contain' },

  // ── Logo texto ──
  logoTextWrap: { justifyContent: 'center', minWidth: 0 },
  logoName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  logoSub: {
    fontFamily: 'Poppins-Medium',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0.2,
  },

  // ── Título pantallas internas ──
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 17,
    letterSpacing: -0.3,
  },
});