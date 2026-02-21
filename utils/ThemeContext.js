// utils/ThemeContext.js
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { lightTheme, darkTheme } from './theme';

const STORAGE_KEY = 'fc_theme_mode_v1';

// mode = preferencia del usuario: 'system' | 'light' | 'dark'
// effectiveMode = lo que se está usando de verdad: 'light' | 'dark'
const ThemeContext = createContext({
  mode: 'system',
  effectiveMode: 'light',
  theme: lightTheme,
  hydrated: false,
  toggleTheme: () => {},
  setMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  // preferencia del usuario
  const [mode, setMode] = useState('system');
  const [hydrated, setHydrated] = useState(false);

  // tema real del sistema (claro/oscuro)
  const [systemScheme, setSystemScheme] = useState(
    Appearance.getColorScheme() || 'light'
  );

  // escuchar cambios del sistema (iOS/Android tema oscuro)
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme || 'light');
    });
    return () => sub?.remove?.();
  }, []);

  // Leer preferencia guardada
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setMode(saved);
        } else {
          setMode('system');
        }
      } catch (e) {
        setMode('system');
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Guardar cuando cambie la preferencia
  useEffect(() => {
    AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {});
  }, [mode]);

  // Modo efectivo que realmente usamos
  const effectiveMode = mode === 'system' ? systemScheme : mode;
  const theme = effectiveMode === 'dark' ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      mode,           // preferencia ('system' | 'light' | 'dark')
      effectiveMode,  // lo que realmente se usa ('light' | 'dark')
      theme,
      hydrated,
      setMode,
      // toggle simple entre claro/oscuro (si quieres usarlo en algún lado)
      toggleTheme: () =>
        setMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
    }),
    [mode, effectiveMode, theme, hydrated]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);

// HOC para clases (Home, Schedule, etc.)
export const withTheme = (Wrapped) => (props) => {
  const ctx = useTheme();
  return (
    <Wrapped
      {...props}
      theme={ctx.theme}
      themeMode={ctx.mode}
      themeEffectiveMode={ctx.effectiveMode}
      setThemeMode={ctx.setMode}
      toggleTheme={ctx.toggleTheme}
    />
  );
};
