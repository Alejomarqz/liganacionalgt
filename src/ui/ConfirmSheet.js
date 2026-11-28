// src/ui/ConfirmSheet.js
// Confirmación con diseño propio (reemplaza el Alert gris de Android).
// Hoja inferior con fondo oscurecido, contenido libre y dos botones grandes.
import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useDesign } from '../design/useDesign';
import Txt from './Text';
import PressableScale from './PressableScale';

export default function ConfirmSheet({ visible, title, message, children, confirmLabel = 'Confirmar', cancelLabel = 'Revisar', onConfirm, onCancel, Icon, busy }) {
  const { colors, isDark } = useDesign();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Cerrar" />
      <View style={[styles.sheet, { backgroundColor: colors.bgElevated, paddingBottom: insets.bottom + 18, borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'transparent' }]}>
        <View style={[styles.grab, { backgroundColor: colors.divider }]} />
        {Icon ? (
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <Icon size={26} color={colors.primary} weight="fill" />
          </View>
        ) : null}
        <Txt variant="h2" align="center">
          {title}
        </Txt>
        {children ? <View style={{ marginTop: 16, width: '100%' }}>{children}</View> : null}
        {message ? (
          <Txt variant="body" tone="secondary" align="center" style={{ marginTop: 14 }}>
            {message}
          </Txt>
        ) : null}
        <View style={styles.actions}>
          <PressableScale onPress={onCancel} style={{ flex: 1 }} accessibilityLabel={cancelLabel}>
            <View style={[styles.btn, { backgroundColor: colors.surfaceHigh }]}>
              <Txt style={styles.btnTxt} color={colors.text}>
                {cancelLabel}
              </Txt>
            </View>
          </PressableScale>
          <PressableScale onPress={onConfirm} disabled={busy} style={{ flex: 1.3 }} accessibilityLabel={confirmLabel}>
            <LinearGradient colors={['#5B86FF', '#2F5BFF', '#1E3FD8']} locations={[0, 0.55, 1]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[styles.btn, { opacity: busy ? 0.7 : 1 }]}>
              <Txt style={styles.btnTxt} color="#fff">
                {busy ? 'Guardando…' : confirmLabel}
              </Txt>
            </LinearGradient>
          </PressableScale>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(3,6,15,0.62)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 22, paddingTop: 10, alignItems: 'center', borderWidth: 1 },
  grab: { width: 40, height: 4, borderRadius: 2, marginBottom: 16 },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 22, width: '100%' },
  btn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontFamily: 'Inter-Bold', fontSize: 15 },
});
