// src/screens/LigaManagerScreen.js
// Liga Manager · Próximamente.
// Al entrar se muestra un anuncio (intersticial) y un adelanto del juego.
// "Avísame cuando salga" suscribe al tema FCM `liga_manager` para anunciar el lanzamiento.
import React, { useEffect, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { CaretLeft, Package, UsersFour, Storefront, TrendUp, BellSimpleRinging, BellSimple } from 'phosphor-react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { palette, hitSlop } from '../design/tokens';
import { Txt, PressableScale } from '../ui';
import { showInterstitialIfReady } from '../../ads/AdManager';

const NOTIFY_KEY = '@lngt:v3:liga_manager_notify';

const FEATURES = [
  { Icon: Package, title: 'Abre sobres', text: 'Cartas Bronce, Plata, Oro y Élite de los jugadores reales de la Liga.' },
  { Icon: UsersFour, title: 'Arma tu once', text: 'Tú eres el DT: elige formación y busca la mejor química.' },
  { Icon: Storefront, title: 'Mercado', text: 'Compra y vende cartas con otros técnicos.' },
  { Icon: TrendUp, title: 'Jornada real', text: 'Tu once suma puntos con lo que pasa en la cancha cada fin de semana.' },
];

function BigCard({ colors, rating, label, rot, x, z, delay }) {
  const f = useSharedValue(0);
  useEffect(() => {
    const t = setTimeout(() => {
      f.value = withRepeat(withSequence(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.quad) })), -1);
    }, delay);
    return () => clearTimeout(t);
  }, [f, delay]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * f.value }, { rotate: `${rot}deg` }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: x, zIndex: z }, s]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.cardShine} />
        <Txt variant="h1" color={label === 'ORO' ? '#2A1E05' : '#fff'} style={{ fontSize: 34, lineHeight: 36 }}>
          {rating}
        </Txt>
        <View style={styles.silHead} />
        <View style={styles.silBody} />
        <Txt variant="overline" color={label === 'ORO' ? 'rgba(42,30,5,0.75)' : 'rgba(255,255,255,0.8)'} align="center" style={{ position: 'absolute', bottom: 12, left: 0, right: 0, fontSize: 9 }}>
          {label}
        </Txt>
      </LinearGradient>
    </Animated.View>
  );
}

export default function LigaManagerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [notify, setNotify] = useState(false);

  useEffect(() => {
    // Anuncio al entrar (si hay uno listo; no bloquea si no carga)
    const t = setTimeout(() => showInterstitialIfReady('liga_manager'), 350);
    AsyncStorage.getItem(NOTIFY_KEY).then((v) => setNotify(v === '1'));
    return () => clearTimeout(t);
  }, []);

  const subscribe = async () => {
    try {
      await messaging().subscribeToTopic('liga_manager');
    } catch {}
    await AsyncStorage.setItem(NOTIFY_KEY, '1');
    setNotify(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#04060E' }}>
      <LinearGradient colors={['rgba(242,193,78,0.28)', 'rgba(30,63,216,0.25)', 'rgba(4,6,14,0)']} locations={[0, 0.35, 0.7]} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 12 }}>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver" style={styles.back}>
            <CaretLeft size={20} color="#fff" weight="bold" />
          </PressableScale>
        </View>

        <View style={{ height: 250, alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
          <View style={{ width: 300, height: 220 }}>
            <BigCard colors={['#F3F5FA', '#8A94A8']} rating={74} label="PLATA" rot={-12} x={10} z={1} delay={300} />
            <BigCard colors={['#3B7BFF', '#0A1440']} rating={86} label="ÉLITE" rot={11} x={150} z={2} delay={600} />
            <BigCard colors={['#FFE9A3', '#F2C14E', '#B8862B']} rating={84} label="ORO" rot={0} x={80} z={3} delay={0} />
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, alignItems: 'center' }}>
          <View style={styles.badge}>
            <Txt variant="overline" color="#2A1E05">
              Próximamente
            </Txt>
          </View>
          <Txt variant="display" color="#fff" align="center" style={{ marginTop: 12 }}>
            Liga Manager
          </Txt>
          <Txt variant="body" color="#9AA3BF" align="center" style={{ marginTop: 6 }}>
            El juego de cartas oficial de la Liga Nacional. Colecciona a los jugadores reales y demuestra que eres el mejor DT de Guatemala.
          </Txt>
        </View>

        <View style={{ marginTop: 24, marginHorizontal: 16, gap: 10 }}>
          {FEATURES.map(({ Icon, title, text }) => (
            <View key={title} style={styles.feature}>
              <View style={styles.featureIcon}>
                <Icon size={22} color={palette.sky} weight="duotone" />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="h3" color="#fff">
                  {title}
                </Txt>
                <Txt variant="caption" color="#9AA3BF">
                  {text}
                </Txt>
              </View>
            </View>
          ))}
        </View>

        <PressableScale onPress={notify ? undefined : subscribe} style={[styles.cta, notify ? { backgroundColor: 'rgba(46,211,160,0.15)' } : null]}>
          {notify ? <BellSimpleRinging size={18} color="#2ED3A0" weight="fill" /> : <BellSimple size={18} color="#14214F" weight="bold" />}
          <Txt variant="bodyStrong" color={notify ? '#2ED3A0' : '#14214F'} style={{ fontFamily: 'Inter-ExtraBold' }}>
            {notify ? 'Te avisaremos cuando salga' : 'AVÍSAME CUANDO SALGA'}
          </Txt>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  back: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  card: { width: 130, height: 184, borderRadius: 14, padding: 14, overflow: 'hidden' },
  cardShine: { position: 'absolute', top: -30, bottom: -30, left: 70, width: 26, backgroundColor: 'rgba(255,255,255,0.3)', transform: [{ skewX: '-20deg' }] },
  silHead: { position: 'absolute', right: 26, top: 40, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.22)' },
  silBody: { position: 'absolute', right: 12, top: 84, width: 68, height: 40, borderTopLeftRadius: 34, borderTopRightRadius: 34, backgroundColor: 'rgba(0,0,0,0.22)' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 6, backgroundColor: '#FFC24B' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)' },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(54,160,255,0.14)' },
  cta: { marginTop: 24, marginHorizontal: 16, height: 52, borderRadius: 12, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
