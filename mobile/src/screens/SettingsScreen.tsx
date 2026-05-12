import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme';
import { api, getApiBase, setApiBase, resetApiBase, DEFAULT_BASE } from '../api';

export default function SettingsScreen() {
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [mode, setMode] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  const test = async () => {
    setStatus('unknown');
    try {
      const h = await api.health();
      if (h && (h.mode === 'ml' || h.mode === 'heuristic')) {
        setStatus('ok');
        setMode(h.mode);
      } else {
        setStatus('error');
        setMode('not the backend');
      }
    } catch {
      setStatus('error');
      setMode('');
    }
  };

  useEffect(() => {
    (async () => {
      const current = await getApiBase();
      setUrl(current);
      setIsCustom(current !== DEFAULT_BASE);
      // Auto-test on mount so user sees connection status immediately
      test();
    })();
  }, []);

  const save = async () => {
    if (!url.trim()) return;
    setSaving(true);
    await setApiBase(url.trim());
    setIsCustom(url.trim() !== DEFAULT_BASE);
    setSaving(false);
    await test();
    Alert.alert('Saved', 'Backend URL updated.');
  };

  const reset = async () => {
    await resetApiBase();
    setUrl(DEFAULT_BASE);
    setIsCustom(false);
    await test();
    Alert.alert('Reset', 'Using auto-detected backend URL.');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.section}>Backend connection</Text>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>API base URL</Text>
          <TextInput
            mode="outlined"
            value={url}
            onChangeText={setUrl}
            placeholder={DEFAULT_BASE}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            outlineColor={colors.border}
            activeOutlineColor={colors.primary}
            textColor={colors.text}
            style={{ backgroundColor: colors.bgSurface }}
            dense
          />
          <Text style={styles.hint}>
            {isCustom
              ? `Custom URL. Auto-detected: ${DEFAULT_BASE}`
              : 'Auto-detected from your dev server. Override only if needed.'}
          </Text>
          <View style={styles.btnRow}>
            <Button mode="outlined" onPress={test} textColor={colors.text} style={{ flex: 1, borderColor: colors.border }}>Test</Button>
            <Button mode="contained" onPress={save} loading={saving} buttonColor={colors.primary} style={{ flex: 1 }}>Save</Button>
          </View>
          {isCustom && (
            <Button mode="text" onPress={reset} textColor={colors.textMuted} compact style={{ marginTop: 6 }}>Reset to auto-detected</Button>
          )}
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, {
              backgroundColor: status === 'ok' ? colors.safe : status === 'error' ? colors.fake : colors.textDim,
            }]} />
            <Text style={styles.statusText}>
              {status === 'ok' && `Connected · mode: ${mode}`}
              {status === 'error' && (mode === 'not the backend'
                ? 'URL responded but is not our backend — wrong port?'
                : 'Cannot reach backend')}
              {status === 'unknown' && 'Checking connection…'}
            </Text>
          </View>
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <Row icon="hardware-chip" label="ML model" value="LightGBM" isFirst />
          <Row icon="layers" label="Datasets" value="IG fake/real, Twitter bot" />
          <Row icon="globe" label="Platforms" value="Instagram · X · Facebook" />
          <Row icon="shield-checkmark" label="Version" value="1.0.0" isLast />
        </View>

        <Text style={styles.disclaimer}>
          Heuristic checks (username, bio) work offline. ML predictions and link scraping require the backend.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, isFirst, isLast }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; isFirst?: boolean; isLast?: boolean }) {
  return (
    <View style={[styles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowVal}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4, marginBottom: 18 },
  section: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 14, marginBottom: 8 },

  card: { backgroundColor: colors.bgSurface, padding: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  cardLabel: { color: colors.textSecondary, fontSize: 13, marginBottom: 8, fontWeight: '500' },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 8, lineHeight: 16 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: colors.textMuted, fontSize: 12 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rowIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { color: colors.text, fontSize: 13, flex: 1 },
  rowVal: { color: colors.textMuted, fontSize: 12 },

  disclaimer: { color: colors.textMuted, fontSize: 11, marginTop: 16, lineHeight: 16, textAlign: 'center' },
});
