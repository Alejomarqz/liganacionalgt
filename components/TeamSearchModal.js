// components/TeamSearchModal.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { loadTeams, searchTeams } from '../services/teams';
import { useTheme } from '../utils/ThemeContext';

export default function TeamSearchModal({ visible, onClose, onSelect }) {
  const [all, setAll] = useState([]);
  const [q, setQ] = useState('');
  const { theme } = useTheme();
  const colors = theme.colors;

  function Crest({ uri }) {
    const [err, setErr] = React.useState(false);
    if (err || !uri) {
      return <View style={{ width: 22, height: 22 }} />; // mantiene el spacing
    }
    return (
      <Image
        source={{ uri }}
        onError={() => setErr(true)}
        style={S.logo}
      />
    );
  }

  useEffect(() => {
    if (visible) {
      (async () => {
        const list = await loadTeams(true); // ← ignora caché y reconstruye con crest
        setAll(list);
      })();
    } else {
      setQ('');
    }
  }, [visible]);

  const results = useMemo(
    () => searchTeams(all, q),
    [all, q]
  );

  // 👇 CLAVE: si no está visible, NO renderizamos nada
  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={S.overlay}
      >
        <View
          style={[
            S.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          <View
            style={[
              S.row,
              { borderBottomColor: colors.cardBorder },
            ]}
          >
            <TextInput
              autoFocus
              placeholder="Buscar equipo…"
              placeholderTextColor={colors.textMuted}
              value={q}
              onChangeText={setQ}
              style={[
                S.input,
                { color: colors.text },
              ]}
              returnKeyType="search"
            />
            <TouchableOpacity
              onPress={onClose}
              style={S.btnClose}
            >
              <Text
                style={{
                  fontWeight: '700',
                  color: colors.accent,
                }}
              >
                Cerrar
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => (
              <View
                style={[
                  S.sep,
                  { backgroundColor: colors.cardBorder },
                ]}
              />
            )}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={S.itemRow}
                onPress={() => {
                  onSelect?.(item);
                  onClose?.();
                }}
              >
                <Crest uri={item.crest} />
                <Text
                  style={[
                    S.nameText,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text
                  style={[
                    S.chev,
                    { color: colors.textMuted },
                  ]}
                >
                  ›
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              !!q ? (
                <Text
                  style={[
                    S.empty,
                    { color: colors.textMuted },
                  ]}
                >
                  Sin resultados
                </Text>
              ) : (
                <Text
                  style={[
                    S.empty,
                    { color: colors.textMuted },
                  ]}
                >
                  Escribe para buscar equipos…
                </Text>
              )
            }
            contentContainerStyle={{ paddingBottom: 8 }}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)', // solo se ve mientras visible===true
    justifyContent: 'flex-start',
    paddingTop: 76,
    paddingHorizontal: 12,
  },
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: '80%',
    borderWidth: 1,
    backgroundColor: '#fff', // se sobreescribe por theme
    borderColor: 'rgba(0,0,0,0.06)', // se sobreescribe
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)', // se sobreescribe
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    color: '#0f172a', // se sobreescribe
  },
  btnClose: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  sep: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)', // se sobreescribe
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  nameText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a', // se sobreescribe
  },
  chev: {
    fontSize: 24,
    color: '#94a3b8',
    marginLeft: 8,
    paddingHorizontal: 4,
  },
  empty: {
    padding: 16,
    textAlign: 'center',
    color: '#64748b',
  },
  logo: {
    width: 22,
    height: 22,
    borderRadius: 0,
  },
});
