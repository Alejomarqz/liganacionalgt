// components/TabSafeSpacer.js
import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabSafeSpacer({ extra = 12 }) {
  const insets = useSafeAreaInsets();
  const footerHeight = 58; // alto del FooterTabs
  const safeBottom = Math.max(insets.bottom, 8);
  return <View style={{ height: footerHeight + safeBottom + extra }} />;
}
