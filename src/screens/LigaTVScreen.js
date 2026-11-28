// src/screens/LigaTVScreen.js
// En vivo: SOLO el reproductor de nuestra transmisión.
// La pestaña aparece únicamente cuando app_config/liga_tv tiene active: true
// (ver components/FooterTabs.js). Sin chat ni textos extra.
import React from 'react';
import { Share, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, ShareNetwork, Television } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, PressableScale, LiveBadge, EmptyState } from '../ui';
import { useLigaTV } from '../features/ligatv/useLigaTV';
import LigaTVPlayer from '../features/ligatv/LigaTVPlayer';
import WebStreamPlayer from '../features/ligatv/WebStreamPlayer';
import FooterTabs from '../../components/FooterTabs';

export default function LigaTVScreen({ navigation }) {
  const { colors } = useDesign();
  const insets = useSafeAreaInsets();
  const { loading, tv } = useLigaTV();

  const share = () => Share.share({ message: `🔴 Estamos EN VIVO: ${tv.title}\nMíralo en la app oficial de la Liga Nacional GT` }).catch(() => {});

  const back = navigation.canGoBack() ? (
    <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver" style={styles.round}>
      <CaretLeft size={18} color="#fff" weight="bold" />
    </PressableScale>
  ) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: '#000' }} />
      ) : tv.active ? (
        <>
          <View style={{ paddingTop: insets.top, backgroundColor: '#000' }}>
            {tv.streamKind === 'web' ? <WebStreamPlayer url={tv.hlsUrl} title={tv.title} /> : <LigaTVPlayer source={tv.hlsUrl} poster={tv.poster} title={tv.title} />}
          </View>
          <View style={[styles.meta, { borderBottomColor: colors.divider }]}>
            <View style={{ flex: 1, gap: 6 }}>
              <LiveBadge />
              <Txt variant="h3" numberOfLines={2}>
                {tv.title}
              </Txt>
            </View>
            <PressableScale onPress={share} hitSlop={hitSlop} accessibilityLabel="Compartir transmisión" style={[styles.iconBtn, { backgroundColor: colors.surfaceHigh }]}>
              <ShareNetwork size={18} color={colors.text} weight="bold" />
            </PressableScale>
          </View>
          {back ? <View style={{ position: 'absolute', top: insets.top + 8, left: 10 }}>{back}</View> : null}
        </>
      ) : (
        // Solo se llega aquí por un enlace o notificación vieja: aviso mínimo
        <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
          {back ? <View style={{ paddingHorizontal: 10 }}>{back}</View> : null}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <EmptyState title="Sin transmisión" message="En este momento no estamos en vivo." Icon={Television} />
          </View>
        </View>
      )}

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom, backgroundColor: colors.bgElevated }}>
        <FooterTabs navigation={navigation} routeName="LigaTV" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  round: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
});
