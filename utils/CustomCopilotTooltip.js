import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from './ThemeContext';
import { useCopilot } from 'react-native-copilot';

export default function CustomCopilotTooltip({
  currentStep: currentStepProp,
  isFirstStep: isFirstProp,
  isLastStep: isLastProp,
  handleNext,
  handlePrev,
  handleStop,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const isDark = theme.mode === 'dark';

  const copilot = useCopilot();

const goToNext = copilot?.goToNext;
const goToPrev = copilot?.goToPrev;
const stop     = copilot?.stop;


  const step = currentStepProp || copilot?.currentStep || null;

  const stepNumber =
  (typeof copilot?.currentStepNumber === 'number' && copilot.currentStepNumber > 0)
    ? copilot.currentStepNumber
    : (typeof step?.order === 'number' && step.order > 0 ? step.order : 1);

const totalSteps =
  (typeof copilot?.totalStepsNumber === 'number' && copilot.totalStepsNumber > 0)
    ? copilot.totalStepsNumber
    : (typeof step?.totalStepsNumber === 'number' && step.totalStepsNumber > 0
        ? step.totalStepsNumber
        : stepNumber); // 👈 si no se sabe, asumimos que este es el total


  const isFirst = (typeof isFirstProp === 'boolean') ? isFirstProp : stepNumber <= 1;
  const isLast  = (typeof isLastProp  === 'boolean') ? isLastProp  : stepNumber >= totalSteps;

  const title = step?.title || 'Tip rápido';
  const text  = step?.text  || '';

  console.log('[COPILOT][TOOLTIP]', {
  hasGoToNext: typeof goToNext === 'function',
  hasGoToPrev: typeof goToPrev === 'function',
  stepNumber: copilot?.currentStepNumber,
  totalSteps: copilot?.totalStepsNumber,
});



  // ✅ Fondo y contraste tipo “burbuja pro”
  const cardBg   = isDark ? 'rgba(20, 24, 34, 0.94)' : 'rgba(255, 255, 255, 0.94)';
  const border   = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)';
  const titleCol = isDark ? '#FFFFFF' : '#0B1220';
  const bodyCol  = isDark ? 'rgba(255,255,255,0.82)' : 'rgba(17,24,39,0.72)';

  // ✅ Botón verde consistente (no lo amarres al primary si te cambia a azul)
  const btnBg = '#22c55e';

  return (
    <View style={styles.container}>
      {/* ✅ Scrim para que NO se mezcle con texto del fondo */}

      <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
        {/* sin título */}

        {!!text && (
          <Text style={[styles.text, { color: bodyCol }]}>{text}</Text>
        )}

        <View style={styles.row}>
          {!isFirst ? (
            <TouchableOpacity
  onPress={() => (handlePrev || goToPrev)?.()}
  style={[styles.btnGhost, { borderColor: border }]}
>
  <Text style={[styles.btnGhostText, { color: titleCol }]}>Atrás</Text>
</TouchableOpacity>

          ) : (
            <View />
          )}

          {isLast ? (
            <TouchableOpacity
  onPress={() => {
    console.log('[COPILOT][TOOLTIP] Entendido PRESSED');
    (handleStop || stop)?.();
  }}
  style={[styles.btnPrimary, { backgroundColor: btnBg }]}
>
  <Text style={styles.btnPrimaryText}>Entendido</Text>
</TouchableOpacity>

          ) : (
            <TouchableOpacity
  onPress={() => {
    console.log('[COPILOT][TOOLTIP] Siguiente PRESSED');
    try { handleNext?.(); } catch (e) { console.log('handleNext error', e); }
    try { goToNext?.(); } catch (e) { console.log('copilot.next error', e); }
  }}
  style={[styles.btnPrimary, { backgroundColor: btnBg }]}
>
  <Text style={styles.btnPrimaryText}>Siguiente</Text>
</TouchableOpacity>

          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },

  scrim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },

  card: {
    minWidth: 280,
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } },
      android: { elevation: 12 },
    }),
  },

  title: { fontSize: 14.5, fontWeight: '900', marginBottom: 6 },
  text: { fontSize: 12.8,  lineHeight: 18.5 },

  row: {
    marginTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  btnGhostText: { fontSize: 12.5, fontWeight: '800' },

  btnPrimary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 12.8, fontWeight: '900' },
});
