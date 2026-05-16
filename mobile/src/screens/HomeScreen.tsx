import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, TextInput as RNTextInput, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, riskColor, riskLabel } from '../theme';
import { useStore, HistoryEntry } from '../store';
import { api } from '../api';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_W = Dimensions.get('window').width;
const TILE_GAP = 12;
const TILE_W = (SCREEN_W - 20 * 2 - TILE_GAP) / 2; // 20px screen padding both sides

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const history = useStore((s) => s.history);
  const load = useStore((s) => s.load);
  const [url, setUrl] = useState('');

  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  const paste = async () => {
    const t = await Clipboard.getStringAsync();
    if (t) setUrl(t.trim());
  };

  const goLink = () => nav.navigate('DetectByLink', url.trim() ? { prefillUrl: url.trim() } : undefined);

  const recent = history.slice(0, 5);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Dashboard</Text>
        <Text style={styles.subheading}>Detect fake profiles across IG · X · Facebook</Text>

        {/* Paste URL bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <RNTextInput
            value={url}
            onChangeText={setUrl}
            placeholder="Paste Profile URL..."
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={goLink}
          />
          {url ? (
            <Pressable onPress={() => setUrl('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Pressable onPress={paste} hitSlop={10}>
              <Ionicons name="clipboard-outline" size={18} color={colors.primary} />
            </Pressable>
          )}
        </View>
        {url.length > 4 && (
          <Pressable style={styles.scanBtn} onPress={goLink}>
            <Ionicons name="scan" size={16} color="#fff" />
            <Text style={styles.scanBtnText}>Scan this profile</Text>
          </Pressable>
        )}

        {/* Start Scan section */}
        <Text style={styles.sectionLabel}>Start scan</Text>
        <View style={styles.grid}>
          <Tile
            icon="link"
            tint={colors.primary}
            title="Detect by Link"
            subtitle="IG · X · Facebook"
            onPress={() => nav.navigate('DetectByLink')}
          />
          <Tile
            icon="document-text-outline"
            tint="#7C3AED"
            title="Manual Analysis"
            subtitle="Enter profile stats"
            onPress={() => nav.navigate('DetectByFeatures')}
          />
          <Tile
            icon="at"
            tint="#0891B2"
            title="Username Check"
            subtitle="Quick handle scan"
            onPress={() => nav.navigate('UsernameAnalyzer')}
          />
          <Tile
            icon="text"
            tint="#DB2777"
            title="Bio Analyzer"
            subtitle="Spam in bio text"
            onPress={() => nav.navigate('BioAnalyzer')}
          />
        </View>

        {/* Recent scans */}
        {recent.length > 0 && (
          <>
            <View style={styles.recentHeader}>
              <Text style={styles.sectionLabel}>Recent scans</Text>
              <Pressable onPress={() => nav.navigate('Tabs' as any, { screen: 'History' } as any)}>
                <Text style={styles.viewAll}>View all</Text>
              </Pressable>
            </View>
            <View style={styles.recentGroup}>
              {recent.map((h, i) => (
                <RecentRow
                  key={h.id}
                  item={h}
                  isLast={i === recent.length - 1}
                  onPress={() => nav.navigate('Result', { result: h.result, method: h.method, label: h.label })}
                />
              ))}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({
  icon, tint, title, subtitle, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && { backgroundColor: colors.bgHover }]}
    >
      <View style={[styles.tileIcon, { backgroundColor: tint + '14' }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={styles.tileTitle}>{title}</Text>
      <Text style={styles.tileSub}>{subtitle}</Text>
    </Pressable>
  );
}

function RecentRow({ item, isLast, onPress }: { item: HistoryEntry; isLast: boolean; onPress: () => void }) {
  const initial = (item.label || '?').replace(/^@/, '').charAt(0).toUpperCase() || '?';
  const c = riskColor(item.risk_level);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.recentRow,
        !isLast && styles.recentDivider,
        pressed && { backgroundColor: colors.bgHover },
      ]}
    >
      <View style={[styles.avatar, { backgroundColor: c + '22', borderColor: c + '44' }]}>
        <Text style={[styles.avatarText, { color: c }]}>{initial}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.recentLabel} numberOfLines={1}>{item.label}</Text>
        <Text style={styles.recentMeta}>
          Trust: <Text style={{ color: c, fontWeight: '700' }}>{riskLabel(item.risk_level)}</Text>
          {item.platform ? ` · ${item.platform}` : ''}
        </Text>
      </View>
      <Text style={[styles.recentPct, { color: c }]}>{Math.round(item.fake_probability * 100)}%</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16 },

  heading: { color: colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -0.6 },
  subheading: { color: colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 16 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14, padding: 0 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 11, borderRadius: radii.md,
    marginTop: 10,
  },
  scanBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 22, marginBottom: 10,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: TILE_GAP },
  tile: {
    width: TILE_W,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 14, minHeight: 120,
  },
  tileIcon: {
    width: 42, height: 42, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  tileTitle: { color: colors.text, fontSize: 14, fontWeight: '700', letterSpacing: -0.2 },
  tileSub: { color: colors.textMuted, fontSize: 11.5, marginTop: 3 },

  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  viewAll: { color: colors.primary, fontSize: 12, fontWeight: '600', paddingBottom: 10 },
  recentGroup: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  recentRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    gap: 12,
  },
  recentDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '800' },
  recentLabel: { color: colors.text, fontSize: 14, fontWeight: '600' },
  recentMeta: { color: colors.textMuted, fontSize: 11.5, marginTop: 2 },
  recentPct: { fontSize: 14, fontWeight: '800' },
});
