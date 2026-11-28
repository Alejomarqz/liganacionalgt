// src/ui/StadiumBackdrop.js
// Foto en duotono azul Liga + haces diagonales suaves.
// La foto SIEMPRE termina en azul noche (también en modo claro): el contenido
// de abajo sube encima en una hoja redondeada (<ContentSheet/>), así nunca se
// ve la foto "lavada" ni una franja de corte.
import React, { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDesign } from '../design/useDesign';
import { palette } from '../design/tokens';
import { Beams } from './Slash';

const DEFAULT = require('../../resources/estadios/1415.jpg');
const NIGHT = palette.ink;

/**
 * mode:
 *  - 'duotone' (estadios): foto tenue sobre degradado azul Liga
 *  - 'photo'   (clubes / jugadores): foto a todo color, oscurecida abajo para leer texto
 */
function StadiumBackdrop({ uri, source, height, tint = 'brand', mode = 'duotone', children, style }) {
  const { colors } = useDesign();
  const [failed, setFailed] = useState(false);
  const img = source || (uri && !failed ? { uri } : DEFAULT);
  const base = tint === 'live' ? ['#5A0E1E', '#1A0711'] : colors.photoTint;
  const photo = mode === 'photo';

  return (
    <View style={[{ height, overflow: 'hidden', backgroundColor: NIGHT }, style]}>
      {!photo ? <LinearGradient colors={base} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      <Image source={img} onError={() => setFailed(true)} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: photo ? 1 : 0.3 }]} />
      <LinearGradient
        colors={photo ? ['rgba(6,10,23,0.55)', 'rgba(6,10,23,0.05)', 'rgba(6,10,23,0.55)', 'rgba(6,10,23,0.96)'] : ['rgba(6,10,23,0.30)', 'rgba(6,10,23,0.25)', 'rgba(6,10,23,0.80)']}
        locations={photo ? [0, 0.3, 0.7, 1] : [0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      {!photo ? <Beams /> : null}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/** Hoja de contenido que sube sobre la foto (esquinas superiores redondeadas). */
export const ContentSheet = memo(function ContentSheet({ children, style, overlap = 24 }) {
  const { colors } = useDesign();
  return <View style={[{ marginTop: -overlap, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.bg, paddingTop: 22 }, style]}>{children}</View>;
});

export default memo(StadiumBackdrop);
