// utils/changeName.js

// Convierte cualquier cosa a string seguro
const toStr = (v) => String(v ?? '').trim();

// Repara mojibake común (UTF-8 leído como Latin-1) y algunos casos con � (U+FFFD)
function fixEncoding(s) {
  let x = toStr(s);

  // Mojibake frecuente: "Ã¡ Ã© Ã­ Ã³ Ãº Ã±" y mayúsculas
  const map = [
    ['Ã¡','á'], ['Ã©','é'], ['Ã­','í'], ['Ã³','ó'], ['Ãº','ú'], ['Ã±','ñ'],
    ['Ã�','Á'], ['Ã‰','É'], ['Ã\x8d','Í'], ['Ã“','Ó'], ['Ãš','Ú'], ['Ã‘','Ñ'],
    // variantes con doble símbolo que a veces aparecen
    ['â','–'], ['â','—'], ['â','’'], ['â','“'], ['â','”']
  ];
  for (const [a,b] of map) x = x.replace(new RegExp(a, 'g'), b);

  // Casos con carácter de reemplazo (�). No se puede inferir siempre,
  // pero para nombres conocidos hacemos parches específicos.
  x = x.replace(/cob\uFFFDn/gi, 'Cobán');      // "Cob�n" -> "Cobán"
  x = x.replace(/siquinal\uFFFD/gi, 'Siquinalá'); // "Siquinal�" -> "Siquinalá"

  return x;
}

// Normalizador base: minúsculas sin tildes
const baseNormalize = (s) =>
  toStr(s)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Versión ultraflexible: solo letras/números (elimina símbolos como "�")
const lettersOnly = (s) => baseNormalize(s).replace(/[^a-z0-9]/g, '');

export const changeName = (input) => {
  const raw0 = toStr(input);
  if (!raw0) return '';

  // 1) Reparar mojibake/� antes de normalizar
  const raw = fixEncoding(raw0);

  // 2) Normalizaciones para matching
  const n  = baseNormalize(raw);
  const nx = lettersOnly(raw);

  // 3) Reglas (usa también nx para tolerar caracteres rotos)
  if (n.includes('xelaj') || nx.includes('xelaju'))          return 'Xelajú';
  if (n.includes('siquinal') || nx.includes('siquinala'))    return 'Siquinalá';
  if (n.includes('coban') || nx.includes('cobanimperial'))   return 'Cobán Imperial';
  if ((n.includes('santa') && n.includes('lucia')) || nx.includes('santalucia'))
                                                              return 'Santa Lucía';
  if ((n.includes('nueva') && n.includes('concepcion')) || nx.includes('nuevaconcepcion'))
                                                              return 'Nueva Concepción';
  if (n.includes('solol') || nx.includes('solola'))          return 'Sololá';
  if (n.includes('mictl') || nx.includes('mictlan'))         return 'Mictlán';

  return raw; // deja el nombre reparado aunque no haya mapeo
};

// Alias “seguro”
export const changeNameSafe = (v) => changeName(v);


export default changeName;

/* ==========================================================
 * Nombres de PERSONAS (jugadores/DT) – limpieza de mojibake
 * Añadir al final del archivo. NO modifica exports existentes.
 * ========================================================== */

// Limpieza básica de UTF-8 mal decodificado y espacios.
function _basicPersonClean(raw) {
  if (raw == null) return '';
  let s = String(raw).replace(/\s+/g, ' ').trim();
  const latinMap = [
    ['Ã¡','á'], ['Ã©','é'], ['Ã­','í'], ['Ã³','ó'], ['Ãº','ú'],
    ['Ã�','Á'], ['Ã‰','É'], ['Ã\x8d','Í'], ['Ã“','Ó'], ['Ãš','Ú'],
    ['Ã±','ñ'], ['Ã‘','Ñ'], ['Ã¼','ü'], ['Ãœ','Ü'],
  ];
  for (const [a, b] of latinMap) s = s.replaceAll(a, b);
  return s;
}

/**
 * changePersonName:
 * Corrige mojibake común (Jos�→José, Mart�nez→Martínez, etc.).
 * Seguro para Guatemala y selecciones (NO aplica alias de clubes).
 */
