// components/FooterTabs.js
// Liga Nacional GT · Barra inferior v3 ("La Diagonal")
// Indicador activo: trazo inclinado con el ángulo de la diagonal del escudo.
import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { House, CalendarBlank, Trophy, GameController, TShirt } from 'phosphor-react-native';
import { useDesign } from '../src/design/useDesign';
import Txt from '../src/ui/Text';

const ITEMS = [
  { key: 'home', label: 'Inicio', route: 'Home', icon: House, activeRoutes: ['Home', 'Match', 'LigaTV'] },
  { key: 'calendar', label: 'Partidos', route: 'Calendar', icon: CalendarBlank, activeRoutes: ['Calendar', 'Schedule'] },
  { key: 'table', label: 'Tabla', route: 'Positions', icon: Trophy, activeRoutes: ['Positions', 'Scorers'] },
  { key: 'games', label: 'Juegos', route: 'Games', icon: GameController, activeRoutes: ['Games'] },
  { key: 'myteam', label: 'Mi club', route: 'MyTeam', icon: TShirt, activeRoutes: ['MyTeam', 'TeamScreen'] },
];

const FooterItem = memo(function FooterItem({ item, active, navigation, colors }) {
  const Icon = item.icon;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={item.label}
      onPress={() => navigation?.navigate(item.route)}
      style={styles.item}
    >
      {active ? <View style={[styles.indicator, { backgroundColor: colors.primary }]} /> : null}
      <Icon size={23} color={active ? colors.text : colors.textMuted} weight={active ? 'fill' : 'regular'} />
      <Txt variant="caption" color={active ? colors.text : colors.textMuted} style={styles.label}>
        {item.label}
      </Txt>
    </Pressable>
  );
});

function FooterTabs({ navigation, routeName = 'Home' }) {
  const { colors } = useDesign();
  return (
    <View style={[styles.container, { backgroundColor: colors.bgElevated, borderTopColor: colors.divider }]}>
      {ITEMS.map((item) => (
        <FooterItem key={item.key} item={item} active={item.activeRoutes.includes(routeName)} navigation={navigation} colors={colors} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, paddingBottom: 8 },
  item: { alignItems: 'center', width: 66, gap: 4 },
  indicator: { position: 'absolute', top: -11, width: 26, height: 3, transform: [{ skewX: '-30deg' }] },
  label: { fontSize: 10, lineHeight: 13, fontFamily: 'Inter-SemiBold' },
});

export default memo(FooterTabs);
