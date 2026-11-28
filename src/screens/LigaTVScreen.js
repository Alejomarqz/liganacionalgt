// src/screens/LigaTVScreen.js
// En vivo · Liga TV
// - Transmitiendo: reproductor + reacciones flotantes + mensaje fijado + chat.
// - Sin transmisión: próxima emisión con cuenta regresiva y "Avísame",
//   programación y episodios anteriores para volver a ver.
// Se controla desde Firestore (app_config/liga_tv y liga_tv_shows).

import React, { useMemo, useState } from 'react';
import { Image, ScrollView, Share, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, BellSimpleRinging, BellSimple, Television, PushPin, ShareNetwork, Play, X } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, Surface, PressableScale, Skeleton, StadiumBackdrop, SectionHeader, LiveBadge, EmptyState } from '../ui';
import { useLigaTV, useLigaTVShows } from '../features/ligatv/useLigaTV';
import LigaTVPlayer from '../features/ligatv/LigaTVPlayer';
import WebStreamPlayer from '../features/ligatv/WebStreamPlayer';
import LiveChat from '../features/ligatv/LiveChat';
import { ReactionsOverlay, ReactionBar, useReactions } from '../features/ligatv/Reactions';
import { useCountdown, formatKickoff, formatDay } from '../api/clock';
import { scheduleLigaTVReminder } from '../notifications/reminders';
import FooterTabs from '../../components/FooterTabs';

const pad = (n) => String(n).padStart(2, '0');

function ReminderButton({ show, compact, colors }) {
  const [on, setOn] = useState(false);
  const ok = show?.startsAt && show.startsAt.getTime() > Date.now();
  if (!ok) return null;
  return (
    <PressableScale
      onPress={async () => setOn(await scheduleLigaTVReminder(show))}
      style={[compact ? styles.bellSmall : styles.bell, { backgroundColor: on ? colors.successSoft : compact ? colors.surfaceHigh : '#fff' }]}
      accessibilityLabel={on ? 'Te avisaremos' : 'Avísame'}
    >
      {on ? <BellSimpleRinging size={16} color={colors.success} weight="fill" /> : <BellSimple size={16} color={compact ? colors.text : '#0A1440'} weight="bold" />}
      {!compact ? (
        <Txt variant="bodyStrong" color={on ? colors.success : '#0A1440'} style={{ fontFamily: 'Inter-Bold' }}>
          {on ? 'Te avisamos 5 min antes' : 'Avísame'}
        </Txt>
      ) : null}
    </PressableScale>
  );
}

