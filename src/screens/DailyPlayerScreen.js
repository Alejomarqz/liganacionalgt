// src/screens/DailyPlayerScreen.js
// "¿Quién es el jugador?" — reto diario.
import React, { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, Share, TextInput, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, ArrowUp, ArrowDown, Check, X, Fire, ShareNetwork, MagnifyingGlass } from 'phosphor-react-native';

import { useDesign } from '../design/useDesign';
import { hitSlop } from '../design/tokens';
import { Txt, Surface, PressableScale, Slash, TeamCrest, SkeletonCard, EmptyState, StadiumBackdrop } from '../ui';
import { useScorers } from '../api/liga';
import { MAX_TRIES, BLUR_BY_TRY, buildPool, loadState, saveState, pickAnswer, compare, finishDay, shareText, todayKey } from '../features/games/daily';

const norm = (s = '') => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Chip({ ok, label, dir, colors }) {
  const bg = ok ? colors.successSoft : colors.surfaceHigh;
  const fg = ok ? colors.success : colors.textSecondary;
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      {ok ? <Check size={12} color={fg} weight="bold" /> : dir === 'higher' ? <ArrowUp size={12} color={fg} weight="bold" /> : dir === 'lower' ? <ArrowDown size={12} color={fg} weight="bold" /> : <X size={12} color={fg} weight="bold" />}
      <Txt variant="caption" color={fg} style={{ fontFamily: 'Inter-SemiBold' }}>
        {label}
      </Txt>
    </View>
  );
}

function GuessRow({ guess, answer, colors }) {
  const c = compare(guess, answer);
  return (
    <View style={[styles.guess, { borderBottomColor: colors.divider }]}>
      <TeamCrest team={guess.team} size={26} />
      <View style={{ flex: 1, gap: 6 }}>
        <Txt variant="bodyStrong" numberOfLines={1} color={c.correct ? colors.success : colors.text}>
          {guess.name}
        </Txt>
        {!c.correct ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Chip ok={c.team === 'equal'} label={c.team === 'equal' ? 'Mismo club' : 'Otro club'} colors={colors} />
            <Chip ok={c.goals === 'equal'} dir={c.goals} label={`${guess.goals} goles`} colors={colors} />
            {guess.number != null ? <Chip ok={c.number === 'equal'} dir={c.number} label={`Dorsal ${guess.number}`} colors={colors} /> : null}
          </View>
        ) : null}
      </View>
      {c.correct ? <Check size={20} color={colors.success} weight="bold" /> : null}
    </View>
  );
}

