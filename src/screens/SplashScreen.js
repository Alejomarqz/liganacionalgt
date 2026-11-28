// src/screens/SplashScreen.js
// Pantalla de carga de marca (después del splash nativo, mismo fondo y escudo
// en el centro para que no haya corte). Anima el escudo con el destello de la
// diagonal, muestra la marca y precarga los datos del Inicio.
import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { fetchQuery } from '../api/store';
import { fetchers } from '../api/liga';
import { primeLogos } from '../api/logoRegistry';
import { seasonLabel } from '../api/clock';
import { palette } from '../design/tokens';
import Txt from '../ui/Text';

const LOGO = require('../../resources/logogrande.png');
const STADIUM = require('../../resources/estadios/1415.jpg');
const MIN_MS = 1800; // tiempo mínimo para que la animación se luzca
const MAX_MS = 4500; // nunca bloqueamos más que esto (sin internet entra igual)

export default function SplashScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const logo = useSharedValue(0);
  const sweep = useSharedValue(0);
  const text = useSharedValue(0);
  const bar = useSharedValue(0);
  const bg = useSharedValue(0);
  const done = useRef(false);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    logo.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.back(1.4)) });
    bg.value = withTiming(1, { duration: 900, easing: ease });
    sweep.value = withDelay(450, withRepeat(withSequence(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 0 }), withDelay(700, withTiming(0, { duration: 0 }))), -1));
    text.value = withDelay(500, withTiming(1, { duration: 600, easing: ease }));
    bar.value = withDelay(400, withTiming(0.85, { duration: MAX_MS - 600, easing: Easing.out(Easing.quad) }));

    const start = Date.now();
    const go = () => {
      if (done.current) return;
      done.current = true;
      bar.value = withTiming(1, { duration: 220 });
      setTimeout(() => navigation.reset({ index: 0, routes: [{ name: 'Home' }] }), 260);
    };

    // Precarga: lo que el Inicio muestra primero
    primeLogos();
    const prefetch = Promise.allSettled([
      fetchQuery('matches', fetchers.matches),
      fetchQuery('home', fetchers.home),
      fetchQuery('standings', fetchers.standings),
      fetchQuery('scorers', fetchers.scorers),
    ]);
    prefetch.then(() => setTimeout(go, Math.max(0, MIN_MS - (Date.now() - start))));
    const cap = setTimeout(go, MAX_MS);
    return () => clearTimeout(cap);
  }, [navigation, logo, sweep, text, bar, bg]);

  const logoStyle = useAnimatedStyle(() => ({ opacity: logo.value, transform: [{ scale: 0.82 + logo.value * 0.18 }, { translateY: -26 * text.value }] }));
  const sweepStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -160 + sweep.value * 320 }, { skewX: '-20deg' }], opacity: sweep.value > 0 && sweep.value < 1 ? 1 : 0 }));
  const textStyle = useAnimatedStyle(() => ({ opacity: text.value, transform: [{ translateY: 14 * (1 - text.value) }] }));
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));
  const bgStyle = useAnimatedStyle(() => ({ opacity: 0.22 * bg.value, transform: [{ scale: 1.08 - 0.08 * bg.value }] }));

  const size = Math.min(width * 0.34, 150);

  return (
    <View style={styles.root}>
      {/* Estadio en duotono, muy tenue */}
      <LinearGradient colors={[palette.blueDeep, palette.blueNight, palette.ink]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Animated.Image source={STADIUM} resizeMode="cover" style={[StyleSheet.absoluteFill, bgStyle]} />
      <LinearGradient colors={['rgba(6,10,23,0.2)', 'rgba(6,10,23,0.55)', palette.ink]} locations={[0, 0.6, 1]} style={StyleSheet.absoluteFill} />
      {/* Haces diagonales suaves */}
      <LinearGradient
        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.06)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[styles.beam, { left: '42%', width: 170 }]}
      />

      <View style={styles.center}>
        <Animated.View style={[{ width: size, height: size, overflow: 'hidden' }, logoStyle]}>
          <Image source={LOGO} style={{ width: size, height: size }} resizeMode="contain" />
          {/* Destello que recorre el escudo */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, sweepStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ position: 'absolute', top: -20, bottom: -20, left: size / 2 - 22, width: 44 }}
            />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[{ alignItems: 'center', marginTop: 4 }, textStyle]}>
          <Txt variant="h1" color="#fff" style={{ letterSpacing: 3, fontSize: 26 }}>
            LIGA NACIONAL
          </Txt>
          <Txt variant="overline" color="rgba(255,255,255,0.6)" style={{ marginTop: 6, letterSpacing: 2.4 }}>
            Guatemala · {seasonLabel()}
          </Txt>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, barStyle]}>
            <LinearGradient colors={[palette.sky, palette.blue]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
        <Txt variant="caption" color="rgba(255,255,255,0.45)" style={{ marginTop: 12 }}>
          App oficial
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.ink },
  beam: { position: 'absolute', top: -200, bottom: -200, transform: [{ skewX: '-20deg' }] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 64, alignItems: 'center' },
  track: { width: 140, height: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', transform: [{ skewX: '-20deg' }] },
  fill: { height: '100%' },
});
