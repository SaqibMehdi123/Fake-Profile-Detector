import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, Share, Dimensions } from 'react-native';

const SCREEN_W = Dimensions.get('window').width;
const TILE_GAP = 12;
const METRIC_W = (SCREEN_W - 16 * 2 - TILE_GAP) / 2; // 16px scroll padding both sides
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { colors, radii, riskColor, riskBg, riskLabel } from '../theme';
import Gauge from '../components/Gauge';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Rt = RouteProp<RootStackParamList, 'Result'>;

export default function ResultScreen() {
  const nav = useNavigation<Nav>();
  const { result, method, label } = useRoute<Rt>().params;
  const color = riskColor(result.risk_level);
  const bgTint = riskBg(result.risk_level);
  const isPartial = !!result.notes?.includes('PARTIAL_ANALYSIS');

  const verdictTitle =
    result.risk_level === 'likely_fake' ? 'Fake Profile Detected' :
    result.risk_level === 'suspicious'  ? 'Suspicious Profile' :
                                          'Profile Looks Genuine';

  const negatives = result.reasons.filter((r) => r.impact === 'negative');
  const positives = result.reasons.filter((r) => r.impact === 'positive');
  const extracted = result.extracted;

  const onShare = () => {
    const txt = `${label}\nFake probability: ${Math.round(result.fake_probability * 100)}%\nVerdict: ${riskLabel(result.risk_level)}\n\nDetected with Detectly.`;
    Share.share({ message: txt }).catch(() => {});
  };

  const recommendations = buildRecommendations(result.risk_level);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      {/* Method + label header */}
      <View style={styles.metaRow}>
        <Text style={styles.method}>{method.toUpperCase()} CHECK</Text>
        <Pressable onPress={onShare} hitSlop={10} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>

      {/* Gauge card */}
      <View style={styles.gaugeCard}>
        <Gauge probability={result.fake_probability} riskLevel={result.risk_level} />
        <Text style={[styles.verdictTitle, { color }]}>{verdictTitle}</Text>
        <Text style={styles.verdictConf}>Confidence: <Text style={styles.confidenceVal}>{result.confidence}</Text></Text>
      </View>

      {/* Partial banner */}
      {isPartial && (
        <View style={styles.partialBanner}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.partialTitle}>Partial analysis</Text>
            <Text style={styles.partialBody}>
              The platform blocked us from fetching profile stats. This is a username-only check. Get the full ML verdict below.
            </Text>
          </View>
        </View>
      )}

      {/* Red Flags */}
      {negatives.length > 0 && (
        <View style={styles.flagsCard}>
          <View style={styles.flagsHeader}>
            <Ionicons name="flag" size={16} color={colors.fake} />
            <Text style={styles.flagsTitle}>Red flags found</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.fakeBg }]}>
              <Text style={[styles.countBadgeText, { color: colors.fake }]}>{negatives.length}</Text>
            </View>
          </View>
          {negatives.map((r, i) => (
            <View key={i} style={styles.flagRow}>
              <Text style={styles.flagNum}>{i + 1}.</Text>
              <Text style={styles.flagText}>{r.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Positive signals */}
      {positives.length > 0 && (
        <View style={[styles.flagsCard, { marginTop: 12 }]}>
          <View style={styles.flagsHeader}>
            <Ionicons name="checkmark-circle" size={16} color={colors.safe} />
            <Text style={[styles.flagsTitle, { color: colors.text }]}>Positive signals</Text>
          </View>
          {positives.map((r, i) => (
            <View key={i} style={styles.flagRow}>
              <Ionicons name="checkmark" size={14} color={colors.safe} style={{ marginTop: 3 }} />
              <Text style={styles.flagText}>{r.label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Detailed Breakdown (metric tiles) */}
      {extracted && (
        <>
          <Text style={styles.sectionLabel}>Detailed breakdown</Text>
          <View style={styles.metricGrid}>
            <Metric
              icon="person-circle-outline"
              label="Profile picture"
              value={extracted.has_profile_pic ? 'Present' : 'Missing'}
              good={extracted.has_profile_pic}
            />
            <Metric
              icon="people-outline"
              label="Followers / Following"
              value={`${formatNum(extracted.followers_count || 0)} / ${formatNum(extracted.following_count || 0)}`}
            />
            <Metric
              icon="document-outline"
              label="Posts"
              value={formatNum(extracted.posts_count || 0)}
              good={(extracted.posts_count ?? 0) > 5}
            />
            <Metric
              icon="text-outline"
              label="Bio length"
              value={`${(extracted.bio || '').length} chars`}
              good={(extracted.bio || '').length > 10}
            />
            <Metric
              icon="link-outline"
              label="External URL"
              value={extracted.has_external_url ? 'Yes' : 'No'}
            />
            <Metric
              icon="lock-closed-outline"
              label="Private account"
              value={extracted.is_private ? 'Yes' : 'No'}
            />
          </View>
        </>
      )}

      {/* Recommended Actions */}
      <Text style={styles.sectionLabel}>Recommended actions</Text>
      <View style={styles.recommendCard}>
        {recommendations.map((rec, i) => (
          <View key={i} style={[styles.recRow, i < recommendations.length - 1 && styles.recDivider]}>
            <View style={[styles.recBullet, { backgroundColor: colors.primarySubtle }]}>
              <Ionicons name="checkmark" size={14} color={colors.primary} />
            </View>
            <Text style={styles.recText}>{rec}</Text>
          </View>
        ))}
      </View>

      {/* Notes (raw, filtered) */}
      {result.notes && result.notes.filter((n) => n !== 'PARTIAL_ANALYSIS' && n !== 'SCRAPE_FAILED').length > 0 && (
        <View style={styles.notesBox}>
          {result.notes
            .filter((n) => n !== 'PARTIAL_ANALYSIS' && n !== 'SCRAPE_FAILED')
            .map((n, i) => (
              <Text key={i} style={styles.note}>• {n}</Text>
            ))}
        </View>
      )}

      {/* Bottom CTAs */}
      <View style={styles.actions}>
        {isPartial ? (
          <Pressable
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={() => nav.replace('DetectByFeatures', { prefill: extracted })}
          >
            <Ionicons name="document-text-outline" size={18} color="#fff" />
            <Text style={styles.ctaText}>Get full ML analysis</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={() => nav.popToTop()}
          >
            <Ionicons name="checkmark" size={18} color="#fff" />
            <Text style={styles.ctaText}>Got it, Stay Safe!</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

function Metric({ icon, label, value, good }: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  good?: boolean;
}) {
  const tint = good === true ? colors.safe : good === false ? colors.fake : colors.primary;
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: tint + '14' }]}>
        <Ionicons name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricVal}>{value}</Text>
    </View>
  );
}

function formatNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

function buildRecommendations(level: 'safe' | 'suspicious' | 'likely_fake'): string[] {
  if (level === 'likely_fake') {
    return [
      'Block this profile on the platform',
      'Report the account to the platform',
      'Do NOT click any links shared by this account',
      'Warn anyone who interacted with the profile',
    ];
  }
  if (level === 'suspicious') {
    return [
      'Verify with another channel before engaging',
      'Avoid sharing personal info or money',
      'Check mutual connections if possible',
    ];
  }
  return [
    'Profile looks genuine — normal precautions apply',
    'Stay alert for any unusual behavior',
  ];
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  method: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  shareBtn: {
    width: 30, height: 30, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSurface,
  },
  label: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, marginBottom: 14 },

  gaugeCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    paddingTop: 18, paddingBottom: 22,
    alignItems: 'center',
  },
  verdictTitle: { fontSize: 18, fontWeight: '800', marginTop: 10, letterSpacing: -0.2 },
  verdictConf: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  confidenceVal: { color: colors.text, fontWeight: '700', textTransform: 'capitalize' },

  partialBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'flex-start',
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary + '33', borderWidth: 1,
    padding: 12, borderRadius: radii.md, marginTop: 12,
  },
  partialTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  partialBody: { color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginTop: 3 },

  sectionLabel: {
    color: colors.textMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginTop: 18, marginBottom: 10,
  },

  flagsCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 14,
    marginTop: 14,
  },
  flagsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  flagsTitle: { color: colors.text, fontSize: 14, fontWeight: '700', flex: 1 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  countBadgeText: { fontSize: 11, fontWeight: '800' },
  flagRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 5 },
  flagNum: { color: colors.fake, fontSize: 13, fontWeight: '700', minWidth: 16 },
  flagText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: TILE_GAP },
  metric: {
    width: METRIC_W,
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: 12,
  },
  metricIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  metricLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  metricVal: { color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 2 },

  recommendCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  recRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  recDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  recBullet: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  recText: { color: colors.textSecondary, fontSize: 13, flex: 1, lineHeight: 19 },

  notesBox: { marginTop: 12, padding: 12, backgroundColor: colors.bgSubtle, borderRadius: radii.md },
  note: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },

  actions: { marginTop: 22 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 15, borderRadius: radii.md,
  },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
