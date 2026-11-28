// components/FooterTabs.js
// Liga Nacional GT · Barra inferior v3 ("La Diagonal")
// Indicador activo: trazo inclinado con el ángulo de la diagonal del escudo.
// "En vivo" muestra un punto rojo cuando Liga TV está transmitiendo.
import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { House, CalendarBlank, Television, Trophy, GameController, TShirt } from 'phosphor-react-native';
import { useDesign } from '../src/design/useDesign';
import Txt from '../src/ui/Text';
import { PulseDot } from '../src/ui/LiveBadge';
import { useLigaTV } from '../src/features/ligatv/useLigaTV';
import { showInterstitialIfReady } from '../ads/AdManager';

const ITEMS = [
  { key: 'home', label: 'Inicio', route: 'Home', icon: House, activeRoutes: ['Home', 'Match'] },
  { key: 'calendar', label: 'Partidos', route: 'Calendar', icon: CalendarBlank, activeRoutes: ['Calendar', 'Schedule'] },
  { key: 'live', label: 'En vivo', route: 'LigaTV', icon: Television, activeRoutes: ['LigaTV'] },
  { key: 'table', label: 'Tabla', route: 'Positions', icon: Trophy, activeRoutes: ['Positions', 'Scorers'] },
  { key: 'games', label: 'Juegos', route: 'Games', icon: GameController, activeRoutes: ['Games', 'Quiniela', 'Ranking', 'DailyPlayer', 'LigaManager'] },
  { key: 'myteam', label: 'Mi club', route: 'MyTeam', icon: TShirt, activeRoutes: ['MyTeam', 'TeamScreen'] },
];

const FooterItem = memo(function FooterItem({ item, active, navigation, colors, onAir }) {
  const Icon = item.icon;
  const isLive = item.key === 'live' && onAir;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={isLive ? 'En vivo ahora' : item.label}
      onPress={async () => {
        // En vivo: intersticial (video/pantalla completa) antes de entrar
        if (item.key === 'live' && !active) {
          try {
            await showInterstitialIfReady('tab_live');
          } catch {}
        }
        navigation?.navigate(item.route);
      }}
      style={styles.item}
    >
      {active ? <View style={[styles.indicator, { backgroundColor: colors.primary }]} /> : null}
      <View>
        <Icon size={23} color={isLive ? colors.live : active ? colors.text : colors.textMuted} weight={active || isLive ? 'fill' : 'regular'} />
        {isLive ? (
          <View style={styles.liveDot}>
            <PulseDot size={7} />
          </View>
        ) : null}
      </View>
      <Txt variant="caption" color={isLive ? colors.live : active ? colors.text : colors.textMuted} style={styles.label} numberOfLines={1}>
        {item.label}
      </Txt>
    </Pressable>
  );
});

function FooterTabs({ navigation, routeName = 'Home' }) {
  const { colors } = useDesign();
  const { tv } = useLigaTV();
  return (
    <View style={[styles.container, { backgroundColor: colors.bgElevated, borderTopColor: colors.divider }]}>
      {ITEMS.map((item) => (
        <FooterItem key={item.key} item={item} active={item.activeRoutes.includes(routeName)} navigation={navigation} colors={colors} onAir={Boolean(tv?.active)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', justifyContent: 'space-around', borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, paddingBottom: 8 },
  item: { alignItems: 'center', flex: 1, gap: 4 },
  indicator: { position: 'absolute', top: -11, width: 24, height: 3, transform: [{ skewX: '-30deg' }] },
  liveDot: { position: 'absolute', top: -1, right: -3 },
  label: { fontSize: 10, lineHeight: 13, fontFamily: 'Inter-SemiBold' },
});

export default memo(FooterTabs);