function NextShowHero({ show, insets, colors }) {
  const c = useCountdown(show?.startsAt);
  const upcoming = show?.startsAt && !c.done;
  return (
    <StadiumBackdrop source={show?.poster ? { uri: show.poster } : undefined} mode={show?.poster ? 'photo' : 'duotone'} height={insets.top + (upcoming ? 340 : 230)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: upcoming ? 78 : 58 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Television size={18} color="#fff" weight="fill" />
          <Txt variant="overline" color="rgba(255,255,255,0.85)">
            Liga TV · {upcoming ? 'Próxima transmisión' : 'Fuera del aire'}
          </Txt>
        </View>
        <Txt variant="h1" color="#fff" style={{ marginTop: 8 }} numberOfLines={2}>
          {upcoming ? show.title : 'Nuestras transmisiones'}
        </Txt>
        <Txt variant="body" color="rgba(255,255,255,0.8)" style={{ marginTop: 4 }} numberOfLines={2}>
          {upcoming ? `${formatKickoff(show.startsAt)}${show.hosts?.length ? ` · Con ${show.hosts.join(', ')}` : ''}` : 'Análisis, previas y la voz de la afición. Cuando salgamos al aire, aquí lo ves y comentas en el chat en vivo.'}
        </Txt>
        {upcoming ? (
          <>
            <View style={styles.countdown}>
              {[...(c.days > 0 ? [[c.days, 'días']] : []), [c.hours, 'horas'], [c.minutes, 'min'], [c.seconds, 'seg']].map(([v, l]) => (
                <View key={l} style={{ alignItems: 'center', minWidth: 54 }}>
                  <Txt variant="h1" color="#fff" style={{ fontSize: 30, lineHeight: 34, fontVariant: ['tabular-nums'] }}>
                    {pad(v)}
                  </Txt>
                  <Txt variant="overline" color="rgba(255,255,255,0.65)" style={{ fontSize: 9 }}>
                    {l}
                  </Txt>
                </View>
              ))}
            </View>
            <ReminderButton show={show} colors={colors} />
          </>
        ) : null}
      </View>
    </StadiumBackdrop>
  );
}

function ShowRow({ show, onPlay, colors, last }) {
  const past = Boolean(onPlay);
  return (
    <PressableScale onPress={past ? () => onPlay(show) : undefined} scaleTo={past ? 0.99 : 1}>
      <View style={[styles.showRow, { borderBottomColor: colors.divider }, last ? { borderBottomWidth: 0 } : null]}>
        <View style={[styles.showThumb, { backgroundColor: colors.surfaceHigh }]}>
          {show.poster ? <Image source={{ uri: show.poster }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Television size={22} color={colors.primary} weight="duotone" />}
          {past ? (
            <View style={styles.playDot}>
              <Play size={12} color="#fff" weight="fill" />
            </View>
          ) : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="overline" tone={past ? 'secondary' : 'brand'}>
            {past ? formatDay(show.startsAt) : formatKickoff(show.startsAt)}
          </Txt>
          <Txt variant="bodyStrong" numberOfLines={2}>
            {show.title}
          </Txt>
          {show.description ? (
            <Txt variant="caption" tone="muted" numberOfLines={1}>
              {show.description}
            </Txt>
          ) : null}
        </View>
        {!past ? <ReminderButton show={show} compact colors={colors} /> : null}
      </View>
    </PressableScale>
  );
}

/* ─────────── Transmitiendo ─────────── */
function LiveView({ tv, navigation, insets, colors }) {
  const { floaters, react, remove } = useReactions(true);
  const share = () => Share.share({ message: `🔴 Estamos EN VIVO en Liga TV: ${tv.title}\nMíralo en la app oficial de la Liga Nacional GT` }).catch(() => {});
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: insets.top, backgroundColor: '#000' }}>
        <View>
          {tv.streamKind === 'web' ? (
            <WebStreamPlayer url={tv.hlsUrl} title={tv.title} />
          ) : (
            <LigaTVPlayer source={tv.hlsUrl} poster={tv.poster} title={tv.title} />
          )}
          <ReactionsOverlay floaters={floaters} onDone={remove} />
        </View>
      </View>

      <View style={[styles.liveMeta, { borderBottomColor: colors.divider }]}>
        <View style={{ flex: 1, gap: 4 }}>
          <LiveBadge />
          <Txt variant="h3" numberOfLines={2}>
            {tv.title}
          </Txt>
          {tv.hosts?.length ? (
            <Txt variant="caption" tone="brand">
              Con {tv.hosts.join(' · ')}
            </Txt>
          ) : null}
        </View>
        <PressableScale onPress={share} hitSlop={hitSlop} accessibilityLabel="Compartir transmisión" style={[styles.iconBtn, { backgroundColor: colors.surfaceHigh }]}>
          <ShareNetwork size={18} color={colors.text} weight="bold" />
        </PressableScale>
      </View>

      {tv.pinned ? (
        <View style={[styles.pinned, { backgroundColor: colors.primarySoft, borderBottomColor: colors.divider }]}>
          <PushPin size={15} color={colors.primary} weight="fill" />
          <Txt variant="caption" style={{ flex: 1, fontFamily: 'Inter-SemiBold' }}>
            {tv.pinned}
          </Txt>
        </View>
      ) : null}

      <ReactionBar onReact={react} />

      {tv.chatEnabled ? <LiveChat streamId="main" admins={tv.admins} /> : <View style={{ flex: 1 }} />}

      {navigation.canGoBack() ? (
        <View style={{ position: 'absolute', top: insets.top + 8, left: 10 }}>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver" style={styles.round}>
            <CaretLeft size={18} color="#fff" weight="bold" />
          </PressableScale>
        </View>
      ) : null}
    </View>
  );
}

