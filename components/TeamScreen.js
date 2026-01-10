// TeamScreen.js — FIX: AdFooter sobre zona segura + padding en tabs
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  RefreshControl,
  Platform,
} from 'react-native';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './Header';
import AdFooter from '../ads/AdFooter';
import { showInterstitialIfReady } from '../ads/AdManager';
import LogoImg from './LogoImg';
import TeamSquad from './TeamSquad';
import { changeName } from '../utils/changeName';
import PositionsBlock from './PositionsBlock';
import TeamMatches from './TeamMatches';
import TeamSummary from './TeamSummary';
import TeamStats from './TeamStats';
import TeamSearchModal from './TeamSearchModal';
import { followTeam, unfollowTeam, isFollowingTeam } from '../services/notifications';
import { API_CUSTOM_DIGITAL, API_WEB_DEPORT_URL } from '@env';
import { useTheme } from '../utils/ThemeContext';
import NotificationPrompt from './NotificationPrompt';
import { getFollowState, toggleFollowTeam as toggleFollowTeamFS, listenFollowersCount } from '../services/firestore';




const BRAND = '#0f1235';
const RED   = '#d32f2f';
const { width: SCREEN_W } = Dimensions.get('window');
const CC_STANDINGS_ENDPOINT = 'https://futbolchapin.net/edit/concacaf-standings.php';

// ⚠️ Altura del banner + “lift” sobre barra de gestos
const BANNER_H = 60; // 320x50
const FOOTER_LIFT = Platform.OS === 'android' ? 48 : 10; // separa el ad de la zona de gestos

const isHex = (v) => typeof v === 'string' && /^#([0-9a-f]{6})$/i.test(v);
const hx = (n) => n.toString(16).padStart(2,'0');
const lighten = (h, a=0.22) => {
  if (!isHex(h)) return h;
  const r=parseInt(h.slice(1,3),16), g=parseInt(h.slice(3,5),16), b=parseInt(h.slice(5,7),16);
  const mix = (c)=>Math.min(255, Math.round(c+(255-c)*a));
  return `#${hx(mix(r))}${hx(mix(g))}${hx(mix(b))}`;
};
const darken = (h, a=0.12) => {
  if (!isHex(h)) return h;
  const r=parseInt(h.slice(1,3),16), g=parseInt(h.slice(3,5),16), b=parseInt(h.slice(5,7),16);
  const mix = (c)=>Math.max(0, Math.round(c*(1-a)));
  return `#${hx(mix(r))}${hx(mix(g))}${hx(mix(b))}`;
};
// cambiar valor de seguidores a 1.2k
function formatCount(n) {
  const num = Number(n || 0);

  if (num < 1000) return String(num);

  const units = [
    { v: 1e9, s: 'B' },
    { v: 1e6, s: 'M' },
    { v: 1e3, s: 'K' },
  ];

  for (const u of units) {
    if (num >= u.v) {
      const val = num / u.v;

      // 1 decimal solo si es < 10 (1.2K, 9.9K) | si es >=10, sin decimal (12K, 120K)
      const digits = val < 10 ? 1 : 0;

      let out = val.toFixed(digits);

      // quita ".0"
      if (out.endsWith('.0')) out = out.slice(0, -2);

      return `${out}${u.s}`;
    }
  }

  return String(num);
}


