// utils/onboarding.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function shouldShowGuide(key) {
  const v = await AsyncStorage.getItem(key);
  return v !== '1';
}

export async function markGuideDone(key) {
  await AsyncStorage.setItem(key, '1');
}
