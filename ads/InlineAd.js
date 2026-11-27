// ads/InlineAd.js
// ─── Banner inline para insertar dentro de listas (posiciones, partidos) ───
import React, { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize } from 'react-native-google-mobile-ads';
import { useTheme } from '../utils/ThemeContext';
import AD_UNITS from './AdConfig';

export default function InlineAd({ style }) {
  const [loaded, setLoaded] = useState(false);
  const { theme } = useTheme();
  const colors = theme.colors;
  const isDark = theme.mode === 'dark';

  return (
    <View style={[S.wrap, !loaded && S.collapsed, style]}>
      <BannerAd
        unitId={AD_UNITS.BANNER_INLINE}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setLoaded(false)}
        style={[
          S.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
          },
        ]}
      />
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    marginVertical: 6,
    alignItems: 'center',
    overflow: 'hidden',
  },
  collapsed: {
    height: 0,
    marginVertical: 0,
  },
  card: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
      },
      android: { elevation: 2 },
    }),
  },
});