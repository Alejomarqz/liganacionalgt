// components/Positions.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';

import Header from './Header';
import AdFooter from '../ads/AdFooter';
import FooterTabs from './FooterTabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import LogoImg from './LogoImg';
import { changeName } from '../utils/changeName';
import TeamSearchModal from './TeamSearchModal';
import analytics from '@react-native-firebase/analytics';
import { useTheme } from '../utils/ThemeContext';

import { API_CUSTOM_DIGITAL } from '@env';

const { width } = Dimensions.get('window');

const COL = {
  RANK: 32,
  PTS: 40,
  NUM: 30,
  DIF: 38,
  ICON: 26,
  GAP: 6,
};
const RIGHT_W = COL.PTS + 4 * COL.NUM + COL.DIF; // PTS + J + G + E + P + DIF
const CUM_W = COL.PTS + COL.NUM + COL.DIF; // PTS + J + DIF
const TEAM_GUTTER = 20;
const RIGHT_INNER_PAD = -10; // gutter hacia el borde derecho
const TAB_H = 58;
const BANNER_PAD = 120; // alto aprox. de banner anchored adaptive
const padBottom = TAB_H + 6 + BANNER_PAD;

// === Helpers numéricos con fallback ===
const num = (v) => (v == null || v === '' ? 0 : parseInt(v, 10) || 0);

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

