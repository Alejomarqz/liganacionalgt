// components/FooterTabs.js
// Liga Nacional GT
// Navegación inferior - diseño de referencia

import React, { memo } from 'react';

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {
  SoccerBall,
  Trophy,
  CalendarBlank,
  TShirt,
  SquaresFour,
} from 'phosphor-react-native';

const BLUE = '#285FFF';
const INACTIVE = '#6073A4';
const WHITE = '#FFFFFF';

const ITEMS = [
  {
    key: 'matches',
    label: 'Partidos',
    route: 'Home',
    icon: SoccerBall,
    activeRoutes: [
      'Home',
      'Match',
      'Schedule',
    ],
  },
  {
    key: 'positions',
    label: 'Posiciones',
    route: 'Positions',
    icon: Trophy,
    activeRoutes: ['Positions'],
  },
  {
    key: 'calendar',
    label: 'Calendario',
    route: 'Calendar',
    icon: CalendarBlank,
    activeRoutes: ['Calendar'],
  },
  {
    key: 'myteam',
    label: 'Mi Equipo',
    route: 'MyTeam',
    icon: TShirt,
    activeRoutes: ['MyTeam', 'TeamScreen'],
  },
  {
    key: 'more',
    label: 'Más',
    route: 'More',
    icon: SquaresFour,
    activeRoutes: [
      'More',
      'Settings',
      'Teams',
      'Players',
      'Scorers',
      'New',
      'ActiveNotifications',
    ],
  },
];

function FooterItem({
  item,
  active,
  navigation,
}) {
  const Icon = item.icon;

  const goToRoute = () => {
    if (!navigation || !item.route) {
      return;
    }

    navigation.navigate(item.route);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={goToRoute}
      style={[
        styles.item,
        active && styles.itemActive,
      ]}
    >
      <View style={styles.iconArea}>
        <Icon
          size={active ? 32 : 28}
          color={active ? BLUE : INACTIVE}
          weight={active ? 'fill' : 'regular'}
        />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.label,
          active && styles.labelActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

function FooterTabs({
  navigation,
  routeName = 'Home',
}) {
  return (
    <View style={styles.container}>
      {ITEMS.map(item => {
        const active =
          item.activeRoutes.includes(routeName);

        return (
          <FooterItem
            key={item.key}
            item={item}
            active={active}
            navigation={navigation}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 72,
    paddingHorizontal: 8,
    paddingTop: 3,
    paddingBottom: 2,
    backgroundColor: WHITE,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E1E7F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  item: {
    flex: 1,
    height: 68,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemActive: {
    backgroundColor: '#EDF2FF',
  },

  iconArea: {
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    color: INACTIVE,
    fontFamily: 'Poppins-Regular',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },

  labelActive: {
    color: BLUE,
    fontFamily: 'Poppins-SemiBold',
  },
});

export default memo(FooterTabs);

