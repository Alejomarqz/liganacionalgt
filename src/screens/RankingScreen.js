// src/screens/RankingScreen.js
// Ranking de la Quiniela: Nacional (top 50 + mi posición) y Mis ligas (con código).
import React, { useCallback, useState } from 'react';
import { ScrollView, Share, TextInput, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, PencilSimple, Plus, SignIn, ShareNetwork, Crown, UsersThree, CaretRight, SignOut } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, Surface, PressableScale, Tabs, Slash, SkeletonCard, EmptyState, SectionHeader } from '../ui';
import { useMatches } from '../api/liga';
import { seasonLabel } from '../api/clock';
import { useGameIdentity, NICK_MAX } from '../features/games/identity';
import { useMyPredictions, useMyScore, useMyRank, useLeaderboard, useMyLeagues, useLeagueTable, createLeague, joinLeague, leaveLeague } from '../features/games/quinielaStore';

const TABS = [
  { key: 'national', label: 'Nacional' },
  { key: 'leagues', label: 'Mis ligas' },
];

function Input({ value, onChangeText, placeholder, maxLength, autoCapitalize, colors }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      maxLength={maxLength}
      autoCapitalize={autoCapitalize}
      style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceHigh }]}
    />
  );
}

function Btn({ label, Icon, onPress, primary, colors, disabled }) {
  return (
    <PressableScale onPress={onPress} disabled={disabled} style={[styles.btn, primary ? { backgroundColor: colors.primaryStrong } : { backgroundColor: colors.surfaceHigh }]}>
      {Icon ? <Icon size={16} color={primary ? '#fff' : colors.text} weight="bold" /> : null}
      <Txt variant="bodyStrong" color={primary ? '#fff' : colors.text} style={{ fontFamily: 'Inter-Bold' }}>
        {label}
      </Txt>
    </PressableScale>
  );
}

function RankRow({ pos, row, me, colors, last }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.divider }, me ? { backgroundColor: colors.primarySoft } : null, last ? { borderBottomWidth: 0 } : null]}>
      <View style={{ width: 30, alignItems: 'flex-start' }}>
        {pos === 1 ? <Crown size={18} color={colors.gold} weight="fill" /> : <Txt variant="points" tone="secondary" style={{ fontSize: 14 }}>{pos}</Txt>}
      </View>
      <Txt variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
        {row.nick || 'Afición'}
        {me ? '  (tú)' : ''}
      </Txt>
      <Txt variant="caption" tone="muted" style={{ width: 64, textAlign: 'center' }}>
        {row.exact || 0} exactos
      </Txt>
      <Txt variant="points" style={{ width: 44, textAlign: 'right', fontSize: 17 }}>
        {row.points || 0}
      </Txt>
    </View>
  );
}

function LeagueTable({ league, uid, colors, onLeave }) {
  const table = useLeagueTable(league.members);
  const share = () =>
    Share.share({ message: `Únete a mi liga "${league.name}" en la Quiniela de la Liga Nacional GT.\nCódigo: ${league.code}\nDescarga la app oficial de la Liga Nacional.` }).catch(() => {});
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
        <Btn label={`Código ${league.code}`} Icon={ShareNetwork} onPress={share} primary colors={colors} />
        <Btn label="Salir" Icon={SignOut} onPress={() => onLeave(league)} colors={colors} />
      </View>
      {table.loading ? (
        <SkeletonCard height={180} style={{ marginHorizontal: 16 }} />
      ) : (
        <Surface padded={false} style={{ marginHorizontal: 16 }}>
          {table.rows.map((r, i) => (
            <RankRow key={r.uid} pos={i + 1} row={r} me={r.uid === uid} colors={colors} last={i === table.rows.length - 1} />
          ))}
        </Surface>
      )}
    </View>
  );
}

