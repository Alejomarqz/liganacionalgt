package com.liganacionalgt

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "chapin"

  // ✅ EVITA que Android restaure fragments de react-native-screens
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null) // 👈 clave del fix
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
    DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
