// ads/NativeAdCard.js
// Anuncio nativo con el diseño de la app (se ve como una tarjeta más, rinde más que un banner).
// API v15 de react-native-google-mobile-ads: NativeAd.createForAdRequest + NativeAdView/NativeAsset.
// Si el módulo no existe, no hay anuncio o falla: no se muestra nada (sin huecos).
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import * as GMA from 'react-native-google-mobile-ads';
import AD_UNITS from './AdConfig';
import { useDesign } from '../src/design/useDesign';

const { NativeAd, NativeAdView, NativeAsset, NativeAssetType, NativeMediaView } = GMA;
const SUPPORTED = Boolean(NativeAd?.createForAdRequest && NativeAdView && NativeAsset && NativeAssetType);

export default function NativeAdCard({ style, media = false }) {
  const { colors, isDark } = useDesign();
  const [ad, setAd] = useState(null);

  useEffect(() => {
    if (!SUPPORTED) return undefined;
    let alive = true;
    let created = null;
    NativeAd.createForAdRequest(AD_UNITS.NATIVE_INLINE)
      .then((a) => {
        created = a;
        if (alive) setAd(a);
        else a?.destroy?.();
      })
      .catch(() => {});
    return () => {
      alive = false;
      created?.destroy?.();
    };
  }, []);

  if (!SUPPORTED || !ad) return null;

  const T = NativeAssetType;
  return (
    <View style={[styles.wrap, style]}>
      <NativeAdView nativeAd={ad} style={[styles.card, { backgroundColor: colors.surface, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(10,20,64,0.06)' }]}>
        <View style={styles.top}>
          {ad.icon?.url ? (
            <NativeAsset assetType={T.ICON}>
              <Image source={{ uri: ad.icon.url }} style={styles.icon} />
            </NativeAsset>
          ) : null}
          <View style={{ flex: 1 }}>
            <View style={styles.labelRow}>
              {/* Atribución obligatoria */}
              <Text style={[styles.label, { color: colors.textMuted, borderColor: colors.divider }]}>Anuncio</Text>
              {ad.advertiser && T.ADVERTISER ? (
                <NativeAsset assetType={T.ADVERTISER}>
                  <Text numberOfLines={1} style={[styles.advertiser, { color: colors.textMuted }]}>
                    {ad.advertiser}
                  </Text>
                </NativeAsset>
              ) : null}
            </View>
            <NativeAsset assetType={T.HEADLINE}>
              <Text numberOfLines={2} style={[styles.headline, { color: colors.text }]}>
                {ad.headline}
              </Text>
            </NativeAsset>
          </View>
        </View>

        {ad.body && T.BODY ? (
          <NativeAsset assetType={T.BODY}>
            <Text numberOfLines={2} style={[styles.body, { color: colors.textSecondary || colors.textMuted }]}>
              {ad.body}
            </Text>
          </NativeAsset>
        ) : null}

        {media && NativeMediaView ? <NativeMediaView style={styles.media} resizeMode="cover" /> : null}

        {ad.callToAction ? (
          <NativeAsset assetType={T.CALL_TO_ACTION}>
            <Text style={[styles.cta, { backgroundColor: colors.primary }]}>{ad.callToAction}</Text>
          </NativeAsset>
        ) : null}
      </NativeAdView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 16 },
  card: { borderRadius: 18, padding: 14, borderWidth: 1, gap: 10 },
  top: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 48, height: 48, borderRadius: 12 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  label: { fontFamily: 'Inter-Bold', fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', borderWidth: 1, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  advertiser: { fontFamily: 'Inter-Medium', fontSize: 11, flexShrink: 1 },
  headline: { fontFamily: 'Inter-Bold', fontSize: 15, lineHeight: 20 },
  body: { fontFamily: 'Inter-Regular', fontSize: 13, lineHeight: 18 },
  media: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden' },
  cta: { overflow: 'hidden', alignSelf: 'stretch', textAlign: 'center', color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14, paddingVertical: 11, borderRadius: 12 },
});
