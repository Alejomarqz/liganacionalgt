// components/MyTeam.js
// Liga Nacional GT
//
// MI EQUIPO
// - Selector premium de equipo favorito.
// - Guarda un único favorito en AsyncStorage.
// - Hero personalizado por club.
// - Resumen, Partidos, Clasificación y Plantilla.
// - Fondos locales por equipo.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import AsyncStorage
  from '@react-native-async-storage/async-storage';

import LinearGradient
  from 'react-native-linear-gradient';

import {
  ArrowLeft,
  CalendarBlank,
  CaretRight,
  Check,
  DotsThree,
  House,
  SoccerBall,
  Star,
  Trophy,
  Users,
} from 'phosphor-react-native';

import TeamMatches
  from './TeamMatches';

import PositionsBlock
  from './PositionsBlock';

import TeamSquad
  from './TeamSquad';

import {
  useTheme,
} from '../utils/ThemeContext';

import {
  BRAND,
} from '../utils/theme';


/* =========================================================
   CONFIG
========================================================= */

const API_BASE =
  'https://liganacionalgt.com/sistema/api';

const WP_BASE =
  'https://liganacionalgt.com/wp-json/wp/v2';

const FAVORITE_TEAM_KEY =
  'lngt_favorite_team_v1';


/* =========================================================
   IMÁGENES
========================================================= */

const SELECTOR_BG =
  require('../resources/home/featured-match-bg.png');


const TEAM_HEROES = {

  antigua:
    require('../resources/myteam/antigua.png'),

  aurora:
    require('../resources/myteam/aurora.png'),

  coban:
    require('../resources/myteam/coban.png'),

  comunicaciones:
    require('../resources/myteam/comunicaciones.png'),

  guastatoya:
    require('../resources/myteam/guastatoya.png'),

  malacateco:
    require('../resources/myteam/malacateco.png'),

  marquense:
    require('../resources/myteam/marquense.png'),

  mixco:
    require('../resources/myteam/mixco.png'),

  municipal:
    require('../resources/myteam/municipal.png'),

  'san-pedro':
    require('../resources/myteam/san-pedro.png'),

  suchitepequez:
    require('../resources/myteam/suchitepequez.png'),

  xelaju:
    require('../resources/myteam/xelaju.png'),
};


/* =========================================================
   API
========================================================= */

async function apiGet(
  endpoint,
  params = {},
) {

  const query =
    Object.entries(params)

      .filter(
        ([, value]) =>
          value !== null &&
          value !== undefined &&
          value !== '',
      )

      .map(
        ([key, value]) =>
          `${encodeURIComponent(
            key,
          )}=${encodeURIComponent(
            String(value),
          )}`,
      )

      .join('&');


  const url =
    `${API_BASE}/${endpoint}` +
    (
      query
        ? `?${query}`
        : ''
    );


  const response =
    await fetch(
      url,
      {
        headers: {
          Accept:
            'application/json',

          'Cache-Control':
            'no-cache',
        },
      },
    );


  let json = {};


  try {
    json =
      await response.json();
  } catch {}


  if (
    !response.ok
  ) {

    throw new Error(
      json?.error ||
      json?.message ||
      `HTTP ${response.status}`,
    );

  }


  return json || {};
}


/* =========================================================
   HELPERS
========================================================= */

function firstValue(
  ...values
) {

  for (
    const value of values
  ) {

    if (
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      return value;
    }

  }


  return null;
}


