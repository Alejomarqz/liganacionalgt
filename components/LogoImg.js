// components/LogoImg.js
// Logo de equipo desde la API Liga Nacional GT.
// Prioridad: uri explícita → team.logo → registro global por teamId → fallback local.
import React, { useState } from 'react';
import { Image } from 'react-native';
import { getTeamLogo } from '../src/api/logoRegistry';

const FALLBACK = require('../resources/logo_fallback.png');

export default function LogoImg({ teamId, team, uri, size = 18, style, resizeMode = 'contain', ...rest }) {
  const [failed, setFailed] = useState(false);
  const resolved = uri || team?.logo || getTeamLogo(teamId ?? team?.id);
  const source = !resolved || failed ? FALLBACK : { uri: resolved };

  return (
    <Image
      source={source}
      style={[{ width: size, height: size }, style]}
      resizeMode={resizeMode}
      {...rest}
      onError={(e) => {
        setFailed(true);
        rest.onError?.(e);
      }}
    />
  );
}
