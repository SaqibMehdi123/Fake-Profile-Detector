import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { colors, radii, riskColor, riskBg, riskLabel } from '../theme';
import ResultGauge from '../components/ResultGauge';
import ReasonList from '../components/ReasonList';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Result'>;

export default function ResultScreen() {
  const nav = useNavigation<Nav>();
  const { result, method, label } = useRoute<Rt>().params;

  const onShare = () => {
    const txt = `${label}\nFake probability: ${Math.round(result.fake_probability * 100)}%\nVerdict: ${riskLabel(result.risk_level)}\n\nDetected with Profile Check.`;
    Share.share({ message: txt }).catch(() => {});
  };

  const color = riskColor(result.risk_level);
  const bgTint = riskBg(result.risk_level);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      {/* Verdict card */}
      <View style={[styles.verdictCard, { backgroundColor: bgTint, borderColor: color + '33' }]}>
        <Text style={styles.verdictMethod}>{method.toUpperCase()} CHECK</Text>
        <Text style={styles.verdictLabel} numberOfLines={1}>{label}</Text>
        <View style={[styles.verdictBadge, { backgroundColor: color }]}>
          <Text style={styles.verdictBadgeText}>{riskLabel(result.risk_level)}</Text>
        </View>
      </View>

      {/* Gauge */}
      <View style={styles.gaugeCard}>
        <ResultGauge probability={result.fake_probability} riskLevel={result.risk_level} />
        <Text style={styles.confidence}>
          Confidence: <Text style={styles.confidenceVal}>{result.confidence}</Text>
        </Text>
      </View>

      {/* Reasons */}
      <View style={{ paddingHorizontal: 16 }}>
        <ReasonList reasons={result.reasons} />
      </View>

      {/* Top features */}
      {result.top_features && result.top_features.length > 0 && (
        <View style={styles.featBlock}>
          <Text style={styles.sectionTitle}>Top model features</Text>
          {result.top_features.map((f, i) => (
            <View key={i} style={[styles.featRow, i === result.top_features!.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={styles.featName}>{f.feature.replace(/_/g, ' ')}</Text>
              <Text style={styles.featVal}>{Number.isInteger(f.value) ? f.value : f.value.toFixed(2)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Partial analysis banner */}
      {result.notes?.includes('PARTIAL_ANALYSIS') && (
        <View style={styles.partialBanner}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.partialTitle}>Partial analysis</Text>
            <Text style={styles.partialBody}>
              The platform blocked us from fetching profile stats, so this is a username-only check. Tap below for a full ML verdict.
            </Text>
          </View>
        </View>
      )}

      {/* Notes (filtered: skip the flag-only entries) */}
      {result.notes && result.notes.filter((n) => n !== 'PARTIAL_ANALYSIS' && n !== 'SCRAPE_FAILED').length > 0 && (
        <View style={styles.notesBox}>
          {result.notes
            .filter((n) => n !== 'PARTIAL_ANALYSIS' && n !== 'SCRAPE_FAILED')
            .map((n, i) => (
              <Text key={i} style={styles.note}>• {n}</Text>
            ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {result.notes?.includes('PARTIAL_ANALYSIS') ? (
          <Pressable
            style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            onPress={() => nav.replace('DetectByFeatures', { prefill: result.extracted })}
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={[styles.actionText, { color: '#fff' }]}>Get full analysis</Text>
          </Pressable>
        ) : (
          <>
            <Pressable style={styles.actionBtn} onPress={onShare}>
              <Ionicons name="share-outline" size={18} color={colors.text} />
              <Text style={styles.actionText}>Share</Text>
            </Pressable>
            <Pressable
              style={[styles.actionBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
              onPress={() => nav.popToTop()}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Done</Text>
            </Pressable>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },

  verdictCard: {
    padding: 18,
    borderRadius: radii.lg,
    borderWidth: 1,
    marginBottom: 14,
  },
  verdictMethod: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  verdictLabel: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4 },
  verdictBadge: {
    alignSelf: 'flex-start', marginTop: 10,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
  },
  verdictBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  gaugeCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingVertical: 24,
    alignItems: 'center',
    marginBottom: 14,
  },
  confidence: { color: colors.textMuted, fontSize: 13, marginTop: 12 },
  confidenceVal: { color: colors.text, fontWeight: '700', textTransform: 'capitalize' },

  sectionTitle: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10 },
  featBlock: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg, padding: 16,
    marginTop: 14, marginHorizontal: 0,
    borderWidth: 1, borderColor: colors.border,
  },
  featRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 8, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  featName: { color: colors.textSecondary, fontSize: 13, textTransform: 'capitalize' },
  featVal: { color: colors.text, fontSize: 13, fontWeight: '600' },

  notesBox: { marginTop: 12, padding: 12, backgroundColor: colors.bgSubtle, borderRadius: radii.md },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },

  partialBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary + '33', borderWidth: 1,
    padding: 12, borderRadius: radii.md, marginTop: 14,
  },
  partialTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  partialBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgSurface, paddingVertical: 14, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, gap: 8,
  },
  actionText: { color: colors.text, fontSize: 14, fontWeight: '700' },
});
