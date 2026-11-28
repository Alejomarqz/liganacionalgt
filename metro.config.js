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
// cuando Gradle crea y borra archivos dentro de node_modules/*/android/.cxx o /build).
// OJO: sin "/" en los patrones — en Windows Metro reemplaza "/" por "\\" y rompe la expresión.
const SEP = '[^\\w.-]'; // separador de carpetas (\\ o /) sin escribir "/"
const blockList = [
  new RegExp(`${SEP}android${SEP}\\.cxx${SEP}.*`),
  new RegExp(`${SEP}android${SEP}build${SEP}.*`),
  new RegExp(`${SEP}ios${SEP}build${SEP}.*`),
  new RegExp(`${SEP}ios${SEP}Pods${SEP}.*`),
];
const prev = config.resolver?.blockList;
config.resolver = {
  ...config.resolver,
  blockList: [...(Array.isArray(prev) ? prev : prev ? [prev] : []), ...blockList],
};

module.exports = config;
