// components/Positions.js
// Liga Nacional GT
// Tabla de posiciones - sin líneas laterales ni fondos de fila

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  Image,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import {
  Trophy,
  ChartBar,
  MagnifyingGlass,
  GearSix,
  X,
} from 'phosphor-react-native';

import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import analytics from '@react-native-firebase/analytics';

import AdFooter from '../ads/AdFooter';
import InlineAd from '../ads/InlineAd';
import FooterTabs from './FooterTabs';
import TeamSearchModal from './TeamSearchModal';

import {
  getStandings,
  getAggregate,
  getTeams,
} from '../services/ligaNacionalApi';

const API =
  'https://liganacionalgt.com/sistema/api';

const COLOR = {
  blue: '#285FFF',
  darkBlue: '#0641BA',
  navy: '#101936',
  muted: '#7180A0',
  white: '#FFFFFF',
  background: '#F4F6FB',
  border: '#E5EAF3',

  green: '#17B775',
  playoff: '#5795F8',
  red: '#FB626A',

  neutral: '#EDF0F6',
};

const FONT = {
  regular: 'Poppins-Regular',
  medium: 'Poppins-Medium',
  semi: 'Poppins-SemiBold',
  bold: 'Poppins-Bold',
};

const FOOTER_HEIGHT = 60;
const AD_HEIGHT = 56;

const FINISHED = new Set([
  'finished',
  'final',
  'ft',
  'fulltime',
  'full_time',
  'ended',
]);

function first(...values) {
  for (const value of values) {
    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      return value;
    }
  }
  return null;
}

function nullableNumber(...values) {
  for (const value of values) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      continue;
    }

    const number = Number(value);

    if (Number.isFinite(number)) {
      return number;
    }
  }

  return null;
}

function number(...values) {
  return nullableNumber(...values) ?? 0;
}

function normalized(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function correctName(value) {
  const name = String(value ?? '').trim();

  if (normalized(name) === 'suchitepequez') {
    return 'Suchitepéquez';
  }

  return name;
}

function extractArray(payload, names) {
  if (Array.isArray(payload)) {
    return payload;
  }

  for (const name of names) {
    if (Array.isArray(payload?.[name])) {
      return payload[name];
    }

    if (Array.isArray(payload?.data?.[name])) {
      return payload.data[name];
    }
  }

  return Array.isArray(payload?.data)
    ? payload.data
    : [];
}

function extractDirectory(payload) {
  const directory = new Map();

  extractArray(payload, ['teams']).forEach(item => {
    const id = number(
      item?.id,
      item?.team_id,
      item?.teamId
    );

    if (!id) return;

    directory.set(id, {
      id,
      name: correctName(
        first(
          item?.name,
          item?.team_name,
          item?.teamName,
          'Equipo'
        )
      ),
      logo: first(
        item?.logo,
        item?.logo_url,
        item?.logoUrl
      ),
    });
  });

  return directory;
}

function normalizeTable(payload, directory) {
  const list = extractArray(payload, [
    'standings',
    'aggregate',
    'table',
    'rows',
  ]);

  const rows = list.map((item, index) => {
    const rawTeam =
      item?.team &&
      typeof item.team === 'object'
        ? item.team
        : {};

    const id = number(
      rawTeam?.id,
      item?.team_id,
      item?.teamId,
      item?.id
    );

    const fallback = directory.get(id);

    const won = number(
      item?.won,
      item?.wins,
      item?.pg,
      item?.g
    );

    const drawn = number(
      item?.drawn,
      item?.draws,
      item?.pe,
      item?.e
    );

    const lost = number(
      item?.lost,
      item?.losses,
      item?.pp,
      item?.p
    );

    const played = nullableNumber(
      item?.played,
      item?.matches_played,
      item?.pj,
      item?.j
    ) ?? (won + drawn + lost);

    const points = nullableNumber(
      item?.pointsactual,
      item?.points,
      item?.pts,
      item?.puntos
    ) ?? (won * 3 + drawn);

    return {
      position: number(
        item?.position,
        item?.rank,
        item?.pos,
        index + 1
      ),

      team: {
        id,
        name: correctName(
          first(
            rawTeam?.name,
            item?.team_name,
            item?.teamName,
            item?.name,
            fallback?.name,
            'Equipo'
          )
        ),
        logo: first(
          rawTeam?.logo,
          rawTeam?.logo_url,
          rawTeam?.logoUrl,
          item?.logo,
          item?.logo_url,
          item?.logoUrl,
          fallback?.logo
        ),
      },

      played,
      won,
      drawn,
      lost,
      points,

      gd: number(
        item?.gd,
        item?.goal_difference,
        item?.goalDifference,
        item?.dg,
        item?.dif
      ),

      streak: Array.isArray(item?.streak)
        ? item.streak
        : [],
    };
  });

  rows.sort((a, b) => {
    if (
      a.position > 0 &&
      b.position > 0 &&
      a.position !== b.position
    ) {
      return a.position - b.position;
    }

    return (
      b.points - a.points ||
      b.gd - a.gd ||
      b.won - a.won
    );
  });

  return rows.map((row, index) => ({
    ...row,
    position: index + 1,
  }));
}

function extractSeason(payload) {
  const season = payload?.season;

  return String(
    first(
      season?.name,
      season?.label,
      typeof season === 'string'
        ? season
        : null,
      payload?.season_name,
      payload?.seasonName,
      payload?.meta?.season_name,
      payload?.meta?.seasonName,
      'Torneo actual'
    )
  );
}

async function fetchTeamMatches(teamId) {
  const url =
    API +
    '/matches.php?team_id=' +
    encodeURIComponent(String(teamId)) +
    '&_=' +
    Date.now();

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      'HTTP ' + response.status
    );
  }

  return response.json();
}

