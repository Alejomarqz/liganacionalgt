// components/TeamSearchModal.js
import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, Animated, Pressable,
} from 'react-native';
import { MagnifyingGlass, X } from 'phosphor-react-native';
import { loadTeams, searchTeams } from '../services/teams';
import { useTheme } from '../utils/ThemeContext';
import { BRAND }    from '../utils/theme';
import LogoImg      from './LogoImg';

/* ══════════════════════════════════════════════════════════
   TEAM SEARCH MODAL
══════════════════════════════════════════════════════════ */
export default function TeamSearchModal({ visible, onClose, onSelect }) {
  const [all, setAll]   = useState([]);
  const [q,   setQ]     = useState('');
  const inputRef        = useRef(null);
  const fadeAnim        = useRef(new Animated.Value(0)).current;
  const slideAnim       = useRef(new Animated.Value(24)).current;

  const { theme } = useTheme();
  const colors    = theme.colors;
  const isDark    = theme.mode === 'dark';
  const iconColor = isDark ? '#6B6E8A' : '#9496A8';
  const activeColor = isDark ? '#F1F2F6' : BRAND.primary;

  /* ── Animación de entrada ── */
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1,  duration: 180, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0,  useNativeDriver: true, speed: 20, bounciness: 4 }),
      ]).start();
      setTimeout(() => inputRef.current?.focus(), 120);
      (async () => {
        const list = await loadTeams(true);
        setAll(list);
      })();
    } else {
      fadeAnim.setValue(0);
      slideAnim.setValue(24);
      setQ('');
    }
  }, [visible]);

  const results = useMemo(() => searchTeams(all, q), [all, q]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Fondo oscuro */}
      <Animated.View style={[S.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={S.overlay}
        pointerEvents="box-none"
      >
        <Animated.View
          style={[
            S.card,
            { backgroundColor: colors.cardBg, borderColor: colors.cardBorder },
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── Search bar ── */}
          <View style={[S.searchBar, { borderBottomColor: colors.cardBorder }]}>
            <MagnifyingGlass size={18} color={iconColor} weight="regular" style={S.searchIcon} />
            <TextInput
              ref={inputRef}
              placeholder="Buscar equipo…"
              placeholderTextColor={colors.textMuted}
              value={q}
              onChangeText={setQ}
              style={[S.input, { color: colors.text }]}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {q.length > 0 && (
              <TouchableOpacity onPress={() => setQ('')} style={S.clearBtn} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
                <View style={[S.clearCircle, { backgroundColor: isDark ? '#2A2D3E' : '#E4E6F0' }]}>
                  <X size={10} color={iconColor} weight="bold" />
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={S.closeBtn} hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}>
              <Text style={[S.closeText, { color: activeColor }]}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {/* ── Lista ── */}
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => (
              <View style={[S.sep, { backgroundColor: colors.cardBorder }]} />
            )}
            renderItem={({ item, index }) => (
              <TeamRow
                item={item}
                index={index}
                colors={colors}
                isDark={isDark}
                activeColor={activeColor}
                onPress={() => { onSelect?.(item); onClose?.(); }}
              />
            )}
            ListEmptyComponent={
              <View style={S.emptyWrap}>
                <Text style={[S.emptyIcon]}>
                  {q ? '🔍' : '⚽'}
                </Text>
                <Text style={[S.emptyText, { color: colors.textMuted }]}>
                  {q ? 'Sin resultados' : 'Escribe para buscar equipos…'}
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: 12 }}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ── Fila de equipo ── */
function TeamRow({ item, index, colors, isDark, activeColor, onPress }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      delay: Math.min(index * 30, 300),
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={S.itemRow}
      >
        <LogoImg teamId={item.id} size={32} style={S.logo} />

        <Text style={[S.nameText, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>

        {item.scope && item.scope !== 'guatemala' && (
          <View style={[S.scopeBadge, { backgroundColor: isDark ? '#22253A' : '#F0F2F7' }]}>
            <Text style={[S.scopeText, { color: colors.textMuted }]}>
              {item.scope === 'concacaf' ? 'CONCACAF' : item.scope.toUpperCase()}
            </Text>
          </View>
        )}

        <Text style={[S.chev, { color: colors.textMuted }]}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const S = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: 14,
  },
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    maxHeight: '80%',
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },

  /* Search bar */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
    gap: 8,
  },
  searchIcon: { flexShrink: 0 },
  input: {
    flex: 1,
    fontFamily: 'Poppins-Regular',
    fontSize: 15,
    paddingVertical: 10,
    minHeight: 44,
  },
  clearBtn:    { padding: 4 },
  clearCircle: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  closeBtn:    { paddingHorizontal: 4, paddingVertical: 8 },
  closeText:   { fontFamily: 'Poppins-SemiBold', fontSize: 13 },

  /* Separador */
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 58 },

  /* Fila de equipo */
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  logo:     { borderRadius: 6, flexShrink: 0 },
  nameText: { flex: 1, fontFamily: 'Poppins-SemiBold', fontSize: 14 },

  scopeBadge:  { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  scopeText:   { fontFamily: 'Poppins-Medium', fontSize: 10, letterSpacing: 0.3 },

  chev: { fontFamily: 'Poppins-Regular', fontSize: 22, lineHeight: 26 },

  /* Empty */
  emptyWrap: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyIcon: { fontSize: 28 },
  emptyText: { fontFamily: 'Poppins-Regular', fontSize: 13, textAlign: 'center' },
});