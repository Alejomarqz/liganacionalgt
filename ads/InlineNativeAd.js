// components/InlineNativeAd.js
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { TestIds } from 'react-native-google-mobile-ads';

// Carga segura del submódulo de Native Ads (v15 usa 'native-ads')
let NativeAds = {};
try {
  NativeAds = require('react-native-google-mobile-ads/native-ads');
} catch (e1) {
  try {
    // fallback por si en tu versión el path cambia
    NativeAds = require('react-native-google-mobile-ads/native');
  } catch (e2) {
    NativeAds = {};
  }
}

const {
  NativeAdView,
  HeadlineView,
  TaglineView,
  ImageView,
  CallToActionView,
} = NativeAds;

export default function InlineNativeAd() {
  // Si el submódulo no cargó, no intentes renderizarlo
  if (!NativeAdView || !HeadlineView) {
    console.warn('[Ads] NativeAds module not available yet.');
    return null;
  }

  const adUnitId = __DEV__
    ? TestIds.NATIVE_ADVANCED
    : (Platform.OS === 'android'
        ? 'ca-app-pub-3710973902746391/9122643056'
        : 'ca-app-pub-3710973902746391/7555228750');

  const adRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (mounted) adRef.current?.loadAd?.();
  }, [mounted]);

  if (!mounted) return null;

  return (
    <View style={S.wrap}>
      <NativeAdView
        nativeAd={{ responseId: '' }}
        ref={adRef}
        adUnitID={adUnitId}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={(e) => {
          setLoaded(false);
          console.log('Native ad failed:', e?.message);
        }}
        style={S.card}
      >
        <View style={S.row}>
          <ImageView style={S.image} />
          <View style={S.textBox}>
            <HeadlineView style={S.title} numberOfLines={1} />
            <TaglineView style={S.tag} numberOfLines={2} />
            <CallToActionView style={S.button} textStyle={S.buttonText} />
          </View>
        </View>
      </NativeAdView>
      {!loaded && <View style={{ height: 6 }} />}
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 8, marginBottom: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  image: { width: 70, height: 70, borderRadius: 8 },
  textBox: { flex: 1, marginLeft: 10 },
  title: { fontWeight: 'bold', fontSize: 15, color: '#111' },
  tag: { color: '#555', fontSize: 13, marginVertical: 4 },
  button: { borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start' },
  buttonText: { fontSize: 13, fontWeight: '600' },
});
