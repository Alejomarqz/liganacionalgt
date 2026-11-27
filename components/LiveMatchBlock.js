// components/LiveMatchBlock.js
// Liga Nacional GT
//
// Pestaña EN VIVO.
// Cronología de eventos usando exclusivamente data.events.
//
// Sin iconos externos para evitar incompatibilidades.
// Filtros:
// - Todos
// - Goles
// - Tarjetas
// - Cambios
// - VAR, solamente si existe.

import React, {
  memo,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

import {
  BRAND,
} from '../utils/theme';


/* =========================================================
   HELPERS
========================================================= */

function safeText(
  value,
  fallback = '',
) {
  if (
    value === null ||
    value === undefined
  ) {
    return fallback;
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    return String(value);
  }

  if (
    typeof value === 'object'
  ) {
    const candidates = [
      value?.label,
      value?.display,
      value?.title,
      value?.name,
      value?.short,
    ];

    for (
      const candidate
      of candidates
    ) {
      if (
        candidate !== null &&
        candidate !== undefined &&
        (
          typeof candidate === 'string' ||
          typeof candidate === 'number'
        )
      ) {
        const text =
          String(candidate).trim();

        if (text) {
          return text;
        }
      }
    }
  }

  return fallback;
}


function normalize(
  value,
) {
  return safeText(
    value,
    '',
  )
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      '',
    )
    .replace(
      /[^a-z0-9]/g,
      '',
    );
}


function eventType(
  event,
) {
  return normalize(
    event?.event_type ??
    event?.type,
  );
}


function eventMinute(
  event,
) {
  const minute =
    Number(
      event?.minute,
    );

  const stoppage =
    Number(
      event?.stoppage ||
      0,
    );

  if (
    !Number.isFinite(
      minute,
    )
  ) {
    return '';
  }

  if (
    stoppage > 0
  ) {
    return `${minute}+${stoppage}′`;
  }

  return `${minute}′`;
}


/* =========================================================
   TYPES
========================================================= */

const GOAL_TYPES =
  new Set([
    'goal',
    'penaltygoal',
    'owngoal',
  ]);


const CARD_TYPES =
  new Set([
    'yellowcard',
    'redcard',
    'secondyellowred',
  ]);


const SUB_TYPES =
  new Set([
    'substitution',
  ]);


function isVarType(
  type,
) {
  return String(
    type ||
    '',
  ).includes(
    'var',
  );
}


/* =========================================================
   TEAM
========================================================= */

function eventTeam(
  event,
  data,
) {
  const direct =
    safeText(
      event?.team_name ??
      event?.teamName,
      '',
    );

  if (direct) {
    return direct;
  }

  const teamId =
    Number(
      event?.team_id ??
      event?.teamId ??
      0,
    );

  const home =
    data?.teams?.home ||
    {};

  const away =
    data?.teams?.away ||
    {};

  if (
    teamId &&
    teamId ===
      Number(
        home?.id ||
        0,
      )
  ) {
    return safeText(
      home?.name,
      '',
    );
  }

  if (
    teamId &&
    teamId ===
      Number(
        away?.id ||
        0,
      )
  ) {
    return safeText(
      away?.name,
      '',
    );
  }

  return '';
}


/* =========================================================
   EVENT MESSAGE
========================================================= */

