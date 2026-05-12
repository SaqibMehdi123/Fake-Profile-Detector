import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform as RNPlatform } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, riskColor, riskBg, riskLabel } from '../theme';
import { api, AnalyzeResult } from '../api';
import ReasonList from '../components/ReasonList';
import { useStore } from '../store';

export default function UsernameAnalyzerScreen() {
  const add = useStore((s) => s.add);
  const [username, setUsername] = useState('');
  const [result, setResult] = useState<(AnalyzeResult & { username: string }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!username.trim()) return;
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const r = await api.analyzeUsername(username.trim());
      setResult(r);
      await add({
        method: 'username',
        label: '@' + username.trim(),
        risk_level: r.risk_level,
        fake_probability: r.suspicion_score,
        result: {
          is_fake: r.suspicion_score >= 0.5,
          fake_probability: r.suspicion_score,
          confidence: 'medium',
          risk_level: r.risk_level,
          reasons: r.reasons,
          notes: ['Username heuristic analysis only'],
        } as any,
      });
    } catch (e: any) {
      setError(e?.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.title}>Username Pattern Check</Text>
          <Text style={styles.sub}>Detects auto-generated and bot-style handles instantly. No internet check required.</Text>
        </View>

        <TextInput
          mode="outlined"
          label="Username"
          value={username}
          onChangeText={setUsername}
          placeholder="johndoe"
          autoCapitalize="none"
          autoCorrect={false}
          outlineColor={colors.border}
          activeOutlineColor={colors.primary}
          textColor={colors.text}
          style={{ backgroundColor: colors.bgSurface }}
          left={<TextInput.Icon icon="at" color={colors.textMuted} />}
        />

        <Button
          mode="contained"
          onPress={submit}
          loading={loading}
          disabled={loading || !username.trim()}
          buttonColor={colors.primary}
          textColor="#fff"
          style={{ borderRadius: radii.md, marginTop: 14 }}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: '700', fontSize: 14 }}
        >
          Analyze
        </Button>

        {error && (
          <View style={styles.errBox}>
            <Ionicons name="alert-circle" size={18} color={colors.fake} />
            <Text style={styles.errText}>{error}</Text>
          </View>
        )}

        {result && (
          <View style={{ marginTop: 22 }}>
            <View style={[styles.scoreCard, { backgroundColor: riskBg(result.risk_level), borderColor: riskColor(result.risk_level) + '33' }]}>
              <Text style={styles.scoreLabel}>SUSPICION SCORE</Text>
              <Text style={[styles.scoreNum, { color: riskColor(result.risk_level) }]}>
                {Math.round(result.suspicion_score * 100)}%
              </Text>
              <View style={[styles.verdictPill, { backgroundColor: riskColor(result.risk_level) }]}>
                <Text style={styles.verdictText}>{riskLabel(result.risk_level)}</Text>
              </View>
              <Text style={styles.scoreSub}>for @{result.username}</Text>
            </View>
            <View style={{ marginTop: 14 }}>
              <ReasonList reasons={result.reasons} title="Pattern signals" />
            </View>
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

  scoreCard: {
    alignItems: 'center', padding: 22,
    borderRadius: radii.lg, borderWidth: 1,
  },
  scoreLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  scoreNum: { fontSize: 56, fontWeight: '800', letterSpacing: -2, marginVertical: 2 },
  verdictPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999, marginTop: 4 },
  verdictText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  scoreSub: { color: colors.textMuted, fontSize: 12, marginTop: 8 },

  errBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: colors.fakeBg, borderColor: colors.fake + '33',
    borderWidth: 1, padding: 12, borderRadius: radii.md, marginTop: 14,
  },
  errText: { color: colors.fake, fontSize: 12, flex: 1 },
});
