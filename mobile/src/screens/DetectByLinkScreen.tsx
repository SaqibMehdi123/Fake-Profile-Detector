import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform as RNPlatform } from 'react-native';
import { TextInput, Button, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii } from '../theme';
import { api } from '../api';
import { useStore } from '../store';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DetectByLink'>;

export default function DetectByLinkScreen() {
  const nav = useNavigation<Nav>();
  const add = useStore((s) => s.add);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const result = await api.predictLink(url.trim());
      const platform = detectPlatform(url) ?? 'instagram';
      // Only redirect to manual when we couldn't even extract a username.
      // For partial analysis (scrape blocked but username found), show the result.
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
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.title}>Paste a profile link</Text>
          <Text style={styles.sub}>
            We try to fetch public profile data automatically and run it through the model.
            If the platform blocks the request, we hand off to the manual form pre-filled.
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
          loading={loading}
          disabled={loading || !url.trim()}
          buttonColor={colors.primary}
          textColor="#fff"
          style={{ borderRadius: radii.md, marginTop: 14 }}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: '700', fontSize: 14 }}
        >
          {loading ? 'Analyzing…' : 'Detect Profile'}
        </Button>

        {loading && (
          <View style={styles.loadingHint}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Scraping public profile and running ML model…</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  loadingHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 18 },
  loadingText: { color: colors.textMuted, fontSize: 12 },
});
