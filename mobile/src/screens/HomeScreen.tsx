import React, { useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, radii, riskColor, riskLabel } from '../theme';
import ListRow from '../components/ListRow';
import { useStore } from '../store';
import { api } from '../api';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Mode = 'unknown' | 'ml' | 'heuristic' | 'offline';

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const history = useStore((s) => s.history);
  const load = useStore((s) => s.load);
  const [mode, setMode] = React.useState<Mode>('unknown');

  const checkHealth = React.useCallback(() => {
    setMode('unknown');
    api.health()
      .then((h) => {
        // Guard against unexpected payloads (e.g., HTML from a dead ngrok URL).
        if (h && (h.mode === 'ml' || h.mode === 'heuristic')) setMode(h.mode);
        else setMode('offline');
      })
      .catch(() => setMode('offline'));
  }, []);

  useFocusEffect(React.useCallback(() => {
    load();
    checkHealth();
  }, [load, checkHealth]));

  const recent = history.slice(0, 4);

  const STATUS_META: Record<Mode, { color: string; label: string }> = {
    ml:        { color: colors.safe,        label: 'ML model online' },
    heuristic: { color: colors.suspicious,  label: 'Heuristic mode' },
    offline:   { color: colors.fake,        label: 'Backend offline' },
    unknown:   { color: colors.textDim,     label: 'Connecting…' },
  };
  const statusMeta = STATUS_META[mode] ?? STATUS_META.unknown;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.brand}>
              <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
              <Text style={styles.brandText}>Profile Check</Text>
            </View>
            <Pressable
              onPress={() => nav.navigate('Tabs' as any, { screen: 'Settings' } as any)}
              hitSlop={10}
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
            </Pressable>
          </View>

          <Text style={styles.heading}>Detect a profile</Text>
          <Text style={styles.subheading}>
            Spot fake accounts across Instagram, X and Facebook with ML and heuristic checks.
          </Text>

          <View style={styles.statusPill}>
            <View style={[styles.statusDot, { backgroundColor: statusMeta.color }]} />
            <Text style={styles.statusText}>{statusMeta.label}</Text>
          </View>
        </View>

        {/* Methods section */}
        <SectionLabel>Detection methods</SectionLabel>
        <View style={styles.listGroup}>
          <ListRow
            icon="link"
            title="Detect by Link"
            subtitle="Paste any IG / X / FB profile URL"
            onPress={() => nav.navigate('DetectByLink')}
          />
          <ListRow
            icon="document-text-outline"
            title="Manual Analysis"
            subtitle="Enter profile stats yourself"
            onPress={() => nav.navigate('DetectByFeatures')}
          />
          <ListRow
            icon="at"
            title="Username Check"
            subtitle="Quick handle pattern scan"
            onPress={() => nav.navigate('UsernameAnalyzer')}
          />
          <ListRow
            icon="text"
            title="Bio Analyzer"
            subtitle="Spot spam patterns in bios"
            onPress={() => nav.navigate('BioAnalyzer')}
            isLast
          />
        </View>

        {/* Recent */}
        {recent.length > 0 && (
          <>
            <SectionLabel>Recent checks</SectionLabel>
            <View style={styles.listGroup}>
              {recent.map((h, i) => (
                <Pressable
                  key={h.id}
                  onPress={() => nav.navigate('Result', { result: h.result, method: h.method, label: h.label })}
                  style={({ pressed }) => [
                    styles.histRow,
                    i < recent.length - 1 && styles.histDivider,
                    pressed && { backgroundColor: colors.bgHover },
                  ]}
                >
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.histLabel} numberOfLines={1}>{h.label}</Text>
                    <Text style={styles.histMeta}>
                      {h.method}{h.platform ? ` · ${h.platform}` : ''}
                    </Text>
                  </View>
                  <View style={[styles.histBadge, { backgroundColor: riskColor(h.risk_level) + '14' }]}>
                    <Text style={[styles.histBadgeText, { color: riskColor(h.risk_level) }]}>
                      {Math.round(h.fake_probability * 100)}% · {riskLabel(h.risk_level)}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingTop: 8, paddingBottom: 16 },

  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  heading: { color: colors.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6, lineHeight: 34 },
  subheading: { color: colors.textMuted, fontSize: 14, marginTop: 6, lineHeight: 20 },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.bgSubtle,
    borderWidth: 1, borderColor: colors.border,
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { color: colors.textSecondary, fontSize: 12, fontWeight: '500' },

  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.7,
    paddingHorizontal: 20, marginTop: 18, marginBottom: 8,
  },
  listGroup: {
    marginHorizontal: 16,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },

  histRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
  },
  histDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  histLabel: { color: colors.text, fontSize: 14, fontWeight: '500' },
  histMeta: { color: colors.textMuted, fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  histBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  histBadgeText: { fontSize: 11, fontWeight: '600' },
});
