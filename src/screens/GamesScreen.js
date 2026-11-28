// src/screens/GamesScreen.js
// Juegos · Quiniela, ¿Quién es el jugador? y Ligas con amigos.
import React, { useCallback, useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Target, UserFocus, UsersThree, CaretRight, Fire, Trophy } from 'phosphor-react-native';
import LinearGradient from 'react-native-linear-gradient';

import { useDesign } from '../design/useDesign';
import { Txt, Surface, Slash, SectionHeader, PressableScale } from '../ui';
import { useMatches } from '../api/liga';
import { seasonLabel } from '../api/clock';
import { useGameIdentity } from '../features/games/identity';
import { useMyPredictions, useMyScore, useMyRank } from '../features/games/quinielaStore';
import { isOpen } from '../features/games/scoring';
import { loadState, todayKey } from '../features/games/daily';
import FooterTabs from '../../components/FooterTabs';
import PollCard from '../../components/PollCard';

function GameCard({ Icon, title, text, badge, onPress, colors }) {
  return (
    <PressableScale onPress={onPress} style={{ marginHorizontal: 16 }}>
      <Surface style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
          <Icon size={24} color={colors.primary} weight="duotone" />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="h3">{title}</Txt>
          <Txt variant="caption" tone="secondary">
            {text}
          </Txt>
          {badge}
        </View>
        <CaretRight size={16} color={colors.textMuted} weight="bold" />
      </Surface>
    </PressableScale>
  );
}

export default function GamesScreen({ navigation }) {
  const { colors } = useDesign();
  const insets = useSafeAreaInsets();
  const { uid, nick, ready } = useGameIdentity();
  const matchesQ = useMatches();
  const preds = useMyPredictions(uid);
  const totals = useMyScore({ uid, nick, seasonId: matchesQ.seasonId, byRound: preds.byRound, matches: matchesQ.matches });
  const { rank } = useMyRank(matchesQ.seasonId, ready && !preds.loading ? totals.points : null);

  // Partidos abiertos sin pronóstico
  const open = matchesQ.matches.filter(isOpen);
  const pending = open.filter((m) => !preds.byRound[String(m.round?.id)]?.picks?.[String(m.id)]).length;

  // Estado del reto diario (se recarga al volver a esta pantalla)
  const [daily, setDaily] = useState(null);
  useFocusEffect(
    useCallback(() => {
      loadState().then(setDaily);
    }, []),
  );
  const dailyDone = Boolean(daily?.days?.[todayKey()]?.done);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom, gap: 24 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <Txt variant="overline" tone="secondary">
            Juega con la Liga · {seasonLabel()}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <Slash width={9} height={24} />
            <Txt variant="h1">Juegos</Txt>
          </View>
        </View>

        {/* Quiniela destacada */}
        <PressableScale onPress={() => navigation.navigate('Quiniela')} style={{ marginHorizontal: 16 }}>
          <LinearGradient colors={['#3B7BFF', '#2350E8', '#1A36B8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Target size={18} color="#fff" weight="fill" />
              <Txt variant="overline" color="rgba(255,255,255,0.9)">
                Quiniela de la jornada
              </Txt>
            </View>
            <Txt variant="h1" color="#fff" style={{ marginTop: 10 }}>
              {pending ? `Te faltan ${pending} pronóstico${pending === 1 ? '' : 's'}` : open.length ? '¡Jornada pronosticada!' : 'Pronostica y suma puntos'}
            </Txt>
            <View style={{ flexDirection: 'row', gap: 18, marginTop: 14 }}>
              <View>
                <Txt variant="h2" color="#fff" style={{ fontVariant: ['tabular-nums'] }}>
                  {totals.points}
                </Txt>
                <Txt variant="caption" color="rgba(255,255,255,0.8)">
                  Puntos
                </Txt>
              </View>
              <View>
                <Txt variant="h2" color="#fff" style={{ fontVariant: ['tabular-nums'] }}>
                  {rank ? `#${rank}` : '–'}
                </Txt>
                <Txt variant="caption" color="rgba(255,255,255,0.8)">
                  Nacional
                </Txt>
              </View>
              <View>
                <Txt variant="h2" color="#fff" style={{ fontVariant: ['tabular-nums'] }}>
                  {totals.exact}
                </Txt>
                <Txt variant="caption" color="rgba(255,255,255,0.8)">
                  Exactos
                </Txt>
              </View>
            </View>
            <View style={styles.heroCta}>
              <Txt variant="bodyStrong" color="#1A36B8" style={{ fontFamily: 'Inter-Bold' }}>
                {pending ? 'Pronosticar ahora' : 'Ver mi quiniela'}
              </Txt>
            </View>
          </LinearGradient>
        </PressableScale>

        <View style={{ gap: 12 }}>
          <GameCard
            Icon={UserFocus}
            title="¿Quién es el jugador?"
            text={dailyDone ? 'Ya jugaste hoy. Vuelve mañana por otro.' : 'Un jugador nuevo cada día. 6 intentos.'}
            badge={
              daily?.streak ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <Fire size={13} color={colors.warning} weight="fill" />
                  <Txt variant="caption" style={{ fontFamily: 'Inter-Bold' }}>
                    Racha de {daily.streak} {daily.streak === 1 ? 'día' : 'días'}
                  </Txt>
                </View>
              ) : null
            }
            onPress={() => navigation.navigate('DailyPlayer')}
            colors={colors}
          />
          <GameCard Icon={UsersThree} title="Ligas con amigos" text="Crea tu liga, comparte el código y compitan jornada a jornada." onPress={() => navigation.navigate('Ranking')} colors={colors} />
          <GameCard Icon={Trophy} title="Ranking nacional" text="Los mejores pronosticadores del torneo." onPress={() => navigation.navigate('Ranking')} colors={colors} />
        </View>

        <View>
          <SectionHeader title="Votación del partido" />
          <View style={{ paddingHorizontal: 16 }}>
            <PollCard />
          </View>
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom, backgroundColor: colors.bgElevated }}>
        <FooterTabs navigation={navigation} routeName="Games" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  icon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 20, padding: 18 },
  heroCta: { marginTop: 16, height: 44, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
});