function normKey(
  value = '',
) {

  return String(
    value || '',
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


function fixTeamName(
  value = '',
) {

  const raw =
    String(
      value || '',
    ).trim();


  if (
    normKey(raw) ===
    'suchitepequez'
  ) {

    return 'Suchitepéquez';

  }


  return raw;
}


function initials(
  value = '',
) {

  return String(
    value || '',
  )

    .trim()

    .split(/\s+/)

    .filter(Boolean)

    .slice(
      0,
      2,
    )

    .map(
      word =>
        word
          .charAt(0)
          .toUpperCase(),
    )

    .join('');
}


function numberOrNull(
  ...values
) {

  for (
    const value of values
  ) {

    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      continue;
    }


    const parsed =
      Number(value);


    if (
      Number.isFinite(
        parsed,
      )
    ) {

      return parsed;

    }

  }


  return null;
}


function getTeamCode(
  team,
) {

  const short =
    String(
      team?.short ||
      '',
    )
      .trim()
      .toUpperCase();


  if (short) {
    return short;
  }


  const key =
    normKey(
      team?.name,
    );


  const map = {

    antigua:
      'ANT',

    aurora:
      'AUR',

    cobanimperial:
      'COB',

    comunicaciones:
      'COM',

    guastatoya:
      'GUA',

    malacateco:
      'MAL',

    marquense:
      'MAR',

    mixco:
      'MIX',

    municipal:
      'MUN',

    sanpedro:
      'SP',

    suchitepequez:
      'SUC',

    xelajumc:
      'XEL',

    xelaju:
      'XEL',
  };


  return (
    map[key] ||
    initials(
      team?.name,
    )
  );
}


function getHeroKey(
  teamName = '',
) {

  const key =
    normKey(
      teamName,
    );


  if (
    key.includes(
      'antigua',
    )
  ) {
    return 'antigua';
  }


  if (
    key.includes(
      'aurora',
    )
  ) {
    return 'aurora';
  }


  if (
    key.includes(
      'coban',
    )
  ) {
    return 'coban';
  }


  if (
    key.includes(
      'comunicaciones',
    )
  ) {
    return 'comunicaciones';
  }


  if (
    key.includes(
      'guastatoya',
    )
  ) {
    return 'guastatoya';
  }


  if (
    key.includes(
      'malacateco',
    )
  ) {
    return 'malacateco';
  }


  if (
    key.includes(
      'marquense',
    )
  ) {
    return 'marquense';
  }


  if (
    key.includes(
      'mixco',
    )
  ) {
    return 'mixco';
  }


  if (
    key.includes(
      'municipal',
    )
  ) {
    return 'municipal';
  }


  if (
    key.includes(
      'sanpedro',
    )
  ) {
    return 'san-pedro';
  }


  if (
    key.includes(
      'suchitepequez',
    )
  ) {
    return 'suchitepequez';
  }


  if (
    key.includes(
      'xelaju',
    )
  ) {
    return 'xelaju';
  }


  return 'antigua';
}


function getHeroSource(
  name,
) {

  const key =
    getHeroKey(
      name,
    );


  return (
    TEAM_HEROES[key] ||
    TEAM_HEROES.antigua
  );
}


function getTeamNickname(
  team,
) {

  const key =
    getHeroKey(
      team?.name,
    );


  const map = {

    antigua:
      'Coloniales',

    aurora:
      'Aurinegros',

    coban:
      'Príncipes Azules',

    comunicaciones:
      'Cremas',

    guastatoya:
      'Pecho Amarillo',

    malacateco:
      'Toros',

    marquense:
      'Leones',

    mixco:
      'Chicharroneros',

    municipal:
      'Rojos',

    'san-pedro':
      'San Pedranos',

    suchitepequez:
      'Venados',

    xelaju:
      'Super Chivos',
  };


  return (
    map[key] ||
    'Mi Equipo'
  );
}


function decodeHtml(
  value = '',
) {

  return String(
    value || '',
  )

    .replace(
      /&#8211;/g,
      '–',
    )

    .replace(
      /&#8212;/g,
      '—',
    )

    .replace(
      /&#8216;/g,
      '‘',
    )

    .replace(
      /&#8217;/g,
      '’',
    )

    .replace(
      /&#8220;/g,
      '“',
    )

    .replace(
      /&#8221;/g,
      '”',
    )

    .replace(
      /&#038;/g,
      '&',
    )

    .replace(
      /&amp;/g,
      '&',
    )

    .replace(
      /&quot;/g,
      '"',
    )

    .replace(
      /&#039;/g,
      "'",
    )

    .replace(
      /&nbsp;/g,
      ' ',
    )

    .replace(
      /<[^>]*>/g,
      '',
    )

    .trim();
}


/* =========================================================
   TEAMS
========================================================= */

function extractTeams(
  payload,
) {

  const source =
    Array.isArray(
      payload?.teams,
    )
      ? payload.teams

      : Array.isArray(
          payload?.data?.teams,
        )
        ? payload.data.teams

        : Array.isArray(
            payload?.data,
          )
          ? payload.data

          : Array.isArray(
              payload,
            )
            ? payload

            : [];


  return source

    .map(
      raw => ({

        id:
          Number(
            firstValue(
              raw?.id,
              raw?.team_id,
              raw?.teamId,
              0,
            ),
          ) || 0,


        name:
          fixTeamName(
            firstValue(
              raw?.name,
              raw?.team_name,
              'Equipo',
            ),
          ),


        short:
          String(
            firstValue(
              raw?.short,
              raw?.short_name,
              '',
            ) || '',
          ),


        logo:
          firstValue(
            raw?.logo,
            raw?.logo_url,
            raw?.logoUrl,
            null,
          ),

      }),
    )

    .filter(
      item =>
        !!item.id,
    )

    .sort(
      (
        a,
        b,
      ) =>
        a.name.localeCompare(
          b.name,
          'es',
        ),
    );
}


/* =========================================================
   TEAM
========================================================= */

function normalizeTeam(
  payload,
  favorite,
) {

  let raw =
    payload?.team ||
    payload?.data?.team ||
    payload?.data ||
    payload ||
    {};


  if (
    Array.isArray(
      raw,
    )
  ) {

    raw =
      raw[0] ||
      {};

  }


  return {

    id:
      Number(
        firstValue(
          raw?.id,
          raw?.team_id,
          favorite?.id,
          0,
        ),
      ) || 0,


    name:
      fixTeamName(
        firstValue(
          raw?.name,
          raw?.team_name,
          favorite?.name,
          'Equipo',
        ),
      ),


    short:
      String(
        firstValue(
          raw?.short,
          raw?.short_name,
          favorite?.short,
          '',
        ) || '',
      ),


    logo:
      firstValue(
        raw?.logo,
        raw?.logo_url,
        raw?.logoUrl,
        favorite?.logo,
        null,
      ),


    city:
      String(
        firstValue(
          raw?.city,
          raw?.location,
          '',
        ) || '',
      ),


    stadium:
      String(
        firstValue(
          raw?.stadium?.name,
          raw?.stadium_name,
          raw?.stadiumName,
          typeof raw?.stadium ===
            'string'
            ? raw.stadium
            : '',
          '',
        ) || '',
      ),
  };
}


/* =========================================================
   STANDINGS
========================================================= */

function extractStandings(
  payload,
  teams,
) {

  const source =
    Array.isArray(
      payload?.standings,
    )
      ? payload.standings

      : Array.isArray(
          payload?.data?.standings,
        )
        ? payload.data.standings

        : Array.isArray(
            payload?.data,
          )
          ? payload.data

          : Array.isArray(
              payload,
            )
            ? payload

            : [];


  return source.map(
    (
      row,
      index,
    ) => {

      const rawTeam =
        row?.team &&
        typeof row.team ===
          'object'
          ? row.team
          : {};


      const id =
        Number(
          firstValue(
            rawTeam?.id,
            row?.team_id,
            row?.teamId,
            0,
          ),
        ) || 0;


      const directory =
        teams.find(
          item =>
            Number(
              item.id,
            ) ===
            id,
        );


      return {

        position:
          Number(
            firstValue(
              row?.position,
              row?.rank,
              index + 1,
            ),
          ) ||
          index + 1,


        team: {
          id,

          name:
            fixTeamName(
              firstValue(
                rawTeam?.name,
                row?.name,
                row?.team_name,
                directory?.name,
                '',
              ),
            ),

          logo:
            firstValue(
              rawTeam?.logo,
              rawTeam?.logo_url,
              row?.logo,
              row?.logo_url,
              directory?.logo,
              null,
            ),
        },


        played:
          Number(
            firstValue(
              row?.played,
              row?.pj,
              0,
            ),
          ) || 0,


        won:
          Number(
            firstValue(
              row?.won,
              row?.pg,
              0,
            ),
          ) || 0,


        drawn:
          Number(
            firstValue(
              row?.drawn,
              row?.draw,
              row?.pe,
              0,
            ),
          ) || 0,


        lost:
          Number(
            firstValue(
              row?.lost,
              row?.pp,
              0,
            ),
          ) || 0,


        gd:
          Number(
            firstValue(
              row?.gd,
              row?.dg,
              0,
            ),
          ) || 0,


        points:
          Number(
            firstValue(
              row?.points,
              row?.pts,
              0,
            ),
          ) || 0,
      };
    },
  );
}


/* =========================================================
   MATCHES
========================================================= */

function extractMatches(
  payload,
) {

  return (
    Array.isArray(
      payload?.matches,
    )
      ? payload.matches

      : Array.isArray(
          payload?.data?.matches,
        )
        ? payload.data.matches

        : Array.isArray(
            payload?.data,
          )
          ? payload.data

          : Array.isArray(
              payload,
            )
            ? payload

            : []
  );
}


function normalizeMatch(
  raw,
) {

  const home =
    raw?.home ||
    raw?.teams?.home ||
    {};


  const away =
    raw?.away ||
    raw?.teams?.away ||
    {};


  const score =
    raw?.score &&
    typeof raw.score ===
      'object'
      ? raw.score
      : {};


  return {

    ...raw,


    id:
      Number(
        firstValue(
          raw?.id,
          raw?.match_id,
          raw?.matchId,
          0,
        ),
      ) || 0,


    status:
      String(
        firstValue(
          raw?.status,
          raw?.status_code,
          'scheduled',
        ),
      )
        .toLowerCase()
        .trim(),


    home: {

      id:
        Number(
          firstValue(
            home?.id,
            raw?.home_team_id,
            0,
          ),
        ) || 0,


      name:
        fixTeamName(
          firstValue(
            home?.name,
            raw?.home_team_name,
            '',
          ),
        ),


      logo:
        firstValue(
          home?.logo,
          home?.logo_url,
          null,
        ),
    },


    away: {

      id:
        Number(
          firstValue(
            away?.id,
            raw?.away_team_id,
            0,
          ),
        ) || 0,


      name:
        fixTeamName(
          firstValue(
            away?.name,
            raw?.away_team_name,
            '',
          ),
        ),


      logo:
        firstValue(
          away?.logo,
          away?.logo_url,
          null,
        ),
    },


    score: {

      home:
        numberOrNull(
          score?.home,
          raw?.home_score,
          raw?.homeScore,
        ),


      away:
        numberOrNull(
          score?.away,
          raw?.away_score,
          raw?.awayScore,
        ),

    },


    kickoff:
      firstValue(
        raw?.kickoff,
        raw?.scheduled_at,
        null,
      ),


    date:
      String(
        firstValue(
          raw?.date,
          String(
            raw?.kickoff ||
            '',
          ).slice(
            0,
            10,
          ),
          '',
        ),
      ),
  };
}


function matchTimestamp(
  match,
) {

  const value =
    firstValue(
      match?.kickoff,
      match?.date,
      '',
    );


  if (!value) {
    return 0;
  }


  const parsed =
    new Date(
      value,
    ).getTime();


  return Number.isFinite(
    parsed,
  )
    ? parsed
    : 0;
}


function getNextMatch(
  matches,
) {

  const now =
    Date.now();


  return matches

    .filter(
      match => {

        if (
          [
            'finished',
            'cancelled',
          ].includes(
            match?.status,
          )
        ) {

          return false;

        }


        const timestamp =
          matchTimestamp(
            match,
          );


        return (
          !timestamp ||
          timestamp >=
          now -
          21600000
        );
      },
    )

    .sort(
      (
        a,
        b,
      ) =>
        matchTimestamp(a) -
        matchTimestamp(b),
    )[0] ||
    null;
}


function getLastMatches(
  matches,
) {

  return matches

    .filter(
      match =>
        match?.status ===
        'finished' &&
        match?.score?.home !==
        null &&
        match?.score?.away !==
        null,
    )

    .sort(
      (
        a,
        b,
      ) =>
        matchTimestamp(b) -
        matchTimestamp(a),
    )

    .slice(
      0,
      5,
    );
}


function resultForTeam(
  match,
  teamId,
) {

  const home =
    Number(
      match?.home?.id,
    ) ===
    Number(
      teamId,
    );


  const gf =
    home
      ? match?.score?.home
      : match?.score?.away;


  const ga =
    home
      ? match?.score?.away
      : match?.score?.home;


  if (
    gf > ga
  ) {
    return 'G';
  }


  if (
    gf === ga
  ) {
    return 'E';
  }


  return 'P';
}


function formatKickoffDate(
  match,
) {

  const value =
    match?.kickoff ||
    match?.date;


  if (!value) {
    return 'Fecha por definir';
  }


  try {

    return new Date(
      value,
    ).toLocaleDateString(
      'es-GT',
      {
        weekday:
          'short',

        day:
          'numeric',

        month:
          'short',
      },
    );

  } catch {

    return 'Fecha por definir';

  }
}


function formatKickoffTime(
  match,
) {

  const value =
    String(
      match?.kickoff ||
      '',
    );


  const result =
    value.match(
      /T(\d{2}):(\d{2})/,
    );


  return result
    ? `${result[1]}:${result[2]}`
    : '';
}


function formatShortDate(
  match,
) {

  const value =
    match?.kickoff ||
    match?.date;


  if (!value) {
    return '';
  }


  try {

    return new Date(
      value,
    ).toLocaleDateString(
      'es-GT',
      {
        day:
          'numeric',

        month:
          'short',
      },
    );

  } catch {

    return '';

  }
}


/* =========================================================
   SCORERS
========================================================= */

function extractTeamScorers(
  payload,
  teamId,
) {

  const source =
    Array.isArray(
      payload?.scorers,
    )
      ? payload.scorers

      : Array.isArray(
          payload?.data,
        )
        ? payload.data

        : Array.isArray(
            payload,
          )
          ? payload

          : [];


  return source

    .map(
      row => {

        const player =
          row?.player &&
          typeof row.player ===
            'object'
            ? row.player
            : {};


        const team =
          row?.team &&
          typeof row.team ===
            'object'
            ? row.team
            : {};


        return {

          id:
            Number(
              firstValue(
                player?.id,
                row?.player_id,
                0,
              ),
            ) || 0,


          name:
            String(
              firstValue(
                player?.name,
                row?.player_name,
                'Jugador',
              ),
            ),


          photo:
            firstValue(
              player?.photo,
              player?.photo_url,
              row?.photo,
              null,
            ),


          teamId:
            Number(
              firstValue(
                team?.id,
                row?.team_id,
                0,
              ),
            ) || 0,


          goals:
            Number(
              firstValue(
                row?.goals,
                row?.goles,
                0,
              ),
            ) || 0,

        };
      },
    )

    .filter(
      scorer =>
        Number(
          scorer.teamId,
        ) ===
        Number(
          teamId,
        ),
    )

    .sort(
      (
        a,
        b,
      ) =>
        b.goals -
        a.goals,
    )

    .slice(
      0,
      3,
    );
}


/* =========================================================
   NEWS
========================================================= */

function getWpImage(
  post,
) {

  const media =
    post?._embedded?.[
      'wp:featuredmedia'
    ]?.[0];


  return (
    media?.media_details
      ?.sizes
      ?.medium_large
      ?.source_url ||

    media?.media_details
      ?.sizes
      ?.medium
      ?.source_url ||

    media?.source_url ||

    null
  );
}


async function loadTeamNews(
  teamName,
) {

  if (!teamName) {
    return [];
  }


  try {

    const url =
      `${WP_BASE}/posts` +
      `?_embed=1` +
      `&per_page=4` +
      `&search=${encodeURIComponent(
        teamName,
      )}`;


    const response =
      await fetch(
        url,
      );


    if (
      !response.ok
    ) {
      return [];
    }


    const json =
      await response.json();


    return Array.isArray(
      json,
    )
      ? json
      : [];

  } catch {

    return [];

  }
}


/* =========================================================
   TEAM LOGO
========================================================= */

function TeamLogo({
  uri,
  name,
  size = 44,
  colors,
}) {

  const [
    failed,
    setFailed,
  ] =
    useState(false);


  useEffect(
    () => {

      setFailed(false);

    },
    [
      uri,
    ],
  );


  if (
    uri &&
    !failed
  ) {

    return (
      <Image
        source={{
          uri,
        }}

        resizeMode="contain"

        onError={
          () =>
            setFailed(true)
        }

        style={{
          width:
            size,

          height:
            size,
        }}
      />
    );

  }


  return (
    <View
      style={[
        styles.logoFallback,

        {
          width:
            size,

          height:
            size,

          borderRadius:
            12,

          borderColor:
            colors.cardBorder,
        },
      ]}
    >

      <Text
        style={
          styles.logoFallbackText
        }
      >
        {initials(
          name,
        )}
      </Text>

    </View>
  );
}


/* =========================================================
   PLAYER PHOTO
========================================================= */

function PlayerPhoto({
  uri,
  name,
}) {

  const [
    failed,
    setFailed,
  ] =
    useState(false);


  useEffect(
    () => {

      setFailed(false);

    },
    [
      uri,
    ],
  );


  if (
    uri &&
    !failed
  ) {

    return (
      <Image
        source={{
          uri,
        }}

        resizeMode="cover"

        onError={
          () =>
            setFailed(true)
        }

        style={
          styles.playerPhoto
        }
      />
    );

  }


  return (
    <View
      style={[
        styles.playerPhoto,
        styles.playerFallback,
      ]}
    >

      <Text
        style={
          styles.playerFallbackText
        }
      >
        {initials(
          name,
        )}
      </Text>

    </View>
  );
}


/* =========================================================
   SELECTOR PREMIUM
========================================================= */

function FavoriteSelector({
  teams,
  selectedId,
  onSelect,
  onSave,
  loading,
  colors,
  navigation,
}) {

  const insets =
    useSafeAreaInsets();


  const selectedTeam =
    teams.find(
      item =>
        Number(
          item.id,
        ) ===
        Number(
          selectedId,
        ),
    );


  return (
    <View
      style={
        styles.selectorScreen
      }
    >

      {/* HERO */}

      <ImageBackground
        source={
          SELECTOR_BG
        }

        resizeMode="cover"

        style={[
          styles.selectorHero,
          {
            paddingTop:
              Math.max(
                insets.top,
                12,
              ),
          },
        ]}
      >

        <LinearGradient
          colors={[
            'rgba(3,27,65,0.65)',
            'rgba(3,32,73,0.84)',
            'rgba(3,36,79,0.97)',
          ]}

          style={
            StyleSheet.absoluteFill
          }
        />


        <TouchableOpacity
          activeOpacity={0.75}

          onPress={
            () =>
              navigation
                ?.goBack?.()
          }

          style={
            styles.selectorBack
          }
        >

          <ArrowLeft
            size={26}
            color="#FFFFFF"
          />

        </TouchableOpacity>


        <View
          style={
            styles.selectorHeroContent
          }
        >

          <Star
            size={39}
            weight="fill"
            color="#FFD229"
          />


          <Text
            style={
              styles.selectorQuestion
            }
          >
            ¿Cuál es tu equipo?
          </Text>


          <Text
            style={
              styles.selectorDescription
            }
          >
            Elige el club que quieres seguir de cerca.
          </Text>

        </View>

      </ImageBackground>


      {/* LISTA */}

      <View
        style={
          styles.selectorSheet
        }
      >

        {loading ? (

          <View
            style={
              styles.selectorLoading
            }
          >

            <ActivityIndicator
              size="large"
              color={
                BRAND.primary
              }
            />

          </View>

        ) : (

          <FlatList
            data={
              teams
            }

            keyExtractor={
              item =>
                String(
                  item.id,
                )
            }

            showsVerticalScrollIndicator={
              false
            }

            contentContainerStyle={{
              paddingHorizontal:
                14,

              paddingTop:
                14,

              paddingBottom:
                104 +
                insets.bottom,
            }}

            renderItem={
              ({
                item,
              }) => {

                const active =
                  Number(
                    selectedId,
                  ) ===
                  Number(
                    item.id,
                  );


                return (
                  <TouchableOpacity
                    activeOpacity={0.82}

                    onPress={
                      () =>
                        onSelect(
                          item.id,
                        )
                    }

                    style={[
                      styles.favoriteTeamCard,

                      active &&
                      styles.favoriteTeamCardActive,
                    ]}
                  >

                    {/* LOGO */}

                    <View
                      style={[
                        styles.favoriteLogoWrap,

                        active &&
                        styles.favoriteLogoWrapActive,
                      ]}
                    >

                      <TeamLogo
                        uri={
                          item.logo
                        }

                        name={
                          item.name
                        }

                        size={48}

                        colors={
                          colors
                        }
                      />

                    </View>


                    {/* NAME */}

                    <View
                      style={
                        styles.favoriteTeamInfo
                      }
                    >

                      <Text
                        numberOfLines={1}

                        style={
                          styles.favoriteTeamName
                        }
                      >
                        {item.name}
                      </Text>


                      <Text
                        style={
                          styles.favoriteTeamCode
                        }
                      >
                        {getTeamCode(
                          item,
                        )}
                      </Text>

                    </View>


                    {/* SELECT */}

                    {active ? (

                      <View
                        style={
                          styles.selectedCircle
                        }
                      >

                        <Check
                          size={16}
                          weight="bold"
                          color="#FFFFFF"
                        />

                      </View>

                    ) : (

                      <View
                        style={
                          styles.unselectedCircle
                        }
                      />

                    )}

                  </TouchableOpacity>
                );
              }
            }
          />

        )}


        {/* BOTÓN FIJO */}

        <View
          style={[
            styles.confirmArea,

            {
              paddingBottom:
                Math.max(
                  insets.bottom,
                  10,
                ),
            },
          ]}
        >

          <TouchableOpacity
            activeOpacity={0.86}

            disabled={
              !selectedTeam
            }

            onPress={
              onSave
            }

            style={[
              styles.confirmButton,

              !selectedTeam &&
              styles.confirmButtonDisabled,
            ]}
          >

            <Star
              size={22}
              weight="fill"
              color="#FFFFFF"
            />


            <Text
              style={
                styles.confirmButtonText
              }
            >
              Confirmar equipo favorito
            </Text>

          </TouchableOpacity>

        </View>

      </View>

    </View>
  );
}


/* =========================================================
   TABS
========================================================= */

function TopTabs({
  tab,
  setTab,
}) {

  const tabs = [

    {
      key:
        'Resumen',

      icon:
        Trophy,
    },

    {
      key:
        'Partidos',

      icon:
        CalendarBlank,
    },

    {
      key:
        'Clasificación',

      icon:
        Trophy,
    },

    {
      key:
        'Plantilla',

      icon:
        Users,
    },

  ];


  return (
    <View
      style={
        styles.tabsShell
      }
    >

      <View
        style={
          styles.tabsInner
        }
      >

        {tabs.map(
          item => {

            const active =
              item.key ===
              tab;


            const Icon =
              item.icon;


            return (
              <TouchableOpacity
                key={
                  item.key
                }

                activeOpacity={0.8}

                onPress={
                  () =>
                    setTab(
                      item.key,
                    )
                }

                style={[
                  styles.tabItem,

                  active &&
                  styles.tabActive,
                ]}
              >

                <Icon
                  size={16}

                  weight={
                    active
                      ? 'fill'
                      : 'regular'
                  }

                  color={
                    active
                      ? '#FFFFFF'
                      : '#66739A'
                  }
                />


                <Text
                  numberOfLines={1}

                  style={[
                    styles.tabText,

                    active &&
                    styles.tabTextActive,
                  ]}
                >
                  {item.key}
                </Text>

              </TouchableOpacity>
            );
          },
        )}

      </View>

    </View>
  );
}


/* =========================================================
   BOTTOM NAV
========================================================= */

function BottomNav({
  navigation,
}) {

  const items = [

    {
      label:
        'Inicio',

      route:
        'Home',

      icon:
        House,
    },

    {
      label:
        'Calendario',

      route:
        'Calendar',

      icon:
        CalendarBlank,
    },

    {
      label:
        'Tabla',

      route:
        'Positions',

      icon:
        Trophy,
    },

    {
      label:
        'Mi Equipo',

      route:
        'MyTeam',

      icon:
        Star,

      active:
        true,
    },

    {
      label:
        'Más',

      route:
        'More',

      icon:
        DotsThree,
    },

  ];


  return (
    <View
      style={
        styles.bottomNav
      }
    >

      {items.map(
        item => {

          const Icon =
            item.icon;


          return (
            <TouchableOpacity
              key={
                item.label
              }

              activeOpacity={0.8}

              onPress={
                () =>
                  navigation
                    ?.navigate?.(
                      item.route,
                    )
              }

              style={[
                styles.bottomItem,

                item.active &&
                styles.bottomItemActive,
              ]}
            >

              <Icon
                size={22}

                weight={
                  item.active
                    ? 'fill'
                    : 'regular'
                }

                color={
                  item.active
                    ? BRAND.primary
                    : '#68789D'
                }
              />


              <Text
                style={[
                  styles.bottomText,

                  item.active &&
                  styles.bottomTextActive,
                ]}
              >
                {item.label}
              </Text>

            </TouchableOpacity>
          );
        },
      )}

    </View>
  );
}


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function MyTeam({
  navigation,
}) {

  const insets =
    useSafeAreaInsets();


  const {
    theme,
  } =
    useTheme();


  const colors =
    theme.colors;


  const [
    favorite,
    setFavorite,
  ] =
    useState(null);


  const [
    teams,
    setTeams,
  ] =
    useState([]);


  const [
    selectedId,
    setSelectedId,
  ] =
    useState(null);


  const [
    team,
    setTeam,
  ] =
    useState(null);


  const [
    standings,
    setStandings,
  ] =
    useState([]);


  const [
    matches,
    setMatches,
  ] =
    useState([]);


  const [
    scorers,
    setScorers,
  ] =
    useState([]);


  const [
    news,
    setNews,
  ] =
    useState([]);


  const [
    loading,
    setLoading,
  ] =
    useState(true);


  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);


  const [
    choosing,
    setChoosing,
  ] =
    useState(false);


  const [
    tab,
    setTab,
  ] =
    useState(
      'Resumen',
    );


  /* =======================================================
     MEMOS
  ======================================================= */

  const standing =
    useMemo(
      () =>
        standings.find(
          row =>
            Number(
              row?.team?.id,
            ) ===
            Number(
              favorite?.id,
            ),
        ) ||
        null,
      [
        standings,
        favorite,
      ],
    );


  const nextMatch =
    useMemo(
      () =>
        getNextMatch(
          matches,
        ),
      [
        matches,
      ],
    );


  const recent =
    useMemo(
      () =>
        getLastMatches(
          matches,
        ),
      [
        matches,
      ],
    );


  /* =======================================================
     FAVORITO GUARDADO
  ======================================================= */

  useEffect(
    () => {

      (
        async () => {

          try {

            const stored =
              await AsyncStorage
                .getItem(
                  FAVORITE_TEAM_KEY,
                );


            if (
              stored
            ) {

              const parsed =
                JSON.parse(
                  stored,
                );


              if (
                parsed?.id
              ) {

                setFavorite(
                  parsed,
                );


                setSelectedId(
                  parsed.id,
                );


                return;

              }

            }


            setChoosing(
              true,
            );

          } catch {

            setChoosing(
              true,
            );

          }

        }
      )();

    },
    [],
  );


  /* =======================================================
     LOAD TEAMS
  ======================================================= */

  const loadTeams =
    useCallback(
      async () => {

        try {

          const payload =
            await apiGet(
              'teams.php',
            );


          const result =
            extractTeams(
              payload,
            );


          setTeams(
            result,
          );


          return result;

        } catch (
          error
        ) {

          console.warn(
            '[MyTeam teams]',
            error,
          );


          return [];

        }

      },
      [],
    );


  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadMyTeam =
    useCallback(
      async (
        fav,
        silent = false,
      ) => {

        if (
          !fav?.id
        ) {
          return;
        }


        if (
          !silent
        ) {

          setLoading(
            true,
          );

        }


        try {

          const [
            teamPayload,
            teamsPayload,
            standingsPayload,
            matchesPayload,
            scorersPayload,
          ] =
            await Promise.all([

              apiGet(
                'team.php',
                {
                  id:
                    fav.id,
                },
              ),


              apiGet(
                'teams.php',
              ).catch(
                () => ({}),
              ),


              apiGet(
                'standings.php',
              ).catch(
                () => ({}),
              ),


              apiGet(
                'matches.php',
                {
                  team_id:
                    fav.id,
                },
              ).catch(
                () => ({}),
              ),


              apiGet(
                'scorers.php',
              ).catch(
                () => ({}),
              ),

            ]);


          const directory =
            extractTeams(
              teamsPayload,
            );


          const normalizedTeam =
            normalizeTeam(
              teamPayload,
              fav,
            );


          setTeams(
            directory,
          );


          setTeam(
            normalizedTeam,
          );


          setStandings(
            extractStandings(
              standingsPayload,
              directory,
            ),
          );


          setMatches(
            extractMatches(
              matchesPayload,
            )
              .map(
                normalizeMatch,
              )
              .filter(Boolean),
          );


          setScorers(
            extractTeamScorers(
              scorersPayload,
              fav.id,
            ),
          );


          const teamNews =
            await loadTeamNews(
              normalizedTeam.name,
            );


          setNews(
            teamNews,
          );

        } catch (
          error
        ) {

          console.warn(
            '[MyTeam]',
            error,
          );

        } finally {

          if (
            !silent
          ) {

            setLoading(
              false,
            );

          }

        }

      },
      [],
    );


  /* =======================================================
     EFFECTS
  ======================================================= */

  useEffect(
    () => {

      if (
        choosing
      ) {

        setLoading(
          true,
        );


        loadTeams()
          .finally(
            () =>
              setLoading(
                false,
              ),
          );

      }

    },
    [
      choosing,
      loadTeams,
    ],
  );


  useEffect(
    () => {

      if (
        favorite?.id &&
        !choosing
      ) {

        loadMyTeam(
          favorite,
        );

      }

    },
    [
      favorite,
      choosing,
      loadMyTeam,
    ],
  );


  /* =======================================================
     GUARDAR FAVORITO
  ======================================================= */

  const saveFavorite =
    async () => {

      const selected =
        teams.find(
          item =>
            Number(
              item.id,
            ) ===
            Number(
              selectedId,
            ),
        );


      if (
        !selected
      ) {
        return;
      }


      try {

        await AsyncStorage
          .setItem(
            FAVORITE_TEAM_KEY,
            JSON.stringify(
              selected,
            ),
          );


        setFavorite(
          selected,
        );


        setTeam(
          null,
        );


        setTab(
          'Resumen',
        );


        setChoosing(
          false,
        );

      } catch (
        error
      ) {

        console.warn(
          '[MyTeam favorite]',
          error,
        );

      }

    };


  /* =======================================================
     REFRESH
  ======================================================= */

  const refresh =
    async () => {

      if (
        !favorite
      ) {
        return;
      }


      setRefreshing(
        true,
      );


      try {

        await loadMyTeam(
          favorite,
          true,
        );

      } finally {

        setRefreshing(
          false,
        );

      }

    };


  /* =======================================================
     SELECTOR
  ======================================================= */

  if (
    choosing ||
    !favorite
  ) {

    return (
      <FavoriteSelector
        teams={
          teams
        }

        selectedId={
          selectedId
        }

        onSelect={
          setSelectedId
        }

        onSave={
          saveFavorite
        }

        loading={
          loading
        }

        colors={
          colors
        }

        navigation={
          navigation
        }
      />
    );

  }


  /* =======================================================
     LOADING
  ======================================================= */

  if (
    loading &&
    !team
  ) {

    return (
      <View
        style={
          styles.fullLoading
        }
      >

        <ActivityIndicator
          size="large"
          color={
            BRAND.primary
          }
        />


        <Text
          style={
            styles.loadingText
          }
        >
          Cargando Mi Equipo…
        </Text>

      </View>
    );

  }


  /* =======================================================
     HERO CLUB
  ======================================================= */

  const renderHero =
    () => (

      <ImageBackground
        source={
          getHeroSource(
            team?.name,
          )
        }

        resizeMode="cover"

        style={
          styles.hero
        }
      >

        <LinearGradient
          colors={[
            'rgba(0,12,31,0.08)',
            'rgba(0,12,31,0.10)',
            'rgba(0,12,31,0.86)',
          ]}

          locations={[
            0,
            0.55,
            1,
          ]}

          style={
            StyleSheet.absoluteFill
          }
        />


        <View
          style={[
            styles.heroTop,
            {
              paddingTop:
                Math.max(
                  insets.top,
                  10,
                ),
            },
          ]}
        >

          <TouchableOpacity
            onPress={
              () =>
                navigation
                  ?.goBack?.()
            }

            style={
              styles.heroIcon
            }
          >

            <ArrowLeft
              size={25}
              color="#FFFFFF"
            />

          </TouchableOpacity>


          <TouchableOpacity
            onPress={
              () => {

                setSelectedId(
                  favorite?.id,
                );


                setChoosing(
                  true,
                );

              }
            }

            style={
              styles.heroIcon
            }
          >

            <Star
              size={28}
              weight="fill"
              color="#FFD229"
            />

          </TouchableOpacity>

        </View>


        <View
          style={
            styles.heroInfo
          }
        >

          <View
            style={
              styles.heroLogo
            }
          >

            <TeamLogo
              uri={
                team?.logo
              }

              name={
                team?.name
              }

              size={84}

              colors={
                colors
              }
            />

          </View>


          <Text
            style={
              styles.heroName
            }
          >
            {team?.name}
          </Text>


          <Text
            style={
              styles.heroNickname
            }
          >
            {getTeamNickname(
              team,
            )}
          </Text>

        </View>

      </ImageBackground>
    );


  /* =======================================================
     SUMMARY
  ======================================================= */

  const renderSummary =
    () => (

      <ScrollView
        showsVerticalScrollIndicator={
          false
        }

        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }

            onRefresh={
              refresh
            }

            colors={[
              BRAND.primary,
            ]}
          />
        }

        contentContainerStyle={{
          paddingBottom:
            110 +
            insets.bottom,
        }}
      >

        {/* NEXT MATCH */}

        {!!nextMatch && (

          <View
            style={
              styles.content
            }
          >

            <View
              style={
                styles.sectionHeader
              }
            >

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Próximo partido
              </Text>


              <Text
                style={
                  styles.sectionLink
                }
              >
                Liga Nacional GT
              </Text>

            </View>


            <TouchableOpacity
              activeOpacity={0.84}

              onPress={
                () =>
                  nextMatch?.id &&
                  navigation
                    ?.navigate?.(
                      'Match',
                      {
                        matchId:
                          nextMatch.id,

                        source:
                          'liga-core',

                        channel:
                          'guatemala',
                      },
                    )
              }

              style={
                styles.nextMatch
              }
            >

              <View
                style={
                  styles.nextTeam
                }
              >

                <TeamLogo
                  uri={
                    nextMatch
                      ?.home
                      ?.logo
                  }

                  name={
                    nextMatch
                      ?.home
                      ?.name
                  }

                  size={60}

                  colors={
                    colors
                  }
                />


                <Text
                  numberOfLines={1}

                  style={
                    styles.nextTeamName
                  }
                >
                  {
                    nextMatch
                      ?.home
                      ?.name
                  }
                </Text>

              </View>


              <View
                style={
                  styles.nextCenter
                }
              >

                <Text
                  style={
                    styles.nextDate
                  }
                >
                  {formatKickoffDate(
                    nextMatch,
                  )}
                </Text>


                <Text
                  style={
                    styles.nextTime
                  }
                >
                  {formatKickoffTime(
                    nextMatch,
                  ) ||
                    '—'}
                </Text>

              </View>


              <View
                style={
                  styles.nextTeam
                }
              >

                <TeamLogo
                  uri={
                    nextMatch
                      ?.away
                      ?.logo
                  }

                  name={
                    nextMatch
                      ?.away
                      ?.name
                  }

                  size={60}

                  colors={
                    colors
                  }
                />


                <Text
                  numberOfLines={1}

                  style={
                    styles.nextTeamName
                  }
                >
                  {
                    nextMatch
                      ?.away
                      ?.name
                  }
                </Text>

              </View>

            </TouchableOpacity>

          </View>

        )}


        {/* LAST MATCHES */}

        {!!recent.length && (

          <View
            style={
              styles.content
            }
          >

            <View
              style={
                styles.sectionHeader
              }
            >

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Últimos partidos
              </Text>


              <TouchableOpacity
                onPress={
                  () =>
                    setTab(
                      'Partidos',
                    )
                }
              >

                <Text
                  style={
                    styles.sectionLink
                  }
                >
                  Ver todos
                </Text>

              </TouchableOpacity>

            </View>


            <ScrollView
              horizontal

              showsHorizontalScrollIndicator={
                false
              }
            >

              {recent.map(
                match => {

                  const isHome =
                    Number(
                      match
                        ?.home
                        ?.id,
                    ) ===
                    Number(
                      team?.id,
                    );


                  const opponent =
                    isHome
                      ? match.away
                      : match.home;


                  const result =
                    resultForTeam(
                      match,
                      team?.id,
                    );


                  const score =
                    isHome
                      ? `${match.score.home} - ${match.score.away}`
                      : `${match.score.away} - ${match.score.home}`;


                  return (
                    <View
                      key={
                        String(
                          match.id,
                        )
                      }

                      style={
                        styles.resultCard
                      }
                    >

                      <Text
                        style={
                          styles.resultLeague
                        }
                      >
                        LIGA
                      </Text>


                      <TeamLogo
                        uri={
                          opponent?.logo
                        }

                        name={
                          opponent?.name
                        }

                        size={33}

                        colors={
                          colors
                        }
                      />


                      <Text
                        style={
                          styles.resultScore
                        }
                      >
                        {score}
                      </Text>


                      <View
                        style={[
                          styles.resultBadge,

                          {
                            backgroundColor:
                              result ===
                              'G'
                                ? '#16B86A'
                                : result ===
                                  'E'
                                  ? '#F9C31C'
                                  : '#F73748',
                          },
                        ]}
                      >

                        <Text
                          style={
                            styles.resultBadgeText
                          }
                        >
                          {result}
                        </Text>

                      </View>


                      <Text
                        numberOfLines={1}

                        style={
                          styles.resultOpponent
                        }
                      >
                        {opponent?.name}
                      </Text>


                      <Text
                        style={
                          styles.resultDate
                        }
                      >
                        {formatShortDate(
                          match,
                        )}
                      </Text>

                    </View>
                  );
                },
              )}

            </ScrollView>

          </View>

        )}


        {/* POSITION + SCORERS */}

        <View
          style={[
            styles.content,
            styles.twoColumns,
          ]}
        >

          <TouchableOpacity
            activeOpacity={0.8}

            onPress={
              () =>
                setTab(
                  'Clasificación',
                )
            }

            style={
              styles.dashboardCard
            }
          >

            <View
              style={
                styles.dashboardHeader
              }
            >

              <Text
                style={
                  styles.dashboardTitle
                }
              >
                Posición en la tabla
              </Text>


              <CaretRight
                size={18}
                color="#7180A3"
              />

            </View>


            {standing ? (

              <View
                style={
                  styles.positionContent
                }
              >

                <Text
                  style={
                    styles.positionNumber
                  }
                >
                  #{standing.position}
                </Text>


                <TeamLogo
                  uri={
                    team?.logo
                  }

                  name={
                    team?.name
                  }

                  size={45}

                  colors={
                    colors
                  }
                />


                <Text
                  numberOfLines={1}

                  style={
                    styles.positionTeam
                  }
                >
                  {team?.name}
                </Text>

              </View>

            ) : (

              <View
                style={
                  styles.noData
                }
              >

                <Text
                  style={
                    styles.noDataText
                  }
                >
                  Sin datos
                </Text>

              </View>

            )}

          </TouchableOpacity>


          <TouchableOpacity
            activeOpacity={0.82}

            onPress={
              () =>
                navigation
                  ?.navigate?.(
                    'Scorers',
                  )
            }

            style={
              styles.dashboardCard
            }
          >

            <View
              style={
                styles.dashboardHeader
              }
            >

              <Text
                style={
                  styles.dashboardTitle
                }
              >
                Máximos goleadores
              </Text>


              <Text
                style={
                  styles.sectionLink
                }
              >
                Ver todos
              </Text>

            </View>


            {scorers.length ? (

              scorers.map(
                (
                  scorer,
                  index,
                ) => (

                  <View
                    key={
                      String(
                        scorer.id ||
                        index,
                      )
                    }

                    style={
                      styles.scorer
                    }
                  >

                    <View
                      style={
                        styles.scorerRank
                      }
                    >

                      <Text
                        style={
                          styles.scorerRankText
                        }
                      >
                        {index + 1}
                      </Text>

                    </View>


                    <PlayerPhoto
                      uri={
                        scorer.photo
                      }

                      name={
                        scorer.name
                      }
                    />


                    <View
                      style={
                        styles.scorerInfo
                      }
                    >

                      <Text
                        numberOfLines={1}

                        style={
                          styles.scorerName
                        }
                      >
                        {scorer.name}
                      </Text>


                      <Text
                        style={
                          styles.scorerGoals
                        }
                      >
                        {scorer.goals}{' '}
                        goles
                      </Text>

                    </View>

                  </View>

                ),
              )

            ) : (

              <View
                style={
                  styles.noData
                }
              >

                <SoccerBall
                  size={26}
                  color="#AAB4C9"
                />

              </View>

            )}

          </TouchableOpacity>

        </View>


        {/* NEWS */}

        {!!news.length && (

          <View
            style={
              styles.content
            }
          >

            <View
              style={
                styles.sectionHeader
              }
            >

              <Text
                style={
                  styles.sectionTitle
                }
              >
                Últimas noticias del equipo
              </Text>


              <TouchableOpacity
                onPress={
                  () =>
                    navigation
                      ?.navigate?.(
                        'New',
                      )
                }
              >

                <Text
                  style={
                    styles.sectionLink
                  }
                >
                  Ver todas
                </Text>

              </TouchableOpacity>

            </View>


            <View
              style={
                styles.newsRow
              }
            >

              {news
                .slice(
                  0,
                  2,
                )
                .map(
                  post => {

                    const image =
                      getWpImage(
                        post,
                      );


                    return (
                      <TouchableOpacity
                        key={
                          String(
                            post.id,
                          )
                        }

                        activeOpacity={0.82}

                        onPress={
                          () =>
                            navigation
                              ?.navigate?.(
                                'New',
                                {
                                  notice:
                                    post,
                                },
                              )
                        }

                        style={
                          styles.newsCard
                        }
                      >

                        {image ? (

                          <Image
                            source={{
                              uri:
                                image,
                            }}

                            resizeMode="cover"

                            style={
                              styles.newsImage
                            }
                          />

                        ) : (

                          <View
                            style={[
                              styles.newsImage,
                              styles.newsFallback,
                            ]}
                          >

                            <SoccerBall
                              size={21}
                              color={
                                BRAND.primary
                              }
                            />

                          </View>

                        )}


                        <View
                          style={
                            styles.newsInfo
                          }
                        >

                          <Text
                            numberOfLines={3}

                            style={
                              styles.newsTitle
                            }
                          >
                            {decodeHtml(
                              post?.title
                                ?.rendered,
                            )}
                          </Text>

                        </View>

                      </TouchableOpacity>
                    );
                  },
                )}

            </View>

          </View>

        )}

      </ScrollView>
    );


  /* =======================================================
     BODY
  ======================================================= */

  const renderBody =
    () => {

      if (
        tab ===
        'Resumen'
      ) {

        return renderSummary();

      }


      if (
        tab ===
        'Partidos'
      ) {

        return (
          <TeamMatches
            teamId={
              team?.id
            }

            navigation={
              navigation
            }

            initialTab="future"

            bottomPadding={
              110 +
              insets.bottom
            }
          />
        );

      }


      if (
        tab ===
        'Clasificación'
      ) {

        return (
          <ScrollView
            contentContainerStyle={{
              padding:
                12,

              paddingBottom:
                110 +
                insets.bottom,
            }}
          >

            <PositionsBlock
              standings={
                standings
              }

              teamId={
                team?.id
              }

              navigation={
                navigation
              }

              scope="guatemala"

              mode="current"

              showHeader={true}

              title=""
            />

          </ScrollView>
        );

      }


      return (
        <TeamSquad
          teamId={
            team?.id
          }

          navigation={
            navigation
          }

          bottomPadding={
            110 +
            insets.bottom
          }
        />
      );
    };


  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <View
      style={
        styles.screen
      }
    >

      {renderHero()}


      <View
        style={
          styles.mainPanel
        }
      >

        <TopTabs
          tab={
            tab
          }

          setTab={
            setTab
          }
        />


        <View
          style={
            styles.body
          }
        >

          {renderBody()}

        </View>

      </View>


      <BottomNav
        navigation={
          navigation
        }
      />

    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({

    screen: {
      flex:
        1,

      backgroundColor:
        '#F6F8FC',
    },


    body: {
      flex:
        1,
    },


    fullLoading: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F6F8FC',
    },


    loadingText: {
      marginTop:
        10,

      color:
        '#74809D',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        10,
    },


    /* =====================================================
       SELECTOR
    ===================================================== */

    selectorScreen: {
      flex:
        1,

      backgroundColor:
        '#F4F7FC',
    },


    selectorHero: {
      height:
        235,

      width:
        '100%',
    },


    selectorBack: {
      position:
        'absolute',

      left:
        18,

      top:
        45,

      width:
        42,

      height:
        42,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      zIndex:
        5,
    },


    selectorHeroContent: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingTop:
        26,
    },


    selectorQuestion: {
      marginTop:
        10,

      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        29,

      lineHeight:
        36,

      textAlign:
        'center',

      textShadowColor:
        'rgba(0,0,0,0.30)',

      textShadowOffset: {
        width:
          0,

        height:
          1,
      },

      textShadowRadius:
        4,
    },


    selectorDescription: {
      marginTop:
        4,

      color:
        'rgba(255,255,255,0.90)',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        12,

      textAlign:
        'center',
    },


    selectorSheet: {
      flex:
        1,

      marginTop:
        -18,

      backgroundColor:
        '#F6F8FC',

      borderTopLeftRadius:
        26,

      borderTopRightRadius:
        26,

      overflow:
        'hidden',
    },


    selectorLoading: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    favoriteTeamCard: {
      height:
        74,

      marginBottom:
        10,

      borderRadius:
        18,

      borderWidth:
        1,

      borderColor:
        '#E1E7F1',

      backgroundColor:
        '#FFFFFF',

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        14,

      shadowColor:
        '#18294F',

      shadowOffset: {
        width:
          0,

        height:
          4,
      },

      shadowOpacity:
        0.045,

      shadowRadius:
        9,

      elevation:
        2,
    },


    favoriteTeamCardActive: {
      borderWidth:
        1.5,

      borderColor:
        '#3672FF',

      backgroundColor:
        '#F2F7FF',

      shadowColor:
        '#2A63E8',

      shadowOpacity:
        0.10,

      elevation:
        3,
    },


    favoriteLogoWrap: {
      width:
        58,

      height:
        58,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#F8FAFD',
    },


    favoriteLogoWrapActive: {
      backgroundColor:
        '#EAF2FF',
    },


    favoriteTeamInfo: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        13,
    },


    favoriteTeamName: {
      color:
        '#111A48',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        13,

      lineHeight:
        18,
    },


    favoriteTeamCode: {
      marginTop:
        1,

      color:
        '#7D8BAA',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9,
    },


    unselectedCircle: {
      width:
        25,

      height:
        25,

      borderRadius:
        13,

      borderWidth:
        1.4,

      borderColor:
        '#8A9AB9',

      backgroundColor:
        '#FFFFFF',
    },


    selectedCircle: {
      width:
        27,

      height:
        27,

      borderRadius:
        14,

      backgroundColor:
        '#2D67ED',

      alignItems:
        'center',

      justifyContent:
        'center',

      shadowColor:
        '#2D67ED',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.25,

      shadowRadius:
        5,

      elevation:
        3,
    },


    confirmArea: {
      position:
        'absolute',

      left:
        0,

      right:
        0,

      bottom:
        0,

      paddingHorizontal:
        14,

      paddingTop:
        10,

      backgroundColor:
        'rgba(246,248,252,0.97)',

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        '#E1E7F0',
    },


    confirmButton: {
      height:
        55,

      borderRadius:
        18,

      backgroundColor:
        '#285EEA',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        9,

      shadowColor:
        '#265EEA',

      shadowOffset: {
        width:
          0,

        height:
          5,
      },

      shadowOpacity:
        0.20,

      shadowRadius:
        10,

      elevation:
        4,
    },


    confirmButtonDisabled: {
      opacity:
        0.45,
    },


    confirmButtonText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        12,
    },


    /* =====================================================
       HERO CLUB
    ===================================================== */

    hero: {
      height:
        275,

      width:
        '100%',

      justifyContent:
        'space-between',
    },


    heroTop: {
      paddingHorizontal:
        15,

      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',
    },


    heroIcon: {
      width:
        44,

      height:
        44,

      borderRadius:
        22,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    heroInfo: {
      paddingHorizontal:
        22,

      paddingBottom:
        23,
    },


    heroLogo: {
      width:
        90,

      height:
        90,

      marginBottom:
        5,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    heroName: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        29,

      lineHeight:
        35,
    },


    heroNickname: {
      marginTop:
        2,

      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        15,
    },


    /* =====================================================
       MAIN PANEL / TABS
    ===================================================== */

    mainPanel: {
      flex:
        1,

      marginTop:
        -10,

      borderTopLeftRadius:
        25,

      borderTopRightRadius:
        25,

      backgroundColor:
        '#F7F9FD',

      overflow:
        'hidden',
    },


    tabsShell: {
      padding:
        10,

      paddingBottom:
        4,

      backgroundColor:
        '#FFFFFF',
    },


    tabsInner: {
      minHeight:
        50,

      borderRadius:
        20,

      padding:
        4,

      backgroundColor:
        '#F1F4F9',

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    tabItem: {
      flex:
        1,

      minHeight:
        41,

      borderRadius:
        17,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        4,
    },


    tabActive: {
      backgroundColor:
        '#2E63F3',
    },


    tabText: {
      color:
        '#637194',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8.5,
    },


    tabTextActive: {
      color:
        '#FFFFFF',
    },


    /* =====================================================
       SUMMARY
    ===================================================== */

    content: {
      paddingHorizontal:
        13,
    },


    sectionHeader: {
      minHeight:
        42,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    sectionTitle: {
      color:
        '#111A43',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        14.5,
    },


    sectionLink: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        9,
    },


    nextMatch: {
      minHeight:
        145,

      borderRadius:
        19,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#E3E9F3',

      padding:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    nextTeam: {
      width:
        103,

      alignItems:
        'center',
    },


    nextTeamName: {
      width:
        103,

      marginTop:
        7,

      textAlign:
        'center',

      color:
        '#111A43',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        9.5,
    },


    nextCenter: {
      flex:
        1,

      alignItems:
        'center',
    },


    nextDate: {
      color:
        '#687799',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        9,
    },


    nextTime: {
      marginTop:
        3,

      color:
        '#111A43',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        23,
    },


    resultCard: {
      width:
        98,

      minHeight:
        137,

      marginRight:
        8,

      borderRadius:
        17,

      borderWidth:
        1,

      borderColor:
        '#E3E9F3',

      backgroundColor:
        '#FFFFFF',

      alignItems:
        'center',

      padding:
        8,
    },


    resultLeague: {
      color:
        '#10183F',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8,
    },


    resultScore: {
      marginTop:
        4,

      color:
        '#10183F',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        15,
    },


    resultBadge: {
      width:
        23,

      height:
        23,

      borderRadius:
        12,

      marginTop:
        4,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    resultBadgeText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        8,
    },


    resultOpponent: {
      marginTop:
        5,

      width:
        82,

      color:
        '#687799',

      textAlign:
        'center',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        7.8,
    },


    resultDate: {
      color:
        '#8792AC',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        7,
    },


    twoColumns: {
      marginTop:
        12,

      flexDirection:
        'row',

      gap:
        9,
    },


    dashboardCard: {
      flex:
        1,

      minHeight:
        180,

      padding:
        10,

      borderRadius:
        18,

      backgroundColor:
        '#FFFFFF',

      borderWidth:
        1,

      borderColor:
        '#E3E9F3',
    },


    dashboardHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },


    dashboardTitle: {
      color:
        '#111A43',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        10.5,
    },


    positionContent: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    positionNumber: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        26,

      marginBottom:
        4,
    },


    positionTeam: {
      marginTop:
        6,

      color:
        '#111A43',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        9,
    },


    scorer: {
      minHeight:
        45,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    scorerRank: {
      width:
        25,

      height:
        25,

      borderRadius:
        13,

      backgroundColor:
        '#EAF1FF',

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        5,
    },


    scorerRankText: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-Bold',

      fontSize:
        8,
    },


    playerPhoto: {
      width:
        34,

      height:
        34,

      borderRadius:
        17,

      backgroundColor:
        '#E8EDF5',
    },


    playerFallback: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },


    playerFallbackText: {
      color:
        '#71809D',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        7,
    },


    scorerInfo: {
      flex:
        1,

      marginLeft:
        6,

      minWidth:
        0,
    },


    scorerName: {
      color:
        '#111A43',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8,
    },


    scorerGoals: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        7.5,
    },


    noData: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    noDataText: {
      color:
        '#8994AE',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        8,
    },


    newsRow: {
      flexDirection:
        'row',

      gap:
        8,
    },


    newsCard: {
      flex:
        1,

      minHeight:
        88,

      borderRadius:
        16,

      borderWidth:
        1,

      borderColor:
        '#E3E9F3',

      backgroundColor:
        '#FFFFFF',

      padding:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    newsImage: {
      width:
        84,

      height:
        63,

      borderRadius:
        10,

      backgroundColor:
        '#E8EDF5',
    },


    newsFallback: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },


    newsInfo: {
      flex:
        1,

      minWidth:
        0,

      marginLeft:
        7,
    },


    newsTitle: {
      color:
        '#111A43',

      fontFamily:
        'Poppins-SemiBold',

      fontSize:
        8,

      lineHeight:
        12,
    },


    /* =====================================================
       BOTTOM NAV
    ===================================================== */

    bottomNav: {
      position:
        'absolute',

      left:
        0,

      right:
        0,

      bottom:
        0,

      height:
        82,

      backgroundColor:
        '#FFFFFF',

      borderTopWidth:
        1,

      borderTopColor:
        '#E3E8F0',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-around',

      paddingHorizontal:
        6,
    },


    bottomItem: {
      width:
        68,

      height:
        60,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    bottomItemActive: {
      backgroundColor:
        '#EDF3FF',
    },


    bottomText: {
      marginTop:
        3,

      color:
        '#6C7B9D',

      fontFamily:
        'Poppins-Regular',

      fontSize:
        8,
    },


    bottomTextActive: {
      color:
        BRAND.primary,

      fontFamily:
        'Poppins-SemiBold',
    },


    /* =====================================================
       FALLBACK
    ===================================================== */

    logoFallback: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      backgroundColor:
        '#F2F5FA',
    },


    logoFallbackText: {
      color:
        '#657494',

      fontFamily:
        'Poppins-Bold',

      fontSize:
        8,
    },

  });