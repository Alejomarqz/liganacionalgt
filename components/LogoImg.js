import React, { useState, useEffect } from 'react';
import { Image } from 'react-native';
import { logoUriCandidates } from '../utils/imagePaths'; // Función que genera las URLs del logo

export default function LogoImg({ teamId, size = 18, style, resizeMode = 'contain', ...rest }) {

  if (!teamId) {
    console.log("No se pasó el teamId correctamente");
    return null; // No renderizamos nada si no hay teamId
  }

  const [logoUri, setLogoUri] = useState(null); // Empezamos sin logo (o null)
  const candidates = logoUriCandidates(teamId) || []; // Generamos las URLs del logo

  // Solo actualizar logoUri si cambian los candidatos
  useEffect(() => {
    if (candidates.length > 0 && candidates[0] !== logoUri) {
      setLogoUri(candidates[0]); // Actualizamos solo si hay un cambio
    }
  }, [teamId, candidates, logoUri]); // Solo cuando teamId o candidates cambian

  // Si no hay logoUri, no renderizamos nada
  if (!logoUri) return null;

    return (
    <Image
      source={{ uri: logoUri }}
      style={[{ width: size, height: size }, style]}
      resizeMode={resizeMode}
      {...rest}   // ✅ esto permite onLoad/onError
    />
  );

}
