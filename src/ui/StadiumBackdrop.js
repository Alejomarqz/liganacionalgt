// src/ui/StadiumBackdrop.js
// Foto en duotono azul Liga (o foto del club) que se funde suavemente con la
// página. Se mantiene oscura la mayor parte del alto (para leer en blanco) y
// solo al final se disuelve hacia el color de fondo, en claro y en oscuro.
import React, { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDesign } from '../design/useDesign';
import { palette } from '../design/tokens';
import { Beams } from './Slash';

const DEFAULT = require('../../resources/estadios/1415.jpg');
const NIGHT = palette.ink;

/**
 * mode: 'duotone' (estadio, tono azul Liga) · 'photo' (foto del club a todo color)
 */
function StadiumBackdrop({ uri, source, height, tint = 'brand', mode = 'duotone', children, style }) {
  const { colors } = useDesign();
  const [failed, setFailed] = useState(false);
  const img = source || (uri && !failed ? { uri } : DEFAULT);
  const base = tint === 'live' ? ['#5A0E1E', '#1A0711'] : colors.photoTint;
  const photo = mode === 'photo';
  const bg = colors.bg;

  // Fundido largo y suave (el que se veía mejor): la foto se va disolviendo
  // desde la mitad hasta el color de la página, sin escalones ni cortes.
  const fade = photo
    ? { colors: ['rgba(6,10,23,0.55)', 'rgba(6,10,23,0.05)', 'rgba(6,10,23,0.5)', bg], locations: [0, 0.3, 0.62, 1] }
    : { colors: ['rgba(6,10,23,0.25)', 'rgba(6,10,23,0.35)', bg], locations: [0, 0.5, 1] };

  return (
    <View style={[{ height, overflow: 'hidden', backgroundColor: NIGHT }, style]}>
      {!photo ? <LinearGradient colors={base} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} /> : null}
      <Image source={img} onError={() => setFailed(true)} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: photo ? 1 : 0.32 }]} />
      {!photo ? <Beams /> : null}
      <LinearGradient colors={fade.colors} locations={fade.locations} style={StyleSheet.absoluteFill} />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

/** Contenedor del contenido que sigue a la foto (sin corte duro). */
export const ContentSheet = memo(function ContentSheet({ children, style }) {
  return <View style={[{ paddingTop: 4 }, style]}>{children}</View>;
});

export default memo(StadiumBackdrop);