function statusOf(match) {
  const raw = match?.status;

  const status =
    raw && typeof raw === 'object'
      ? first(
          raw.code,
          raw.slug,
          raw.key,
          raw.value,
          raw.name
        )
      : first(
          raw,
          match?.status_code,
          match?.statusCode
        );

  return String(status || '')
    .trim()
    .toLowerCase();
}

function scoreOf(match) {
  const home =
    match?.home ||
    match?.teams?.home ||
    match?.homeTeam ||
    {};

  const away =
    match?.away ||
    match?.teams?.away ||
    match?.awayTeam ||
    {};

  const score =
    match?.score &&
    typeof match.score === 'object'
      ? match.score
      : {};

  const result =
    match?.result &&
    typeof match.result === 'object'
      ? match.result
      : {};

  const full =
    score?.fullTime ||
    score?.full_time ||
    {};

  return {
    home: nullableNumber(
      home?.score,
      home?.goals,
      home?.goals_total,
      score?.home,
      score?.homeScore,
      score?.home_score,
      full?.home,
      full?.homeScore,
      result?.home,
      result?.homeScore,
      match?.home_score,
      match?.homeScore,
      match?.score_home
    ),

    away: nullableNumber(
      away?.score,
      away?.goals,
      away?.goals_total,
      score?.away,
      score?.awayScore,
      score?.away_score,
      full?.away,
      full?.awayScore,
      result?.away,
      result?.awayScore,
      match?.away_score,
      match?.awayScore,
      match?.score_away
    ),
  };
}

function timeOf(match) {
  const raw = first(
    match?.kickoff,
    match?.scheduled_at,
    match?.scheduledStart,
    match?.scheduled_start,
    match?.datetime,
    match?.date
  );

  const parsed = raw
    ? Date.parse(String(raw))
    : NaN;

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  return number(
    match?.id,
    match?.match_id,
    match?.matchId
  );
}