export default function Positions({ navigation }) {
  const [standings, setStandings] = useState([]);
  const [standingsCum, setStandingsCum] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCum, setShowCum] = useState(true); // true = Acumulada
  const [showTeamSearch, setShowTeamSearch] = useState(false);

  // 👉 NUEVO: contador para forzar remount del footer al cerrar el modal
  const [footerVersion, setFooterVersion] = useState(0);

  const insets = useSafeAreaInsets();
  const safeBottom = Math.max(insets?.bottom || 0, 0);

  const { theme } = useTheme();
  const colors = theme.colors;

  // Analytics: screen_view
  useEffect(() => {
    (async () => {
      try {
        await analytics().logScreenView({
          screen_name: 'Positions',
          screen_class: 'Positions',
        });
      } catch {}
    })();
  }, []);

  useEffect(() => {
    fetch(`${API_CUSTOM_DIGITAL}/positions`)
      .then((r) => r.json())
      .then((result) => {
        const teams = result?.posiciones?.equipo || [];
        const cum = [...teams];

        // Ordenar acumulada por puntos y dif (usando helpers con fallback)
        cum.sort((rowA, rowB) => {
          const p1 = computePTS(rowA);
          const p2 = computePTS(rowB);
          if (p1 !== p2) return p2 - p1;
          const dg1 = A(rowA, 'difgol');
          const dg2 = A(rowB, 'difgol');
          return dg2 - dg1;
        });

        setStandings(teams);
        setStandingsCum(cum);
      })
      .catch((err) => console.warn('Error posiciones:', err))
      .finally(() => setLoading(false));
  }, []);

  const data = showCum ? standingsCum : standings;
  const total = data.length;

  // 👉 NUEVO: cerrar modal + refrescar footer
  const handleCloseSearch = () => {
    setShowTeamSearch(false);
    setFooterVersion((v) => v + 1);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.screenBg,
        position: 'relative',
      }}
    >
      <Header
        title="Tabla de Posiciones"
        navigation={navigation}
        showSearch
        onSearchPress={() => setShowTeamSearch(true)}
      />

      {loading ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : (
        <View style={{ flex: 1, minHeight: 0 }}>
          {/* Selector (fuera del scroll) */}
          <View
            style={[
              styles.selectorWrap,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder,
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.selectorBtn,
                showCum && { backgroundColor: colors.accent },
              ]}
              onPress={async () => {
                setShowCum(true);
                try {
                  await analytics().logEvent('positions_tab', {
                    table: 'Acumulada',
                  });
                } catch {}
              }}
            >
              <Text
                style={[
                  styles.selectorText,
                  { color: showCum ? '#fff' : colors.text },
                ]}
              >
                Acumulada
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.selectorBtn,
                !showCum && { backgroundColor: colors.accent },
              ]}
              onPress={async () => {
                setShowCum(false);
                try {
                  await analytics().logEvent('positions_tab', {
                    table: 'Apertura',
                  });
                } catch {}
              }}
            >
              <Text
                style={[
                  styles.selectorText,
                  { color: !showCum ? '#fff' : colors.text },
                ]}
              >
                Apertura
              </Text>
            </TouchableOpacity>
          </View>

          {/* Lista: cabecera sticky + filas scrolleables */}
          <FlatList
            style={{ flex: 1 }}
            data={data}
            keyExtractor={(item, index) =>
              String(item?.id?.[0] ?? index)
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: padBottom }}
            scrollIndicatorInsets={{ bottom: padBottom }}
            keyboardShouldPersistTaps="handled"
            stickyHeaderIndices={[0]}
            ListHeaderComponent={
              // CABECERA DE TABLA (STICKY)
              <View
                style={{
                  backgroundColor: colors.cardBg,
                }}
              >
                <View
                  style={[
                    styles.tableHeader,
                    { backgroundColor: colors.cardBg },
                  ]}
                >
                  <View
                    style={[styles.thCol, { width: COL.RANK }]}
                  >
                    <Text
                      style={[
                        styles.thText,
                        { color: colors.text },
                      ]}
                    >
                      #
                    </Text>
                  </View>
                  <View
                    style={{
                      flex: 1,
                      paddingRight: TEAM_GUTTER,
                    }}
                  >
                    <Text
                      style={[
                        styles.thTextLeft,
                        { color: colors.text },
                      ]}
                    >
                      Equipo
                    </Text>
                  </View>

                  {showCum ? (
                    <View
                      style={{
                        width: CUM_W,
                        flexDirection: 'row',
                        marginRight: RIGHT_INNER_PAD,
                      }}
                    >
                      <View
                        style={[
                          styles.thCol,
                          { width: COL.PTS },
                        ]}
                      >
                        <Text
                          style={[
                            styles.thText,
                            { color: colors.text },
                          ]}
                        >
                          Pts
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.thCol,
                          { width: COL.NUM },
                        ]}
                      >
                        <Text
                          style={[
                            styles.thText,
                            { color: colors.text },
                          ]}
                        >
                          J
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.thCol,
                          { width: COL.DIF },
                        ]}
                      >
                        <Text
                          style={[
                            styles.thText,
                            { color: colors.text },
                          ]}
                        >
                          Dif
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <View
                      style={{
                        width: RIGHT_W,
                        flexDirection: 'row',
                        marginRight: RIGHT_INNER_PAD,
                      }}
                    >
                      <View
                        style={[
                          styles.thCol,
                          { width: COL.PTS },
                        ]}
                      >
                        <Text
                          style={[
                            styles.thText,
                            { color: colors.text },
                          ]}
                        >
                          Pts
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.thCol,
                          { width: COL.NUM },
                        ]}
                      >
                        <Text
                          style={[
                            styles.thText,
                            { color: colors.text },
                          ]}
                        >
                          J
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.thCol,
                          { width: COL.NUM },
                        ]}
                      >
                        <Text
                          style={[
                            styles.thText,
                            { color: colors.text },
                          ]}
                        >
                          G
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.thCol,
                          { width: COL.NUM },
                        ]}
                      >
                        <Text
                          style={[
                            styles.thText,
                            { color: colors.text },
                          ]}
                        >
                          E
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.thCol,
                          { width: COL.NUM },
                        ]}
                      >
                        <Text
                          style={[
                            styles.thText,
                            { color: colors.text },
                          ]}
                        >
                          P
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.thCol,
                          { width: COL.DIF },
                        ]}
                      >
                        <Text
                          style={[
                            styles.thText,
                            { color: colors.text },
                          ]}
                        >
                          Dif
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.cardBorder,
                    width,
                  }}
                />
              </View>
            }
            renderItem={({ item, index }) => {
              const teamId = item?.id?.[0]
                ? String(item.id[0])
                : null;
              const name = changeName(
                (item?.nombre?.[0] || '').trim()
              );

              const PTS = computePTS(item);
              const J = A(item, 'jugados');
              const G = A(item, 'ganados');
              const E = A(item, 'empatados');
              const P = A(item, 'perdidos');
              const DIF = A(item, 'difgol');

              const rank = index + 1;
              const qual = rank <= 8;
              const bottom = rank >= total - 1;

              const circleStyle = bottom
                ? [styles.rankCircle, styles.rankCircleDanger]
                : qual
                ? [styles.rankCircle, styles.rankCircleQual]
                : [
                    styles.rankCircle,
                    {
                      backgroundColor: colors.cardBg,
                      borderColor: colors.cardBorder,
                    },
                  ];

              const circleTextStyle = bottom
                ? [styles.rankText, styles.rankTextDanger]
                : qual
                ? [styles.rankText, styles.rankTextQual]
                : [
                    styles.rankText,
                    { color: colors.text },
                  ];

              const rowDangerBg =
                theme.mode === 'dark'
                  ? 'rgba(220,38,38,0.1)'
                  : '#FEF2F2';

              return (
                <View>
                  <View
                    style={[
                      styles.teamRow,
                      {
                        backgroundColor: colors.cardBg,
                      },
                      bottom && {
                        backgroundColor: rowDangerBg,
                      },
                    ]}
                  >
                    {/* Posición */}
                    <View style={{ width: COL.RANK }}>
                      <View style={circleStyle}>
                        <Text style={circleTextStyle}>
                          {rank}
                        </Text>
                      </View>
                    </View>

                    {/* Logo + Nombre — TOCABLE */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={async () => {
                        const idNum = Number(teamId);
                        if (!Number.isFinite(idNum)) return;
                        try {
                          await analytics().logEvent(
                            'open_team_from_positions',
                            {
                              team_id: String(teamId || ''),
                              team_name: String(name || ''),
                              rank: Number(rank),
                              pts: Number(PTS),
                              table: showCum
                                ? 'Acumulada'
                                : 'Apertura',
                            }
                          );
                        } catch {}
                        navigation?.push?.(
                          'TeamScreen',
                          {
                            teamId: idNum,
                            scope: 'guatemala',
                            tab: 'Resumen',
                            teamName: name,
                          }
                        );
                      }}
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingRight: TEAM_GUTTER,
                      }}
                    >
                      <LogoImg
                        teamId={teamId}
                        size={COL.ICON}
                        style={{ marginRight: COL.GAP }}
                      />
                      <Text
                        style={[
                          styles.tdTeamName,
                          { color: colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>

                    {/* Stats */}
                    {showCum ? (
                      <View
                        style={{
                          width: CUM_W,
                          flexDirection: 'row',
                          marginRight: RIGHT_INNER_PAD,
                        }}
                      >
                        <Text
                          style={[
                            styles.colNum,
                            styles.colPts,
                            {
                              width: COL.PTS,
                              color: colors.text,
                            },
                          ]}
                        >
                          {PTS}
                        </Text>
                        <Text
                          style={[
                            styles.colNum,
                            {
                              width: COL.NUM,
                              color: colors.text,
                            },
                          ]}
                        >
                          {J}
                        </Text>
                        <Text
                          style={[
                            styles.colNum,
                            {
                              width: COL.DIF,
                              color: colors.text,
                            },
                          ]}
                        >
                          {DIF}
                        </Text>
                      </View>
                    ) : (
                      <View
                        style={{
                          width: RIGHT_W,
                          flexDirection: 'row',
                          marginRight: RIGHT_INNER_PAD,
                        }}
                      >
                        <Text
                          style={[
                            styles.colNum,
                            styles.colPts,
                            {
                              width: COL.PTS,
                              color: colors.text,
                            },
                          ]}
                        >
                          {PTS}
                        </Text>
                        <Text
                          style={[
                            styles.colNum,
                            {
                              width: COL.NUM,
                              color: colors.text,
                            },
                          ]}
                        >
                          {J}
                        </Text>
                        <Text
                          style={[
                            styles.colNum,
                            {
                              width: COL.NUM,
                              color: colors.text,
                            },
                          ]}
                        >
                          {G}
                        </Text>
                        <Text
                          style={[
                            styles.colNum,
                            {
                              width: COL.NUM,
                              color: colors.text,
                            },
                          ]}
                        >
                          {E}
                        </Text>
                        <Text
                          style={[
                            styles.colNum,
                            {
                              width: COL.NUM,
                              color: colors.text,
                            },
                          ]}
                        >
                          {P}
                        </Text>
                        <Text
                          style={[
                            styles.colNum,
                            {
                              width: COL.DIF,
                              color: colors.text,
                            },
                          ]}
                        >
                          {DIF}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={{
                      height: 1,
                      backgroundColor: colors.cardBorder,
                      width,
                    }}
                  />
                </View>
              );
            }}
          />
        </View>
      )}

      <TeamSearchModal
        visible={showTeamSearch}
        onClose={handleCloseSearch}  // 👉 aquí usamos el nuevo handler
        onSelect={async (team) => {
          try {
            await analytics().logEvent('open_team_from_search', {
              team_id: String(team?.id ?? ''),
              team_name: String(team?.name ?? ''),
              scope: String(team?.scope ?? 'guatemala'),
            });
          } catch {}
          navigation.navigate('TeamScreen', {
            teamId: team.id,
            scope: team.scope,
            teamName: team.name,
          });

          // 👉 aseguramos que al seleccionar también se cierre correcto
          handleCloseSearch();
        }}
      />

      {/* Footer fijo con Banner y Tabs (overlay) */}
      <View
        key={footerVersion}   // 👉 remount cuando cambiamos footerVersion
        style={[
          styles.footerFixed,
          { height: TAB_H + safeBottom },
        ]}
      >
        {/* Banner por encima de los tabs */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: TAB_H + safeBottom,
            zIndex: 20,
            elevation: 20,
          }}
        >
          <AdFooter />
        </View>

        {/* Tabs pegados abajo */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: TAB_H + safeBottom,
            zIndex: 10,
            elevation: 10,
          }}
        >
          <FooterTabs
            navigation={navigation}
            routeName="Positions"
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Selector estilo Alineaciones (pill centrado)
  selectorWrap: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginVertical: 5,
    backgroundColor: '#fff', // se sobreescribe con theme
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0f1235', // se sobreescribe
    overflow: 'hidden',
  },
  selectorBtn: {
    paddingVertical: 4,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent', // activo se maneja en runtime
  },
  selectorText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 0,
    backgroundColor: '#fff', // se sobreescribe
  },
  thCol: { alignItems: 'center', justifyContent: 'center' },
  thText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0b1f3b', // se sobreescribe
  },
  thTextLeft: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0b1f3b', // se sobreescribe
  },

  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff', // se sobreescribe
  },
  tdTeamName: {
    color: '#111827', // se sobreescribe
    fontSize: 13,
    fontWeight: '700',
  },

  rankCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rankCircleDefault: {
    backgroundColor: '#fff',
    borderColor: '#D1D5DB',
  },
  rankCircleQual: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
  },
  rankCircleDanger: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
  },
  rankText: { fontSize: 13, fontWeight: '800' },
  rankTextDefault: { color: '#111827' },
  rankTextQual: { color: '#fff' },
  rankTextDanger: { color: '#fff' },

  colNum: {
    fontSize: 13,
    color: '#111827', // se sobreescribe
    textAlign: 'center',
    fontWeight: '500',
    minWidth: 24,
    ...(Platform.OS === 'ios'
      ? { fontVariant: ['tabular-nums'] }
      : null),
  },
  colPts: { fontWeight: '900' },

  teamRowDanger: {
    backgroundColor: '#FEF2F2',
  },

  footerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
});
