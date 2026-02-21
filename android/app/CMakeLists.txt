# android/app/CMakeLists.txt
cmake_minimum_required(VERSION 3.22.1)
project(appmodules)

set(CMAKE_VERBOSE_MAKEFILE ON)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Debe venir desde Gradle (React Native lo inyecta)
if(NOT DEFINED REACT_ANDROID_DIR)
  message(FATAL_ERROR "REACT_ANDROID_DIR no está definido (lo inyecta Gradle).")
endif()

# ─────────────────────────────────────────────────────────────
# ⚠️ Lo CRÍTICO: inyectar libc++_shared para TODOS los targets
# ─────────────────────────────────────────────────────────────
# 1) Declaramos/ubicamos la STL compartida del NDK
find_library(CPP_SHARED c++_shared REQUIRED)

# 2) A nivel de directorio (se hereda a targets creados después)
#    Esto aplica a los codegen/autolink de RN (safeareacontext, screens, etc.)
link_libraries(${CPP_SHARED})

# 3) Refuerzo por flags del enlazador C++ (útil con algunos toolchains)
add_link_options($<$<LINK_LANGUAGE:CXX>:-lc++_shared>)
string(APPEND CMAKE_SHARED_LINKER_FLAGS " -lc++_shared")
string(APPEND CMAKE_MODULE_LINKER_FLAGS " -lc++_shared")
# Opcional: refuerzo para bibliotecas estándar C++
set(CMAKE_CXX_STANDARD_LIBRARIES "${CMAKE_CXX_STANDARD_LIBRARIES} -lc++_shared")

# Utilidades modernas de RN (0.80+); maneja autolink/codegen interno
include(${REACT_ANDROID_DIR}/cmake-utils/ReactNative-application.cmake)

# Biblioteca mínima de tu app (si no usas C++ igual debe existir el .cpp)
add_library(appmodules SHARED
  ${CMAKE_SOURCE_DIR}/src/main/cpp/appmodules.cpp
)

# Includes y dependencias base
target_include_directories(appmodules PRIVATE
  "${REACT_ANDROID_DIR}/../ReactCommon"
)

find_package(ReactAndroid REQUIRED CONFIG)
find_package(fbjni REQUIRED CONFIG)

target_link_libraries(appmodules
  ReactAndroid::reactnative
  fbjni::fbjni
  ${CPP_SHARED}   # también aquí por claridad explícita
)
