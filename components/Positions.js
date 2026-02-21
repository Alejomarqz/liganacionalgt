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
import { BRAND } from '../utils/theme';

import { API_CUSTOM_DIGITAL } from '@env';

const { width } = Dimensions.get('window');

const COL = {
  RANK: 32,
  PTS:  40,
  NUM:  30,
  DIF:  38,
  ICON: 26,
  GAP:  6,
};
const RIGHT_W    = COL.PTS + 4 * COL.NUM + COL.DIF;
const CUM_W      = COL.PTS + COL.NUM + COL.DIF;
const TEAM_GUTTER     = 20;
const RIGHT_INNER_PAD = -10;
const TAB_H      = 58;
const BANNER_PAD = 120;
const padBottom  = TAB_H + 6 + BANNER_PAD;

/* ─── helpers ─────────────────────────────── */
const num  = (v) => (v == null || v === '' ? 0 : parseInt(v, 10) || 0);
const pick = (row, keys = []) => {
  for (const k of keys) {
    const v = row?.[k]?.[0];
    if (v != null && v !== '') return num(v);
  }
  return 0;
};
const A          = (row, base) => pick(row, [`${base}actual`, base]);
const computePTS = (row) => {
  const pv = pick(row, ['puntosactual', 'puntos']);
  if (pv) return pv;
  return A(row, 'ganados') * 3 + A(row, 'empatados');
};