export default function RankingScreen({ navigation }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState('national');
  const { uid, nick, ready, rename } = useGameIdentity();
  const matchesQ = useMatches();
  const seasonId = matchesQ.seasonId;
  const preds = useMyPredictions(uid);
  const totals = useMyScore({ uid, nick, seasonId, byRound: preds.byRound, matches: matchesQ.matches });
  const { rank, total } = useMyRank(seasonId, ready && !preds.loading ? totals.points : null);
  const board = useLeaderboard(seasonId, 50);
  const mine = useMyLeagues(uid);

  const [editing, setEditing] = useState(false);
  const [nickDraft, setNickDraft] = useState('');
  const [leagueName, setLeagueName] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [openLeague, setOpenLeague] = useState(null);

  const run = useCallback(async (fn, ok) => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      if (ok) setMsg({ ok: true, text: ok(r) });
    } catch (e) {
      setMsg({ ok: false, text: e?.message || 'Algo salió mal, intenta de nuevo.' });
    } finally {
      setBusy(false);
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView stickyHeaderIndices={[2]} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ paddingTop: 6, paddingHorizontal: 12 }}>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver" style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
            <CaretLeft size={22} color={colors.text} weight="bold" />
          </PressableScale>
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
          <Txt variant="overline" tone="secondary">
            Quiniela · {seasonLabel()}
          </Txt>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
            <Slash width={9} height={24} />
            <Txt variant="h1">Ranking</Txt>
          </View>

          {/* Mi tarjeta */}
          <Surface style={{ marginTop: 16, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Txt variant="caption" tone="muted">
                  Tu nombre en el ranking
                </Txt>
                {editing ? (
                  <Input value={nickDraft} onChangeText={setNickDraft} placeholder="Tu apodo" maxLength={NICK_MAX} colors={colors} />
                ) : (
                  <Txt variant="h2">{nick || '…'}</Txt>
                )}
              </View>
              {editing ? (
                <Btn
                  label="Guardar"
                  primary
                  colors={colors}
                  disabled={busy}
                  onPress={() =>
                    run(async () => {
                      await rename(nickDraft);
                      setEditing(false);
                    }, () => 'Apodo actualizado.')
                  }
                />
              ) : (
                <PressableScale
                  onPress={() => {
                    setNickDraft(nick);
                    setEditing(true);
                  }}
                  hitSlop={hitSlop}
                  accessibilityLabel="Cambiar apodo"
                  style={[styles.iconBtn, { backgroundColor: colors.surfaceHigh }]}
                >
                  <PencilSimple size={16} color={colors.text} weight="bold" />
                </PressableScale>
              )}
            </View>
            <View style={{ flexDirection: 'row' }}>
              {[
                [rank ? `#${rank}` : '–', total ? `de ${total} jugadores` : 'Posición'],
                [totals.points, 'Puntos'],
                [totals.exact, 'Exactos'],
              ].map(([v, l], i) => (
                <View key={l} style={{ flex: 1, alignItems: 'center', borderLeftWidth: i ? StyleSheet.hairlineWidth : 0, borderLeftColor: colors.divider }}>
                  <Txt variant="h1" tone={i === 0 ? 'brand' : 'primary'} style={{ fontSize: 24, lineHeight: 28, fontVariant: ['tabular-nums'] }}>
                    {v}
                  </Txt>
                  <Txt variant="caption" tone="muted" numberOfLines={1}>
                    {l}
                  </Txt>
                </View>
              ))}
            </View>
          </Surface>
          {msg ? (
            <Txt variant="caption" tone={msg.ok ? 'success' : 'danger'} style={{ marginTop: 8 }}>
              {msg.text}
            </Txt>
          ) : null}
        </View>

        <View style={{ backgroundColor: colors.bg }}>
          <Tabs tabs={TABS} value={tab} onChange={setTab} />
        </View>

        <View style={{ paddingTop: space[5], gap: space[5] }}>
          {tab === 'national' ? (
            board.loading ? (
              <SkeletonCard height={400} style={{ marginHorizontal: 16 }} />
            ) : board.rows.length ? (
              <Surface padded={false} style={{ marginHorizontal: 16 }}>
                {board.rows.map((r, i) => (
                  <RankRow key={r.uid} pos={i + 1} row={r} me={r.uid === uid} colors={colors} last={i === board.rows.length - 1} />
                ))}
              </Surface>
            ) : (
              <EmptyState title="El ranking arranca pronto" message="Los puntos aparecen cuando terminen los primeros partidos pronosticados." />
            )
          ) : (
            <>
              <View>
                <SectionHeader title="Crear una liga" />
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Input value={leagueName} onChangeText={setLeagueName} placeholder="Ej. Los de la oficina" maxLength={30} colors={colors} />
                  </View>
                  <Btn
                    label="Crear"
                    Icon={Plus}
                    primary
                    colors={colors}
                    disabled={busy}
                    onPress={() =>
                      run(async () => {
                        const c = await createLeague({ uid, name: leagueName, seasonId });
                        setLeagueName('');
                        return c;
                      }, (c) => `Liga creada. Comparte el código ${c} con tus amigos.`)
                    }
                  />
                </View>
              </View>

              <View>
                <SectionHeader title="Unirme con código" />
                <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16 }}>
                  <View style={{ flex: 1 }}>
                    <Input value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="ABC123" maxLength={6} autoCapitalize="characters" colors={colors} />
                  </View>
                  <Btn
                    label="Unirme"
                    Icon={SignIn}
                    colors={colors}
                    disabled={busy}
                    onPress={() =>
                      run(async () => {
                        const l = await joinLeague({ uid, code });
                        setCode('');
                        return l;
                      }, (l) => `Te uniste a "${l.name}".`)
                    }
                  />
                </View>
              </View>

              <View>
                <SectionHeader title="Mis ligas" />
                {mine.loading ? (
                  <SkeletonCard height={120} style={{ marginHorizontal: 16 }} />
                ) : mine.leagues.length ? (
                  <View style={{ gap: 12 }}>
                    {mine.leagues.map((l) => {
                      const isOpen = openLeague === l.code;
                      return (
                        <View key={l.code} style={{ gap: 12 }}>
                          <PressableScale onPress={() => setOpenLeague(isOpen ? null : l.code)} style={{ marginHorizontal: 16 }}>
                            <Surface style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                              <View style={[styles.leagueIcon, { backgroundColor: colors.primarySoft }]}>
                                <UsersThree size={20} color={colors.primary} weight="duotone" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Txt variant="h3">{l.name}</Txt>
                                <Txt variant="caption" tone="muted">
                                  {(l.members || []).length} {(l.members || []).length === 1 ? 'persona' : 'personas'} · {l.code}
                                </Txt>
                              </View>
                              <CaretRight size={16} color={colors.textMuted} weight="bold" style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }} />
                            </Surface>
                          </PressableScale>
                          {isOpen ? (
                            <LeagueTable
                              league={l}
                              uid={uid}
                              colors={colors}
                              onLeave={(lg) => run(() => leaveLeague({ uid, code: lg.code }).then(() => setOpenLeague(null)), () => `Saliste de "${lg.name}".`)}
                            />
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <EmptyState title="Aún no tienes ligas" message="Crea una y comparte el código, o únete con el código de un amigo." />
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  input: { height: 44, borderRadius: 10, paddingHorizontal: 14, fontFamily: 'Inter-SemiBold', fontSize: 15 },
  btn: { height: 44, paddingHorizontal: 16, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  leagueIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
