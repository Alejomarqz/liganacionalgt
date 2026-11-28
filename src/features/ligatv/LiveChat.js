// src/features/ligatv/LiveChat.js
// Chat en vivo de Liga TV sobre Firestore (gratis en el plan Spark para este volumen).
// Usuario anónimo + apodo local. Límite de longitud, anti-spam y filtro básico.
// Reglas de seguridad: ver docs/firestore.rules

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, TextInput, View, StyleSheet } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaperPlaneRight } from 'phosphor-react-native';
import { useDesign } from '../../design/useDesign';
import { Txt, PressableScale } from '../../ui';

const COL = 'liga_tv_chat';
const MAX_LEN = 140;
const COOLDOWN_MS = 4000;
const NICK_KEY = '@lngt:v3:chat_nick';

const BLOCK = ['puta', 'puto', 'mierda', 'pendejo', 'hijueputa', 'culero', 'verga'];
const clean = (t) => BLOCK.reduce((s, w) => s.replace(new RegExp(`\\b${w}\\b`, 'gi'), '•••'), t);

// Color estable por usuario
const NICK_COLORS = ['#4F7CFF', '#1FD39A', '#FFC24B', '#FF7A59', '#B67CFF', '#38C6F4', '#FF5C8A'];
const colorFor = (uid = '') => NICK_COLORS[[...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % NICK_COLORS.length];

async function getNick() {
  let n = await AsyncStorage.getItem(NICK_KEY);
  if (!n) {
    n = `Afición${Math.floor(1000 + Math.random() * 9000)}`;
    await AsyncStorage.setItem(NICK_KEY, n);
  }
  return n;
}

const Message = memo(({ m, colors }) => (
  <View style={styles.msg}>
    <Txt variant="caption" color={colorFor(m.uid)} style={{ fontFamily: 'Inter-Bold' }}>
      {m.nick}{' '}
      <Txt variant="body" color={colors.text}>
        {m.text}
      </Txt>
    </Txt>
  </View>
));

function LiveChat({ streamId = 'main' }) {
  const { colors, space, radius } = useDesign();
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    const unsub = firestore()
      .collection(COL)
      .where('streamId', '==', streamId)
      .orderBy('createdAt', 'desc')
      .limit(80)
      .onSnapshot(
        (snap) => setMsgs(snap?.docs?.map((d) => ({ id: d.id, ...d.data() })) || []),
        () => {},
      );
    return () => unsub();
  }, [streamId]);

  const send = useCallback(async () => {
    const body = text.trim().slice(0, MAX_LEN);
    if (!body || sending) return;
    if (Date.now() - last.current < COOLDOWN_MS) return;
    setSending(true);
    try {
      const user = auth().currentUser || (await auth().signInAnonymously()).user;
      await firestore().collection(COL).add({
        streamId,
        uid: user.uid,
        nick: await getNick(),
        text: clean(body),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      last.current = Date.now();
      setText('');
    } catch {
      // silencioso: la regla de Firestore puede rechazar spam
    } finally {
      setSending(false);
    }
  }, [text, sending, streamId]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <FlatList
        inverted
        data={msgs}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <Message m={item} colors={colors} />}
        contentContainerStyle={{ paddingHorizontal: space[4], paddingVertical: space[2] }}
        ListEmptyComponent={
          <Txt variant="caption" tone="muted" align="center" style={{ padding: space[6], transform: [{ scaleY: -1 }] }}>
            Sé el primero en comentar 👋
          </Txt>
        }
      />
      <View style={[styles.inputRow, { borderTopColor: colors.divider, backgroundColor: colors.bgElevated }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Escribe un comentario…"
          placeholderTextColor={colors.textMuted}
          maxLength={MAX_LEN}
          returnKeyType="send"
          onSubmitEditing={send}
          style={[styles.input, { color: colors.text, backgroundColor: colors.surfaceHigh, borderRadius: radius.pill }]}
        />
        <PressableScale
          onPress={send}
          disabled={!text.trim() || sending}
          accessibilityLabel="Enviar comentario"
          style={[styles.send, { backgroundColor: colors.primary }]}
        >
          <PaperPlaneRight size={18} color="#fff" weight="fill" />
        </PressableScale>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  msg: { paddingVertical: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 11 : 8, fontFamily: 'Inter-Regular', fontSize: 14 },
  send: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});

export default memo(LiveChat);
