// components/PositionsBlock.js
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import LogoImg from './LogoImg';
import { changeName } from '../utils/changeName';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../utils/ThemeContext';

const { width } = Dimensions.get('window');

const COL = { RANK: 32, PTS: 40, NUM: 30, DIF: 38, ICON: 22, GAP: 6 };
const RIGHT_W = COL.PTS + (4 * COL.NUM) + COL.DIF; // Pts J G E P Dif
const CUM_W   = COL.PTS + COL.NUM + COL.DIF;       // Pts J Dif
const TEAM_GUTTER = 18;
const RIGHT_INNER_PAD = -10; // gutter hacia el borde derecho

// === Helpers numéricos con fallback ===
const num = (v) => (v == null || v === '') ? 0 : parseInt(v, 10) || 0;

/** pick(row, ['puntosactual','puntos']) => primer valor no vacío, parseado */
const pick = (row, keys = []) => {
  for (const k of keys) {
    const v = row?.[k]?.[0];
    if (v != null && v !== '') return num(v);
  }
  return 0;
};

/** A(row, 'ganados') => ganadosactual || ganados */
const A = (row, base) => pick(row, [`${base}actual`, base]);

/** Puntos: usa puntosactual || puntos; si no vienen, calcula 3*G + E */
const computePTS = (row) => {
  const pv = pick(row, ['puntosactual', 'puntos']);
  if (pv) return pv;
  const w = A(row, 'ganados');
  const d = A(row, 'empatados');
  return w * 3 + d;
};

/**
 * Props:
 * - standings        : array torneo vigente (Apertura/Clausura)
 * - standingsCum     : array acumulada (ya ordenada)
 * - mode             : 'apertura' | 'acumulada' | 'both' (default 'apertura')
 * - defaultView      : 'apertura' | 'acumulada' (default 'apertura')
 * - title            : string (default 'Tabla de Posiciones'); pásalo "" para ocultar
 * - showHeader       : boolean (default true) — cabecera de columnas
 * - highlightTop     : number (default 8) — resalta 1..N
 * - compact          : boolean (default false) — reduce paddings
 * - tournamentLabel  : string (default 'Apertura') — etiqueta del torneo vigente
 */
