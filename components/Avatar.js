// components/Avatar.js
import React from 'react';
import { View, Text, StyleSheet, Image, Animated } from 'react-native';
import { playerImgById, defaultPlayer } from '../utils/imagePaths'; // 👈 ruta corregida
const DEFAULT_LOCAL = require('../resources/default.webp');          // 👈 .webp local

/* ========= Chip reutilizable ========= */
export function RatingChip({ value, style, textStyle }) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const bg = n >= 7 ? '#1e8f4c' : n >= 6 ? '#e0b000' : '#d26a19';
  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      <Text style={[styles.chipText, textStyle]}>{n.toFixed(1)}</Text>
    </View>
  );
}

/* ========= Cache de URLs fallidas en esta sesión ========= */
const FAILED = new Set();

/* ========= Avatar principal (sin FastImage) =========
   Props:
   - id?: string|number       -> arma la URL con playerImgById
   - uri?: string             -> si ya tienes una URL
   - player?: any             -> saca candidatos desde el feed (photo, images.*, etc.)
   - size?: number            -> 40 por defecto
   - rounded?: boolean        -> true = círculo
   - borderColor?: string     -> #e7e7e7
   - borderWidth?: number     -> 1
   - overlayRating?: number   -> pinta chip con la nota
   - overlayOffset?: number   -> 8 (más alto => más abajo)
*/
export default function Avatar({
  id,
  uri,
  player,
  size = 40,
  rounded = true,
  borderColor = '#e7e7e7',
  borderWidth = 1,
  overlayRating,
  overlayOffset = 8,
  style,
  imageStyle,
}) {
  // Construir candidatos (feed → id/cdn → default remoto)
  const candidates = React.useMemo(() => {
    const list = [];

    const add = (v) => {
      if (typeof v === 'string' && v.length > 4 && !FAILED.has(v)) list.push(v);
    };

    add(uri);

    if (player) {
      add(player.photo); add(player.image); add(player.img);
      add(player.headshot); add(player.avatar); add(player.portrait); add(player.foto);
      add(player?.images?.portrait); add(player?.images?.headshot);
      add(player?.images?.default);  add(player?.images?.main);
    }

    if (id != null) add(playerImgById(String(id)));
    const defRemote = defaultPlayer && defaultPlayer();
    add(defRemote);

    // únicos y limpios
    return Array.from(new Set(list));
  }, [id, uri, player]);

  const [idx, setIdx] = React.useState(0);
  const fade = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => { setIdx(0); fade.setValue(0); }, [candidates.join('|')]);

  const current = candidates[idx] || null;
  const radius = rounded ? size / 2 : Math.max(4, Math.round(size * 0.15));

  const onLoad = () => {
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  };
  const onError = () => {
    if (current) FAILED.add(current);
    setIdx((i) => (i + 1 < candidates.length ? i + 1 : i));
    fade.setValue(0);
  };

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* 1) Placeholder local inmediato */}
      <Image
        source={DEFAULT_LOCAL}
        style={[
          styles.img,
          { width: size, height: size, borderRadius: radius, borderWidth, borderColor },
          imageStyle,
        ]}
        resizeMode="cover"
      />

      {/* 2) Remoto con fade-in (solo si hay URL válida) */}
      {current ? (
        <Animated.Image
          source={{ uri: current }}
          style={[
            StyleSheet.absoluteFill,
            styles.img,
            { width: size, height: size, borderRadius: radius, borderWidth, borderColor, opacity: fade },
            imageStyle,
          ]}
          resizeMode="cover"
          onLoad={onLoad}
          onError={onError}
          accessibilityLabel="Foto de jugador"
        />
      ) : null}

      {/* 3) Chip de rating (opcional) */}
      {overlayRating != null && Number(overlayRating) > 0 && (
        <View
          pointerEvents="none"
          style={[
            styles.overlayWrap,
            { left: size / 2 - 13, bottom: 2 - overlayOffset },
          ]}
        >
          <RatingChip value={overlayRating} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: '#e5e7eb' },
  chip: {
    paddingHorizontal: 6,
    minWidth: 26,
    height: 16,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 2,
  },
  chipText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  overlayWrap: { position: 'absolute' },
});
