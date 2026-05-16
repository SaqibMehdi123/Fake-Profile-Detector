import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
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
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Settings</Text>

        {/* Prominent status banner */}
        <View style={[
          styles.statusBanner,
          status === 'ok'      && { backgroundColor: colors.safeBg,   borderColor: colors.safe + '33' },
          status === 'error'   && { backgroundColor: colors.fakeBg,   borderColor: colors.fake + '33' },
          status === 'unknown' && { backgroundColor: colors.bgSubtle, borderColor: colors.border },
        ]}>
          <View style={[styles.statusBigDot, {
            backgroundColor: status === 'ok' ? colors.safe : status === 'error' ? colors.fake : colors.textDim,
          }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusBannerTitle}>
              {status === 'ok' && 'Backend connected'}
              {status === 'error' && 'Backend offline'}
              {status === 'unknown' && 'Checking connection…'}
            </Text>
            <Text style={styles.statusBannerSub}>
              {status === 'ok' && `mode: ${mode}`}
              {status === 'error' && (mode === 'not the backend'
                ? 'URL responded but is not our backend — wrong port?'
                : 'Set the backend URL below and tap Save.')}
              {status === 'unknown' && 'Pinging /health …'}
            </Text>
          </View>
          <Pressable onPress={test} hitSlop={10} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Backend URL card — REQUIRED for installed APK builds where auto-detect can't work */}
        <Text style={styles.section}>Backend URL</Text>
        <View style={styles.card}>
          <TextInput
            mode="outlined"
            value={url}
            onChangeText={setUrl}
            placeholder="http://192.168.1.5:8000"
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
              ? 'Custom URL saved.'
              : 'Auto-detected from your dev server. In a production APK you must enter it manually:\n  • LAN: http://<laptop-ip>:8000 (phone + laptop on same Wi-Fi)\n  • Public: paste your ngrok https URL'}
          </Text>
          <View style={styles.btnRow}>
            <Button mode="outlined" onPress={test} textColor={colors.text} style={{ flex: 1, borderColor: colors.border }}>Test</Button>
            <Button mode="contained" onPress={save} loading={saving} buttonColor={colors.primary} style={{ flex: 1 }}>Save</Button>
          </View>
          {isCustom && (
            <Pressable onPress={reset} style={styles.resetLink}>
              <Ionicons name="refresh" size={13} color={colors.primary} />
              <Text style={styles.resetLinkText}>Reset to auto-detected ({DEFAULT_BASE})</Text>
            </Pressable>
          )}
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
  section: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },

  card: { backgroundColor: colors.bgSurface, padding: 16, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border },
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 8, lineHeight: 16 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rowIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: colors.primarySubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { color: colors.text, fontSize: 13, flex: 1 },
  rowVal: { color: colors.textMuted, fontSize: 12 },

  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: radii.lg, borderWidth: 1, marginBottom: 8,
  },
  statusBigDot: { width: 12, height: 12, borderRadius: 6 },
  statusBannerTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  statusBannerSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  refreshBtn: {
    width: 34, height: 34, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border,
  },

  resetLink: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 10, paddingHorizontal: 2,
  },
  resetLinkText: { color: colors.primary, fontSize: 11, fontWeight: '600' },

  disclaimer: { color: colors.textMuted, fontSize: 11, marginTop: 16, lineHeight: 16, textAlign: 'center' },
});