function eventMessage(
  event,
) {
  const display =
    safeText(
      event?.display,
      '',
    );

  if (display) {
    return display;
  }

  const type =
    eventType(
      event,
    );

  const player =
    safeText(
      event?.player_name ??
      event?.playerName,
      '',
    );

  if (
    type === 'goal'
  ) {
    return player
      ? `Gol de ${player}`
      : 'Gol';
  }

  if (
    type ===
    'penaltygoal'
  ) {
    return player
      ? `Gol de penal de ${player}`
      : 'Gol de penal';
  }

  if (
    type ===
    'owngoal'
  ) {
    return player
      ? `Autogol de ${player}`
      : 'Autogol';
  }

  if (
    type ===
    'yellowcard'
  ) {
    return player
      ? `Tarjeta amarilla para ${player}`
      : 'Tarjeta amarilla';
  }

  if (
    type ===
    'redcard'
  ) {
    return player
      ? `Tarjeta roja para ${player}`
      : 'Tarjeta roja';
  }

  if (
    type ===
    'secondyellowred'
  ) {
    return player
      ? `Segunda amarilla y expulsión para ${player}`
      : 'Segunda amarilla y expulsión';
  }

  if (
    type ===
    'substitution'
  ) {
    const incoming =
      safeText(
        event?.player_in_name ??
        event?.playerInName ??
        event?.in_player_name,
        '',
      );

    const outgoing =
      safeText(
        event?.player_out_name ??
        event?.playerOutName ??
        event?.out_player_name,
        '',
      );

    if (
      incoming &&
      outgoing
    ) {
      return (
        `Entra ${incoming} · ` +
        `Sale ${outgoing}`
      );
    }

    if (incoming) {
      return `Entra ${incoming}`;
    }

    if (outgoing) {
      return `Sale ${outgoing}`;
    }

    return 'Cambio';
  }

  if (
    isVarType(
      type,
    )
  ) {
    return player
      ? `Revisión VAR sobre ${player}`
      : 'Revisión VAR';
  }

  if (
    type ===
      'kickoff' ||
    type ===
      'firsthalf'
  ) {
    return 'Inicio del partido';
  }

  if (
    type ===
    'halftime'
  ) {
    return 'Final del primer tiempo';
  }

  if (
    type ===
    'secondhalf'
  ) {
    return 'Inicio del segundo tiempo';
  }

  if (
    type ===
      'finished' ||
    type ===
      'fulltime'
  ) {
    return 'Final del partido';
  }

  return safeText(
    event?.note,
    'Evento del partido',
  );
}


/* =========================================================
   FILTERS
========================================================= */

function filterEvents(
  events,
  filter,
) {
  if (
    filter === 'all'
  ) {
    return events;
  }

  return events.filter(
    event => {
      const type =
        eventType(
          event,
        );

      if (
        filter ===
        'goals'
      ) {
        return GOAL_TYPES.has(
          type,
        );
      }

      if (
        filter ===
        'cards'
      ) {
        return CARD_TYPES.has(
          type,
        );
      }

      if (
        filter ===
        'subs'
      ) {
        return SUB_TYPES.has(
          type,
        );
      }

      if (
        filter ===
        'var'
      ) {
        return isVarType(
          type,
        );
      }

      return true;
    },
  );
}


/* =========================================================
   SORT
========================================================= */

function sortEvents(
  source,
) {
  return [
    ...source,
  ].sort(
    (
      a,
      b,
    ) => {
      const minuteA =
        Number(
          a?.minute ||
          0,
        );

      const minuteB =
        Number(
          b?.minute ||
          0,
        );

      const stoppageA =
        Number(
          a?.stoppage ||
          0,
        );

      const stoppageB =
        Number(
          b?.stoppage ||
          0,
        );

      return (
        minuteA * 100 +
        stoppageA
      ) - (
        minuteB * 100 +
        stoppageB
      );
    },
  );
}


/* =========================================================
   FILTER SYMBOL
========================================================= */

function FilterSymbol({
  type,
  active,
}) {
  const color =
    active
      ? '#FFFFFF'
      : '#607298';

  if (
    type ===
    'cards'
  ) {
    return (
      <View
        style={
          styles.cardsSymbol
        }
      >
        <View
          style={
            styles.cardsYellow
          }
        />

        <View
          style={
            styles.cardsRed
          }
        />
      </View>
    );
  }

  if (
    type ===
    'var'
  ) {
    return (
      <View
        style={[
          styles.varFilterIcon,

          active && {
            borderColor:
              '#FFFFFF',
          },
        ]}
      >
        <Text
          style={[
            styles.varFilterText,

            {
              color,
            },
          ]}
        >
          VAR
        </Text>
      </View>
    );
  }

  let symbol =
    '☷';

  if (
    type ===
    'goals'
  ) {
    symbol =
      '⚽';
  }

  if (
    type ===
    'subs'
  ) {
    symbol =
      '↔';
  }

  return (
    <Text
      style={[
        styles.filterSymbolText,

        {
          color,
        },
      ]}
    >
      {symbol}
    </Text>
  );
}


/* =========================================================
   FILTER BUTTON
========================================================= */

