// src/screens/LigaTVScreen.js
// "Liga TV": transmisión en vivo propia (HLS) + chat de la afición.
// Si no hay transmisión activa: cuenta regresiva a la próxima + botón "Avísame".
import React, { useState } from 'react';
import { Image, StatusBar, View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { CaretLeft, BellSimpleRinging, BellSimple, Television } from 'phosphor-react-native';
import { useDesign } from '../design/useDesign';
import { Txt, PressableScale, Skeleton } from '../ui';
import { useLigaTV } from '../features/ligatv/useLigaTV';
import LigaTVPlayer from '../features/ligatv/LigaTVPlayer';
import LiveChat from '../features/ligatv/LiveChat';
import { useCountdown, formatKickoff } from '../api/clock';
import { scheduleLigaTVReminder } from '../notifications/reminders';
import { hitSlop } from '../design/tokens';

function Offline({ tv }) {
  const { colors, space, radius } = useDesign();
  const c = useCountdown(tv.startsAt);
  const [reminded, setReminded] = useState(false);
  const upcoming = tv.startsAt && !c.done;

  return (
    <View style={{ padding: space[5], gap: space[4] }}>
      <LinearGradient colors={colors.heroGradient} style={[styles.offline, { borderRadius: radius.xl }]}>
        {tv.poster ? <Image source={{ uri: tv.poster }} style={[StyleSheet.absoluteFill, { opacity: 0.35 }]} /> : null}
        <Television size={42} color="#fff" weight="duotone" />
        <Txt variant="h2" color="#fff" align="center" style={{ marginTop: 10 }}>
          {upcoming ? tv.title : 'Liga TV'}
        </Txt>
        <Txt variant="body" color="rgba(255,255,255,0.8)" align="center">
          {upcoming ? formatKickoff(tv.startsAt) : 'No hay transmisión en este momento. Te avisamos en la próxima.'}
        </Txt>
        {upcoming ? (
          <Txt variant="score" color="#fff" style={{ marginTop: 8, fontSize: 34 }}>
            {c.days > 0 ? `${c.days}d ` : ''}
            {String(c.hours).padStart(2, '0')}:{String(c.minutes).padStart(2, '0')}:{String(c.seconds).padStart(2, '0')}
          </Txt>
        ) : null}
      </LinearGradient>
      {upcoming ? (
        <PressableScale
          onPress={async () => setReminded(await scheduleLigaTVReminder(tv))}
          style={[styles.cta, { backgroundColor: reminded ? colors.successSoft : colors.primary, borderRadius: radius.pill }]}
        >
          {reminded ? <BellSimpleRinging size={18} color={colors.success} weight="fill" /> : <BellSimple size={18} color="#fff" weight="bold" />}
          <Txt variant="bodyStrong" color={reminded ? colors.success : '#fff'}>
            {reminded ? 'Listo, te avisamos 5 min antes' : 'Avísame cuando empiece'}
          </Txt>
        </PressableScale>
      ) : null}
    </View>
  );
}

export default function LigaTVScreen({ navigation }) {
  const { colors, space } = useDesign();
  const { loading, tv } = useLigaTV();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: 8, backgroundColor: '#000' }]}>
        <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver">
          <CaretLeft size={22} color="#fff" weight="bold" />
        </PressableScale>
        <Txt variant="h3" color="#fff" style={{ marginLeft: 10 }}>
          Liga TV
        </Txt>
      </View>

      {loading ? (
        <Skeleton height={220} radius={0} />
      ) : tv.active ? (
        <>
          <LigaTVPlayer source={tv.hlsUrl} poster={tv.poster} title={tv.title} />
          <View style={[styles.meta, { borderBottomColor: colors.divider, paddingHorizontal: space[4] }]}>
            <Txt variant="h3" numberOfLines={2}>
              {tv.title}
            </Txt>
            {tv.subtitle ? (
              <Txt variant="caption" tone="muted" numberOfLines={2}>
                {tv.subtitle}
              </Txt>
            ) : null}
            {tv.hosts?.length ? (
              <Txt variant="caption" tone="brand" style={{ marginTop: 2 }}>
                Con {tv.hosts.join(' · ')}
              </Txt>
            ) : null}
          </View>
          {tv.chatEnabled ? <LiveChat streamId="main" /> : null}
        </>
      ) : (
        <Offline tv={tv} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  meta: { paddingVertical: 12, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  offline: { alignItems: 'center', padding: 28, gap: 4, overflow: 'hidden', minHeight: 240, justifyContent: 'center' },
  cta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
});