function buildStreak(payload, teamId) {
  const id = Number(teamId);

  return extractArray(payload, ['matches'])
    .map(match => {
      const home =
        match?.home ||
        match?.teams?.home ||
        match?.homeTeam ||
        {};

      const away =
        match?.away ||
        match?.teams?.away ||
        match?.awayTeam ||
        {};

      const score = scoreOf(match);

      return {
        homeId: number(
          home?.id,
          home?.team_id,
          home?.teamId,
          match?.home_team_id,
          match?.homeTeamId
        ),

        awayId: number(
          away?.id,
          away?.team_id,
          away?.teamId,
          match?.away_team_id,
          match?.awayTeamId
        ),

        homeScore: score.home,
        awayScore: score.away,

        status: statusOf(match),
        time: timeOf(match),
      };
    })
    .filter(item => (
      (item.homeId === id ||
        item.awayId === id) &&
      FINISHED.has(item.status) &&
      item.homeScore !== null &&
      item.awayScore !== null
    ))
    .sort((a, b) => b.time - a.time)
    .slice(0, 3)
    .reverse()
    .map(item => {
      const home = item.homeId === id;

      const gf = home
        ? item.homeScore
        : item.awayScore;

      const gc = home
        ? item.awayScore
        : item.homeScore;

      if (gf > gc) return 'W';
      if (gf < gc) return 'L';

      return 'D';
    });
}

async function loadStreaks(rows) {
  const ids = [
    ...new Set(
      rows
        .map(row => Number(row?.team?.id))
        .filter(Boolean)
    ),
  ];

  const result = await Promise.all(
    ids.map(async id => {
      try {
        const payload = await fetchTeamMatches(id);
        return [
          id,
          buildStreak(payload, id),
        ];
      } catch (error) {
        console.warn(
          '[Positions] Racha:',
          id,
          error?.message || error
        );
        return [id, []];
      }
    })
  );

  return new Map(result);
}

function TeamLogo({ team, size }) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [team?.logo]);

  if (team?.logo && !failed) {
    return (
      <Image
        source={{ uri: team.logo }}
        resizeMode="contain"
        style={{
          width: size,
          height: size,
        }}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: '#E7EEFA',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          color: COLOR.blue,
          fontFamily: FONT.bold,
          fontSize: 10,
        }}
      >
        {String(team?.name || '?')
          .charAt(0)
          .toUpperCase()}
      </Text>
    </View>
  );
}

const FORM = {
  W: {
    label: 'G',
    background: '#1AB778',
    color: '#FFFFFF',
  },
  D: {
    label: 'E',
    background: '#CAD3E5',
    color: COLOR.navy,
  },
  L: {
    label: 'P',
    background: '#F5404F',
    color: '#FFFFFF',
  },
};

