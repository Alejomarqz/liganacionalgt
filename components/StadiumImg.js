// components/StadiumImg.js
import React, { useState, useMemo } from 'react';
import {
  View, Image, useWindowDimensions,
  StyleSheet, Animated,
} from 'react-native';
import { stadiumUriCandidates } from '../utils/imagePaths';

/* ─── Fallback ───────────────────────────────────────────── */
const STADIUM_FALLBACK = require('../resources/stadium_fallback.webp');

/* ─── Layout tokens — deben coincidir con styles.card ───── */
const CARD_MARGIN_H = 8;
const CARD_PAD_H    = 14;

/* ══════════════════════════════════════════════════════════
   STADIUM IMG
   Props:
   - stadiumId     ID del estadio
   - ratio         relación de aspecto (default 16/9)
   - fullWidth     usa el ancho completo de pantalla
   - bleed         full-bleed dentro del card (quita padding)
   - borderRadius  radio de borde
   - style         estilos extra para la imagen
   - shimmer       muestra placeholder animado mientras carga
══════════════════════════════════════════════════════════ */
export default function StadiumImg({
  stadiumId,
  ratio        = 16 / 9,
  fullWidth    = true,
  bleed        = false,
  borderRadius = 0,
  style,
  shimmer      = true,
}) {
  const { width: screenW } = useWindowDimensions();

  /* ── Ancho calculado ── */
  const cardContentW = screenW - CARD_MARGIN_H * 2 - CARD_PAD_H * 2;
  const screenFullW  = screenW - (fullWidth ? 0 : CARD_MARGIN_H * 2);
  const w            = bleed || fullWidth ? screenFullW : cardContentW;
  const h            = Math.round(w / ratio);

  /* ── Lista de candidatos con fallback ── */
  const candidates = useMemo(() => {
    if (!stadiumId) return [STADIUM_FALLBACK];
    const uris = stadiumUriCandidates(stadiumId);
    if (!uris?.length) return [STADIUM_FALLBACK];
    return [...uris.map(uri => ({ uri })), STADIUM_FALLBACK];
  }, [stadiumId]);

  const [idx,     setIdx]     = useState(0);
  const [loaded,  setLoaded]  = useState(false);
  const fadeAnim              = React.useRef(new Animated.Value(0)).current;

  const source = candidates[Math.min(idx, candidates.length - 1)];

  const onLoad = () => {
    setLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 250, useNativeDriver: true,
    }).start();
  };

  const onError = () => {
    if (idx < candidates.length - 1) {
      setIdx(i => i + 1);
    } else {
      // Ya estamos en el fallback — igual hacemos fade in
      onLoad();
    }
  };

  const radius = bleed ? 0 : borderRadius;

  return (
    <View
      style={[
        bleed && { marginHorizontal: -CARD_PAD_H },
        { width: w, height: h, alignSelf: 'center' },
      ]}
    >
      {/* Shimmer placeholder mientras carga */}
      {shimmer && !loaded && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.shimmer,
            { borderRadius: radius },
          ]}
        />
      )}

      {/* Imagen con fade-in */}
      <Animated.Image
        source={source}
        onLoad={onLoad}
        onError={onError}
        style={[
          { width: w, height: h, borderRadius: radius },
          { opacity: fadeAnim },
          style,
        ]}
        resizeMode="cover"
      />
    </View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const styles = StyleSheet.create({
  shimmer: {
    backgroundColor: '#E0E3EC',
  },
});