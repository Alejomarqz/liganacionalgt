// components/Header.js
import React from 'react';
import {
  View, Text, TouchableOpacity, Image,
  StyleSheet, Platform, Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CommonActions }     from '@react-navigation/native';
import { MagnifyingGlass, Gear, CaretLeft } from 'phosphor-react-native';
import BellToggle   from './BellToggle';
import { useTheme } from '../utils/ThemeContext';
import { BRAND }    from '../utils/theme';

/* ── Color de iconos según tema ── */
function ic(colors) { return colors.iconColor; }

/* ══════════════════════════════════════════════════════════
   HEADER
   Props:
   - showLogo      → modo Home (logo + nombre a la izquierda)
   - title         → modo pantalla interna (título centrado)
   - liveCount     → número de partidos en vivo (badge rojo)
   - showSearch / showSettings / showBell
══════════════════════════════════════════════════════════ */
export default function Header({
  navigation,
  title          = '',
  showSearch     = false,
  showBell       = false,
  bellProps      = {},
  onSearchPress,
  showSettings   = false,
  onSettingsPress,
  disableBack    = false,

  /* Modo Home */
  showLogo   = false,
  logoName   = 'Liga Nacional',
  logoSource = require('../resources/logos/app-logo.png'),
  logoSize   = 32,
  liveCount  = 0,   // badge "EN VIVO · N"
}) {
  const { theme } = useTheme();
  const colors    = theme.colors;
  const isDark    = theme.mode === 'dark';
  const insets    = useSafeAreaInsets();
  const topPad    = Platform.OS === 'android' ? (insets.top || 0) : 0;

  const canGoBack = navigation?.canGoBack?.();
  const showBack  = !disableBack && canGoBack;

  const handleBack = () => {
    if (showBack) { navigation.goBack(); return; }
    navigation?.dispatch?.(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }));
  };

  /* ── Modo HOME ─────────────────────────────────────────── */
  if (showLogo) {
    return (
      <View style={[S.outer, { backgroundColor: colors.headerBg, borderBottomColor: colors.tabBarBorder, paddingTop: topPad }]}>
        <View style={S.homeInner}>

          {/* Izquierda: logo + nombre */}
          <View style={S.homeBrand}>
            <Image
              source={logoSource}
              style={{ width: logoSize, height: logoSize }}
              resizeMode="contain"
            />
            <View style={S.brandText}>
              <Text style={[S.brandName, { color: colors.text }]} numberOfLines={1}>
                {logoName}
              </Text>
              {/* Badge EN VIVO — solo cuando hay partidos en vivo */}
              {liveCount > 0 && (
                <View style={S.liveBadge}>
                  <View style={S.liveDot} />
                  <Text style={S.liveText}>
                    EN VIVO{liveCount > 1 ? ` · ${liveCount}` : ''}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Derecha: acciones */}
          <View style={S.actions}>
            {showBell && <BellToggle {...bellProps} />}

            {showSearch && (
              <TouchableOpacity
                onPress={() => onSearchPress?.()}
                activeOpacity={0.65}
                hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                style={S.iconBtn}
              >
                <MagnifyingGlass size={22} color={ic(colors)} weight="regular" />
              </TouchableOpacity>
            )}

            {showSettings && (
              <TouchableOpacity
                onPress={() => onSettingsPress?.()}
                activeOpacity={0.65}
                hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                style={S.iconBtn}
              >
                <Gear size={22} color={ic(colors)} weight="regular" />
              </TouchableOpacity>
            )}
          </View>

        </View>
      </View>
    );
  }

  /* ── Modo PANTALLA INTERNA ─────────────────────────────── */
  const rightCount = (showBell ? 1 : 0) + (showSearch ? 1 : 0) + (showSettings ? 1 : 0);
  const sideW      = Math.max(44, rightCount * 40 + 8);

  return (
    <View style={[S.outer, { backgroundColor: colors.headerBg, borderBottomColor: colors.tabBarBorder, paddingTop: topPad }]}>
      <View style={[S.inner, { height: 54 }]}>

        {/* Izquierda */}
        <View style={[S.side, { width: sideW, alignItems: 'flex-start' }]}>
          {showBack ? (
            <TouchableOpacity
              hitSlop={{ top: 12, left: 12, right: 12, bottom: 12 }}
              onPress={handleBack}
              activeOpacity={0.65}
              style={S.iconBtn}
            >
              <CaretLeft size={22} color={ic(colors)} weight="regular" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {/* Centro */}
        <View style={S.center}>
          {!!title && (
            <Text numberOfLines={1} style={[S.title, { color: colors.headerText }]}>
              {title}
            </Text>
          )}
        </View>

        {/* Derecha */}
        <View style={[S.side, { width: sideW, alignItems: 'flex-end' }]}>
          <View style={S.actions}>
            {showBell && <BellToggle {...bellProps} />}

            {showSearch && (
              <TouchableOpacity
                style={S.iconBtn}
                onPress={() => onSearchPress?.()}
                activeOpacity={0.65}
                hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
              >
                <MagnifyingGlass size={22} color={ic(colors)} weight="regular" />
              </TouchableOpacity>
            )}

            {showSettings && (
              <TouchableOpacity
                style={S.iconBtn}
                onPress={() => onSettingsPress?.()}
                activeOpacity={0.65}
                hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
              >
                <Gear size={22} color={ic(colors)} weight="regular" />
              </TouchableOpacity>
            )}
          </View>
        </View>

      </View>
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  outer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
    elevation: 0,
    shadowOpacity: 0,
  },

  /* ── Home mode ── */
  homeInner: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  homeBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  brandText: {
    flexDirection: 'column',
    justifyContent: 'center',
    gap: 2,
  },
  brandName: {
    fontFamily: 'Poppins-Bold',
    fontSize: 17,
    lineHeight: 21,
    letterSpacing: -0.3,
  },

  /* Badge EN VIVO */
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(232,48,74,0.10)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 50,
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: 5, height: 5,
    borderRadius: 3,
    backgroundColor: BRAND.red,
  },
  liveText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 9,
    color: BRAND.red,
    letterSpacing: 0.4,
  },

  /* Acciones */
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Pantalla interna ── */
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  side: {
    justifyContent: 'center',
    flexShrink: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    minWidth: 0,
  },
  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 17,
    letterSpacing: -0.3,
    textAlign: 'center',
  },
});