export function changePersonName(raw0) {
  let name = _basicPersonClean ? _basicPersonClean(raw0) : String(raw0 || '');

  // 1) Arreglos cuando viene con "�" (mojíbyte)
  const fixes = [
    [/Nicol\uFFFDs/gi, 'Nicolás'],
    [/Mart\uFFFDnez/gi, 'Martínez'],
    [/Garc\uFFFDa/gi, 'García'],
    [/Hern\uFFFDndez/gi, 'Hernández'],
    [/Ben\uFFFDtez/gi, 'Benítez'],
    [/M\uFFFDndez/gi, 'Méndez'],
    [/D\uFFFDaz/gi, 'Díaz'],
    [/P\uFFFDrez/gi, 'Pérez'],
    [/S\uFFFDnchez/gi, 'Sánchez'],
    [/Rodr\uFFFDguez/gi, 'Rodríguez'],
    [/Ram\uFFFDrez/gi, 'Ramírez'],
    [/L\uFFFDpez/gi, 'López'],
    [/Mu\uFFFDoz/gi, 'Muñoz'],
    [/Qui\uFFFDones/gi, 'Quiñones'],
    [/\b\uFFFDlvaro/gi, 'Álvaro'],
    [/\b\uFFFDngel/gi,  'Ángel'],
    [/\b\uFFFDvalos/gi, 'Ávalos'],
    [/\b\uFFFDscar/gi,  'Óscar'],
    [/Jos\uFFFD\b/gi,   'José'],
    [/V\uFFFDctor/gi,   'Víctor'],
    [/C\uFFFDsar/gi,    'César'],
    [/Le\uFFFDn/gi,     'León'],
    [/B\uFFFDez/gi,     'Báez'],
    [/Jos\uFFFD/gi,     'José'],
    [/\uFFFDvalos/gi,     'Ávalos'],
    [/Baj\uFFFDn/gi,     'Baján'],
    [/Le\uFFFDn/gi, 'León'],
    [/Monz\uFFFDn/gi, 'Monzón'],
    [/Isa\uFFFDas/gi, 'Isaías'],
    [/C\uFFFDrdenas/gi, 'Cárdenas'],
    [/Ten\uFFFD\b/gi, 'Tené'],
    [/Ticur\uFFFD\b/gi, 'Ticurú'],
    [/Baj\uFFFDn/gi, 'Bajón'],
    [/Gol\uFFFDn/gi, 'Golán'],
    [/\uFFFDngel/gi, 'Ángel'],
  ];
  for (const [re, rep] of fixes) name = name.replace(re, rep);

  // 2) Heurísticas cuando NO hay "�" pero faltan tildes (casos muy comunes)
  const postFixes = [
    [/\bJos(?=\s)/g, 'José'],   // "Jos " → "José "
    [/\bJose\b/gi,   'José'],   // "Jose" → "José"
    [/\bVictor\b/gi, 'Víctor'], // "Victor" → "Víctor"
    [/\bAvalos\b/gi, 'Ávalos'], // "Avalos" → "Ávalos"
  ];
  for (const [re, rep] of postFixes) name = name.replace(re, rep);

  // 3) Elimina cualquier '�' que aún quede
  name = name.replace(/\uFFFD/g, '');

  return name.trim();
}


/**
 * bestPersonNameFromObj:
 * Elige el MEJOR nombre desde el objeto de la API de goleadores
 * y lo pasa por changePersonName.
 * Prioridad: nombreCorto > nombreCompleto > nombre+apellido > apodo.
 * Si hay varias, elige la que tenga menos '�' y luego la más corta.
 */
export function bestPersonNameFromObj(p) {
  const cands = [
    p?.nombreCorto?.[0],
    p?.nombreCompleto?.[0],
    [p?.nombre?.[0], p?.apellido?.[0]].filter(Boolean).join(' '),
    p?.apodo?.[0],
  ].filter(Boolean).map(String);

  if (!cands.length) return '';

  cands.sort((a, b) => {
    const ca = (a.match(/\uFFFD/g) || []).length;
    const cb = (b.match(/\uFFFD/g) || []).length;
    return ca - cb || a.length - b.length;
  });

  return changePersonName(cands[0]);
}


