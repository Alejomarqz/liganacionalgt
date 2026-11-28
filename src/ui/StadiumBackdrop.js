// src/ui/StadiumBackdrop.js
// Foto de estadio en duotono azul Liga + haces diagonales + fundido al fondo.
// En RN no hay mix-blend-mode: el duotono se logra con la foto en baja opacidad
// sobre el degradado de marca, que da el mismo resultado visual.
import React, { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useDesign } from '../design/useDesign';
import { Beams } from './Slash';

const DEFAULT = require('../../resources/estadios/1415.jpg');

function StadiumBackdrop({ uri, source, height, tint = 'brand', children, style }) {
  const { colors } = useDesign();
  const [failed, setFailed] = useState(false);
  const img = source || (uri && !failed ? { uri } : DEFAULT);
  const base = tint === 'live' ? ['#5A0E1E', '#1A0711'] : colors.photoTint;

  return (
    <View style={[{ height, overflow: 'hidden' }, style]}>
      <LinearGradient colors={base} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <Image source={img} onError={() => setFailed(true)} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: 0.32 }]} blurRadius={0.5} />
      <LinearGradient
        colors={['rgba(6,10,23,0.25)', 'rgba(6,10,23,0.35)', colors.bg]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <Beams />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

export default memo(StadiumBackdrop);
