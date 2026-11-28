// src/screens/GamesScreen.js
// Juegos · punto de entrada de la Quiniela y el reto diario (Fase 3).
// Mientras se construyen, muestra lo que viene y deja votar el marcador
// del partido destacado con la votación que ya existe (PollCard).
import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Target, UserFocus, Trophy } from 'phosphor-react-native';
import { useDesign } from '../design/useDesign';
import { Txt, Surface, Slash, SectionHeader, Pill } from '../ui';
import FooterTabs from '../../components/FooterTabs';
import PollCard from '../../components/PollCard';

const Upcoming = ({ Icon, title, text, colors }) => (
  <Surface style={{ marginHorizontal: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
    <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
      <Icon size={24} color={colors.primary} weight="duotone" />
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Txt variant="h3">{title}</Txt>
      <Txt variant="caption" tone="secondary">
        {text}
      </Txt>
    </View>
    <Pill label="Pronto" tone="brand" />
  </Surface>
);

export default function GamesScreen({ navigation }) {
  const { colors } = useDesign();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 + insets.bottom, gap: 24 }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 10 }}>
          <Txt variant="overline" tone="secondary">
            Juega con la Liga
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <Slash width={9} height={24} />
            <Txt variant="h1">Juegos</Txt>
          </View>
        </View>

        <View>
          <SectionHeader title="Pronostica el marcador" />
          <View style={{ paddingHorizontal: 16 }}>
            <PollCard />
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <SectionHeader title="Muy pronto" />
          <Upcoming Icon={Target} title="Quiniela de la jornada" text="Pronostica todos los partidos, suma puntos y sube en el ranking nacional." colors={colors} />
          <Upcoming Icon={UserFocus} title="¿Quién es el jugador?" text="Un reto nuevo cada día. Mantén tu racha." colors={colors} />
          <Upcoming Icon={Trophy} title="Ligas con amigos" text="Crea tu liga privada y compite con tu gente." colors={colors} />
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
});
