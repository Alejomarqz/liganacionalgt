import React from 'react';
import { View, Image, useWindowDimensions } from 'react-native';
import { stadiumUriCandidates } from '../utils/imagePaths'; // Usamos la misma función para obtener las URLs de los estadios

const STADIUM_FALLBACK = require('../resources/stadium_fallback.webp'); // Imagen de respaldo si no hay imagen del estadio

// Ajusta si tu card cambia estos valores
const CARD_MARGIN_H = 8;   // styles.card -> marginHorizontal: 8
const CARD_PAD_H    = 14;  // styles.card -> paddingHorizontal: 14

export default function StadiumImg({
  stadiumId,         // ID del estadio
  ratio = 16 / 9,     // Relación de aspecto (por defecto 16:9)
  fullWidth = true,  // Si se ajusta al ancho completo de la pantalla
  bleed = false,      // Si se ajusta sin márgenes (full-bleed)
  borderRadius = 0,   // Radio de borde
  style,              // Estilos adicionales
}) {
  const { width: screenW } = useWindowDimensions();

  // A) Ancho de contenido del card (excluyendo márgenes y padding)
  const cardContentW = screenW - (CARD_MARGIN_H * 2) - (CARD_PAD_H * 2);
  // B) Ancho total de la pantalla (si fullWidth, sin márgenes)
  const screenFullW  = screenW - (fullWidth ? 0 : CARD_MARGIN_H * 2);

  // Si bleed=true, hacemos full-bleed dentro del card (quitando el padding del card)
  const containerStyle = bleed ? { marginHorizontal: -CARD_PAD_H } : null;

  const w = bleed || fullWidth ? screenFullW : cardContentW;

  // Usamos la función que ya tenías para obtener las URLs del estadio
  const candidates = React.useMemo(() => {
    const list = [];
    stadiumUriCandidates(stadiumId).forEach(uri =>
      list.push({ uri }) // Añadimos la URI del estadio
    );
    list.push(STADIUM_FALLBACK); // Si no se encuentra, mostramos una imagen por defecto
    return list;
  }, [stadiumId]);

  const [idx, setIdx] = React.useState(0); // Estado para cambiar entre las URLs en caso de error
  const source = candidates[Math.min(idx, candidates.length - 1)];

  return (
    <View style={containerStyle}>
      <Image
        source={source} // Usamos la imagen que obtuvimos o la de respaldo
        onError={() => setIdx(i => Math.min(i + 1, candidates.length - 1))} // Si hay error, probamos con la siguiente imagen
        style={[{ 
          width: w, 
          aspectRatio: ratio,  // Mantiene la relación de aspecto
          borderRadius: bleed ? 0 : borderRadius, 
          alignSelf: 'center', 
        }, style]}
        resizeMode="cover" // Ajuste de la imagen al contenedor
      />
    </View>
  );
}
