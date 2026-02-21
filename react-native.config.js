// react-native.config.js
// Autolink (RN 0.79) + override de AsyncStorage

module.exports = {
  // 👇 Esto es lo que pide el plugin Gradle nuevo para no romper:
  project: {
    android: {
      // Debe coincidir con tu namespace y con MainApplication.kt (package ...)
      packageName: 'com.chapinpro',
    },
  },

  // Overrides específicos (si alguna lib no expone bien su config)
  dependencies: {
    '@react-native-async-storage/async-storage': {
      platforms: {
        android: {
          // Estos campos ayudan si la lib no declara bien el autolink,
          // y NO estorban aunque tengas el workaround manual en settings.gradle
          packageImportPath: 'import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;',
          packageInstance: 'new AsyncStoragePackage()',
        },
      },
    },
  },
};

