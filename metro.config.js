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

// Ignorar carpetas temporales de compilación nativa (en Windows Metro se cae con ENOENT
// cuando Gradle crea y borra archivos dentro de node_modules/*/android/.cxx o /build)
const esc = (p) => p.replace(/[/\\]/g, '[/\\\\]');
const blockList = [
  new RegExp(esc('/android/.cxx/') + '.*'),
  new RegExp(esc('/android/build/') + '.*'),
  new RegExp(esc('/node_modules/') + '[^/\\\\]+' + esc('/android/.cxx/') + '.*'),
  new RegExp(esc('/ios/build/') + '.*'),
  new RegExp(esc('/ios/Pods/') + '.*'),
];
const prev = config.resolver?.blockList;
config.resolver = {
  ...config.resolver,
  blockList: [...(Array.isArray(prev) ? prev : prev ? [prev] : []), ...blockList],
};

module.exports = config;