// Tabs con auto-scroll
function Tabs({ tabs, value, onChange }) {
  const scrollRef = useRef(null);
  const metaRef = useRef({});

  const { theme } = useTheme();
  const UI = theme.colors;

  const centerIndex = (idx) => {
    const next = Math.min(idx + 1, tabs.length - 1);
    const meta = metaRef.current[next] || metaRef.current[idx];
    if (!meta || !scrollRef.current?.scrollTo) return;
    const targetX = Math.max(0, meta.x - (SCREEN_W/2 - meta.w/2));
    scrollRef.current.scrollTo({ x: targetX, y: 0, animated: true });
  };

  return (
    <View
    style={[
      styles.tabs,
      {
        backgroundColor: UI.tabBarBg,
        borderBottomColor: UI.tabBarBorder,
      },
    ]}
  >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsContent}
        onContentSizeChange={() => {
          const activeIdx = Math.max(0, tabs.indexOf(value));
          centerIndex(activeIdx);
        }}
      >
        {tabs.map((t, i) => {
          const active = t === value;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => {
                onChange(t);
                requestAnimationFrame(() => centerIndex(i));
              }}
              activeOpacity={0.8}
              onLayout={(e) => {
                const { x, width } = e.nativeEvent.layout;
                metaRef.current[i] = { x, w: width };
              }}
              style={[
    styles.tabBtn,
    active && [
      styles.tabBtnActive,
      { borderBottomColor: UI.accent },   // color de la pestaña activa
    ],
  ]}
>
  <Text
    style={[
      styles.tabText,
      { color: UI.textMuted },
      active && [
        styles.tabTextOn,
        { color: UI.accent },             // texto activo
      ],
    ]}
  >
    {t}
  </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function TeamScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const UI = theme.colors;

  // 📢 INTERSTITIAL AL ENTRAR A TEAM (cuando la screen gana foco)
  useFocusEffect(
    useCallback(() => {
            // 📢 INTERSTITIAL AL SALIR DE TEAM (cuando se hace back / navigate away)
      const unsub = navigation.addListener('beforeRemove', () => {
        showInterstitialIfReady('exit_team');
      });

      return () => {
        unsub?.();
      };
    }, [navigation])
  );


  const teamParam = route?.params?.team || {};
  const scope = (route?.params?.scope || 'guatemala').toLowerCase();

  const teamId =
    teamParam?.id ??
    teamParam?.teamId ??
    route?.params?.teamId ??
    null;

  // ⚠️ Aquí nace el “Equipo”: fallback si no hay nombre válido
  const teamName = changeName(
    teamParam?.nombre?.[0] ||
    teamParam?.info?.name ||
    teamParam?.name ||
    teamParam?.nombre_corto ||
    route?.params?.team?.info?.name ||
    route?.params?.team?.name ||
    route?.params?.teamName ||
    'Equipo'
  );

  const [teamNameFix, setTeamNameFix] = useState(teamName);
  const scopeLabel =
    scope === 'guatemala' ? 'Guatemala'
    : scope === 'concacaf' ? 'Eliminatorias'
    : scope === 'nationsleague' ? 'Liga de Naciones'
    : '';

  const TABS = ['Resumen', 'Partidos', 'Clasificación', 'Plantilla', 'Estadísticas'];
  const [tab, setTab] = useState(TABS[0]);
  const [isFollowingTeam, setIsFollowingTeam] = useState(false);
  const [promptHandledThisVisit, setPromptHandledThisVisit] = useState(false);

  const [followersCount, setFollowersCount] = useState(0);
  const [followBusy, setFollowBusy] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);


  const [showTeamSearch, setShowTeamSearch] = useState(false);
  

  useEffect(() => {
  let unsub = null;
  let off = false;

  (async () => {
    try {
      if (!teamId) return;

      // 1) Estado real: ¿lo sigo?
      const following = await getFollowState(teamId);
      if (!off) setIsFollowingTeam(!!following);

      // 2) Contador en vivo
      unsub = listenFollowersCount(teamId, (n) => {
        if (!off) setFollowersCount(Number(n || 0));
      });
    } catch (e) {
      // si falla, no rompas la UI
    }
  })();

  return () => {
    off = true;
    try { unsub && unsub(); } catch {}
  };
}, [teamId]);


  const toggleFollowTeam = React.useCallback(async () => {
  if (!teamId || followBusy) return;

  setFollowBusy(true);
  try {
    // 1) Toggle en Firestore (contador + estado real)
    const res = await toggleFollowTeamFS(teamId); // { following, followersCount }

    // 2) Actualiza UI
    setIsFollowingTeam(!!res.following);
    if (typeof res.followersCount === 'number') {
      setFollowersCount(res.followersCount);
    }

    // El usuario ya tomó una decisión en esta visita
    setPromptHandledThisVisit(true);

    // 3) 🔔 Topics + storage local usando TU sistema (notifications.js)
    const id = String(teamId);
    if (res.following) {
      await followTeam(id);     // subscribe team_{id} + guarda AsyncStorage
    } else {
      await unfollowTeam(id);   // unsubscribe team_{id} + borra AsyncStorage
    }
  } catch (e) {
    // silencioso por ahora (luego metemos toast bonito)
  } finally {
    setFollowBusy(false);
  }
}, [teamId, followBusy, toggleFollowTeamFS]);



  const [partidosSubTab, setPartidosSubTab] = React.useState('future');
  const [refreshing, setRefreshing] = useState(false);
  const [reloadKey, setReloadKey]   = useState(0);

  // === Posiciones ===
  const [loadingPos, setLoadingPos] = useState(false);
  const [errPos, setErrPos] = useState(null);
  const [standings, setStandings] = useState([]);
  const [standingsCum, setStandingsCum] = useState([]);
  const [ccGroupName, setCcGroupName] = useState(null);
  const [phase, setPhase] = useState('final');
  const [phases, setPhases] = useState([]);
  const [phaseType, setPhaseType] = useState('groups');

  const ccRowsToDF = (rows = []) => rows.map((r) => ({
    id:                [String(r.teamId)],
    nombre:            [String(r.team)],
    puntosactual:      [String(r.pts)],
    jugadosactual:     [String(r.pj)],
    ganadosactual:     [String(r.pg)],
    empatadosactual:   [String(r.pe)],
    perdidosactual:    [String(r.pp)],
    golesfavoractual:  [String(r.gf)],
    golescontraactual: [String(r.gc)],
    difgolactual:      [String(r.df)],
  }));

  const fetchPositions = useCallback(async (silent = false) => {
    const num = (v) => (v == null || v === '') ? 0 : parseInt(v, 10) || 0;
    try {
      if (!silent) setLoadingPos(true);
      setErrPos(null);

      const scopeLower = (scope || 'guatemala').toLowerCase();

      if (scopeLower !== 'guatemala') {
        const url = `${CC_STANDINGS_ENDPOINT}?phase=${encodeURIComponent(phase)}&t=${Date.now()}`;
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();

        const short = (s='') => /final/i.test(s) ? 'Ronda Final'
                          : /ronda\s*1/i.test(s) || /mar/i.test(s) ? 'Ronda 1'
                          : /fase/i.test(s) || /jun/i.test(s) ? 'Ronda 2'
                          : s;

        setPhases(Array.isArray(j?.phases) ? j.phases.map(p => ({ id: p.id, label: short(p.label) })) : []);
        setPhaseType(j?.phaseType || 'groups');

        if (j?.phaseType === 'knockout') {
          setStandings([]); setStandingsCum([]); setCcGroupName(null);
          return;
        }

        const groups = j?.groups || {};
        const teamGroup = j?.teamGroup || {};
        const idStr = String(teamId || '');
        let groupName = teamGroup[idStr] || Object.keys(groups)[0] || null;
        const rows = groupName ? (groups[groupName] || []) : [];
        const dfRows = ccRowsToDF(rows);

        const cum = [...dfRows].sort((A, B) => {
          const p1 = num(A?.puntosactual?.[0]), p2 = num(B?.puntosactual?.[0]);
          if (p1 !== p2) return p2 - p1;
          const dg1 = num(A?.difgolactual?.[0]), dg2 = num(B?.difgolactual?.[0]);
          if (dg1 !== dg2) return dg2 - dg1;
          const gf1 = num(A?.golesfavoractual?.[0]), gf2 = num(B?.golesfavoractual?.[0]);
          return gf2 - gf1;
        });

        setStandings(dfRows);
        setStandingsCum(cum);
        setCcGroupName(groupName);
        return;
      }

      const mainUrl = API_CUSTOM_DIGITAL ? `${API_CUSTOM_DIGITAL}/positions` : null;
      if (!mainUrl) throw new Error('No hay endpoint de posiciones definido');

      const res = await fetch(mainUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const equipos = json?.posiciones?.equipo || json?.equipos || json || [];

      const cum = [...equipos].sort((A, B) => {
        const p1 = num(A?.puntosactual?.[0]), p2 = num(B?.puntosactual?.[0]);
        if (p1 !== p2) return p2 - p1;
        const dg1 = num(A?.difgolactual?.[0]), dg2 = num(B?.difgolactual?.[0]);
        return dg2 - dg1;
      });

      setStandings(equipos);
      setStandingsCum(cum);
      setCcGroupName(null);
    } catch (e) {
      setErrPos(String(e));
    } finally {
      if (!silent) setLoadingPos(false);
    }
  }, [scope, teamId, phase]);

  useEffect(() => {
    if (tab !== 'Clasificación') return;
    fetchPositions(false);
  }, [tab, scope, teamId, phase, fetchPositions]);

  useEffect(() => {
    const sLower = (scope || 'guatemala').toLowerCase();
    if (sLower !== 'guatemala' && phase !== 'final') {
      setPhase('final');
      return;
    }
    fetchPositions(false);
  }, [teamId, scope]); // eslint-disable-line

  useEffect(() => {
    setTab('Resumen');
  }, [teamId, scope]);

  const onRefreshTab = useCallback(async () => {
    setRefreshing(true);
    try {
      if (tab === 'Clasificación') {
        await fetchPositions(true);
      } else {
        setReloadKey(Date.now());
        await new Promise(r => setTimeout(r, 300));
      }
    } finally {
      setRefreshing(false);
    }
  }, [tab, fetchPositions]);

  // Base del gradiente: usa el headerBg del theme si existe, si no el BRAND
const brandBase = UI.headerBg || BRAND;

// Ajustes distintos para claro / oscuro (un poco menos agresivo en oscuro)
const gradStart = lighten(brandBase, theme.name === 'dark' ? 0.12 : 0.22);
const gradEnd   = darken(brandBase, theme.name === 'dark' ? 0.10 : 0.12);


  const byTeamPattern = `${API_WEB_DEPORT_URL}/${scope}/events/byTeam/:teamId.json`;

  // === Alturas para evitar que el contenido quede oculto tras el banner ===
  const bottomBannerSpace = BANNER_H; // espacio para scrolls
  const liftedBottom = Math.max(insets.bottom, FOOTER_LIFT); // eleva el ad

  const showFollowButton =
  isFollowingTeam ||        // si ya sigue → mostrar “Siguiendo”
  !promptVisible;           // si NO hay prompt visible → puede mostrar botón

  return (
    <SafeAreaView
    style={[styles.container, { backgroundColor: UI.screenBg }]}
    edges={['bottom']}
  >
      <Header
        navigation={navigation} title="Equipo"
        showSearch
        showBell
        bellProps={{
          on: isFollowingTeam,
          onPress: toggleFollowTeam,
          size: 22,
        }}
        onSearchPress={() => setShowTeamSearch(true)}
      />

      <View
  style={[
    styles.teamHeader,
    {
      backgroundColor: UI.cardBg,   // 👈 mismo color que las cards
      borderBottomColor: UI.cardBorder,
    },
  ]}
>


        <View style={styles.left}>
          <LogoImg teamId={teamId} size={56} style={styles.logo} />
        </View>
        <View style={styles.center}>
          <Text
  style={[styles.teamName, { color: UI.headerText }]}
  numberOfLines={1}
>
  {teamNameFix}
</Text>

<Text
  style={[
    styles.sub,
    { color: UI.headerText, opacity: 0.85 }, // subtítulo un poco más suave
  ]}
  numberOfLines={1}
>
  {scopeLabel}
</Text>

        </View>
        <View style={styles.right}>
  <View
  style={[
    styles.followPill,
    { backgroundColor: UI.cardBg, borderColor: UI.cardBorder },
  ]}
>
  <Text style={[styles.followPillNum, { color: UI.text }]}>
    {formatCount(followersCount)}
  </Text>
  <Text style={[styles.followPillLbl, { color: UI.textMuted }]}>
    Seguidores
  </Text>
</View>


  {showFollowButton && (
    <TouchableOpacity
      onPress={toggleFollowTeam}
      activeOpacity={0.85}
      disabled={followBusy}
      style={[
        styles.followBtn,
        {
          backgroundColor: isFollowingTeam ? UI.cardBg : UI.accent,
          borderColor: UI.accent,
        },
      ]}
    >
      <Text
        style={[
          styles.followBtnText,
          { color: isFollowingTeam ? UI.accent : '#fff' },
        ]}
      >
        {followBusy ? '...' : (isFollowingTeam ? 'SIGUIENDO' : 'SEGUIR')}
      </Text>
    </TouchableOpacity>
  )}
</View>


      </View>

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      <View style={{ flex: 1, width: '100%' }}>
        {tab === 'Partidos' && (
          <TeamMatches
            teamId={teamId}
            scope={scope}
            navigation={navigation}
            initialTab={partidosSubTab}
            onTabChange={setPartidosSubTab}
          />
        )}

        {tab === 'Plantilla' && (
          <TeamSquad
            teamId={teamId}
            scope={scope}
            eventsByTeamUrlPattern={byTeamPattern}
            bottomPadding={bottomBannerSpace}  // ⬅️ evita que la lista choque con el banner
            navigation={navigation}
          />
        )}

        {(tab !== 'Partidos' && tab !== 'Plantilla') && (
          <ScrollView
  style={[styles.scroll, { backgroundColor: UI.screenBg }]}
  contentContainerStyle={[
    styles.scrollContent,
    { paddingBottom: tab === 'Clasificación' ? bottomBannerSpace : 16 },
  ]}
  scrollIndicatorInsets={{ bottom: bottomBannerSpace }}
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefreshTab}
      colors={['#e53935']}
      tintColor="#e53935"
      progressBackgroundColor={UI.cardBg}
    />
  }
>

            {tab === 'Resumen' && (
              <TeamSummary
                teamId={teamId}
                scope={scope}
                navigation={navigation}
                standings={standings}
                onOpenPartidos={() => {
                  setPartidosSubTab('past');
                  requestAnimationFrame(() => setTab('Partidos'));
                }}
              />
            )}

            {tab === 'Clasificación' && (
              <View style={[styles.fullBleed, { marginBottom: 0, backgroundColor: UI.cardBg }]}>
                {/* … (tu bloque de fases/estados/PositionsBlock se mantiene igual) */}
                {/* Estados de carga / error */}
                {loadingPos ? (
  <View style={{ padding: 16 }}>
    <Text style={{ textAlign: 'center', color: UI.textMuted }}>
      Cargando posiciones…
    </Text>
  </View>
) : errPos ? (
  <View style={{ padding: 16 }}>
    <Text style={{ textAlign: 'center', color: UI.accent }}>
      No se pudo cargar la clasificación.
    </Text>
  </View>
) : null}


                {(() => {
                  const scopeLower = (scope || 'guatemala').toLowerCase();
                  const qualifyTop =
                    scopeLower === 'guatemala' ? 8 : (phase === 'r2' ? 2 : 1);

                  if (scopeLower === 'guatemala') {
                    return !!standings?.length && (
                      <View style={{ paddingHorizontal: 10 }}>
                        <PositionsBlock
                          standings={standings}
                          standingsCum={standingsCum}
                          mode="apertura"
                          showHeader={true}
                          title={'Tabla de Posiciones'}
                          tournamentLabel={'Apertura'}
                          compact={false}
                          highlightTop={qualifyTop}
                          navigation={navigation}
                          scope={scope}
                        />
                      </View>
                    );
                  }

                  if (phaseType === 'knockout' || !standings?.length) {
  return (
    <View style={{ paddingHorizontal: 12, paddingVertical: 12 }}>
      <Text
        style={{
          fontSize: 14,
          fontWeight: '700',
          color: UI.text,
          marginBottom: 4,
        }}
      >
        Esta fase no tiene tabla de grupos
      </Text>
      <Text
        style={{
          fontSize: 13,
          color: UI.textMuted,
        }}
      >
        Revisa los resultados de la fase en la pestaña “Partidos”.
      </Text>
    </View>
  );
}


                  return (
                    <View style={{ paddingHorizontal: 10 }}>
                      {ccGroupName ? (
  <>
    <View
      style={{
        paddingHorizontal: 10,
        paddingTop: 4,
        paddingBottom: 4,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: UI.text,
        }}
      >
        {ccGroupName}
      </Text>
    </View>
    <View
      style={{
        height: 1,
        backgroundColor: UI.cardBorder,
        marginHorizontal: 8,
        marginBottom: 6,
        opacity: 0.9,
      }}
    />
  </>
) : null}


                      <PositionsBlock
                        standings={standings}
                        standingsCum={standingsCum}
                        mode="apertura"
                        showHeader={false}
                        title=""
                        tournamentLabel=""
                        compact={false}
                        highlightTop={qualifyTop}
                        navigation={navigation}
                        scope={scope}
                      />
                    </View>
                  );
                })()}
              </View>
            )}

            {tab === 'Estadísticas' && (
              <View key={`stats-${reloadKey}`} style={{ marginBottom: -16 }}>
                <TeamStats teamId={teamId} scope={scope} navigation={navigation} />
              </View>
            )}

            {tab !== 'Clasificación' && tab !== 'Estadísticas' && <View style={{ height: 16 }} />}
          </ScrollView>
        )}
      </View>

            <TeamSearchModal
        visible={showTeamSearch}
        onClose={() => setShowTeamSearch(false)}
        onSelect={(team) => navigation.navigate('TeamScreen', {
          teamId: team.id,
          scope: team.scope,
        })}
      />

      {/* 🔔 Overlay centrado para activar notificaciones del equipo */}
      <NotificationPrompt
        id={`team:${teamId}`}
        mode="team"
        teamId={teamId}
        enabled={isFollowingTeam}
        onActivate={async () => {
          if (!isFollowingTeam) await toggleFollowTeam();
        }}
        onVisibleChange={setPromptVisible}
        shouldShow={!promptHandledThisVisit}

      />



      <AdFooter />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f7f7' },

  teamHeader: {
  minHeight: 100,
  paddingHorizontal: 16,
  paddingVertical: 14,
  flexDirection: 'row',
  alignItems: 'center',
  borderBottomWidth: 1,
  borderBottomColor: 'rgba(0,0,0,0.06)', // se sobreescribe con UI.cardBorder
},
  left: { width: 64, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, paddingLeft: 8 },
  right: { width: 60, alignItems: 'flex-end', justifyContent: 'center' },
  logo: { borderRadius: 8 },
  teamName: { fontSize: 22, fontWeight: '700', color: '#ffffff' }, // se sobreescribe
sub: { marginTop: 2, fontSize: 12, color: 'rgba(255,255,255,0.85)' }, // se sobreescribe
  tabs: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  tabsContent: { paddingHorizontal: 6 },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: RED, paddingBottom: 7 },
  tabText: { fontSize: 14, color: '#444', fontWeight: '600' },
  tabTextOn: { color: RED, fontWeight: '800' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 10, paddingTop: 12, paddingBottom: 0 },

  fullBleed: {
    marginHorizontal: -20,
    backgroundColor: '#fff',
  },
  followCount: {
  fontSize: 14,
  fontWeight: '900',
  textAlign: 'right',
  marginBottom: 6,
},
followBtn: {
  paddingHorizontal: 6,
  paddingVertical: 2,
  borderRadius: 8,
  borderWidth: 2,
  minWidth: 72,
  alignItems: 'center',
  justifyContent: 'center',
},
followBtnText: {
  fontSize: 8,
  fontWeight: '700',
  letterSpacing: 0.4,
},

followPill: {
  minWidth: 78,
  paddingHorizontal: 6,
  paddingVertical: 6,
  borderRadius: 14,
  borderWidth: 1,
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8, // separa del botón
},
followPillNum: {
  fontSize: 14,
  fontWeight: '900',
  lineHeight: 16,
},
followPillLbl: {
  marginTop: 3,
  fontSize: 10,
  fontWeight: '800',
  lineHeight: 12,
  opacity: 0.9,
},


});
