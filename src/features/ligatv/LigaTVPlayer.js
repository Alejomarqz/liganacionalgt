// src/features/ligatv/LigaTVPlayer.js
// Reproductor HLS (.m3u8) propio de Liga Nacional GT.
// - Controles personalizados con la marca (se ocultan solos)
// - Pantalla completa horizontal, Picture-in-Picture, audio en segundo plano
// - Reconexión automática si se cae la señal (típico en transmisiones en vivo)
// Requiere: react-native-video ^6

import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';
import Video from 'react-native-video';
import LinearGradient from 'react-native-linear-gradient';
import { Play, Pause, SpeakerHigh, SpeakerSlash, CornersOut, PictureInPicture, ArrowClockwise } from 'phosphor-react-native';
import { Txt, LiveBadge, PressableScale } from '../../ui';
import { hitSlop } from '../../design/tokens';

const HIDE_AFTER = 3500;
const MAX_RETRIES = 6;

const IconBtn = ({ onPress, children, label }) => (
  <PressableScale onPress={onPress} hitSlop={hitSlop} accessibilityLabel={label} style={styles.iconBtn}>
    {children}
  </PressableScale>
);

function LigaTVPlayer({ source, poster, title, autoPlay = true, onStatus }, ref) {
  const video = useRef(null);
  const [paused, setPaused] = useState(!autoPlay);
  const [muted, setMuted] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [controls, setControls] = useState(true);
  const [error, setError] = useState(null);
  const [retry, setRetry] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const hideTimer = useRef(null);

  useImperativeHandle(ref, () => ({
    pause: () => setPaused(true),
    play: () => setPaused(false),
    enterPiP: () => video.current?.enterPictureInPicture?.(),
  }));

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), HIDE_AFTER);
  }, []);

  useEffect(() => {
    if (!paused) scheduleHide();
    return () => clearTimeout(hideTimer.current);
  }, [paused, scheduleHide]);

  const toggleControls = useCallback(() => {
    setControls((v) => {
      if (!v) scheduleHide();
      return !v;
    });
  }, [scheduleHide]);

  // Reintento con backoff cuando la señal falla
  const handleError = useCallback(
    (e) => {
      onStatus?.('error', e);
      if (retry < MAX_RETRIES) {
        const wait = Math.min(15000, 1500 * 2 ** retry);
        setBuffering(true);
        setTimeout(() => {
          setRetry((r) => r + 1);
          setReloadKey((k) => k + 1);
        }, wait);
      } else {
        setError('La transmisión no está disponible en este momento.');
      }
    },
    [retry, onStatus],
  );

  const manualRetry = () => {
    setError(null);
    setRetry(0);
    setReloadKey((k) => k + 1);
  };

  if (!source) return null;

  return (
    <View style={styles.wrap}>
      <Video
        key={reloadKey}
        ref={video}
        source={{ uri: source, type: 'm3u8', bufferConfig: { minBufferMs: 4000, maxBufferMs: 20000, bufferForPlaybackMs: 1500, bufferForPlaybackAfterRebufferMs: 3000 } }}
        style={StyleSheet.absoluteFill}
        resizeMode="contain"
        paused={paused}
        muted={muted}
        playInBackground
        playWhenInactive
        ignoreSilentSwitch="ignore"
        enterPictureInPictureOnLeave={!paused}
        fullscreenOrientation="landscape"
        fullscreenAutorotate
        controls={false}
        onLoad={() => {
          setBuffering(false);
          setRetry(0);
          setError(null);
          onStatus?.('playing');
        }}
        onBuffer={({ isBuffering }) => setBuffering(isBuffering)}
        onError={handleError}
        onEnd={() => handleError({ reason: 'ended' })}
      />

      {/* Poster mientras carga */}
      {buffering && poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} resizeMode="cover" blurRadius={2} /> : null}

      <Pressable style={StyleSheet.absoluteFill} onPress={toggleControls} accessibilityLabel="Mostrar controles" />

      {buffering && !error ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color="#fff" size="large" />
          {retry > 0 ? (
            <Txt variant="caption" color="#fff" style={{ marginTop: 8 }}>
              Reconectando señal…
            </Txt>
          ) : null}
        </View>
      ) : null}

      {error ? (
        <View style={[styles.center, { backgroundColor: 'rgba(0,0,0,0.75)', gap: 12 }]}>
          <Txt variant="bodyStrong" color="#fff" align="center" style={{ paddingHorizontal: 24 }}>
            {error}
          </Txt>
          <PressableScale onPress={manualRetry} style={styles.retry}>
            <ArrowClockwise size={16} color="#fff" weight="bold" />
            <Txt variant="bodyStrong" color="#fff">
              Reintentar
            </Txt>
          </PressableScale>
        </View>
      ) : null}

      {controls && !error ? (
        <>
          <LinearGradient colors={['rgba(0,0,0,0.65)', 'transparent']} style={styles.top} pointerEvents="box-none">
            <LiveBadge solid />
            <Txt variant="bodyStrong" color="#fff" numberOfLines={1} style={{ flex: 1, marginLeft: 10 }}>
              {title}
            </Txt>
          </LinearGradient>

          <View style={styles.center} pointerEvents="box-none">
            <PressableScale
              onPress={() => setPaused((p) => !p)}
              accessibilityLabel={paused ? 'Reproducir' : 'Pausar'}
              style={styles.playBtn}
            >
              {paused ? <Play size={30} color="#fff" weight="fill" /> : <Pause size={30} color="#fff" weight="fill" />}
            </PressableScale>
          </View>

          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.bottom} pointerEvents="box-none">
            <IconBtn onPress={() => setMuted((m) => !m)} label={muted ? 'Activar sonido' : 'Silenciar'}>
              {muted ? <SpeakerSlash size={20} color="#fff" weight="bold" /> : <SpeakerHigh size={20} color="#fff" weight="bold" />}
            </IconBtn>
            <View style={{ flex: 1 }} />
            <IconBtn onPress={() => video.current?.enterPictureInPicture?.()} label="Ventana flotante">
              <PictureInPicture size={20} color="#fff" weight="bold" />
            </IconBtn>
            <IconBtn onPress={() => video.current?.presentFullscreenPlayer?.()} label="Pantalla completa">
              <CornersOut size={20} color="#fff" weight="bold" />
            </IconBtn>
          </LinearGradient>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 12, paddingBottom: 28 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', padding: 10, paddingTop: 28, gap: 6 },
  playBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, backgroundColor: '#3B5BDB' },
});

export default memo(forwardRef(LigaTVPlayer));
