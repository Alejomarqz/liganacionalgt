// src/ui/TeamCrest.js
// Escudo del equipo: siempre desde la API de Liga Nacional GT (team.logo).
// Si la imagen falla, muestra monograma con las siglas (nunca un hueco vacío).
import React, { memo, useState } from 'react';
import { Image, View } from 'react-native';
import { useDesign } from '../design/useDesign';
import Txt from './Text';

function TeamCrest({ team, size = 36, style }) {
  const { colors } = useDesign();
  const [failed, setFailed] = useState(false);
  const uri = team?.logo;
  const initials = (team?.short || team?.name || '?').slice(0, 3).toUpperCase();

  if (!uri || failed) {
    return (
      <View
        accessibilityLabel={team?.name}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: colors.primarySoft,
            alignItems: 'center',
            justifyContent: 'center',
          },
          style,
        ]}
      >
        <Txt variant="overline" tone="brand" style={{ fontSize: Math.max(8, size * 0.26), letterSpacing: 0.3 }}>
          {initials}
        </Txt>
      </View>
    );
  }

  return (
    <Image
      accessibilityLabel={team?.name}
      source={{ uri }}
      onError={() => setFailed(true)}
      resizeMode="contain"
      fadeDuration={150}
      style={[{ width: size, height: size }, style]}
    />
  );
}

export default memo(TeamCrest, (a, b) => a.team?.logo === b.team?.logo && a.size === b.size && a.team?.short === b.team?.short);