/* ─── COMPONENT ───────────────────────────── */
export default function Positions({ navigation }) {
  const [standings,    setStandings]    = useState([]);
  const [standingsCum, setStandingsCum] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showCum,      setShowCum]      = useState(true);
  const [showTeamSearch, setShowTeamSearch] = useState(false);
  const [footerVersion,  setFooterVersion]  = useState(0);

  const insets    = useSafeAreaInsets();
  const safeBottom = Math.max(insets?.bottom || 0, 0);
  const { theme } = useTheme();
  const colors    = theme.colors;
  const isDark    = theme.mode === 'dark';

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
        const cum   = [...teams].sort((a, b) => {
          const diff = computePTS(b) - computePTS(a);
          return diff !== 0 ? diff : A(b, 'difgol') - A(a, 'difgol');
        });
        setStandings(teams);
        setStandingsCum(cum);
      })
      .catch((err) => console.warn('Error posiciones:', err))
      .finally(() => setLoading(false));
  }, []);

  const data  = showCum ? standingsCum : standings;
  const total = data.length;

  const handleCloseSearch = () => {
    setShowTeamSearch(false);
    setFooterVersion((v) => v + 1);
  };

  /* ── Cabecera sticky de la tabla ── */
  const TableHeader = (
    <View style={{ backgroundColor: colors.cardBg }}>
      {/* Línea decorativa azul arriba */}
      <View style={[styles.tableTopLine, { backgroundColor: BRAND.primary }]} />

      <View style={[styles.tableHeader, { backgroundColor: colors.cardBg }]}>
        {/* # */}
        <View style={{ width: COL.RANK }}>
          <Text style={[styles.thText, { color: colors.textMuted }]}>#</Text>
        </View>

        {/* Equipo */}
        <View style={{ flex: 1, paddingRight: TEAM_GUTTER }}>
          <Text style={[styles.thTextLeft, { color: colors.textMuted }]}>
            Equipo
          </Text>
        </View>

        {/* Stats */}
        {showCum ? (
          <View style={{ width: CUM_W, flexDirection: 'row', marginRight: RIGHT_INNER_PAD }}>
            {['Pts', 'J', 'Dif'].map((h, i) => (
              <View key={h} style={{ width: [COL.PTS, COL.NUM, COL.DIF][i], alignItems: 'center' }}>
                <Text style={[styles.thText, { color: colors.textMuted }, h === 'Pts' && styles.thPts]}>
                  {h}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ width: RIGHT_W, flexDirection: 'row', marginRight: RIGHT_INNER_PAD }}>
            {[['Pts', COL.PTS], ['J', COL.NUM], ['G', COL.NUM], ['E', COL.NUM], ['P', COL.NUM], ['Dif', COL.DIF]].map(([h, w]) => (
              <View key={h} style={{ width: w, alignItems: 'center' }}>
                <Text style={[styles.thText, { color: colors.textMuted }, h === 'Pts' && styles.thPts]}>
                  {h}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Divisor */}
      <View style={{ height: 1, backgroundColor: colors.cardBorder, width }} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.screenBg, position: 'relative' }}>

      <Header
        title="Tabla de Posiciones"
        navigation={navigation}
        showSearch
        onSearchPress={() => setShowTeamSearch(true)}
      />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={BRAND.primary} />
        </View>
      ) : (
        <View style={{ flex: 1, minHeight: 0 }}>

          {/* ── Selector Acumulada / Apertura ── */}
          <View style={[styles.selectorWrap, { backgroundColor: colors.cardBg, borderColor: colors.cardBorder }]}>
            {[
              { label: 'Acumulada', val: true  },
              { label: 'Apertura',  val: false },
            ].map(({ label, val }) => {
              const active = showCum === val;
              return (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.selectorBtn,
                    active && { backgroundColor: BRAND.primary },
                  ]}
                  onPress={async () => {
                    setShowCum(val);
                    try {
                      await analytics().logEvent('positions_tab', { table: label });
                    } catch {}
                  }}
                >
                  <Text style={[
                    styles.selectorText,
                    { color: active ? '#fff' : colors.textMuted },
                    active && styles.selectorTextActive,
                  ]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Lista ── */}
          <FlatList
            style={{ flex: 1 }}
            data={data}
            keyExtractor={(item, index) => String(item?.id?.[0] ?? index)}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: padBottom }}
            scrollIndicatorInsets={{ bottom: padBottom }}
            keyboardShouldPersistTaps="handled"
            stickyHeaderIndices={[0]}
            ListHeaderComponent={TableHeader}
            renderItem={({ item, index }) => {
              const teamId = item?.id?.[0] ? String(item.id[0]) : null;
              const name   = changeName((item?.nombre?.[0] || '').trim());

              const PTS = computePTS(item);
              const J   = A(item, 'jugados');
              const G   = A(item, 'ganados');
              const E   = A(item, 'empatados');
              const P   = A(item, 'perdidos');
              const DIF = A(item, 'difgol');

              const rank    = index + 1;
              const qual    = rank <= 8;
              const bottom  = rank >= total - 1;

              // Color de la burbuja de posición
              const bubbleBg = bottom
                ? BRAND.red
                : qual
                ? BRAND.accent
                : isDark ? '#2A2D3E' : '#E4E6F0';

              const bubbleTextColor = (qual || bottom)
                ? '#fff'
                : colors.textMuted;

              // Fondo de fila especial
              const rowBg = bottom
                ? isDark ? 'rgba(232,48,74,0.06)' : 'rgba(232,48,74,0.04)'
                : qual
                ? isDark ? 'rgba(0,196,140,0.04)' : 'rgba(0,196,140,0.03)'
                : colors.cardBg;

              return (
                <View>
                  <View style={[styles.teamRow, { backgroundColor: rowBg }]}>

                    {/* Indicador lateral de color */}
                    <View style={[
                      styles.rowIndicator,
                      { backgroundColor: bottom ? BRAND.red : qual ? BRAND.accent : 'transparent' },
                    ]} />

                    {/* Posición */}
                    <View style={{ width: COL.RANK, alignItems: 'center' }}>
                      <View style={[styles.rankBubble, { backgroundColor: bubbleBg }]}>
                        <Text style={[styles.rankText, { color: bubbleTextColor }]}>
                          {rank}
                        </Text>
                      </View>
                    </View>

                    {/* Logo + Nombre */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={async () => {
                        const idNum = Number(teamId);
                        if (!Number.isFinite(idNum)) return;
                        try {
                          await analytics().logEvent('open_team_from_positions', {
                            team_id:   String(teamId || ''),
                            team_name: String(name || ''),
                            rank:      Number(rank),
                            pts:       Number(PTS),
                            table:     showCum ? 'Acumulada' : 'Apertura',
                          });
                        } catch {}
                        navigation?.push?.('TeamScreen', {
                          teamId:   idNum,
                          scope:    'guatemala',
                          tab:      'Resumen',
                          teamName: name,
                        });
                      }}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingRight: TEAM_GUTTER }}
                    >
                      <LogoImg teamId={teamId} size={COL.ICON} style={{ marginRight: COL.GAP }} />
                      <Text
                        style={[styles.tdTeamName, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {name}
                      </Text>
                    </TouchableOpacity>

                    {/* Stats */}
                    {showCum ? (
                      <View style={{ width: CUM_W, flexDirection: 'row', marginRight: RIGHT_INNER_PAD }}>
                        <Text style={[styles.colPts, { width: COL.PTS, color: qual ? BRAND.primary : colors.text }]}>
                          {PTS}
                        </Text>
                        <Text style={[styles.colNum, { width: COL.NUM, color: colors.textMuted }]}>{J}</Text>
                        <Text style={[styles.colNum, { width: COL.DIF, color: DIF >= 0 ? colors.text : BRAND.red }]}>
                          {DIF > 0 ? `+${DIF}` : DIF}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ width: RIGHT_W, flexDirection: 'row', marginRight: RIGHT_INNER_PAD }}>
                        <Text style={[styles.colPts, { width: COL.PTS, color: qual ? BRAND.primary : colors.text }]}>
                          {PTS}
                        </Text>
                        <Text style={[styles.colNum, { width: COL.NUM, color: colors.textMuted }]}>{J}</Text>
                        <Text style={[styles.colNum, { width: COL.NUM, color: colors.textMuted }]}>{G}</Text>
                        <Text style={[styles.colNum, { width: COL.NUM, color: colors.textMuted }]}>{E}</Text>
                        <Text style={[styles.colNum, { width: COL.NUM, color: colors.textMuted }]}>{P}</Text>
                        <Text style={[styles.colNum, { width: COL.DIF, color: DIF >= 0 ? colors.text : BRAND.red }]}>
                          {DIF > 0 ? `+${DIF}` : DIF}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Divisor */}
                  <View style={{ height: 1, backgroundColor: colors.cardBorder, width }} />
                </View>
              );
            }}
          />

          {/* ── Leyenda ── */}
          <View style={[styles.legend, { backgroundColor: colors.cardBg, borderTopColor: colors.cardBorder }]}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BRAND.accent }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Liguilla (Top 8)</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: BRAND.red }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>Descenso</Text>
            </View>
          </View>
        </View>
      )}

      <TeamSearchModal
        visible={showTeamSearch}
        onClose={handleCloseSearch}
        onSelect={async (team) => {
          try {
            await analytics().logEvent('open_team_from_search', {
              team_id:   String(team?.id ?? ''),
              team_name: String(team?.name ?? ''),
              scope:     String(team?.scope ?? 'guatemala'),
            });
          } catch {}
          navigation.navigate('TeamScreen', {
            teamId:   team.id,
            scope:    team.scope,
            teamName: team.name,
          });
          handleCloseSearch();
        }}
      />

      {/* Footer fijo */}
      <View key={footerVersion} style={[styles.footerFixed, { height: TAB_H + safeBottom }]}>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: TAB_H + safeBottom, zIndex: 20, elevation: 20 }}>
          <AdFooter />
        </View>
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: TAB_H + safeBottom, zIndex: 10, elevation: 10 }}>
          <FooterTabs navigation={navigation} routeName="Positions" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Selector ──
  selectorWrap: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginVertical: 10,
    borderRadius: 50,
    borderWidth: 1,
    overflow: 'hidden',
  },
  selectorBtn: {
    paddingVertical: 6,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
  },
  selectorTextActive: {
    fontFamily: 'Poppins-Bold',
  },

  // ── Tabla cabecera ──
  tableTopLine: {
    height: 3,
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  thText: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  thTextLeft: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  thPts: {
    fontFamily: 'Poppins-Bold',
    color: BRAND.primary,
  },

  // ── Filas ──
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 9,
    position: 'relative',
  },

  // Indicador lateral de color (liguilla / descenso)
  rowIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },

  // Burbuja de posición
  rankBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontFamily: 'Poppins-Bold',
    fontSize: 11,
  },

  tdTeamName: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    flex: 1,
  },

  // Estadísticas
  colNum: {
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    textAlign: 'center',
    ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : null),
  },
  colPts: {
    fontFamily: 'Poppins-ExtraBold',
    fontSize: 14,
    textAlign: 'center',
    ...(Platform.OS === 'ios' ? { fontVariant: ['tabular-nums'] } : null),
  },

  // ── Leyenda ──
  legend: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: 'Poppins-Medium',
    fontSize: 11,
  },

  // ── Footer ──
  footerFixed: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
});