export default function PositionsBlock({
  standings = [],
  standingsCum = [],
  mode = 'apertura',
  defaultView = 'apertura',
  title = 'Tabla de Posiciones',
  showHeader = true,
  highlightTop = 8,
  compact = false,
  tournamentLabel = 'Apertura',
  navigation,
  onPressTeam,
  scope = 'guatemala',
}) {

  const { theme } = useTheme();
  const UI = theme.colors;
  const nav = useNavigation();

  const [view, setView] = useState(defaultView); // 'apertura' | 'acumulada'
  const showCum = mode === 'acumulada' || (mode === 'both' && view === 'acumulada');
  const data = useMemo(() => (showCum ? standingsCum : standings), [showCum, standings, standingsCum]);
  const total = data?.length || 0;

  const headerWidth = showCum ? CUM_W : RIGHT_W;
  const titleText = tournamentLabel ?? title ?? 'Tabla de Posiciones';

  return (
    <View style={{ backgroundColor: UI.cardBg }}>

      {/* Título opcional */}
      {!!title && (
        <View
    style={[
      styles.blockTitle,
      { backgroundColor: UI.headerBg },
    ]}
  >
    <Text
      style={[
        styles.blockTitleText,
        { color: UI.headerText },
      ]}
    >
      {titleText}
    </Text>
  </View>
      )}

      {/* Selector pill solo si mode === 'both' */}
      {mode === 'both' && (
  <View style={[
  styles.selectorWrap,
  {
    backgroundColor: UI.cardBg,
    borderColor: UI.cardBorder,
  }
]}>

    <TouchableOpacity
      style={[
        styles.selectorBtn,
        view === 'acumulada' && [
          styles.selectorBtnActive,
          { backgroundColor: UI.accent, borderColor: UI.accent },
        ],
      ]}
      onPress={() => setView('acumulada')}
    >
      <Text
        style={[
          styles.selectorText,
          { color: UI.segmentText },
          view === 'acumulada' && { color: UI.segmentTextActive },
        ]}
      >
        Acumulada
      </Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={[
        styles.selectorBtn,
        view === 'apertura' && [
          styles.selectorBtnActive,
          { backgroundColor: UI.accent, borderColor: UI.accent },
        ],
      ]}
      onPress={() => setView('apertura')}
    >
      <Text
        style={[
          styles.selectorText,
          { color: UI.segmentText },
          view === 'apertura' && { color: UI.segmentTextActive },
        ]}
      >
        {tournamentLabel}
      </Text>
    </TouchableOpacity>
  </View>
)}


      {/* Cabecera */}
      {showHeader && (
        <>
          <View
  style={[
    styles.tableHeader,
    { backgroundColor: UI.rowBg, borderBottomColor: UI.cardBorder },
  ]}
>
            <View style={[styles.thCol, { width: COL.RANK }]}><Text style={[styles.thText, { color: UI.text }]}>#</Text></View>
            <View style={{ flex: 1, paddingRight: TEAM_GUTTER }}>
              <Text style={[styles.thTextLeft, { color: UI.text }]}>Equipo</Text>
            </View>

            <View style={{ width: headerWidth, flexDirection: 'row', marginRight: RIGHT_INNER_PAD }}>
              <View style={[styles.thCol, { width: COL.PTS }]}><Text style={[styles.thText, { color: UI.text }]}>Pts</Text></View>
              <View style={[styles.thCol, { width: COL.NUM }]}><Text style={[styles.thText, { color: UI.text }]}>J</Text></View>
              {!showCum && (
                <>
                  <View style={[styles.thCol, { width: COL.NUM }]}><Text style={[styles.thText, { color: UI.text }]}>G</Text></View>
                  <View style={[styles.thCol, { width: COL.NUM }]}><Text style={[styles.thText, { color: UI.text }]}>E</Text></View>
                  <View style={[styles.thCol, { width: COL.NUM }]}><Text style={[styles.thText, { color: UI.text }]}>P</Text></View>
                </>
              )}
              <View style={[styles.thCol, { width: COL.DIF }]}><Text style={[styles.thText, { color: UI.text }]}>Dif</Text></View>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: UI.cardBorder, width }} />
        </>
      )}

      {/* Filas */}
      {(data || []).map((item, index) => {
        const teamId = item?.id?.[0] ? String(item.id[0]) : null;
        const name = changeName((item?.nombre?.[0] || '').trim());

        const teamIdNum = Number(teamId);
        const openTeam = () => {
          if (!Number.isFinite(teamIdNum)) return;
          if (onPressTeam) onPressTeam(teamIdNum);
          else nav?.navigate?.('TeamScreen', { teamId: teamIdNum, scope });
        };

        const PTS = computePTS(item);
        const J   = A(item, 'jugados');
        const G   = A(item, 'ganados');
        const E   = A(item, 'empatados');
        const P   = A(item, 'perdidos');
        const DIF = A(item, 'difgol');

        const rank = index + 1;

        // === Solo verde para clasificados; rojo solo en Liga Guatemala ===
        const scopeLower = (scope || 'guatemala').toLowerCase();
        const qualifyTop = Number(highlightTop || 0); // te lo manda TeamScreen
        const isTop = rank <= qualifyTop;

        const dangerBottomCount = scopeLower === 'guatemala'
          ? 2
          : 0;

        const isBottom = dangerBottomCount > 0 && rank > (total - dangerBottomCount);

        return (
          <View key={teamId || index}>
            <View style={[
  styles.teamRow,
  { backgroundColor: UI.cardBg },
  compact && { paddingVertical: 9 },
  isBottom && {
    backgroundColor: theme.mode === 'dark'
      ? 'rgba(220,38,38,0.1)'
      : '#FEF2F2',
  }
]}>

              {/* Posición */}
              <View style={{ width: COL.RANK }}>
                <View style={[
  styles.rankCircle,
  {
    backgroundColor: UI.cardBg,
    borderColor: UI.cardBorder,
  },
  isTop && styles.rankCircleQual,
  isBottom && styles.rankCircleDanger,
]}>

  <Text style={[
  styles.rankText,
  { color: UI.text },
  isTop && styles.rankTextQual,
  isBottom && styles.rankTextDanger,
]}>

    {rank}
  </Text>
</View>

              </View>

              {/* Logo + Nombre — tocable */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={openTeam}
                style={{ flex:1, flexDirection:'row', alignItems:'center', paddingRight: TEAM_GUTTER }}
              >
                <LogoImg teamId={teamId} size={COL.ICON} style={{ marginRight: COL.GAP }} />
                <Text style={[styles.tdTeamName, { color: UI.text }]} numberOfLines={1} > {name} </Text>
              </TouchableOpacity>

              {/* Stats */}
              <View style={{width: headerWidth, flexDirection: 'row', marginRight: RIGHT_INNER_PAD, }}> 
              {/* PTS */}
                <Text style={[styles.colNum, styles.colPts, { width: COL.PTS, color: UI.text }, ]} > {PTS} </Text>
              {/* J */}
                <Text style={[styles.colNum, { width: COL.NUM, color: UI.text }, ]} > {J} </Text>
              {/* G, E, P solo cuando NO es acumulada */}
              {!showCum && (
              <>
                <Text style={[styles.colNum, { width: COL.NUM, color: UI.text }, ]} > {G} </Text>
                <Text style={[styles.colNum, { width: COL.NUM, color: UI.text }, ]} > {E} </Text>
                <Text style={[styles.colNum, { width: COL.NUM, color: UI.text }, ]} > {P} </Text>
              </>
            )}
              {/* DIF */}
                <Text style={[styles.colNum, { width: COL.DIF, color: UI.text }, ]} > {DIF} </Text>
            </View>

            </View>

            <View style={{ height: 1, backgroundColor: UI.cardBorder, width }} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blockTitle: {
    marginTop: 0,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    width,
  },
  blockTitleText: { fontSize: 14, fontWeight: 'bold', },

  // Selector estilo Alineaciones (pill centrado)
  selectorWrap: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectorBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorBtnActive: {
  borderWidth: 1,
},
  selectorText: { fontSize: 14, fontWeight: 'bold',  },
  selectorTextActive: { fontWeight: 'bold', },

  tableHeader: {
  flexDirection: 'row',
  paddingHorizontal: 8,
  paddingVertical: 8,
  borderBottomWidth: StyleSheet.hairlineWidth,
},
  thCol: { alignItems: 'center', justifyContent: 'center' },
thText: { fontSize: 12, fontWeight: '800' },
thTextLeft: { fontSize: 12, fontWeight: '800' },

  teamRow: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 8,
  paddingVertical: 8,
},
  tdTeamName: { fontSize:12, fontWeight:'700' },

  rankCircle: {
  width: 22,
  height: 22,
  borderRadius: 11,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
},
rankCircleDefault: { },

rankCircleQual:   { backgroundColor: '#10B981', borderColor: '#059669' },
rankCircleDanger: { backgroundColor: '#EF4444', borderColor: '#DC2626' },

rankText: { fontSize: 12, fontWeight: '800' },
rankTextDefault: { },
rankTextQual:    { color: '#fff' },
rankTextDanger:  { color: '#fff' },


  colNum: {
  fontSize: 12,
  textAlign: 'center',
  fontWeight: '500',
  minWidth: 24,
  ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : null),
},

  colPts: { fontWeight: '900' },

  teamRowDanger: { backgroundColor: '#FEF2F2' },
});
