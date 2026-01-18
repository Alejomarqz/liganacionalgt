// AdFooter.js
import React from 'react';
import { SafeAreaView, View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '../utils/ThemeContext';

export default function AdFooter() {
  const { theme } = useTheme();
  const colors = theme.colors;

  // ⬇️ Mantén tu lógica exacta de IDs
  const unitId = __DEV__
    ? TestIds.BANNER
    : (Platform.OS === 'ios' || Platform.OS === 'macos'
        ? 'ca-app-pub-3710973902746391/7504779644'  // iOS real
        : 'ca-app-pub-3710973902746391/8895303811'); // Android real

  return (
    <SafeAreaView pointerEvents="box-none" style={S.wrap}>
      <View
        style={[
          S.bannerBox,
          {
            backgroundColor: colors.cardBg,      // antes #F7F8FA
            borderTopColor: colors.cardBorder,  // antes #ebe6e6ff
          },
        ]}
      >
        <BannerAd
          unitId={unitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        />
      </View>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  wrap: {
    backgroundColor: 'transparent',
  },
  bannerBox: {
    borderTopWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: -2 },
      },
      android: { elevation: 6 },
    }),
  },
});
