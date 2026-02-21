// components/Header.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import BellToggle from './BellToggle';
import { useTheme } from '../utils/ThemeContext';
import { BRAND, TYPOGRAPHY } from '../utils/theme';

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
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const isDark = theme.mode === 'dark';

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
    <View
      style={[
        S.wrap,
        {
          backgroundColor: colors.headerBg,
          borderBottomColor: colors.tabBarBorder,
        },
      ]}
    >
      {/* ── IZQUIERDA: back o logo ── */}
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
          /* Logo badge azul con ⚽ */
          <View style={S.logoBadge}>
            <Text style={S.logoBadgeIcon}>⚽</Text>
          </View>
        ) : (
          <View style={{ width: 36, height: 36 }} />
        )}
      </View>

      {/* ── CENTRO: logo texto o título ── */}
      <View style={S.center}>
        {showLogo ? (
          <View style={S.logoTextWrap}>
            <Text style={[S.logoName, { color: colors.text }]}>
              Liga Nacional GT
            </Text>
            <Text style={[S.logoSub, { color: BRAND.gold }]}>
              🇬🇹 Guatemala · Temporada 2025
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

      {/* ── DERECHA: acciones ── */}
      <View style={S.right}>
        {showBell && <BellToggle {...bellProps} />}

        {showSearch && (
          <TouchableOpacity
            style={[S.iconBtn, { backgroundColor: colors.iconBg }]}
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
            style={[S.iconBtn, { backgroundColor: colors.iconBg }, S.iconBtnMl]}
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
  );
}

const S = StyleSheet.create({
  wrap: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingHorizontal: 12,
  },

  // ── Izquierda ──
  left: {
    width: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  // ── Centro ──
  center: {
    flex: 1,
    alignItems: 'flex-start',   // alineado a izquierda como OneFootball
    paddingHorizontal: 4,
    justifyContent: 'center',
  },

  // ── Derecha ──
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },

  // ── Icon button (estilo Facebook) ──
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnMl: {
    marginLeft: 4,
  },
  icon18: { width: 18, height: 18, resizeMode: 'contain' },
  icon20: { width: 20, height: 20, resizeMode: 'contain' },

  // ── Logo badge ──
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: BRAND.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: BRAND.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  logoBadgeIcon: {
    fontSize: 18,
  },

  // ── Logo texto ──
  logoTextWrap: {
    justifyContent: 'center',
  },
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