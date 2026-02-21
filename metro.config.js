// metro.config.js — compatible con Reanimated 3.x (wrapper nuevo o plugin viejo)
console.log('[METRO] Cargando config desde', __filename);

const { getDefaultConfig } = require('@react-native/metro-config');
let config = getDefaultConfig(__dirname);

// Intentar wrapper nuevo
try {
  const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');
  if (typeof wrapWithReanimatedMetroConfig === 'function') {
    config = wrapWithReanimatedMetroConfig(config);
  }
} catch (_) {}

// Fallback al plugin viejo
try {
  const withReanimated = require('react-native-reanimated/metro-plugin');
  if (typeof withReanimated === 'function') {
    config = withReanimated(config);
  }
} catch (_) {}

module.exports = config;
