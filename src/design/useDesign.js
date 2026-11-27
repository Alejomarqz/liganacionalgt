// src/design/useDesign.js
// Hook único para el nuevo sistema. Se apoya en el ThemeContext existente
// (preferencia system/light/dark guardada) para que pantallas viejas y
// nuevas cambien de modo al mismo tiempo durante la migración.

import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../utils/ThemeContext';
import { themes, space, radius, type, fonts, motion, shadow } from './tokens';

export function useDesign() {
  const { effectiveMode, mode, setMode } = useTheme();
  const colors = effectiveMode === 'dark' ? themes.dark : themes.light;

  return useMemo(
    () => ({
      colors,
      space,
      radius,
      type,
      fonts,
      motion,
      isDark: colors.mode === 'dark',
      elevation: (level = 1) => shadow(colors.mode, level),
      mode,
      setMode,
    }),
    [colors, mode, setMode],
  );
}

// Crea estilos dependientes del tema y los memoiza por modo.
// Uso: const useStyles = makeStyles(d => ({ card: { backgroundColor: d.colors.surface } }));
export function makeStyles(factory) {
  const cache = {};
  return function useStyles() {
    const d = useDesign();
    const key = d.colors.mode;
    if (!cache[key]) {
      cache[key] = StyleSheet.create(factory(d));
    }
    return cache[key];
  };
}
