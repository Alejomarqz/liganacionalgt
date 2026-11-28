module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'module:react-native-dotenv',
    // Reanimated: convierte las animaciones en "worklets" (corren en el hilo de UI).
    // Debe ir SIEMPRE de último en la lista.
    'react-native-reanimated/plugin',
  ],
};