function FormDots({ results, size }) {
  const last = Array.isArray(results)
    ? results.slice(-3)
    : [];

  const padded = [
    ...Array(
      Math.max(0, 3 - last.length)
    ).fill(null),
    ...last,
  ];

  return (
    <View style={styles.formRow}>
      {padded.map((result, index) => {
        const config = FORM[result];

        return (
          <View
            key={index}
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor:
                config?.background || '#E8EDF5',
            }}
          >
            <Text
              style={{
                color: config?.color || COLOR.muted,
                fontFamily: FONT.bold,
                fontSize: size * 0.47,
                includeFontPadding: false,
              }}
            >
              {config?.label || ''}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function getLayout(screenWidth) {
  const total = screenWidth - 34;

  const ratios = {
    rank: 0.086,
    team: 0.31,
    points: 0.085,
    played: 0.059,
    small: 0.053,
    diff: 0.092,
    form: 0.209,
  };

  const unit = Math.max(295, total);

  const rank = unit * ratios.rank;
  const team = unit * ratios.team;
  const points = unit * ratios.points;
  const played = unit * ratios.played;
  const small = unit * ratios.small;
  const diff = unit * ratios.diff;

  const form =
    unit -
    rank -
    team -
    points -
    played -
    small * 3 -
    diff;

  return {
    unit,
    rank,
    team,
    points,
    played,
    small,
    diff,
    form,
    logo: Math.min(25, unit * 0.075),
    dot: Math.min(19, unit * 0.056),
    rowHeight: 56,
  };
}

function zoneFor(position, total) {
  if (
    total >= 10 &&
    position > total - 2
  ) {
    return COLOR.red;
  }

  if (position <= 2) {
    return COLOR.green;
  }

  if (position <= 6) {
    return COLOR.playoff;
  }

  return null;
}

function TableColumn({ title, width, align }) {
  return (
    <Text
      numberOfLines={1}
      style={{
        width,
        textAlign: align || 'center',
        fontFamily: FONT.semi,
        fontSize: 8.6,
        color: COLOR.muted,
        includeFontPadding: false,
      }}
    >
      {title}
    </Text>
  );
}

function TableHeader({ layout }) {
  return (
    <View style={styles.columns}>
      <TableColumn title="#" width={layout.rank} />
      <TableColumn title="Equipo" width={layout.team} align="left" />
      <TableColumn title="PTS" width={layout.points} />
      <TableColumn title="J" width={layout.played} />
      <TableColumn title="G" width={layout.small} />
      <TableColumn title="E" width={layout.small} />
      <TableColumn title="P" width={layout.small} />
      <TableColumn title="DIF" width={layout.diff} />
      <TableColumn title="Últ. 3" width={layout.form} />
    </View>
  );
}

function NumberCell({
  value,
  width,
  color,
  strong,
}) {
  return (
    <Text
      numberOfLines={1}
      style={{
        width,
        textAlign: 'center',
        color: color || COLOR.navy,
        fontFamily: strong
          ? FONT.bold
          : FONT.regular,
        fontSize: strong ? 10 : 9.5,
        includeFontPadding: false,
      }}
    >
      {value}
    </Text>
  );
}

function PositionRow({
  item,
  position,
  total,
  layout,
  navigation,
  highlightIds,
}) {
  const team = item?.team || {};
  const circleColor = zoneFor(position, total);

  const selected = Array.isArray(highlightIds)
    ? highlightIds.map(String).includes(String(team.id))
    : highlightIds != null &&
      String(highlightIds) === String(team.id);

  const diffColor =
    item.gd > 0
      ? '#0DA967'
      : item.gd < 0
        ? '#F03A49'
        : COLOR.navy;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.teamRow,
        {
          height: layout.rowHeight,
          backgroundColor: COLOR.white,
        },
        selected && styles.highlighted,
      ]}
      onPress={() => {
        if (!team.id) return;

        navigation?.navigate?.('TeamScreen', {
          teamId: team.id,
          teamName: team.name,
          scope: 'guatemala',
        });
      }}
    >
      <View
        style={{
          width: layout.rank,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor:
              circleColor || COLOR.neutral,
          }}
        >
          <Text
            style={{
              fontFamily: FONT.bold,
              fontSize: 11,
              color: circleColor
                ? COLOR.white
                : COLOR.navy,
              includeFontPadding: false,
            }}
          >
            {position}
          </Text>
        </View>
      </View>

      <View
        style={{
          width: layout.team,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingRight: 3,
        }}
      >
        <TeamLogo
          team={team}
          size={layout.logo}
        />

        <Text
          numberOfLines={1}
          style={styles.teamName}
        >
          {correctName(team.name)}
        </Text>
      </View>

      <NumberCell
        value={item.points}
        width={layout.points}
        strong
      />

      <NumberCell
        value={item.played}
        width={layout.played}
      />

      <NumberCell
        value={item.won}
        width={layout.small}
      />

      <NumberCell
        value={item.drawn}
        width={layout.small}
      />

      <NumberCell
        value={item.lost}
        width={layout.small}
      />

      <NumberCell
        value={
          item.gd > 0
            ? '+' + item.gd
            : item.gd
        }
        width={layout.diff}
        color={diffColor}
        strong
      />

      <View
        style={{
          width: layout.form,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <FormDots
          results={item.streak}
          size={layout.dot}
        />
      </View>
    </TouchableOpacity>
  );
}

export default function Positions({
  navigation,
  route,
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const layout = useMemo(
    () => getLayout(width),
    [width]
  );

  const bottomInset = Math.max(0, insets.bottom || 0);

  const [mode, setMode] =
    useState('aggregate');

  const [currentRows, setCurrentRows] =
    useState([]);

  const [aggregateRows, setAggregateRows] =
    useState([]);

  const [season, setSeason] =
    useState('Torneo actual');

  const [search, setSearch] =
    useState('');

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState('');

  const [teamSearch, setTeamSearch] =
    useState(false);

  const highlightIds =
    route?.params?.highlightIds ??
    route?.params?.highlightTeamId ??
    null;

  useEffect(() => {
    analytics()
      .logScreenView({
        screen_name: 'Positions',
        screen_class: 'Positions',
      })
      .catch(() => {});
  }, []);

  const loadData = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');

      try {
        const [
          standingsPayload,
          aggregatePayload,
          teamsPayload,
        ] = await Promise.all([
          getStandings(),
          getAggregate().catch(() => null),
          getTeams(),
        ]);

        const directory =
          extractDirectory(teamsPayload);

        const current =
          normalizeTable(
            standingsPayload,
            directory
          );

        let aggregate =
          normalizeTable(
            aggregatePayload,
            directory
          );

        if (!aggregate.length) {
          aggregate = current.map(
            row => ({ ...row })
          );
        }

        const streakMap =
          await loadStreaks(current);

        setCurrentRows(
          current.map(row => ({
            ...row,
            streak:
              streakMap.get(
                Number(row.team.id)
              ) || row.streak,
          }))
        );

        setAggregateRows(
          aggregate.map(row => ({
            ...row,
            streak:
              streakMap.get(
                Number(row.team.id)
              ) || row.streak,
          }))
        );

        setSeason(
          extractSeason(standingsPayload)
        );
      } catch (err) {
        console.warn(
          '[Positions]',
          err?.message || err
        );

        setError(
          err?.message ||
          'No se pudo cargar la tabla.'
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const rows =
    mode === 'aggregate'
      ? aggregateRows
      : currentRows;

  const visibleRows = useMemo(() => {
    const query = normalized(search);

    if (!query) {
      return rows;
    }

    return rows.filter(row =>
      normalized(row.team?.name).includes(query)
    );
  }, [rows, search]);

  const changeMode = next => {
    if (next === mode) return;

    setMode(next);
    setSearch('');

    analytics()
      .logEvent('positions_tab', {
        table: next,
      })
      .catch(() => {});
  };

  return (
    <View style={styles.screen}>
      <StatusBar
        translucent={false}
        backgroundColor={COLOR.white}
        barStyle="dark-content"
      />

      <View style={styles.appHeader}>
        <View style={styles.brandLogo}>
          <Text style={styles.brandLetter}>
            L
          </Text>
        </View>

        <Text style={styles.brandName}>
          Liga Nacional GT
        </Text>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() =>
            setTeamSearch(true)
          }
        >
          <MagnifyingGlass
            size={20}
            color="#617499"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerIcon}
          onPress={() =>
            navigation?.navigate?.('Settings')
          }
        >
          <GearSix
            size={20}
            color="#617499"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroDecoration} />

        <View style={styles.heroText}>
          <Text
            style={styles.heroTitle}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            Tabla de posiciones
          </Text>

          <Text
            style={styles.heroSubtitle}
            numberOfLines={1}
          >
            {mode === 'aggregate'
              ? 'Clasificación acumulada'
              : season}
          </Text>
        </View>

        <View style={styles.seasonChip}>
          <Text
            style={styles.seasonChipText}
            numberOfLines={1}
          >
            {season}
          </Text>
        </View>
      </View>

      <View style={styles.controls}>
        <View style={styles.segment}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.segmentButton,
              mode === 'aggregate' &&
                styles.segmentActive,
            ]}
            onPress={() =>
              changeMode('aggregate')
            }
          >
            <Trophy
              size={17}
              weight="fill"
              color={
                mode === 'aggregate'
                  ? COLOR.white
                  : '#60749C'
              }
            />

            <Text
              style={[
                styles.segmentText,
                mode === 'aggregate' &&
                  styles.segmentTextActive,
              ]}
            >
              Acumulada
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.segmentButton,
              mode === 'current' &&
                styles.segmentActive,
            ]}
            onPress={() =>
              changeMode('current')
            }
          >
            <ChartBar
              size={17}
              weight="fill"
              color={
                mode === 'current'
                  ? COLOR.white
                  : '#60749C'
              }
            />

            <Text
              style={[
                styles.segmentText,
                mode === 'current' &&
                  styles.segmentTextActive,
              ]}
            >
              Torneo
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchBox}>
          <MagnifyingGlass
            size={19}
            color="#8492AF"
          />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar equipo..."
            placeholderTextColor="#95A2B9"
            style={styles.searchInput}
            autoCorrect={false}
            returnKeyType="search"
          />

          {!!search && (
            <TouchableOpacity
              onPress={() => setSearch('')}
            >
              <X
                size={17}
                color="#8492AF"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View
        style={[
          styles.tableCard,
          {
            marginBottom:
              FOOTER_HEIGHT +
              bottomInset +
              AD_HEIGHT +
              8,
          },
        ]}
      >
        <View style={styles.tablePadding}>
          <TableHeader layout={layout} />
        </View>

        {loading && !rows.length ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator
              color={COLOR.blue}
            />
            <Text style={styles.stateText}>
              Cargando posiciones...
            </Text>
          </View>
        ) : error && !rows.length ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              {error}
            </Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => loadData()}
            >
              <Text style={styles.retryText}>
                Reintentar
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={styles.tableScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() =>
                  loadData(true)
                }
                colors={[COLOR.blue]}
                tintColor={COLOR.blue}
              />
            }
          >
            <View style={styles.tablePadding}>
              {visibleRows.map((row, index) => {
                const position =
                  rows.findIndex(
                    item =>
                      item.team.id === row.team.id
                  ) + 1;

                return (
                  <PositionRow
                    key={String(row.team.id || index)}
                    item={row}
                    position={position}
                    total={rows.length}
                    layout={layout}
                    navigation={navigation}
                    highlightIds={highlightIds}
                  />
                );
              })}

              {!visibleRows.length && (
                <Text style={styles.emptyText}>
                  No se encontraron equipos.
                </Text>
              )}
            </View>

            <View style={styles.bottomSpace} />

            <View style={styles.inlineAd}>
              <InlineAd />
            </View>
          </ScrollView>
        )}
      </View>

      <TeamSearchModal
        visible={teamSearch}
        onClose={() =>
          setTeamSearch(false)
        }
        onSelect={team => {
          setTeamSearch(false);

          if (!team?.id) return;

          navigation?.navigate?.('TeamScreen', {
            teamId: team.id,
            teamName: team.name,
            scope: 'guatemala',
          });
        }}
      />

      <View
        style={[
          styles.adContainer,
          {
            bottom:
              FOOTER_HEIGHT + bottomInset,
            height: AD_HEIGHT,
          },
        ]}
      >
        <AdFooter />
      </View>

      <View
        style={[
          styles.footer,
          {
            height:
              FOOTER_HEIGHT + bottomInset,
          },
        ]}
      >
        <FooterTabs
          navigation={navigation}
          routeName="Positions"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR.background,
  },

  appHeader: {
    height: 49,
    backgroundColor: COLOR.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    gap: 9,
  },

  brandLogo: {
    width: 28,
    height: 33,
    backgroundColor: COLOR.blue,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  brandLetter: {
    fontFamily: FONT.bold,
    fontStyle: 'italic',
    fontSize: 19,
    color: COLOR.white,
  },

  brandName: {
    flex: 1,
    color: COLOR.navy,
    fontFamily: FONT.bold,
    fontSize: 15,
  },

  headerIcon: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    height: 75,
    backgroundColor: COLOR.darkBlue,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 12,
    overflow: 'hidden',
  },

  heroDecoration: {
    position: 'absolute',
    right: -55,
    top: -56,
    width: 175,
    height: 175,
    borderRadius: 90,
    backgroundColor: '#0B50D5',
  },

  heroText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },

  heroTitle: {
    color: COLOR.white,
    fontFamily: FONT.bold,
    fontSize: 18,
    lineHeight: 25,
  },

  heroSubtitle: {
    color: '#DCE7FF',
    fontFamily: FONT.regular,
    fontSize: 10.5,
    lineHeight: 17,
  },

  seasonChip: {
    maxWidth: 109,
    minHeight: 26,
    paddingHorizontal: 9,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BFD4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },

  seasonChipText: {
    color: COLOR.white,
    fontFamily: FONT.semi,
    fontSize: 9,
  },

  controls: {
    marginTop: -11,
    backgroundColor: COLOR.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 11,
    paddingTop: 10,
    paddingBottom: 10,
  },

  segment: {
    height: 44,
    borderRadius: 24,
    backgroundColor: '#EFF2F9',
    flexDirection: 'row',
    padding: 4,
    gap: 4,
  },

  segmentButton: {
    flex: 1,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },

  segmentActive: {
    backgroundColor: COLOR.blue,
  },

  segmentText: {
    fontFamily: FONT.semi,
    fontSize: 11.5,
    color: '#5F7095',
  },

  segmentTextActive: {
    color: COLOR.white,
  },

  searchBox: {
    height: 42,
    marginTop: 11,
    borderRadius: 12,
    borderColor: '#DDE5F2',
    borderWidth: 1,
    backgroundColor: COLOR.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  searchInput: {
    flex: 1,
    paddingVertical: 0,
    fontFamily: FONT.regular,
    fontSize: 12,
    color: COLOR.navy,
  },

  tableCard: {
    flex: 1,
    minHeight: 0,
    marginTop: 7,
    marginHorizontal: 10,
    backgroundColor: COLOR.white,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLOR.border,
    overflow: 'hidden',
  },

  tablePadding: {
    paddingHorizontal: 5,
  },

  columns: {
    height: 40,
    backgroundColor: '#FBFCFE',
    borderBottomWidth: 1,
    borderBottomColor: COLOR.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  tableScroll: {
    flex: 1,
  },

  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E9EDF4',
  },

  teamName: {
    flex: 1,
    minWidth: 0,
    color: COLOR.navy,
    fontFamily: FONT.semi,
    fontSize: 10.3,
    lineHeight: 15,
    includeFontPadding: false,
  },

  highlighted: {
    borderColor: COLOR.blue,
    borderWidth: 1,
  },

  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  stateContainer: {
    flex: 1,
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },

  stateText: {
    color: COLOR.muted,
    fontFamily: FONT.regular,
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },

  retryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 14,
    backgroundColor: COLOR.blue,
  },

  retryText: {
    color: COLOR.white,
    fontFamily: FONT.semi,
    fontSize: 11,
  },

  emptyText: {
    paddingVertical: 24,
    color: COLOR.muted,
    fontFamily: FONT.regular,
    fontSize: 11,
    textAlign: 'center',
  },

  bottomSpace: {
    height: 12,
  },

  inlineAd: {
    marginVertical: 8,
  },

  adContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: COLOR.white,
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 5,
  },

  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLOR.white,
    zIndex: 6,
  },
});