// components/More.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from './Header';
import FooterTabs from './FooterTabs';
import TeamSearchModal from './TeamSearchModal'; // 👈 NUEVO
import analytics from '@react-native-firebase/analytics';
import { useTheme } from '../utils/ThemeContext';

export default function More({ navigation }) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const colors = theme.colors;

  // 👇 NUEVO: estado para el modal
  const [showTeamSearch, setShowTeamSearch] = React.useState(false);

  const items = [
    {
      key: 'teams',
      label: 'Equipos',
      icon: require('../resources/people.png'),
      onPress: () => navigation.navigate('Teams'),
    },
    {
      key: 'scorers',
      label: 'Goleadores',
      icon: require('../resources/scorers.png'),
      onPress: () => navigation.navigate('Scorers'),
    },
    {
      key: 'tournaments',
      label: 'Torneos',
      icon: require('../resources/Trophy.png'),
      onPress: () => navigation.navigate('Torneos'),
    },
    {
      key: 'settings',
      label: 'Ajustes',
      icon: require('../resources/settings.png'),
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  // Alto del footer absoluto (58) + zona de gestos
  const footerSpace = 58 + (insets.bottom || 0) + 12;

  // Analytics: screen_view de More
  React.useEffect(() => {
    (async () => {
      try {
        await analytics().logScreenView({
          screen_name: 'More',
          screen_class: 'More',
        });
      } catch {}
    })();
  }, []);

  return (
    <View style={[S.screen, { backgroundColor: colors.screenBg }]}>
      <View style={S.headerFixed}>
        <Header
          navigation={navigation}
          title="Más"
          showSearch
          // 👇 NUEVO: abre el modal de búsqueda
          onSearchPress={() => setShowTeamSearch(true)}
        />
      </View>

      <ScrollView
        style={S.scroll}
        contentContainerStyle={[S.content, { paddingBottom: footerSpace }]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            S.list,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder,
            },
          ]}
        >
          {items.map((it, idx) => (
            <TouchableOpacity
              key={it.key}
              style={[
                S.row,
                idx > 0 && [
                  S.divider,
                  { borderTopColor: colors.cardBorder },
                ],
              ]}
              activeOpacity={0.85}
              onPress={async () => {
                try {
                  await analytics().logEvent('more_click', {
                    item_key: String(it?.key || ''),
                    item_label: String(it?.label || ''),
                  });
                } catch {}

                it.onPress && it.onPress();
              }}
            >
              <Image
                source={it.icon}
                style={[S.rowIcon, { tintColor: colors.text }]}
              />
              <Text style={[S.rowText, { color: colors.text }]}>
                {it.label}
              </Text>
              <Text
                style={[S.chevron, { color: colors.textMuted }]}
                accessibilityElementsHidden
              >
                {'›'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* 👇 NUEVO: modal de búsqueda de equipos */}
      <TeamSearchModal
        visible={showTeamSearch}
        onClose={() => setShowTeamSearch(false)}
        onSelect={async (team) => {
          try {
            await analytics().logEvent('open_team_from_search', {
              team_id: String(team?.id ?? ''),
              team_name: String(team?.name ?? ''),
              scope: String(team?.scope ?? 'guatemala'),
              origin: 'More',
            });
          } catch {}

          setShowTeamSearch(false);
          navigation.navigate('TeamScreen', {
            teamId: team.id,
            scope: team.scope,
            teamName: team.name,
          });
        }}
      />

      <FooterTabs navigation={navigation} routeName="More" />
    </View>
  );
}

const S = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f7f7f7' }, // se sobreescribe con theme
  headerFixed: {},
  scroll: { flex: 1 },
  content: { paddingHorizontal: 12, paddingTop: 12 },

  list: {
    backgroundColor: '#fff', // se sobreescribe con theme
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  row: {
    minHeight: 56,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  rowIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
    resizeMode: 'contain',
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    fontWeight: '700',
  },
  chevron: {
    fontSize: 22,
    color: '#9CA3AF',
    marginLeft: 8,
    marginRight: 2,
  },
});