export default function LigaTVScreen({ navigation }) {
  const { colors } = useDesign();
  const insets = useSafeAreaInsets();
  const { loading, tv } = useLigaTV();
  const shows = useLigaTVShows();
  const [episode, setEpisode] = useState(null);
  const [footerH, setFooterH] = useState(0);

  // Próxima emisión: la del config o la primera programada
  const next = useMemo(() => {
    if (tv.startsAt && tv.startsAt.getTime() > Date.now()) return { title: tv.title, startsAt: tv.startsAt, poster: tv.poster, hosts: tv.hosts };
    return shows.upcoming[0] || null;
  }, [tv, shows.upcoming]);
  const restUpcoming = shows.upcoming.filter((s) => s !== next);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <Skeleton height={insets.top + 230} radius={0} />
      </View>
    );
  }

  if (tv.active) return <LiveView tv={tv} navigation={navigation} insets={insets} colors={colors} />;

  const footerPad = (footerH || insets.bottom + 64) + 4;

  const programa = (
    <ScrollView contentContainerStyle={{ paddingBottom: footerPad + 16, gap: 26, paddingTop: 14 }} showsVerticalScrollIndicator={false}>
      {episode ? (
        <View style={{ backgroundColor: '#000' }}>
          <LigaTVPlayer source={episode.vodUrl} poster={episode.poster} title={episode.title} live={false} />
          <View style={[styles.episodeBar, { backgroundColor: colors.surface, borderBottomColor: colors.divider }]}>
            <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
              {episode.title}
            </Txt>
            <PressableScale onPress={() => setEpisode(null)} hitSlop={hitSlop} accessibilityLabel="Cerrar episodio" style={[styles.iconBtn, { backgroundColor: colors.surfaceHigh }]}>
              <X size={16} color={colors.text} weight="bold" />
            </PressableScale>
          </View>
        </View>
      ) : null}
      <View>
        <SectionHeader title="Programación" />
        {restUpcoming.length ? (
          <Surface padded={false} style={{ marginHorizontal: 16 }}>
            {restUpcoming.map((s, i) => (
              <ShowRow key={s.id} show={s} colors={colors} last={i === restUpcoming.length - 1} />
            ))}
          </Surface>
        ) : (
          <Txt variant="body" tone="muted" style={{ marginHorizontal: 20 }}>
            Pronto anunciaremos la próxima transmisión. Activa las notificaciones para enterarte.
          </Txt>
        )}
      </View>
      <View>
        <SectionHeader title="Episodios anteriores" />
        {shows.past.length ? (
          <Surface padded={false} style={{ marginHorizontal: 16 }}>
            {shows.past.map((s, i) => (
              <ShowRow key={s.id} show={s} onPlay={setEpisode} colors={colors} last={i === shows.past.length - 1} />
            ))}
          </Surface>
        ) : (
          <EmptyState title="Muy pronto" message="Aquí podrás volver a ver nuestras transmisiones." Icon={Television} />
        )}
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <NextShowHero show={next} insets={insets} colors={colors} />

      <View style={{ flex: 1 }}>{programa}</View>

      <View onLayout={(e) => setFooterH(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom, backgroundColor: colors.bgElevated }}>
        <FooterTabs navigation={navigation} routeName="LigaTV" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  countdown: { flexDirection: 'row', gap: 6, marginTop: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(6,10,23,0.45)', justifyContent: 'center' },
  bell: { marginTop: 14, height: 46, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  bellSmall: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  showRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  showThumb: { width: 96, height: 60, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  playDot: { position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  liveMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  pinned: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  round: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  switchRow: { flexDirection: 'row', gap: 4, padding: 4, marginHorizontal: 16, marginTop: -26, borderRadius: 14 },
  switchBtn: { height: 40, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  chatNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  preChat: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16 },
  preChatIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  episodeBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
});
