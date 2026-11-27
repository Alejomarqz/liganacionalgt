// components/PollCard.js

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  AppState,
} from 'react-native';

import {
  useTheme,
} from '../utils/ThemeContext';

import {
  loadFeaturedPrediction,
  refreshPrediction,
  votePoll,
} from '../services/leaguePollApi';


/* =========================================================
   HELPERS
========================================================= */

function normKey(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function fixTeamName(value = '') {
  const raw = String(value || '').trim();

  if (normKey(raw) === 'suchitepequez') {
    return 'Suchitepéquez';
  }

  return raw;
}

function getShortTeamName(team) {
  const supplied = String(
    team?.short ||
    team?.short_name ||
    team?.shortName ||
    '',
  ).trim();

  if (supplied) {
    return supplied.toUpperCase();
  }

  const key = normKey(team?.name);

  const known = {
    antigua: 'ANT',
    antiguagfc: 'ANT',
    aurora: 'AUR',
    aurorafc: 'AUR',
    cobanimperial: 'COB',
    comunicaciones: 'COM',
    municipal: 'MUN',
    guastatoya: 'GUA',
    malacateco: 'MAL',
    marquense: 'MAR',
    mixco: 'MIX',
    sanpedro: 'SPD',
    suchitepequez: 'SUC',
    xelaju: 'XEL',
    xelajumc: 'XEL',
  };

  if (known[key]) {
    return known[key];
  }

  return fixTeamName(team?.name || '')
    .slice(0, 3)
    .toUpperCase();
}

function optionId(option) {
  return Number(
    option?.id ||
    option?.optionId ||
    option?.option_id ||
    0,
  );
}

function optionTeamId(option) {
  return Number(
    option?.team_id ||
    option?.teamId ||
    0,
  );
}


/* =========================================================
   DATE
========================================================= */

function getDateAndTime(match) {
  const kickoff = String(match?.kickoff || '');
  const date = String(
    match?.date ||
    kickoff.slice(0, 10) ||
    '',
  );

  const timeMatch = kickoff.match(/T(\d{2}):(\d{2})/);

  return {
    dateLabel: date
      ? `${date.slice(8, 10)}/${date.slice(5, 7)}`
      : '',
    timeLabel: timeMatch
      ? `${timeMatch[1]}:${timeMatch[2]}`
      : '--:--',
  };
}


/* =========================================================
   LOGO
========================================================= */

function TeamLogo({
  uri,
  name,
  style,
  color,
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (uri && !failed) {
    return (
      <Image
        source={{ uri }}
        style={style}
        resizeMode="contain"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <View style={[style, styles.logoFallback]}>
      <Text
        style={[
          styles.logoFallbackText,
          { color },
        ]}
      >
        {String(name || '?')
          .charAt(0)
          .toUpperCase()}
      </Text>
    </View>
  );
}


/* =========================================================
   ICONO DE CABECERA
========================================================= */

function PollHeaderIcon() {
  return (
    <View style={styles.headerIconBox}>
      <View style={styles.headerBars}>
        <View style={[styles.headerBar, styles.headerBar1]} />
        <View style={[styles.headerBar, styles.headerBar2]} />
        <View style={[styles.headerBar, styles.headerBar3]} />
      </View>
    </View>
  );
}


/* =========================================================
   OPTION
========================================================= */

function PollOption({
  label,
  logo,
  tie = false,
  selected,
  disabled,
  voting,
  onPress,
  colors,
  isDark,
}) {
  return (
    <TouchableOpacity
      activeOpacity={disabled ? 1 : 0.72}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.optionCard,
        {
          backgroundColor: selected
            ? (isDark
                ? 'rgba(49,93,228,0.14)'
                : '#F4F7FF')
            : colors.cardBg,
          borderColor: selected
            ? '#315DE4'
            : (isDark
                ? 'rgba(255,255,255,0.12)'
                : '#DDE5F0'),
        },
      ]}
    >
      {tie ? (
        <View style={styles.tieIcon}>
          <Text style={styles.tieText}>X</Text>
        </View>
      ) : (
        <TeamLogo
          uri={logo}
          name={label}
          style={styles.optionLogo}
          color={colors.text}
        />
      )}

      <Text
        numberOfLines={1}
        style={[
          styles.optionText,
          {
            color: selected
              ? '#315DE4'
              : colors.text,
          },
        ]}
      >
        {label}
      </Text>

      {voting && (
        <ActivityIndicator
          size={10}
          color="#315DE4"
        />
      )}

      {selected && (
        <View style={styles.selectedDot} />
      )}
    </TouchableOpacity>
  );
}


/* =========================================================
   POLL
========================================================= */

export default function PollCard({
  match: forcedMatch = null,
  style,
}) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const isDark = theme.mode === 'dark';

  const [match, setMatch] = useState(forcedMatch || null);
  const [poll, setPoll] = useState(null);
  const [voterToken, setVoterToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [pendingOptionId, setPendingOptionId] = useState(0);
  const [error, setError] = useState('');

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) {
        setLoading(true);
      }

      setError('');

      try {
        const data = await loadFeaturedPrediction(
          forcedMatch || null,
        );

        setMatch(
          data?.match ||
          forcedMatch ||
          null,
        );

        setPoll(data?.poll || null);
        setVoterToken(data?.voterToken || '');
      } catch (loadError) {
        console.warn(
          '[PollCard] load:',
          loadError?.message || loadError,
        );

        if (!silent) {
          setError(
            loadError?.message ||
            'No se pudo cargar la votación.',
          );
        }
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [forcedMatch?.id],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(
    async () => {
      if (!match?.id || !voterToken || voting) {
        return;
      }

      try {
        const next = await refreshPrediction(
          match,
          voterToken,
        );

        setPoll(next);
      } catch (refreshError) {
        console.warn(
          '[PollCard] refresh:',
          refreshError?.message || refreshError,
        );
      }
    },
    [match?.id, voterToken, voting],
  );

  useEffect(() => {
    if (!match?.id) {
      return undefined;
    }

    const interval = setInterval(refresh, 20000);

    const sub = AppState.addEventListener(
      'change',
      state => {
        if (state === 'active') {
          refresh();
        }
      },
    );

    return () => {
      clearInterval(interval);
      sub?.remove?.();
    };
  }, [match?.id, refresh]);

  const home = match?.home || null;
  const away = match?.away || null;

  const options = Array.isArray(poll?.options)
    ? poll.options
    : [];

  const homeOption = useMemo(
    () =>
      options.find(
        option =>
          optionTeamId(option) ===
          Number(home?.id || 0),
      ) || null,
    [options, home?.id],
  );

  const awayOption = useMemo(
    () =>
      options.find(
        option =>
          optionTeamId(option) ===
          Number(away?.id || 0),
      ) || null,
    [options, away?.id],
  );

  const tieOption = useMemo(
    () =>
      options.find(
        option =>
          !optionTeamId(option) &&
          /empate/i.test(
            String(option?.label || ''),
          ),
      ) || null,
    [options],
  );

  const myOptionId = Number(
    poll?.myVote?.option_id ||
    poll?.myVote?.optionId ||
    0,
  );

  const voted = myOptionId > 0;

  const open =
    String(poll?.status || '').toLowerCase() ===
    'open';

  const total = Number(
    poll?.totalVotesRaw ??
    poll?.totalVotes ??
    0,
  ) || 0;

  const selected = option =>
    myOptionId === optionId(option);

  const disabled = !open || voted || voting;

  const vote = async option => {
    const id = optionId(option);

    if (!id || !poll?.id || disabled) {
      return;
    }

    setVoting(true);
    setPendingOptionId(id);
    setError('');

    try {
      const next = await votePoll(
        poll.id,
        id,
        voterToken,
      );

      setPoll(next);
    } catch (voteError) {
      setError(
        voteError?.message ||
        'No se pudo guardar el voto.',
      );
    } finally {
      setVoting(false);
      setPendingOptionId(0);
    }
  };

  if (loading) {
    return (
      <View style={[styles.wrapper, style]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <ActivityIndicator
            size="small"
            color="#315DE4"
          />
        </View>
      </View>
    );
  }

  if (
    !match ||
    !poll ||
    !home ||
    !away ||
    !homeOption ||
    !awayOption ||
    !tieOption
  ) {
    return null;
  }

  const { dateLabel, timeLabel } =
    getDateAndTime(match);

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.cardBg,
            borderColor: isDark
              ? 'rgba(255,255,255,0.11)'
              : '#DCE5F0',
          },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.titleWrap}>
            <PollHeaderIcon />

            <View style={styles.titleColumn}>
              <Text
                numberOfLines={1}
                style={[
                  styles.title,
                  { color: colors.text },
                ]}
              >
                {poll?.question || '¿Quién ganará el partido?'}
              </Text>

              <Text
                style={[
                  styles.meta,
                  { color: colors.textMuted },
                ]}
              >
                {dateLabel} · {timeLabel}
              </Text>
            </View>
          </View>

          <View style={styles.voteBadge}>
            <Text style={styles.voteBadgeIcon}>👥</Text>
            <Text style={styles.voteBadgeText}>
              Votos: {total}
            </Text>
          </View>
        </View>

        <View style={styles.optionsRow}>
          <PollOption
            label={getShortTeamName(home)}
            logo={home?.logo}
            selected={selected(homeOption)}
            disabled={disabled}
            voting={pendingOptionId === optionId(homeOption)}
            onPress={() => vote(homeOption)}
            colors={colors}
            isDark={isDark}
          />

          <PollOption
            label="Empate"
            tie
            selected={selected(tieOption)}
            disabled={disabled}
            voting={pendingOptionId === optionId(tieOption)}
            onPress={() => vote(tieOption)}
            colors={colors}
            isDark={isDark}
          />

          <PollOption
            label={getShortTeamName(away)}
            logo={away?.logo}
            selected={selected(awayOption)}
            disabled={disabled}
            voting={pendingOptionId === optionId(awayOption)}
            onPress={() => vote(awayOption)}
            colors={colors}
            isDark={isDark}
          />
        </View>

        {!!error && (
          <Text style={styles.error}>
            {error}
          </Text>
        )}

        <Text
          numberOfLines={1}
          style={[
            styles.footNote,
            { color: colors.textMuted },
          ]}
        >
          {voted
            ? 'Tu voto quedó registrado. Un voto por persona.'
            : open
              ? 'Elige una opción. Un voto por persona; cierra al inicio del partido.'
              : 'La votación está cerrada.'}
        </Text>
      </View>
    </View>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  wrapper: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 12,
  },

  card: {
    minHeight: 108,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingTop: 9,
    paddingBottom: 8,
    justifyContent: 'center',
  },

  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  titleWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },

  headerIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  headerBars: {
    width: 12,
    height: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },

  headerBar: {
    width: 2.5,
    borderRadius: 2,
    backgroundColor: '#315DE4',
  },

  headerBar1: {
    height: 7,
  },

  headerBar2: {
    height: 10,
  },

  headerBar3: {
    height: 12,
  },

  titleColumn: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11.8,
    lineHeight: 15,
  },

  meta: {
    marginTop: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 8.4,
    lineHeight: 10,
  },

  voteBadge: {
    minHeight: 24,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#D6E2FF',
    borderRadius: 999,
    backgroundColor: '#F4F7FF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  voteBadgeIcon: {
    fontSize: 8,
    marginRight: 4,
  },

  voteBadgeText: {
    color: '#315DE4',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 8,
  },

  optionsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },

  optionCard: {
    flex: 1,
    height: 34,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },

  optionLogo: {
    width: 17,
    height: 17,
    marginRight: 6,
  },

  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoFallbackText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 7,
  },

  tieIcon: {
    width: 17,
    height: 17,
    borderRadius: 5,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },

  tieText: {
    color: '#315DE4',
    fontFamily: 'Poppins-Bold',
    fontSize: 8,
  },

  optionText: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 9.5,
    lineHeight: 12,
  },

  selectedDot: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#315DE4',
    top: 3,
    right: 3,
  },

  footNote: {
    fontFamily: 'Poppins-Regular',
    fontSize: 7.5,
    lineHeight: 10,
  },

  error: {
    color: '#DC2626',
    fontFamily: 'Poppins-Regular',
    fontSize: 8,
    marginBottom: 4,
  },
});