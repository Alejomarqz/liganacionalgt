// src/screens/MyClubScreen.js
// "Mi club" v3: el hub del equipo favorito.
// - Sin favorito: selector a pantalla completa (escudos de la API + apodos).
// - Con favorito: perfil del club con portada a pantalla completa.
// Usa la MISMA clave que la versión anterior: nadie pierde su equipo elegido.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Star, Check, CaretLeft } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, TeamCrest, PressableScale, StadiumBackdrop, SkeletonCard, ErrorState } from '../ui';
import { api } from '../api/liga';
import { useQuery } from '../api/store';
import { normalizeTeam } from '../api/normalize';
import { clubNickname } from '../features/teams/clubMedia';
import { TeamProfileView } from './TeamProfileScreen';
import FooterTabs from '../../components/FooterTabs';

export const FAVORITE_TEAM_KEY = 'lngt_favorite_team_v1';

function ClubPicker({ current, onConfirm, onCancel, navigation }) {
  const showTabs = !onCancel; // primera vez: se puede salir con la barra inferior
  const [tabsH, setTabsH] = useState(0);
  const { colors } = useDesign();
  const insets = useSafeAreaInsets();
  const q = useQuery('teams-raw', api.teams, { staleTime: 6 * 3600 * 1000 });
  const teams = useMemo(() => (q.data?.teams || []).map((t) => ({ ...normalizeTeam(t), city: t.city })).sort((a, b) => a.name.localeCompare(b.name, 'es')), [q.data]);
  const [selected, setSelected] = useState(current?.id ?? null);
  const chosen = teams.find((t) => t.id === selected);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StadiumBackdrop height={insets.top + 210}>
        <View style={{ paddingTop: insets.top + 10, paddingHorizontal: 20 }}>
          {onCancel ? (
            <PressableScale onPress={onCancel} hitSlop={hitSlop} accessibilityLabel="Volver" style={{ width: 38, height: 38, justifyContent: 'center' }}>
              <CaretLeft size={22} color="#fff" weight="bold" />
            </PressableScale>
          ) : (
            <View style={{ height: 38 }} />
          )}
          <Txt variant="overline" color="rgba(255,255,255,0.75)" style={{ marginTop: 8 }}>
            Mi club
          </Txt>
          <Txt variant="h1" color="#fff" style={{ marginTop: 4 }}>
            ¿Cuál es tu equipo?
          </Txt>
          <Txt variant="body" color="rgba(255,255,255,0.75)" style={{ marginTop: 4 }}>
            Te mostramos sus partidos, noticias y alertas primero.
          </Txt>
        </View>
      </StadiumBackdrop>

      <View style={{ flex: 1, marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.bg, overflow: 'hidden' }}>
        {q.loading ? (
          <View style={{ padding: 16, gap: 10 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} height={68} />
            ))}
          </View>
        ) : q.error && !teams.length ? (
          <ErrorState message={q.error?.message} onRetry={q.refresh} />
        ) : (
          <FlatList
            data={teams}
            keyExtractor={(t) => String(t.id)}
            contentContainerStyle={{ padding: 16, paddingBottom: 120 + insets.bottom + tabsH, gap: 10 }}
            renderItem={({ item }) => {
              const on = item.id === selected;
              return (
                <PressableScale onPress={() => setSelected(item.id)} scaleTo={0.98} accessibilityState={{ selected: on }}>
                  <View style={[styles.item, { backgroundColor: colors.surface, borderColor: on ? colors.primaryStrong : colors.border }]}>
                    {on ? <View style={[styles.itemSlash, { backgroundColor: colors.primaryStrong }]} /> : null}
                    <TeamCrest team={item} size={40} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="h3">{item.name}</Txt>
                      <Txt variant="caption" tone="muted">
                        {[clubNickname(item), item.city].filter(Boolean).join(' · ')}
                      </Txt>
                    </View>
                    <View style={[styles.radio, { borderColor: on ? colors.primaryStrong : colors.borderStrong, backgroundColor: on ? colors.primaryStrong : 'transparent' }]}>
                      {on ? <Check size={14} color="#fff" weight="bold" /> : null}
                    </View>
                  </View>
                </PressableScale>
              );
            }}
          />
        )}
      </View>

      <View style={[styles.confirmBar, { bottom: showTabs ? tabsH : 0, paddingBottom: showTabs ? 12 : insets.bottom + 12, backgroundColor: colors.bgElevated, borderTopColor: colors.divider }]}>
        <PressableScale onPress={() => chosen && onConfirm(chosen)} disabled={!chosen} style={[styles.confirm, { backgroundColor: colors.primaryStrong }]}>
          <Star size={18} color="#fff" weight="fill" />
          <Txt variant="bodyStrong" color="#fff" style={{ fontFamily: 'Inter-Bold' }}>
            {chosen ? `Elegir ${chosen.name}` : 'Elige tu equipo'}
          </Txt>
        </PressableScale>
      </View>

      {showTabs ? (
        <View onLayout={(e) => setTabsH(e.nativeEvent.layout.height)} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingBottom: insets.bottom, backgroundColor: colors.bgElevated }}>
          <FooterTabs navigation={navigation} routeName="MyTeam" />
        </View>
      ) : null}
    </View>
  );
}

export default function MyClubScreen({ navigation }) {
  const { colors } = useDesign();
  const [favorite, setFavorite] = useState(undefined); // undefined = cargando
  const [picking, setPicking] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(FAVORITE_TEAM_KEY)
      .then((raw) => {
        const parsed = raw ? JSON.parse(raw) : null;
        setFavorite(parsed?.id ? parsed : null);
      })
      .catch(() => setFavorite(null));
  }, []);

  const confirm = useCallback(async (team) => {
    const value = { id: team.id, name: team.name, short: team.short, slug: team.slug, logo: team.logo };
    await AsyncStorage.setItem(FAVORITE_TEAM_KEY, JSON.stringify(value)).catch(() => {});
    setFavorite(value);
    setPicking(false);
  }, []);

  if (favorite === undefined) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  if (!favorite || picking) {
    return <ClubPicker navigation={navigation} current={favorite} onConfirm={confirm} onCancel={favorite ? () => setPicking(false) : null} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <TeamProfileView navigation={navigation} teamId={Number(favorite.id)} passed={favorite} isMyClub onChangeClub={() => setPicking(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1.5, overflow: 'hidden' },
  itemSlash: { position: 'absolute', left: -6, top: 0, bottom: 0, width: 10, transform: [{ skewX: '-14deg' }] },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  confirmBar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  confirm: { height: 52, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