export default function DailyPlayerScreen({ navigation }) {
  const { colors, space } = useDesign();
  const insets = useSafeAreaInsets();
  const scorers = useScorers();
  const pool = useMemo(() => buildPool(scorers.rows), [scorers.rows]);
  const [state, setState] = useState(null);
  const [query, setQuery] = useState('');
  const [photoFailed, setPhotoFailed] = useState(false);

  useEffect(() => {
    loadState().then(setState);
  }, []);

  const answer = useMemo(() => (state && pool.length ? pickAnswer(state, pool) : null), [state, pool]);
  const today = state?.days?.[todayKey()] || null;
  const guesses = useMemo(() => (today?.guesses || []).map((id) => pool.find((p) => p.id === id)).filter(Boolean), [today, pool]);
  const done = Boolean(today?.done);
  const won = Boolean(today?.won);

  // Fija la respuesta del día en cuanto se calcula (no cambia aunque cambie la tabla)
  useEffect(() => {
    if (!state || !answer || today?.answerId) return;
    const next = { ...state, days: { ...(state.days || {}), [todayKey()]: { answerId: answer.id, guesses: [] } } };
    setState(next);
    saveState(next);
  }, [state, answer, today?.answerId]);

  const suggestions = useMemo(() => {
    const q = norm(query.trim());
    if (q.length < 2) return [];
    const used = new Set(guesses.map((g) => g.id));
    return pool.filter((p) => !used.has(p.id) && norm(p.name).includes(q)).slice(0, 6);
  }, [query, pool, guesses]);

  const guess = (p) => {
    if (!answer || done) return;
    const ids = [...(today?.guesses || []), p.id];
    const correct = p.id === answer.id;
    let next = { ...state, days: { ...state.days, [todayKey()]: { ...(today || {}), answerId: answer.id, guesses: ids } } };
    if (correct || ids.length >= MAX_TRIES) next = finishDay(next, { won: correct, tries: ids.length, answerId: answer.id, guesses: ids });
    setState(next);
    saveState(next);
    setQuery('');
  };

  const tries = guesses.length;
  const blur = done ? 0 : BLUR_BY_TRY[Math.min(tries, BLUR_BY_TRY.length - 1)];
  const hints = answer
    ? [
        tries >= 1 && answer.team ? { k: 'Club', v: answer.team.name, crest: answer.team } : null,
        tries >= 2 && answer.number != null ? { k: 'Dorsal', v: String(answer.number) } : null,
        tries >= 3 ? { k: 'Goles en el torneo', v: String(answer.goals) } : null,
        tries >= 4 ? { k: 'Iniciales', v: answer.name.split(' ').map((w) => w[0]).join('. ') + '.' } : null,
      ].filter(Boolean)
    : [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={{ paddingTop: 6, paddingHorizontal: 12 }}>
          <PressableScale onPress={() => navigation.goBack()} hitSlop={hitSlop} accessibilityLabel="Volver" style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}>
            <CaretLeft size={22} color={colors.text} weight="bold" />
          </PressableScale>
        </View>
        <View style={{ paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <View>
            <Txt variant="overline" tone="secondary">
              Reto diario
            </Txt>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <Slash width={9} height={24} />
              <Txt variant="h1">¿Quién es el jugador?</Txt>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 10 }}>
          <View style={[styles.stat, { backgroundColor: colors.surfaceHigh }]}>
            <Fire size={14} color={colors.warning} weight="fill" />
            <Txt variant="caption" style={{ fontFamily: 'Inter-Bold' }}>
              Racha {state?.streak || 0}
            </Txt>
          </View>
          <View style={[styles.stat, { backgroundColor: colors.surfaceHigh }]}>
            <Txt variant="caption" tone="secondary" style={{ fontFamily: 'Inter-SemiBold' }}>
              Mejor {state?.best || 0} · Ganados {state?.wins || 0}/{state?.played || 0}
            </Txt>
          </View>
        </View>

        {!state || scorers.loading ? (
          <SkeletonCard height={320} style={{ margin: 16 }} />
        ) : !answer ? (
          <EmptyState title="Vuelve pronto" message="El reto se activa cuando haya goleadores en el torneo." />
        ) : (
          <View style={{ gap: space[4], marginTop: space[4] }}>
            {/* Foto del jugador: se aclara con cada intento */}
            <View style={{ marginHorizontal: 16, borderRadius: 20, overflow: 'hidden' }}>
              <StadiumBackdrop height={260}>
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={styles.photoRing}>
                    {answer.photo && !photoFailed ? (
                      <Image source={{ uri: answer.photo }} blurRadius={blur} onError={() => setPhotoFailed(true)} style={styles.photo} />
                    ) : (
                      <View style={[styles.photo, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' }]}>
                        <Txt variant="display" color="#fff">
                          ?
                        </Txt>
                      </View>
                    )}
                  </View>
                  <Txt variant="h2" color="#fff" style={{ marginTop: 12 }}>
                    {done ? answer.name : `Intento ${Math.min(tries + 1, MAX_TRIES)} de ${MAX_TRIES}`}
                  </Txt>
                  {done ? (
                    <Txt variant="caption" color="rgba(255,255,255,0.8)">
                      {won ? `¡Lo adivinaste en ${tries}!` : 'Mañana hay otro jugador'}
                    </Txt>
                  ) : null}
                </View>
              </StadiumBackdrop>
            </View>

            {hints.length ? (
              <Surface style={{ marginHorizontal: 16, gap: 10 }}>
                {hints.map((h) => (
                  <View key={h.k} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Txt variant="body" tone="secondary">
                      {h.k}
                    </Txt>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {h.crest ? <TeamCrest team={h.crest} size={18} /> : null}
                      <Txt variant="bodyStrong">{h.v}</Txt>
                    </View>
                  </View>
                ))}
              </Surface>
            ) : (
              <Txt variant="caption" tone="secondary" style={{ paddingHorizontal: 20 }}>
                Es uno de los goleadores del torneo. Con cada fallo recibes una pista y la foto se aclara.
              </Txt>
            )}

            {!done ? (
              <View style={{ marginHorizontal: 16 }}>
                <View style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <MagnifyingGlass size={18} color={colors.textMuted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Escribe el nombre del jugador…"
                    placeholderTextColor={colors.textMuted}
                    style={{ flex: 1, color: colors.text, fontFamily: 'Inter-Medium', fontSize: 15, paddingVertical: 12 }}
                  />
                </View>
                {suggestions.length ? (
                  <Surface padded={false} style={{ marginTop: 6 }}>
                    {suggestions.map((item, index) => (
                      <PressableScale key={item.id} onPress={() => guess(item)} scaleTo={0.99}>
                        <View style={[styles.sugg, { borderBottomColor: colors.divider }, index === suggestions.length - 1 ? { borderBottomWidth: 0 } : null]}>
                          <TeamCrest team={item.team} size={22} />
                          <Txt variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                            {item.name}
                          </Txt>
                        </View>
                      </PressableScale>
                    ))}
                  </Surface>
                ) : null}
              </View>
            ) : (
              <PressableScale
                onPress={() => Share.share({ message: shareText({ won, tries, streak: state.streak }) }).catch(() => {})}
                style={[styles.share, { backgroundColor: colors.primaryStrong, marginHorizontal: 16 }]}
              >
                <ShareNetwork size={18} color="#fff" weight="bold" />
                <Txt variant="bodyStrong" color="#fff" style={{ fontFamily: 'Inter-Bold' }}>
                  Compartir mi resultado
                </Txt>
              </PressableScale>
            )}

            {guesses.length ? (
              <Surface padded={false} style={{ marginHorizontal: 16 }}>
                {guesses.map((g) => (
                  <GuessRow key={g.id} guess={g} answer={answer} colors={colors} />
                ))}
              </Surface>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  photoRing: { padding: 4, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.18)' },
  photo: { width: 140, height: 140, borderRadius: 70 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1 },
  sugg: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  guess: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  share: { height: 50, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
});
