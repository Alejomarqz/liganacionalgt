// AdFooter.js
import React from 'react';
import { SafeAreaView, View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useTheme } from '../utils/ThemeContext';

export default function AdFooter() {
  const { theme } = useTheme();
  const colors = theme.colors;

  const unitId = __DEV__
    ? TestIds.BANNER
    : (Platform.OS === 'ios' || Platform.OS === 'macos'
        ? 'ca-app-pub-5408077761010566/9891088729'  // iOS — banner_footer
        : 'ca-app-pub-5408077761010566/3778912498'); // Android — banner_footer

  return (
    <SafeAreaView pointerEvents="box-none" style={S.wrap}>
      <View
        style={[
          S.bannerBox,
          {
            backgroundColor: colors.cardBg,
            borderTopColor:  colors.cardBorder,
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