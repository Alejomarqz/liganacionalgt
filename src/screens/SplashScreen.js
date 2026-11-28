// src/screens/SplashScreen.js
// Pantalla de carga: fondo blanco (igual que el arranque nativo) y el escudo
// que SE LLENA de abajo hacia arriba mientras se cargan los datos del Inicio.
// Al completarse: destello diagonal, aparece la marca y entra a la app.
import React, { useEffect, useRef, useState } from 'react';
import { Image, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { fetchQuery } from '../api/store';
import { fetchers } from '../api/liga';
import { primeLogos } from '../api/logoRegistry';
import { seasonLabel } from '../api/clock';
import { palette } from '../design/tokens';
import Txt from '../ui/Text';

const LOGO = require('../../resources/logogrande.png');
const MIN_MS = 1600; // tiempo mínimo: que la animación se vea completa
const MAX_MS = 5000; // sin internet igual entra (con lo guardado)

const STEPS = [
  ['matches', 'Cargando partidos…', fetchers.matches],
  ['standings', 'Actualizando la tabla…', fetchers.standings],
  ['home', 'Preparando la jornada…', fetchers.home],
  ['scorers', 'Buscando goleadores…', fetchers.scorers],
];

export default function SplashScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const size = Math.min(width * 0.36, 156);
  const fill = useSharedValue(0); // 0..1 cuánto del escudo está lleno
  const appear = useSharedValue(0);
  const shine = useSharedValue(0);
  const brand = useSharedValue(0);
  const out = useSharedValue(1);
  const [message, setMessage] = useState('Cargando…');
  const finished = useRef(false);

  useEffect(() => {
    appear.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    // Avance "vivo" mientras llegan las respuestas (nunca se queda quieto)
    fill.value = withTiming(0.18, { duration: 500, easing: Easing.out(Easing.quad) });

    const start = Date.now();
    let done = 0;
    primeLogos();

    const leave = () => navigation.reset({ index: 0, routes: [{ name: 'Home' }] });

    const finish = () => {
      if (finished.current) return;
      finished.current = true;
      setMessage('¡Listo!');
      const wait = Math.max(0, MIN_MS - (Date.now() - start));
      fill.value = withDelay(wait, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
      shine.value = withDelay(wait + 380, withTiming(1, { duration: 650, easing: Easing.inOut(Easing.quad) }));
      brand.value = withDelay(wait + 300, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
      out.value = withDelay(
        wait + 1250,
        withTiming(0, { duration: 260 }, (ok) => {
          if (ok) runOnJS(leave)();
        }),
      );
    };

    STEPS.forEach(([key, msg, fetcher], i) => {
      if (i === 0) setMessage(msg);
      fetchQuery(key, fetcher)
        .catch(() => {})
        .finally(() => {
          done += 1;
          if (finished.current) return;
          fill.value = withTiming(0.18 + (0.72 * done) / STEPS.length, { duration: 420, easing: Easing.out(Easing.quad) });
          if (STEPS[done]) setMessage(STEPS[done][1]);
          if (done === STEPS.length) finish();
        });
    });
    const cap = setTimeout(finish, MAX_MS);
    return () => clearTimeout(cap);
  }, [navigation, fill, appear, shine, brand, out]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: out.value }));
  const logoWrap = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: 0.9 + appear.value * 0.1 + Math.sin(shine.value * Math.PI) * 0.04 }],
  }));
  const fillStyle = useAnimatedStyle(() => ({ height: size * fill.value }));
  const shineStyle = useAnimatedStyle(() => ({ transform: [{ translateX: -size + shine.value * size * 2 }, { skewX: '-20deg' }], opacity: shine.value > 0 && shine.value < 1 ? 1 : 0 }));
  const brandStyle = useAnimatedStyle(() => ({ opacity: brand.value, transform: [{ translateY: 12 * (1 - brand.value) }] }));
  const msgStyle = useAnimatedStyle(() => ({ opacity: appear.value * (1 - brand.value) }));

  return (
    <Animated.View style={[styles.root, rootStyle]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.center}>
        <Animated.View style={[{ width: size, height: size }, logoWrap]}>
          {/* Silueta del escudo (vacío) */}
          <Image source={LOGO} style={[StyleSheet.absoluteFill, { width: size, height: size, tintColor: '#E7ECF6' }]} resizeMode="contain" />
          {/* Escudo real que se llena de abajo hacia arriba */}
          <Animated.View style={[styles.fill, { width: size }, fillStyle]}>
            <Image source={LOGO} style={{ position: 'absolute', bottom: 0, width: size, height: size }} resizeMode="contain" />
          </Animated.View>
          {/* Destello diagonal al completar */}
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
            <Animated.View style={[{ position: 'absolute', top: -20, bottom: -20, left: size / 2 - 20, width: 40 }, shineStyle]}>
              <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          </View>
        </Animated.View>

        <View style={{ height: 72, alignItems: 'center', justifyContent: 'center', marginTop: 18 }}>
          <Animated.View style={[{ position: 'absolute', alignItems: 'center' }, brandStyle]}>
            <Txt variant="h1" color={palette.ink} style={{ letterSpacing: 3, fontSize: 24 }}>
              LIGA NACIONAL
            </Txt>
            <Txt variant="overline" color={palette.blue} style={{ marginTop: 4, letterSpacing: 2.4 }}>
              Guatemala · {seasonLabel()}
            </Txt>
          </Animated.View>
          <Animated.View style={msgStyle}>
            <Txt variant="caption" color="#8A93AD" style={{ fontFamily: 'Inter-Medium' }}>
              {message}
            </Txt>
          </Animated.View>
        </View>
      </View>
      <Txt variant="caption" color="#B3BACB" align="center" style={styles.footer}>
        App oficial de la Liga Nacional de Fútbol de Guatemala
      </Txt>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fill: { position: 'absolute', left: 0, bottom: 0, overflow: 'hidden' },
  footer: { position: 'absolute', left: 24, right: 24, bottom: 48, fontSize: 11 },
});
