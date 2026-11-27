
// components/DetallesBlock.js
// Liga Nacional GT
// Detalles del partido + publicación asociada de WordPress

import React, {
  memo,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  Image,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';

import {
  Info,
  Trophy,
  CalendarBlank,
  Clock,
  MapPin,
  UsersThree,
  SoccerBall,
  ArrowsLeftRight,
  MonitorPlay,
  CaretLeft,
  CaretRight,
  CaretDown,
  GitBranch,
  PlayCircle,
  ArrowSquareOut,
} from 'phosphor-react-native';

import { getH2H } from '../services/ligaNacionalApi';

// =====================================================
// CONFIGURACIÓN
// =====================================================

const WEB = 'https://liganacionalgt.com';
const WORDPRESS_API = WEB + '/wp-json/wp/v2';

const BLUE = '#285FFF';
const NAVY = '#101936';
const MUTED = '#63769F';
const WHITE = '#FFFFFF';
const BORDER = '#E4EAF5';

const REG = 'Poppins-Regular';
const SEMI = 'Poppins-SemiBold';
const BOLD = 'Poppins-Bold';

// =====================================================
// HELPERS
// =====================================================

function str(value, fallback = '') {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'object') {
    return str(
      value.name ??
      value.label ??
      value.title ??
      value.rendered ??
      value.display,
      fallback
    );
  }

  return String(value);
}