function FilterButton({
  active,
  type,
  label,
  onPress,
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}

      onPress={
        onPress
      }

      style={[
        styles.filter,

        active &&
        styles.filterActive,
      ]}
    >
      <FilterSymbol
        type={
          type
        }

        active={
          active
        }
      />

      <Text
        style={[
          styles.filterLabel,

          active &&
          styles.filterLabelActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}


/* =========================================================
   EVENT SYMBOL
========================================================= */

function EventSymbol({
  type,
}) {
  if (
    GOAL_TYPES.has(
      type,
    )
  ) {
    return (
      <Text
        style={
          styles.goalSymbol
        }
      >
        ⚽
      </Text>
    );
  }

  if (
    type ===
    'yellowcard'
  ) {
    return (
      <View
        style={
          styles.yellowCard
        }
      />
    );
  }

  if (
    type ===
    'redcard'
  ) {
    return (
      <View
        style={
          styles.redCard
        }
      />
    );
  }

  if (
    type ===
    'secondyellowred'
  ) {
    return (
      <View
        style={
          styles.doubleCard
        }
      >
        <View
          style={
            styles.doubleYellow
          }
        />

        <View
          style={
            styles.doubleRed
          }
        />
      </View>
    );
  }

  if (
    type ===
    'substitution'
  ) {
    return (
      <Text
        style={
          styles.subSymbol
        }
      >
        ↔
      </Text>
    );
  }

  if (
    isVarType(
      type,
    )
  ) {
    return (
      <View
        style={
          styles.varEventIcon
        }
      >
        <Text
          style={
            styles.varEventText
          }
        >
          VAR
        </Text>
      </View>
    );
  }

  return (
    <View
      style={
        styles.genericEventDot
      }
    />
  );
}


/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyEvents({
  hasAnyEvents,
}) {
  return (
    <View
      style={
        styles.emptyCard
      }
    >
      <View
        style={
          styles.emptyIcon
        }
      >
        <Text
          style={
            styles.emptyIconText
          }
        >
          ●
        </Text>
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        {hasAnyEvents
          ? 'Sin eventos de esta categoría'
          : 'El partido aún no inicia'}
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        {hasAnyEvents
          ? 'Selecciona otra categoría para consultar las incidencias.'
          : 'Los eventos aparecerán aquí cuando comience el encuentro.'}
      </Text>
    </View>
  );
}


/* =========================================================
   EVENT ROW
========================================================= */

function EventRow({
  event,
  data,
  last,
}) {
  const type =
    eventType(
      event,
    );

  const team =
    eventTeam(
      event,
      data,
    );

  return (
    <View
      style={
        styles.eventRow
      }
    >
      {/* LINE */}

      <View
        style={
          styles.timelineSide
        }
      >
        <View
          style={
            styles.timelineDot
          }
        />

        {!last && (
          <View
            style={
              styles.timelineLine
            }
          />
        )}
      </View>

      {/* MINUTE */}

      <View
        style={
          styles.minuteBox
        }
      >
        <Text
          style={
            styles.minuteText
          }
        >
          {eventMinute(
            event,
          ) || '•'}
        </Text>
      </View>

      {/* EVENT */}

      <View
        style={
          styles.eventCard
        }
      >
        <View
          style={
            styles.eventIcon
          }
        >
          <EventSymbol
            type={
              type
            }
          />
        </View>

        <View
          style={
            styles.eventContent
          }
        >
          <Text
            numberOfLines={2}

            style={
              styles.eventTitle
            }
          >
            {eventMessage(
              event,
            )}
          </Text>

          {!!team && (
            <Text
              numberOfLines={1}

              style={
                styles.eventTeam
              }
            >
              {team}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}


/* =========================================================
   MAIN
========================================================= */

function LiveMatchBlock({
  data,
}) {
  const [
    filter,
    setFilter,
  ] =
    useState(
      'all',
    );

  const events =
    useMemo(
      () => {
        const source =
          Array.isArray(
            data?.events,
          )
            ? data.events
            : [];

        return sortEvents(
          source,
        );
      },
      [
        data?.events,
      ],
    );

  const hasVar =
    useMemo(
      () =>
        events.some(
          event =>
            isVarType(
              eventType(
                event,
              ),
            ),
        ),
      [
        events,
      ],
    );

  const filtered =
    useMemo(
      () =>
        filterEvents(
          events,
          filter,
        ),
      [
        events,
        filter,
      ],
    );

  const filters = [
    {
      key:
        'all',

      label:
        'Todos',
    },

    {
      key:
        'goals',

      label:
        'Goles',
    },

    {
      key:
        'cards',

      label:
        'Tarjetas',
    },

    {
      key:
        'subs',

      label:
        'Cambios',
    },
  ];

  if (
    hasVar
  ) {
    filters.push({
      key:
        'var',

      label:
        'VAR',
    });
  }

  return (
    <View
      style={
        styles.screen
      }
    >
      {/* HEADER */}

      <View
        style={
          styles.header
        }
      >
        <View
          style={
            styles.headerIcon
          }
        >
          <Text
            style={
              styles.headerIconText
            }
          >
            ↕
          </Text>
        </View>

        <View
          style={
            styles.headerTextWrap
          }
        >
          <Text
            style={
              styles.headerTitle
            }
          >
            Eventos del partido
          </Text>

          <Text
            style={
              styles.headerSubtitle
            }
          >
            Cronología del encuentro
          </Text>
        </View>

        {!!events.length && (
          <View
            style={
              styles.counter
            }
          >
            <Text
              style={
                styles.counterText
              }
            >
              {events.length}
            </Text>
          </View>
        )}
      </View>

      {/* FILTERS */}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.filters
        }
      >
        {filters.map(
          item => (
            <FilterButton
              key={
                item.key
              }

              active={
                filter ===
                item.key
              }

              type={
                item.key
              }

              label={
                item.label
              }

              onPress={
                () =>
                  setFilter(
                    item.key,
                  )
              }
            />
          ),
        )}
      </ScrollView>

      {/* TIMELINE */}

      {!filtered.length ? (
        <EmptyEvents
          hasAnyEvents={
            events.length > 0
          }
        />

      ) : (
        <View
          style={
            styles.timelineCard
          }
        >
          {filtered.map(
            (
              event,
              index,
            ) => (
              <EventRow
                key={
                  String(
                    event?.id ||
                    `${eventType(
                      event,
                    )}-${index}`,
                  )
                }

                event={
                  event
                }

                data={
                  data
                }

                last={
                  index ===
                  filtered.length -
                  1
                }
              />
            ),
          )}
        </View>
      )}
    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    screen: {
      paddingHorizontal:
        10,

      paddingTop:
        10,

      paddingBottom:
        25,
    },


    /* HEADER */

    header: {
      minHeight:
        54,

      paddingHorizontal:
        3,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    headerIcon: {
      width:
        37,

      height:
        37,

      borderRadius:
        12,

      backgroundColor:
        '#EDF3FF',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        9,
    },


    headerIconText: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        18,
    },


    headerTextWrap: {
      flex:
        1,
    },


    headerTitle: {
      color:
        '#111A43',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        14,
    },


    headerSubtitle: {
      marginTop:
        1,

      color:
        '#7A87A3',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        7.5,
    },


    counter: {
      minWidth:
        31,

      height:
        31,

      paddingHorizontal:
        8,

      borderRadius:
        16,

      backgroundColor:
        '#EDF3FF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    counterText: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        8,
    },


    /* FILTERS */

    filters: {
      paddingTop:
        8,

      paddingBottom:
        11,

      paddingRight:
        4,
    },


    filter: {
      minHeight:
        34,

      marginRight:
        7,

      paddingHorizontal:
        12,

      borderRadius:
        17,

      borderWidth:
        1,

      borderColor:
        '#E2E7F0',

      backgroundColor:
        '#F1F4F9',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,
    },


    filterActive: {
      borderColor:
        BRAND.primary,

      backgroundColor:
        BRAND.primary,
    },


    filterLabel: {
      color:
        '#607298',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8,
    },


    filterLabelActive: {
      color:
        '#FFFFFF',
    },


    filterSymbolText: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        11,
    },


    /* CARDS SYMBOL */

    cardsSymbol: {
      width:
        18,

      height:
        15,

      position:
        'relative',
    },


    cardsYellow: {
      position:
        'absolute',

      left:
        1,

      top:
        1,

      width:
        8,

      height:
        11,

      borderRadius:
        1,

      backgroundColor:
        '#F1D600',
    },


    cardsRed: {
      position:
        'absolute',

      left:
        8,

      top:
        3,

      width:
        8,

      height:
        11,

      borderRadius:
        1,

      backgroundColor:
        '#E63C3C',
    },


    /* VAR FILTER */

    varFilterIcon: {
      minWidth:
        25,

      height:
        16,

      paddingHorizontal:
        3,

      borderWidth:
        1,

      borderColor:
        '#607298',

      borderRadius:
        4,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    varFilterText: {
      fontFamily:
        'Poppins-Bold',

      fontSize:
        5,
    },


    /* TIMELINE CARD */

    timelineCard: {
      borderRadius:
        19,

      borderWidth:
        1,

      borderColor:
        '#E1E7F0',

      backgroundColor:
        '#FFFFFF',

      paddingHorizontal:
        9,

      paddingVertical:
        6,

      shadowColor:
        '#16294E',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.04,

      shadowRadius:
        8,

      elevation:
        1,
    },


    eventRow: {
      minHeight:
        67,

      flexDirection:
        'row',

      alignItems:
        'stretch',
    },


    timelineSide: {
      width:
        18,

      alignItems:
        'center',

      position:
        'relative',
    },


    timelineDot: {
      width:
        10,

      height:
        10,

      marginTop:
        29,

      borderRadius:
        5,

      backgroundColor:
        BRAND.primary,

      zIndex:
        2,
    },


    timelineLine: {
      position:
        'absolute',

      top:
        36,

      bottom:
        -31,

      width:
        1.5,

      backgroundColor:
        '#B8C7E5',
    },


    minuteBox: {
      width:
        47,

      height:
        47,

      marginTop:
        10,

      marginHorizontal:
        6,

      borderRadius:
        12,

      backgroundColor:
        '#F0F3F8',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    minuteText: {
      color:
        '#27395E',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        10,
    },


    eventCard: {
      flex:
        1,

      minHeight:
        51,

      marginVertical:
        7,

      borderRadius:
        14,

      borderWidth:
        1,

      borderColor:
        '#E4E9F2',

      backgroundColor:
        '#FFFFFF',

      paddingHorizontal:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    eventIcon: {
      width:
        38,

      height:
        38,

      borderRadius:
        11,

      backgroundColor:
        '#F5F7FB',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        9,
    },


    eventContent: {
      flex:
        1,

      minWidth:
        0,
    },


    eventTitle: {
      color:
        '#111A43',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9.5,

      lineHeight:
        13,
    },


    eventTeam: {
      marginTop:
        1,

      color:
        '#7582A0',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        7.2,
    },


    /* EVENT SYMBOLS */

    goalSymbol: {
      fontSize:
        19,
    },


    yellowCard: {
      width:
        13,

      height:
        20,

      borderRadius:
        2,

      backgroundColor:
        '#F4D900',
    },


    redCard: {
      width:
        13,

      height:
        20,

      borderRadius:
        2,

      backgroundColor:
        '#EA3131',
    },


    doubleCard: {
      width:
        24,

      height:
        24,

      position:
        'relative',
    },


    doubleYellow: {
      position:
        'absolute',

      left:
        2,

      top:
        2,

      width:
        11,

      height:
        17,

      borderRadius:
        2,

      backgroundColor:
        '#F4D900',
    },


    doubleRed: {
      position:
        'absolute',

      right:
        2,

      bottom:
        2,

      width:
        11,

      height:
        17,

      borderRadius:
        2,

      backgroundColor:
        '#EA3131',
    },


    subSymbol: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        20,
    },


    varEventIcon: {
      minWidth:
        29,

      height:
        20,

      borderRadius:
        5,

      backgroundColor:
        '#EEE9FF',

      borderWidth:
        1,

      borderColor:
        '#D8CBFF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    varEventText: {
      color:
        '#6745CC',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        6,
    },


    genericEventDot: {
      width:
        13,

      height:
        13,

      borderRadius:
        7,

      backgroundColor:
        BRAND.primary,
    },


    /* EMPTY */

    emptyCard: {
      minHeight:
        190,

      borderRadius:
        19,

      borderWidth:
        1,

      borderColor:
        '#E1E7F0',

      backgroundColor:
        '#FFFFFF',

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        25,
    },


    emptyIcon: {
      width:
        56,

      height:
        56,

      borderRadius:
        28,

      backgroundColor:
        '#EDF3FF',

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    emptyIconText: {
      color:
        BRAND.primary,

      fontSize:
        18,
    },


    emptyTitle: {
      marginTop:
        10,

      color:
        '#111A43',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        11,
    },


    emptyText: {
      maxWidth:
        270,

      marginTop:
        4,

      color:
        '#7B88A4',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        8,

      lineHeight:
        13,

      textAlign:
        'center',
    },

  });


export default memo(
  LiveMatchBlock,
);