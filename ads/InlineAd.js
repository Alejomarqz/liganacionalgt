import React, { useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

export default function InlineAd() {
  const [loaded, setLoaded] = useState(false);
  const [showAd, setShowAd] = useState(true); // Controlar si se debe mostrar el banner
  const adUnitId = __DEV__
    ? TestIds.BANNER
    : (Platform.OS === 'ios'
        ? 'ca-app-pub-3710973902746391/7504779644'   // iOS real
        : 'ca-app-pub-3710973902746391/8895303811'); // Android real

  // Función para recargar el banner después de un tiempo (60 segundos)
  useEffect(() => {
    const interval = setInterval(() => {
      setShowAd(false);  // Ocultar el anuncio
      setLoaded(false);  // Marcar como no cargado
      setTimeout(() => {
        setShowAd(true);  // Mostrar nuevamente el anuncio después de ocultarlo
      }, 100);  // Pequeña demora para asegurarse que el banner se recargue
    }, 60000); // 60000ms = 60 segundos

    return () => clearInterval(interval); // Limpiar el intervalo cuando el componente se desmonte
  }, []);

  return (
    <View style={S.wrap}>
      {showAd && (
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: false }}
          onAdLoaded={() => setLoaded(true)}  // Cuando se carga el anuncio
          onAdFailedToLoad={(error) => console.log('Ad failed to load:', error)}  // Si falla la carga
          style={S.card}
        />
      )}
    </View>
  );
}

const S = StyleSheet.create({
  wrap: {
    marginVertical: 8,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