function norm(value) {
  return str(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function first(object, keys, fallback = null) {
  if (!object || typeof object !== 'object') {
    return fallback;
  }

  for (const key of keys) {
    const value = object[key];

    if (
      value !== null &&
      value !== undefined &&
      value !== ''
    ) {
      return value;
    }
  }

  return fallback;
}

function validUrl(value) {
  const url = str(value).trim();
  return /^https?:\/\//i.test(url) ? url : '';
}

function safePostUrl(value) {
  const url = validUrl(value);

  if (!url) return '';

  try {
    const clean = url.split(/[?#]/)[0];
    const host = clean
      .replace(/^https?:\/\//i, '')
      .split('/')[0]
      .toLowerCase();

    if (
      host !== 'liganacionalgt.com' &&
      host !== 'www.liganacionalgt.com'
    ) {
      return '';
    }

    return url;
  } catch (_) {
    return '';
  }
}

function arrayOf(value) {
  if (Array.isArray(value)) return value;

  const candidates = [
    value?.matches,
    value?.events,
    value?.items,
    value?.h2h,
    value?.results,
    value?.fixtures,
    value?.headToHead,
    value?.data,
    value?.data?.matches,
    value?.data?.h2h,
    value?.data?.items,
    value?.data?.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }

  return [];
}

function decodeHtml(value) {
  return str(value)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, number) =>
      String.fromCharCode(Number(number))
    )
    .replace(/\s+/g, ' ')
    .trim();
}

// =====================================================
// FECHA Y HORA
// =====================================================

function formatDate(value) {
  const raw = str(value).trim();

  if (!raw) return '—';

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (iso) {
    return iso[3] + '-' + iso[2] + '-' + iso[1];
  }

  const latin = raw.match(
    /^(\d{2})[/-](\d{2})[/-](\d{4})/
  );

  if (latin) {
    return latin[1] + '-' + latin[2] + '-' + latin[3];
  }

  return raw;
}

function findTime(value) {
  const found = str(value).match(/(\d{1,2}):(\d{2})/);

  return found
    ? found[1].padStart(2, '0') + ':' + found[2]
    : '';
}

function kickoffInfo(match = {}) {
  const date = first(match, [
    'date',
    'match_date',
    'matchDate',
    'kickoff',
    'kickoff_at',
    'datetime',
  ]);

  const time =
    findTime(match.time) ||
    findTime(match.hora) ||
    findTime(match.hour) ||
    findTime(match.kickoff_time) ||
    findTime(match.kickoffTime) ||
    findTime(match.kickoff) ||
    findTime(match.datetime) ||
    '—';

  return {
    date: formatDate(date),
    time,
  };
}

// =====================================================
// ESTADIO
// =====================================================

function getStadium(data) {
  const rawA = data?.stadium;
  const rawB = data?.match?.stadium;

  const a =
    rawA && typeof rawA === 'object'
      ? rawA
      : { name: rawA };

  const b =
    rawB && typeof rawB === 'object'
      ? rawB
      : { name: rawB };

  const capacity = Number(
    first(a, ['capacity', 'capacidad']) ??
    first(b, ['capacity', 'capacidad'])
  );

  return {
    name: str(
      first(a, ['name', 'stadiumName']) ??
      first(b, ['name', 'stadiumName']),
      'Estadio por confirmar'
    ),

    city: str(
      first(a, ['city', 'location']) ??
      first(b, ['city', 'location'])
    ),

    image: validUrl(
      first(a, [
        'image',
        'image_url',
        'imageUrl',
        'photo',
        'photo_url',
        'cover',
      ]) ??
      first(b, [
        'image',
        'image_url',
        'photo',
      ])
    ),

    capacity:
      Number.isFinite(capacity) && capacity > 0
        ? capacity.toLocaleString('en-US')
        : '—',

    surface: str(
      first(a, [
        'surface',
        'field_surface',
        'fieldSurface',
        'grass_type',
      ]) ??
      first(b, [
        'surface',
        'field_surface',
      ]),
      '—'
    ),
  };
}

// =====================================================
// ELEMENTOS GENERALES
// =====================================================

function Box({ children }) {
  return <View style={styles.box}>{children}</View>;
}

function Heading({ Icon, title, subtitle, right }) {
  return (
    <View style={styles.heading}>
      <Icon size={19} color={BLUE} weight="fill" />

      <View style={styles.headingTexts}>
        <Text style={styles.headingTitle} numberOfLines={2}>
          {title}
        </Text>

        {!!subtitle && (
          <Text style={styles.headingSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {right || null}
    </View>
  );
}

function InfoCell({ Icon, label, value, sub }) {
  return (
    <View style={styles.infoCell}>
      <Icon size={22} color={BLUE} weight="bold" />

      <Text style={styles.infoLabel}>{label}</Text>

      <Text
        style={[
          styles.infoValue,
          label === 'ESTADIO' && styles.infoStadiumValue,
        ]}
        numberOfLines={2}
      >
        {str(value, '—')}
      </Text>

      {!!sub && (
        <Text style={styles.infoSub} numberOfLines={1}>
          {sub}
        </Text>
      )}
    </View>
  );
}

// =====================================================
// INFORMACIÓN DEL PARTIDO
// =====================================================

function MatchInfo({ data }) {
  const kickoff = kickoffInfo(data?.match || {});
  const stadium = getStadium(data);

  return (
    <Box>
      <Heading
        Icon={Info}
        title="Información del partido"
        right={
          <View style={styles.leagueChip}>
            <Trophy size={14} color={BLUE} weight="fill" />
            <Text style={styles.leagueChipText}>
              Liga Nacional GT
            </Text>
          </View>
        }
      />

      <View style={styles.infoRow}>
        <InfoCell
          Icon={CalendarBlank}
          label="FECHA"
          value={kickoff.date}
        />

        <InfoCell
          Icon={Clock}
          label="HORA"
          value={kickoff.time}
          sub="Hora local (GT)"
        />

        <InfoCell
          Icon={MapPin}
          label="ESTADIO"
          value={stadium.name}
          sub={stadium.city}
        />
      </View>
    </Box>
  );
}

// =====================================================
// ESTADIO
// =====================================================

function PitchIcon() {
  return (
    <View style={styles.pitch}>
      <View style={styles.pitchHalf} />
      <View style={styles.pitchCircle} />
      <View style={styles.pitchLeft} />
      <View style={styles.pitchRight} />
    </View>
  );
}

function StadiumStats({ stadium }) {
  return (
    <View style={styles.stadiumStats}>
      <View style={styles.stadiumStat}>
        <UsersThree size={19} color={WHITE} weight="fill" />

        <View style={styles.statText}>
          <Text style={styles.stadiumStatLabel}>CAPACIDAD</Text>
          <Text style={styles.stadiumStatValue}>
            {stadium.capacity}
          </Text>
        </View>
      </View>

      <View style={styles.stadiumStat}>
        <PitchIcon />

        <View style={styles.statText}>
          <Text style={styles.stadiumStatLabel}>SUPERFICIE</Text>
          <Text style={styles.stadiumStatValue} numberOfLines={1}>
            {stadium.surface}
          </Text>
        </View>
      </View>
    </View>
  );
}

function Stadium({ data }) {
  const stadium = getStadium(data);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [stadium.image]);

  return (
    <Box>
      <Heading
        Icon={MapPin}
        title={stadium.name}
        subtitle={stadium.city}
      />

      {stadium.image && !failed ? (
        <ImageBackground
          source={{ uri: stadium.image }}
          resizeMode="cover"
          style={styles.stadiumPhoto}
          imageStyle={styles.stadiumImageRadius}
          onError={() => setFailed(true)}
        >
          <View style={styles.stadiumShade} />
          <StadiumStats stadium={stadium} />
        </ImageBackground>
      ) : (
        <View style={styles.stadiumFallback}>
          <MapPin size={26} color="#7094D4" weight="fill" />
          <Text style={styles.stadiumFallbackName}>
            {stadium.name}
          </Text>
          <StadiumStats stadium={stadium} />
        </View>
      )}
    </Box>
  );
}

// =====================================================
// ÚLTIMOS ENFRENTAMIENTOS
// =====================================================

function parseScore(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (typeof value === 'object') {
    return parseScore(
      first(value, [
        'goals',
        'score',
        'value',
        'total',
        'fulltime',
      ])
    );
  }

  const number = Number(value);
  return Number.isFinite(number) ? String(number) : null;
}

function getGameScore(game, side) {
  const score = game?.score ?? game?.scores ?? game?.result;

  let value;

  if (typeof score === 'string') {
    const match = score.match(/(\d+)\s*[-:]\s*(\d+)/);
    if (match) {
      value = side === 'home' ? match[1] : match[2];
    }
  }

  if (value === undefined) {
    value =
      score?.[side] ??
      game?.[side + '_score'] ??
      game?.[side + 'Score'] ??
      game?.['score_' + side] ??
      game?.[side + '_goals'] ??
      game?.['goals_' + side] ??
      game?.teams?.[side]?.score ??
      game?.teams?.[side]?.goals ??
      game?.[side]?.score ??
      game?.[side]?.goals;
  }

  return parseScore(value) ?? '—';
}

function getGameTeam(game, side, fallback) {
  const team =
    game?.teams?.[side] ??
    game?.[side] ??
    game?.[side + '_team'] ??
    {};

  return {
    name: str(
      team?.name ??
      team?.team_name ??
      game?.[side + '_team_name'],
      fallback?.name || ''
    ),

    logo: validUrl(
      team?.logo ??
      team?.logo_url ??
      game?.[side + '_logo'] ??
      fallback?.logo
    ),
  };
}

function SmallLogo({ uri, name }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={styles.h2hLogo}
        resizeMode="contain"
      />
    );
  }

  return (
    <View style={styles.h2hLogoFallback}>
      <Text style={styles.h2hLogoLetter}>
        {str(name, '?').charAt(0)}
      </Text>
    </View>
  );
}

function H2HItem({ game, data }) {
  const home = getGameTeam(
    game,
    'home',
    data?.teams?.home
  );

  const away = getGameTeam(
    game,
    'away',
    data?.teams?.away
  );

  const date = first(game, [
    'kickoff',
    'date',
    'match_date',
    'matchDate',
  ]);

  return (
    <View style={styles.h2hItem}>
      <Text style={styles.h2hDate} numberOfLines={1}>
        {formatDate(date)}
      </Text>

      <View style={styles.h2hScoreRow}>
        <SmallLogo uri={home.logo} name={home.name} />

        <Text style={styles.h2hScore}>
          {getGameScore(game, 'home') +
            ' - ' +
            getGameScore(game, 'away')}
        </Text>

        <SmallLogo uri={away.logo} name={away.name} />
      </View>

      <Text style={styles.h2hLeague}>
        Liga Nacional GT
      </Text>
    </View>
  );
}

function H2H({ data }) {
  const embedded = useMemo(() => {
    const candidates = [
      data?.context?.h2h,
      data?.context?.headToHead,
      data?.h2h,
      data?.headToHead,
      data?.previousMatches,
    ];

    for (const candidate of candidates) {
      const list = arrayOf(candidate);
      if (list.length) return list;
    }

    return [];
  }, [data]);

  const homeId = Number(data?.teams?.home?.id || 0);
  const awayId = Number(data?.teams?.away?.id || 0);

  const [fetched, setFetched] = useState([]);
  const [loading, setLoading] = useState(false);
  const [start, setStart] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let active = true;

    setFetched([]);
    setStart(0);
    setExpanded(false);

    if (embedded.length || !homeId || !awayId) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    getH2H(homeId, awayId, { limit: 10 })
      .then(result => {
        if (active) setFetched(arrayOf(result));
      })
      .catch(error => {
        console.warn('[H2H]', error?.message || error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [homeId, awayId, embedded.length]);

  const matches = embedded.length ? embedded : fetched;
  const maxStart = Math.max(0, matches.length - 3);
  const index = Math.min(start, maxStart);

  const visible = expanded
    ? matches
    : matches.slice(index, index + 3);

  return (
    <Box>
      <Heading
        Icon={Clock}
        title="Últimos enfrentamientos"
        right={
          <TouchableOpacity
            style={styles.seeAll}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.seeAllText}>
              {expanded ? 'Ver menos' : 'Ver todos'}
            </Text>
            <CaretDown size={12} color={BLUE} />
          </TouchableOpacity>
        }
      />

      {matches.length ? (
        <View style={styles.h2hContainer}>
          {!expanded && matches.length > 3 && (
            <TouchableOpacity
              style={[styles.h2hArrow, styles.h2hLeft]}
              onPress={() => setStart(Math.max(0, index - 1))}
            >
              <CaretLeft size={17} color={NAVY} />
            </TouchableOpacity>
          )}

          <View style={styles.h2hList}>
            {visible.map((game, i) => (
              <H2HItem
                key={str(game.id, 'h2h-' + i)}
                game={game}
                data={data}
              />
            ))}
          </View>

          {!expanded && matches.length > 3 && (
            <TouchableOpacity
              style={[styles.h2hArrow, styles.h2hRight]}
              onPress={() =>
                setStart(Math.min(maxStart, index + 1))
              }
            >
              <CaretRight size={17} color={NAVY} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          {loading
            ? 'Cargando últimos enfrentamientos…'
            : 'No hay enfrentamientos anteriores registrados.'}
        </Text>
      )}
    </Box>
  );
}

// =====================================================
// PUBLICACIÓN DEL PARTIDO EN WORDPRESS
// =====================================================

// El partido debe traer una asociación explícita.
// Ejemplos aceptados:
// match.wordpress_post_id
// match.post_id
// match.post_url
// match.wordpress_post_url
// data.post.id
// data.post.link
// data.matchPost.id
// data.matchPost.url

function associatedPost(data) {
  const match = data?.match || {};

  const object =
    data?.matchPost ||
    data?.match_post ||
    data?.post ||
    match?.post ||
    match?.wordpress_post ||
    {};

  const postId = Number(
    first(match, [
      'wordpress_post_id',
      'wp_post_id',
      'post_id',
      'postId',
    ]) ??
    first(object, [
      'id',
      'post_id',
      'postId',
      'wordpress_post_id',
    ]) ??
    0
  );

  const url = safePostUrl(
    first(match, [
      'wordpress_post_url',
      'wp_post_url',
      'post_url',
      'postUrl',
    ]) ??
    first(object, [
      'link',
      'url',
      'post_url',
    ])
  );

  const image = validUrl(
    first(object, [
      'featured_image_url',
      'featuredImage',
      'image',
      'photo',
      'thumbnail',
    ])
  );

  const title = decodeHtml(
    first(object, [
      'title',
      'post_title',
      'name',
    ])
  );

  return {
    id:
      Number.isInteger(postId) && postId > 0
        ? postId
        : 0,
    url,
    image,
    title,
  };
}

function wpImage(post) {
  const embedded =
    post?._embedded?.['wp:featuredmedia'];

  const media = Array.isArray(embedded)
    ? embedded[0]
    : null;

  return validUrl(
    media?.media_details?.sizes?.large?.source_url ??
    media?.media_details?.sizes?.medium_large?.source_url ??
    media?.source_url ??
    post?.featured_image_url
  );
}

function normalizeWpPost(post) {
  if (!post || typeof post !== 'object') return null;

  if (post.status && post.status !== 'publish') {
    return null;
  }

  const url = safePostUrl(post.link);

  if (!url) return null;

  return {
    id: Number(post.id || 0),
    url,
    title: decodeHtml(post.title?.rendered ?? post.title),
    excerpt: decodeHtml(
      post.excerpt?.rendered ?? post.excerpt
    ),
    image: wpImage(post),
  };
}

async function fetchWordPressPost(association) {
  if (!association.id && !association.url) return null;

  let endpoint = '';

  if (association.id) {
    endpoint =
      WORDPRESS_API +
      '/posts/' +
      association.id +
      '?_embed=1';
  } else {
    const path = association.url
      .split(/[?#]/)[0]
      .replace(/^https?:\/\/[^/]+/i, '');

    const parts = path.split('/').filter(Boolean);
    const slug = parts[parts.length - 1];

    if (!slug) return null;

    endpoint =
      WORDPRESS_API +
      '/posts?slug=' +
      encodeURIComponent(slug) +
      '&_embed=1';
  }

  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(
      'WordPress HTTP ' + response.status
    );
  }

  const payload = await response.json();

  const item = Array.isArray(payload)
    ? payload[0]
    : payload;

  const post = normalizeWpPost(item);

  if (!post) return null;

  // Si se guardó URL además del ID, la URL asociada
  // tiene prioridad. No buscamos otros encuentros.
  return {
    ...post,
    url: association.url || post.url,
  };
}

function MatchPostCard({ data }) {
  const association = associatedPost(data);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let active = true;

    setPost(null);
    setImageFailed(false);

    if (!association.id && !association.url) {
      setLoading(false);
      return () => {
        active = false;
      };
    }

    // La asociación puede incluir ya todos los datos
    // necesarios; el post se puede mostrar sin otra petición.
    const direct =
      association.url &&
      association.title &&
      association.image;

    if (direct) {
      setPost({
        url: association.url,
        title: association.title,
        image: association.image,
        excerpt: '',
      });
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);

    fetchWordPressPost(association)
      .then(result => {
        if (active) {
          setPost(result);
        }
      })
      .catch(error => {
        console.warn(
          '[Match WordPress]',
          error?.message || error
        );

        // Si WordPress no entrega vista previa,
        // mostramos los datos asociados disponibles.
        if (
          active &&
          association.url &&
          association.title
        ) {
          setPost({
            url: association.url,
            title: association.title,
            image: association.image,
            excerpt: '',
          });
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    association.id,
    association.url,
    association.title,
    association.image,
  ]);

  const openPost = async () => {
    if (!post?.url) return;

    try {
      await Linking.openURL(post.url);
    } catch (error) {
      console.warn(
        '[Abrir partido]',
        error?.message || error
      );
    }
  };

  // No se muestra ninguna tarjeta sin publicación válida.
  if (!post) return null;

  return (
    <Box>
      <Heading
        Icon={PlayCircle}
        title="Mira aquí el partido"
      />

      <TouchableOpacity
        style={styles.postPreview}
        activeOpacity={0.82}
        onPress={openPost}
        accessibilityRole="link"
        accessibilityLabel="Abrir publicación del partido"
      >
        {!!post.image && !imageFailed && (
          <Image
            source={{ uri: post.image }}
            style={styles.postImage}
            resizeMode="cover"
            onError={() => setImageFailed(true)}
          />
        )}

        <View style={styles.postBody}>
          <Text
            style={styles.postTitle}
            numberOfLines={2}
          >
            {post.title}
          </Text>

          <Text
            style={styles.postSubtitle}
            numberOfLines={2}
          >
            {post.excerpt ||
              'Publicación del encuentro en Liga Nacional GT'}
          </Text>

          <View style={styles.postBottom}>
            <Text style={styles.postLinkText}>
              Ver publicación completa
            </Text>

            <ArrowSquareOut
              size={17}
              color={BLUE}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Box>
  );
}

// =====================================================
// EVENTOS
// =====================================================

function eventType(event) {
  return norm(
    event?.event_type ??
    event?.eventType ??
    event?.type ??
    event?.kind
  );
}

function eventCategory(event) {
  const type = eventType(event);

  if (/goal|gol/.test(type)) return 'goals';
  if (/card|yellow|red|tarjeta/.test(type)) return 'cards';
  if (/substitut|cambio/.test(type)) return 'subs';
  if (type.includes('var')) return 'var';

  return 'other';
}

function eventMinute(event) {
  const minute = Number(event?.minute);

  if (!Number.isFinite(minute)) return '—';

  const extra = Number(event?.stoppage || 0);

  return extra > 0
    ? minute + '+' + extra + '′'
    : minute + '′';
}

function eventTitle(event) {
  const explicit = str(event?.title ?? event?.label);

  if (explicit) return explicit;

  const titles = {
    kickoff: 'Inicio del partido',
    firsthalf: 'Inicio del partido',
    halftime: 'Final del primer tiempo',
    secondhalf: 'Inicio del segundo tiempo',
    fulltime: 'Final del partido',
    finished: 'Final del partido',
    goal: 'Gol',
    penaltygoal: 'Gol de penal',
    owngoal: 'Autogol',
    yellowcard: 'Tarjeta amarilla',
    redcard: 'Tarjeta roja',
    secondyellowred: 'Segunda amarilla y expulsión',
    substitution: 'Cambio',
  };

  const type = eventType(event);

  if (type.includes('var')) return 'Revisión VAR';

  return titles[type] || 'Evento del partido';
}

function eventDescription(event, data) {
  const type = eventType(event);

  if (type === 'substitution') {
    const incoming = str(
      event?.player_in_name ?? event?.playerInName
    );

    const outgoing = str(
      event?.player_out_name ?? event?.playerOutName
    );

    if (incoming && outgoing) {
      return 'Entra ' + incoming + ' · Sale ' + outgoing;
    }
  }

  const player = str(
    event?.player_name ?? event?.playerName
  );

  if (player) return player;

  const description = str(
    event?.description ??
    event?.detail ??
    event?.note
  );

  if (description) return description;

  if (type === 'kickoff') {
    return (
      'Comienza el encuentro en el ' +
      getStadium(data).name +
      '.'
    );
  }

  return str(event?.team_name);
}

function EventIcon({ event }) {
  const category = eventCategory(event);
  const type = eventType(event);

  if (category === 'cards') {
    return (
      <View
        style={[
          styles.cardSymbol,
          {
            backgroundColor: type.includes('red')
              ? '#F3343B'
              : '#FFD600',
          },
        ]}
      />
    );
  }

  if (category === 'subs') {
    return (
      <ArrowsLeftRight size={21} color={BLUE} />
    );
  }

  if (category === 'var') {
    return (
      <MonitorPlay size={21} color={BLUE} />
    );
  }

  return (
    <SoccerBall
      size={22}
      color={NAVY}
      weight="fill"
    />
  );
}

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'goals', label: 'Goles' },
  { key: 'cards', label: 'Tarjetas' },
  { key: 'subs', label: 'Cambios' },
  { key: 'var', label: 'VAR' },
];

function FilterIcon({ category, active }) {
  const color = active ? WHITE : '#576EA2';

  switch (category) {
    case 'goals':
      return (
        <SoccerBall size={16} color={color} weight="fill" />
      );

    case 'cards':
      return (
        <View style={styles.filterCards}>
          <View style={styles.filterYellow} />
          <View style={styles.filterRed} />
        </View>
      );

    case 'subs':
      return (
        <ArrowsLeftRight size={16} color={color} />
      );

    case 'var':
      return (
        <MonitorPlay size={16} color={color} />
      );

    default:
      return (
        <GitBranch size={16} color={color} />
      );
  }
}

function Events({ data }) {
  const [filter, setFilter] = useState('all');

  const events = useMemo(() => {
    const list = arrayOf(
      data?.events ?? data?.context?.events
    );

    return [...list].sort((a, b) => {
      const aa =
        Number(a?.minute || 0) * 100 +
        Number(a?.stoppage || 0);

      const bb =
        Number(b?.minute || 0) * 100 +
        Number(b?.stoppage || 0);

      return aa - bb;
    });
  }, [data]);

  const filtered = events.filter(
    event =>
      filter === 'all' ||
      eventCategory(event) === filter
  );

  return (
    <Box>
      <Heading Icon={GitBranch} title="Eventos del partido" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map(item => {
          const active = filter === item.key;

          return (
            <TouchableOpacity
              key={item.key}
              onPress={() => setFilter(item.key)}
              style={[
                styles.filterChip,
                active && styles.filterActive,
              ]}
            >
              <FilterIcon
                category={item.key}
                active={active}
              />

              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {filtered.length ? (
        <View style={styles.eventsList}>
          {filtered.map((event, index) => (
            <View
              key={str(event.id, 'event-' + index)}
              style={styles.eventRow}
            >
              <View style={styles.timelineSide}>
                <View
                  style={[
                    styles.timelineDot,
                    index > 0 && styles.timelineDotOutline,
                  ]}
                />

                {index < filtered.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>

              <View style={styles.minuteBox}>
                <Text style={styles.minuteText}>
                  {eventMinute(event)}
                </Text>
              </View>

              <View style={styles.eventBox}>
                <EventIcon event={event} />

                <View style={styles.eventTextColumn}>
                  <Text
                    style={styles.eventTitle}
                    numberOfLines={1}
                  >
                    {eventTitle(event)}
                  </Text>

                  <Text
                    style={styles.eventDescription}
                    numberOfLines={2}
                  >
                    {eventDescription(event, data)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>
          {events.length
            ? 'No hay eventos de este tipo.'
            : 'Los eventos aparecerán cuando comience el encuentro.'}
        </Text>
      )}
    </Box>
  );
}

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

function DetallesBlock({ data }) {
  return (
    <View style={styles.screen}>
      <MatchInfo data={data} />

      <Stadium data={data} />

      <H2H data={data} />

      {/* POST ASOCIADO AL PARTIDO */}
      <MatchPostCard data={data} />

      <Events data={data} />
    </View>
  );
}

// =====================================================
// ESTILOS
// =====================================================

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 8,
    paddingTop: 2,
    paddingBottom: 12,
    gap: 8,
  },

  box: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E9EDF6',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    shadowColor: '#16305A',
    shadowOpacity: 0.055,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },

  heading: {
    minHeight: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },

  headingTexts: {
    flex: 1,
    minWidth: 0,
  },

  headingTitle: {
    color: NAVY,
    fontFamily: BOLD,
    fontSize: 13,
    lineHeight: 18,
  },

  headingSubtitle: {
    color: MUTED,
    fontFamily: REG,
    fontSize: 9,
    lineHeight: 12,
  },

  leagueChip: {
    borderWidth: 1,
    borderColor: '#D9E4FF',
    backgroundColor: '#F5F8FF',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  leagueChipText: {
    color: BLUE,
    fontFamily: SEMI,
    fontSize: 9,
  },

  infoRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 6,
  },

  infoCell: {
    flex: 1,
    minWidth: 0,
    height: 96,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F7F9FD',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },

  infoLabel: {
    color: MUTED,
    fontFamily: REG,
    fontSize: 9,
    marginTop: 4,
  },

  infoValue: {
    color: NAVY,
    fontFamily: BOLD,
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },

  infoStadiumValue: {
    fontSize: 10,
    lineHeight: 13,
  },

  infoSub: {
    color: MUTED,
    fontFamily: REG,
    fontSize: 8,
    textAlign: 'center',
  },

  stadiumPhoto: {
    width: '100%',
    height: 150,
    marginTop: 8,
    borderRadius: 15,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },

  stadiumImageRadius: {
    borderRadius: 15,
  },

  stadiumShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },

  stadiumFallback: {
    height: 150,
    marginTop: 8,
    borderRadius: 15,
    backgroundColor: '#EAF0FA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  stadiumFallbackName: {
    fontFamily: SEMI,
    fontSize: 10,
    color: MUTED,
  },

  stadiumStats: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingBottom: 8,
    marginTop: 'auto',
  },

  stadiumStat: {
    flex: 1,
    maxWidth: 170,
    height: 39,
    borderRadius: 12,
    backgroundColor: 'rgba(15,24,16,0.48)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },

  statText: {
    flexShrink: 1,
    minWidth: 0,
  },

  stadiumStatLabel: {
    color: WHITE,
    fontFamily: REG,
    fontSize: 7,
    lineHeight: 9,
  },

  stadiumStatValue: {
    color: WHITE,
    fontFamily: BOLD,
    fontSize: 11,
    lineHeight: 14,
  },

  pitch: {
    width: 19,
    height: 15,
    borderWidth: 1.2,
    borderColor: WHITE,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  pitchHalf: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: WHITE,
  },

  pitchCircle: {
    width: 5,
    height: 5,
    borderWidth: 1,
    borderColor: WHITE,
    borderRadius: 3,
  },

  pitchLeft: {
    position: 'absolute',
    left: 0,
    width: 4,
    height: 7,
    borderWidth: 1,
    borderColor: WHITE,
  },

  pitchRight: {
    position: 'absolute',
    right: 0,
    width: 4,
    height: 7,
    borderWidth: 1,
    borderColor: WHITE,
  },

  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  seeAllText: {
    color: BLUE,
    fontFamily: SEMI,
    fontSize: 9,
  },

  h2hContainer: {
    position: 'relative',
    marginTop: 7,
  },

  h2hList: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },

  h2hItem: {
    flex: 1,
    minWidth: 0,
    height: 76,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#F8FAFE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },

  h2hDate: {
    color: MUTED,
    fontFamily: REG,
    fontSize: 8,
  },

  h2hScoreRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 2,
  },

  h2hLogo: {
    width: 22,
    height: 22,
  },

  h2hLogoFallback: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#E7EFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  h2hLogoLetter: {
    color: BLUE,
    fontFamily: BOLD,
    fontSize: 9,
  },

  h2hScore: {
    color: NAVY,
    fontFamily: BOLD,
    fontSize: 12,
  },

  h2hLeague: {
    color: MUTED,
    fontFamily: REG,
    fontSize: 8,
    marginTop: 2,
  },

  h2hArrow: {
    position: 'absolute',
    top: 23,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#F7F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
    elevation: 3,
  },

  h2hLeft: {
    left: -15,
  },

  h2hRight: {
    right: -15,
  },

  // ===================================================
  // NUEVA TARJETA DEL POST
  // ===================================================

  postPreview: {
    marginTop: 9,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: WHITE,
  },

  postImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#F0F3FA',
  },

  postBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },

  postTitle: {
    color: NAVY,
    fontFamily: BOLD,
    fontSize: 12,
    lineHeight: 17,
  },

  postSubtitle: {
    color: MUTED,
    fontFamily: REG,
    fontSize: 9,
    lineHeight: 14,
  },

  postBottom: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  postLinkText: {
    color: BLUE,
    fontFamily: SEMI,
    fontSize: 10,
  },

  // ===================================================
  // EVENTOS
  // ===================================================

  filters: {
    flexDirection: 'row',
    gap: 5,
    paddingVertical: 7,
  },

  filterChip: {
    minHeight: 31,
    minWidth: 65,
    paddingHorizontal: 9,
    borderRadius: 18,
    backgroundColor: '#F0F3FB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  filterActive: {
    backgroundColor: BLUE,
  },

  filterText: {
    color: '#52699D',
    fontFamily: SEMI,
    fontSize: 9,
  },

  filterTextActive: {
    color: WHITE,
  },

  filterCards: {
    width: 18,
    height: 20,
    position: 'relative',
  },

  filterYellow: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 11,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#FFD600',
  },

  filterRed: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 11,
    height: 16,
    borderRadius: 2,
    backgroundColor: '#F3343B',
  },

  eventsList: {
    marginTop: 1,
  },

  eventRow: {
    minHeight: 49,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 5,
    marginBottom: 4,
  },

  timelineSide: {
    width: 14,
    alignItems: 'center',
    paddingTop: 12,
  },

  timelineDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: BLUE,
    zIndex: 2,
  },

  timelineDotOutline: {
    backgroundColor: WHITE,
    borderWidth: 2,
    borderColor: '#6278AD',
  },

  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#8297C0',
  },

  minuteBox: {
    width: 40,
    minHeight: 44,
    borderRadius: 9,
    backgroundColor: '#F0F3F8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  minuteText: {
    color: '#3B4F7D',
    fontFamily: BOLD,
    fontSize: 10,
  },

  eventBox: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FBFCFF',
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },

  eventTextColumn: {
    flex: 1,
    minWidth: 0,
  },

  eventTitle: {
    color: NAVY,
    fontFamily: BOLD,
    fontSize: 10,
    lineHeight: 14,
  },

  eventDescription: {
    color: MUTED,
    fontFamily: REG,
    fontSize: 8,
    lineHeight: 12,
  },

  cardSymbol: {
    width: 14,
    height: 20,
    borderRadius: 2,
  },

  emptyText: {
    color: MUTED,
    fontFamily: REG,
    fontSize: 10,
    paddingVertical: 13,
    textAlign: 'center',
  },
});

export default memo(DetallesBlock);
