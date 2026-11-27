// react-native.config.js
// Autolink (RN 0.79) + override de AsyncStorage + fuentes

module.exports = {
  project: {
    android: {
      packageName: 'com.liganacionalgt',
    },
  },

  // 👇 Ruta donde están las fuentes Poppins
  assets: ['./assets/fonts/'],

  dependencies: {
    '@react-native-async-storage/async-storage': {
      platforms: {
        android: {
          packageImportPath: 'import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;',
          packageInstance: 'new AsyncStoragePackage()',
        },
      },
    },
  },
};