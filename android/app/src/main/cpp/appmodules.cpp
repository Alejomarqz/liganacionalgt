// android/app/src/main/cpp/appmodules.cpp
#include <jni.h>
extern "C" JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return JNI_VERSION_1_6;
}
