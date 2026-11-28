// src/features/teams/clubMedia.js
// Fotos de portada y apodos de cada club (los mismos que ya usaba "Mi equipo").
// Las fotos viven en resources/myteam/*.jpg.

const HEROES = {
  antigua: require('../../../resources/myteam/antigua.jpg'),
  aurora: require('../../../resources/myteam/aurora.jpg'),
  coban: require('../../../resources/myteam/coban.jpg'),
  comunicaciones: require('../../../resources/myteam/comunicaciones.jpg'),
  guastatoya: require('../../../resources/myteam/guastatoya.jpg'),
  malacateco: require('../../../resources/myteam/malacateco.jpg'),
  marquense: require('../../../resources/myteam/marquense.jpg'),
  mixco: require('../../../resources/myteam/mixco.jpg'),
  municipal: require('../../../resources/myteam/municipal.jpg'),
  'san-pedro': require('../../../resources/myteam/san-pedro.jpg'),
  suchitepequez: require('../../../resources/myteam/suchitepequez.jpg'),
  xelaju: require('../../../resources/myteam/xelaju.jpg'),
};

const NICKNAMES = {
  antigua: 'Coloniales',
  aurora: 'Aurinegros',
  coban: 'Príncipes Azules',
  comunicaciones: 'Cremas',
  guastatoya: 'Pecho Amarillo',
  malacateco: 'Toros',
  marquense: 'Leones',
  mixco: 'Chicharroneros',
  municipal: 'Rojos',
  'san-pedro': 'San Pedranos',
  suchitepequez: 'Venados',
  xelaju: 'Superchivos',
};

const norm = (s = '') =>
  String(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');

/** Clave del club a partir del nombre o slug ("Antigua GFC" → "antigua"). */
export function clubKey(team) {
  const k = norm(team?.slug || '') + '|' + norm(team?.name || '');
  if (k.includes('antigua')) return 'antigua';
  if (k.includes('aurora')) return 'aurora';
  if (k.includes('coban')) return 'coban';
  if (k.includes('comunicaciones')) return 'comunicaciones';
  if (k.includes('guastatoya')) return 'guastatoya';
  if (k.includes('malacateco')) return 'malacateco';
  if (k.includes('marquense')) return 'marquense';
  if (k.includes('mixco')) return 'mixco';
  if (k.includes('municipal')) return 'municipal';
  if (k.includes('sanpedro')) return 'san-pedro';
  if (k.includes('suchitepequez')) return 'suchitepequez';
  if (k.includes('xelaju')) return 'xelaju';
  return null;
}

export const clubHero = (team) => HEROES[clubKey(team)] || null;
export const clubNickname = (team) => NICKNAMES[clubKey(team)] || '';
