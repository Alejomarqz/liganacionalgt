// components/BellToggle.js
import React from 'react';
import { TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { getBellIcon, bellA11yLabel } from '../utils/bell';
import { useTheme } from '../utils/ThemeContext';   // 👈 nuevo import

export default function BellToggle({
  on = false,
  dark = false,        // puedes seguir pasándolo a mano si quieres
  loading = false,
  size = 22,
  onPress,
  accessibilityLabel,
}) {
  const { theme } = useTheme();                     // 👈 leer tema global
  const isDarkTheme = theme?.mode === 'dark';

  if (loading) return <ActivityIndicator size="small" />;

  // si te pasan `dark` lo respetas, si no, usas el del tema
  const src = getBellIcon({ on, dark: dark || isDarkTheme });

  return (
    <TouchableOpacity
      onPress={onPress}
      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || bellA11yLabel(on)}
    >
      <Image
        source={src}
        style={{ width: size, height: size, resizeMode: 'contain' }}
      />
    </TouchableOpacity>
  );
}
