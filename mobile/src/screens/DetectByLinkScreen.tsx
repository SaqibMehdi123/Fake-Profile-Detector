import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform as RNPlatform, ActivityIndicator } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { colors, radii } from '../theme';
import { api } from '../api';
import { useStore } from '../store';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DetectByLink'>;
type Rt = RouteProp<RootStackParamList, 'DetectByLink'>;

const STEPS = [
  'Resolving profile URL…',
  'Fetching public profile data…',
  'Extracting features…',
  'Running ML model…',
  'Generating verdict…',
];

export default function DetectByLinkScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const prefillUrl = route.params?.prefillUrl;
  const add = useStore((s) => s.add);
  const [url, setUrl] = useState(prefillUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartedRef = useRef(false);

  useEffect(() => () => { if (stepTimer.current) clearInterval(stepTimer.current); }, []);

  // Auto-start detection if URL was passed in from Dashboard
  useEffect(() => {
    if (prefillUrl && !autoStartedRef.current) {
      autoStartedRef.current = true;
      submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillUrl]);

  const paste = async () => {
    const t = await Clipboard.getStringAsync();
    if (t) setUrl(t.trim());
  };

  const detectPlatform = (u: string) => {
    if (/instagram\.com/i.test(u)) return 'instagram';
    if (/twitter\.com|x\.com/i.test(u)) return 'twitter';
    if (/facebook\.com|fb\.com/i.test(u)) return 'facebook';
    return null;
  };

  const submit = async () => {
    if (!url.trim()) return;
    setError(null);
    setLoading(true);
    setStepIdx(0);
    stepTimer.current = setInterval(() => {
      setStepIdx((i) => Math.min(i + 1, STEPS.length - 1));
    }, 700);
    try {
      const result = await api.predictLink(url.trim());
      const platform = detectPlatform(url) ?? 'instagram';
      const totallyFailed = result.notes?.includes('SCRAPE_FAILED');
      if (totallyFailed && result.extracted) {
        nav.replace('DetectByFeatures', { prefill: { ...result.extracted, platform } });
        return;
      }
      const label = result.extracted?.username ? '@' + result.extracted.username : url.trim();
      await add({ method: 'link', platform: platform as any, label, risk_level: result.risk_level, fake_probability: result.fake_probability, result });
      nav.replace('Result', { result, method: 'link', label });
    } catch (e: any) {
      setError(e?.message || 'Request failed. Is the backend running?');
    } finally {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setLoading(false);
    }
  };

  if (loading) {
    return <AnalyzingView stepIdx={stepIdx} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.title}>Paste a profile link</Text>
          <Text style={styles.sub}>
            We fetch the public profile and run it through the ML model. If the platform blocks the request, you'll get a username-only verdict with the option to fill in stats manually.
          </Text>
        </View>

        <TextInput
          mode="outlined"
          label="Profile URL"
          value={url}
          onChangeText={setUrl}
          placeholder="https://instagram.com/username"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          textColor={colors.text}
          style={{ backgroundColor: colors.bgSurface }}
          right={<TextInput.Icon icon="content-paste" onPress={paste} color={colors.primary} />}
        />
        <Text style={styles.hint}>Supported: instagram.com · x.com / twitter.com · facebook.com</Text>

        {error && (
          <View style={styles.errBox}>
            <Ionicons name="alert-circle" size={18} color={colors.fake} />
            <Text style={styles.errText}>{error}</Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={submit}
          disabled={!url.trim()}
          buttonColor={colors.primary}
          textColor="#fff"
          style={{ borderRadius: radii.md, marginTop: 14 }}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: '700', fontSize: 14 }}
        >
          Detect Profile
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AnalyzingView({ stepIdx }: { stepIdx: number }) {
  return (
    <View style={styles.analyzeWrap}>
      <View style={styles.analyzeCircle}>
        <View style={styles.analyzeInner}>
          <Ionicons name="person" size={48} color={colors.textDim} />
        </View>
        <View style={styles.spinnerWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
      <Text style={styles.analyzeTitle}>Analyzing Profile Data…</Text>
      <View style={{ marginTop: 16, alignItems: 'center' }}>
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          return (
            <View key={i} style={styles.stepRow}>
              <Ionicons
                name={done ? 'checkmark-circle' : active ? 'ellipsis-horizontal-circle' : 'ellipse-outline'}
                size={16}
                color={done ? colors.safe : active ? colors.primary : colors.textDim}
              />
              <Text style={[
                styles.stepText,
                done && { color: colors.safe },
                active && { color: colors.text, fontWeight: '600' },
              ]}>{s}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((stepIdx + 1) / STEPS.length) * 100}%` }]} />
      </View>
      <Text style={styles.progressText}>{Math.round(((stepIdx + 1) / STEPS.length) * 100)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 40 },
  intro: { marginBottom: 16, marginTop: 4 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  sub: { color: colors.textMuted, fontSize: 13, marginTop: 6, lineHeight: 19 },
  hint: { color: colors.textDim, fontSize: 11, marginTop: 6, marginLeft: 4 },
  errBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: colors.fakeBg, borderColor: colors.fake + '33',
    borderWidth: 1, padding: 12, borderRadius: radii.md, marginTop: 14,
  },
  errText: { color: colors.fake, fontSize: 12, flex: 1 },

  analyzeWrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  analyzeCircle: {
    width: 160, height: 160,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  analyzeInner: {
    position: 'absolute',
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  spinnerWrap: {
    position: 'absolute',
    width: 160, height: 160,
    alignItems: 'center', justifyContent: 'center',
  },
  analyzeTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 8 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  stepText: { color: colors.textMuted, fontSize: 13 },
  progressBar: {
    width: '70%', height: 6, backgroundColor: colors.bgSubtle,
    borderRadius: 999, marginTop: 18, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 999 },
  progressText: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
});
