// components/QuickAccess.js
// Liga Nacional GT
// Accesos rápidos Home - diseño 4 x 2

import React, {
  useCallback,
  useRef,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';

import {
  Trophy,
  SoccerBall,
  CalendarBlank,
  NewspaperClipping,
  ChartBar,
  TShirt,
  ShieldStar,
  DotsThree,
} from 'phosphor-react-native';

import {
  useTheme,
} from '../utils/ThemeContext';


/* =========================================================
   ITEMS
========================================================= */

const ITEMS = [

  {
    key:
      'positions',

    label:
      'Posiciones',

    Icon:
      Trophy,

    screen:
      'Positions',

    color:
      '#F5A000',

    bgLight:
      '#FFF6DA',

    bgDark:
      'rgba(245,160,0,0.14)',
  },


  {
    key:
      'scorers',

    label:
      'Goleadores',

    Icon:
      SoccerBall,

    screen:
      'Scorers',

    color:
      '#10B981',

    bgLight:
      '#E5FAF1',

    bgDark:
      'rgba(16,185,129,0.14)',
  },


  {
    key:
      'calendar',

    label:
      'Calendario',

    Icon:
      CalendarBlank,

    screen:
      'Calendar',

    color:
      '#3478F6',

    bgLight:
      '#EAF2FF',

    bgDark:
      'rgba(52,120,246,0.14)',
  },


  {
    key:
      'news',

    label:
      'Noticias',

    Icon:
      NewspaperClipping,

    screen:
      'New',

    color:
      '#A237F4',

    bgLight:
      '#F4EAFE',

    bgDark:
      'rgba(162,55,244,0.14)',
  },


  {
    key:
      'stats',

    label:
      'Estadísticas',

    Icon:
      ChartBar,

    screen:
      null,

    color:
      '#F02A55',

    bgLight:
      '#FFE8EE',

    bgDark:
      'rgba(240,42,85,0.14)',
  },


  {
    key:
      'myTeam',

    label:
      'Mi Equipo',

    Icon:
      TShirt,

    screen:
      'MyTeam',

    color:
      '#3478F6',

    bgLight:
      '#E7F1FF',

    bgDark:
      'rgba(52,120,246,0.14)',
  },


  {
    key:
      'clubs',

    label:
      'Clubes',

    Icon:
      ShieldStar,

    screen:
      'Teams',

    color:
      '#922BEF',

    bgLight:
      '#F1E7FE',

    bgDark:
      'rgba(146,43,239,0.14)',
  },


  {
    key:
      'more',

    label:
      'Más',

    Icon:
      DotsThree,

    screen:
      'More',

    color:
      '#6473A3',

    bgLight:
      '#EEF1F8',

    bgDark:
      'rgba(100,115,163,0.14)',
  },

];


/* =========================================================
   ITEM
========================================================= */

function QuickItem({
  item,
  onPress,
  colors,
  isDark,
}) {

  const scale =
    useRef(
      new Animated.Value(
        1,
      ),
    ).current;


  const handlePressIn =
    useCallback(
      () => {

        Animated.spring(
          scale,
          {
            toValue:
              0.95,

            useNativeDriver:
              true,

            speed:
              45,

            bounciness:
              0,
          },
        ).start();

      },
      [
        scale,
      ],
    );


  const handlePressOut =
    useCallback(
      () => {

        Animated.spring(
          scale,
          {
            toValue:
              1,

            useNativeDriver:
              true,

            speed:
              20,

            bounciness:
              5,
          },
        ).start();

      },
      [
        scale,
      ],
    );


  const iconBg =
    isDark
      ? item.bgDark
      : item.bgLight;


  const disabled =
    !item?.screen;


  return (

    <TouchableOpacity
      activeOpacity={1}

      disabled={
        disabled
      }

      onPress={
        () =>
          onPress(
            item,
          )
      }

      onPressIn={
        handlePressIn
      }

      onPressOut={
        handlePressOut
      }

      style={
        styles.itemTouch
      }
    >

      <Animated.View
        style={[
          styles.itemCard,

          {
            backgroundColor:
              colors.cardBg,

            borderColor:
              isDark
                ? 'rgba(255,255,255,0.08)'
                : '#E6EBF3',

            transform: [
              {
                scale,
              },
            ],
          },
        ]}
      >

        <View
          style={[
            styles.iconCircle,

            {
              backgroundColor:
                iconBg,
            },
          ]}
        >

          <item.Icon
            size={22}

            color={
              item.color
            }

            weight="fill"
          />

        </View>


        <Text
          numberOfLines={1}

          style={[
            styles.itemLabel,

            {
              color:
                colors.text,
            },
          ]}
        >
          {item.label}
        </Text>

      </Animated.View>

    </TouchableOpacity>

  );

}


/* =========================================================
   QUICK ACCESS
========================================================= */

export default function QuickAccess({
  navigation,
  style,
}) {

  const {
    theme,
  } =
    useTheme();


  const colors =
    theme.colors;


  const isDark =
    theme.mode ===
    'dark';


  const handlePress =
    useCallback(
      item => {

        if (
          !item?.screen
        ) {
          return;
        }


        navigation
          ?.navigate?.(
            item.screen,
          );

      },
      [
        navigation,
      ],
    );


  return (

    <View
      style={[
        styles.container,
        style,
      ]}
    >

      <View
        style={
          styles.grid
        }
      >

        {ITEMS.map(
          item => (

            <QuickItem
              key={
                item.key
              }

              item={
                item
              }

              onPress={
                handlePress
              }

              colors={
                colors
              }

              isDark={
                isDark
              }
            />

          ),
        )}

      </View>

    </View>

  );

}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    container: {
      marginHorizontal:
        12,

      marginTop:
        2,

      marginBottom:
        14,
    },


    grid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',

      rowGap:
        9,
    },


    itemTouch: {
      width:
        '24%',
    },


    itemCard: {
      minHeight:
        78,

      borderRadius:
        16,

      borderWidth:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        4,

      paddingVertical:
        9,

      shadowColor:
        '#101828',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.06,

      shadowRadius:
        6,

      elevation:
        2,
    },


    iconCircle: {
      width:
        38,

      height:
        38,

      borderRadius:
        13,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginBottom:
        5,
    },


    itemLabel: {
      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        10.5,

      lineHeight:
        15,

      textAlign:
        'center',

      includeFontPadding:
        false,
    },

  });