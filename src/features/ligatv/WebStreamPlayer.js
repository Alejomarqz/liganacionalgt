// src/features/ligatv/WebStreamPlayer.js
// Reproductor para enlaces de PÁGINA (ej. https://.../player/canal.html).
// - Se queda en el dominio del reproductor: bloquea ventanas emergentes y
//   redirecciones a otros sitios (típicas de reproductores con publicidad).
// - Controles propios: volumen, recargar y pantalla completa.
// - Al tocar un control se muestra un anuncio (con el límite de AdManager: 1 por minuto).
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Modal, StatusBar, StyleSheet, View, useWindowDimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { SpeakerHigh, SpeakerSlash, CornersOut, CornersIn, ArrowClockwise } from 'phosphor-react-native';
import { Txt, PressableScale, LiveBadge } from '../../ui';
import { hitSlop } from '../../design/tokens';
import { showInterstitialIfReady } from '../../../ads/AdManager';

const hostOf = (u = '') => {
  const m = String(u).match(/^https?:\/\/([^/]+)/i);
  return m ? m[1].toLowerCase() : '';
};

// Silencia / activa todos los <video> de la página
const muteJS = (muted) => `(function(){try{document.querySelectorAll('video,audio').forEach(function(v){v.muted=${muted ? 'true' : 'false'};if(!${muted ? 'true' : 'false'}){v.volume=1;}});}catch(e){}})();true;`;
// Ajusta el video al contenedor y oculta márgenes de la página
const FIT_JS = `(function(){try{var s=document.createElement('style');s.innerHTML='html,body{margin:0!important;padding:0!important;background:#000!important;overflow:hidden!important}video,iframe{width:100vw!important;height:100vh!important;object-fit:contain;}';document.head.appendChild(s);}catch(e){}})();true;`;

function Player({ url, webRef, onLoadEnd }) {
  const host = useMemo(() => hostOf(url), [url]);
  return (
    <WebView
      ref={webRef}
      source={{ uri: url }}
      style={{ flex: 1, backgroundColor: '#000' }}
      allowsInlineMediaPlayback
      allowsFullscreenVideo
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      injectedJavaScript={FIT_JS}
      onLoadEnd={onLoadEnd}
      originWhitelist={['https://*', 'http://*']}
      onShouldStartLoadWithRequest={(req) => {
        // permitimos el propio reproductor y recursos embebidos; bloqueamos saltos de página a otros dominios
        if (!req.isTopFrame) return true;
        return hostOf(req.url) === host || req.url === 'about:blank';
      }}
    />
  );
}

export default function WebStreamPlayer({ url, title, live = true }) {
  const { width, height } = useWindowDimensions();
  const webRef = useRef(null);
  const fsRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [full, setFull] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  // Toda acción de control pasa por aquí: anuncio primero (si toca), luego la acción
  const withAd = useCallback(async (action) => {
    try {
      await showInterstitialIfReady('player_control');
    } catch {}
    action();
  }, []);

  const toggleMute = () =>
    withAd(() => {
      const next = !muted;
      setMuted(next);
      webRef.current?.injectJavaScript(muteJS(next));
      fsRef.current?.injectJavaScript(muteJS(next));
    });

  const controls = (inFull) => (
    <View style={[styles.bar, inFull ? styles.barFull : null]}>
      {live ? <LiveBadge /> : null}
      <Txt variant="caption" color="#fff" numberOfLines={1} style={{ flex: 1, marginLeft: 8, fontFamily: 'Inter-SemiBold' }}>
        {title}
      </Txt>
      <PressableScale onPress={toggleMute} hitSlop={hitSlop} accessibilityLabel={muted ? 'Activar sonido' : 'Silenciar'} style={styles.btn}>
        {muted ? <SpeakerSlash size={20} color="#fff" weight="bold" /> : <SpeakerHigh size={20} color="#fff" weight="bold" />}
      </PressableScale>
      <PressableScale onPress={() => withAd(() => setReloadKey((k) => k + 1))} hitSlop={hitSlop} accessibilityLabel="Recargar señal" style={styles.btn}>
        <ArrowClockwise size={20} color="#fff" weight="bold" />
      </PressableScale>
      <PressableScale onPress={() => withAd(() => setFull(!inFull))} hitSlop={hitSlop} accessibilityLabel={inFull ? 'Salir de pantalla completa' : 'Pantalla completa'} style={styles.btn}>
        {inFull ? <CornersIn size={20} color="#fff" weight="bold" /> : <CornersOut size={20} color="#fff" weight="bold" />}
      </PressableScale>
    </View>
  );

  return (
    <View>
      <View style={styles.box}>
        {!full ? <Player key={reloadKey} url={url} webRef={webRef} onLoadEnd={() => setLoading(false)} /> : <View style={{ flex: 1, backgroundColor: '#000' }} />}
        {loading && !full ? (
          <View style={styles.loading} pointerEvents="none">
            <Txt variant="caption" color="rgba(255,255,255,0.7)">
              Conectando la señal…
            </Txt>
          </View>
        ) : null}
      </View>
      {controls(false)}

      {/* Pantalla completa: giramos la vista 90° (horizontal) sin librerías extra */}
      <Modal visible={full} animationType="fade" supportedOrientations={['portrait', 'landscape']} onRequestClose={() => setFull(false)} statusBarTranslucent>
        <StatusBar hidden />
        <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: height, height: width, transform: [{ rotate: '90deg' }] }}>
            <Player key={`fs-${reloadKey}`} url={url} webRef={fsRef} />
            {controls(true)}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000' },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#000' },
  barFull: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  btn: { width: 40, height: 36, alignItems: 'center', justifyContent: 'center' },
});
