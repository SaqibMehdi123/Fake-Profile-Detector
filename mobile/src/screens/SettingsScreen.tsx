import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme';
import { api, getApiBase, setApiBase, resetApiBase, DEFAULT_BASE, discoverBackend } from '../api';

export default function SettingsScreen() {
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [mode, setMode] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoverMsg, setDiscoverMsg] = useState('');
  const autoTriedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const test = async () => {
    setStatus('unknown');
    try {
      const h = await api.health();
      if (h && (h.mode === 'ml' || h.mode === 'heuristic')) {
        setStatus('ok'); setMode(h.mode); return true;
      }
      setStatus('error'); setMode('not the backend'); return false;
    } catch {
      setStatus('error'); setMode(''); return false;
    }
  };

  const discover = async () => {
    if (discovering) return;
    abortRef.current = new AbortController();
    setDiscovering(true);
    setDiscoverMsg('Starting…');
    const found = await discoverBackend(setDiscoverMsg, abortRef.current.signal);
    setDiscovering(false);
    setDiscoverMsg('');
    if (found) {
      await setApiBase(found);
      setUrl(found);
      setIsCustom(found !== DEFAULT_BASE);
      await test();
    } else if (!abortRef.current?.signal.aborted) {
      Alert.alert('Not found', 'Could not auto-detect a backend on your network. Enter the URL manually and tap Save.');
    }
  };

  const stopDiscover = () => abortRef.current?.abort();

  useEffect(() => {
    (async () => {
      const current = await getApiBase();
      setUrl(current);
      setIsCustom(current !== DEFAULT_BASE);
      const ok = await test();
      // First time loading + can't reach backend -> try auto-discovery once
      if (!ok && !autoTriedRef.current) {
        autoTriedRef.current = true;
        discover();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!url.trim()) return;
    setSaving(true);
    await setApiBase(url.trim());
    setIsCustom(url.trim() !== DEFAULT_BASE);
    setSaving(false);
    await test();
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

        {/* Status banner */}
        <View style={[
          styles.statusBanner,
          status === 'ok'      && { backgroundColor: colors.safeBg,   borderColor: colors.safe + '33' },
          status === 'error'   && { backgroundColor: colors.fakeBg,   borderColor: colors.fake + '33' },
          status === 'unknown' && { backgroundColor: colors.bgSubtle, borderColor: colors.border },
        ]}>
          <View style={[styles.statusDot, {
            backgroundColor: status === 'ok' ? colors.safe : status === 'error' ? colors.fake : colors.textDim,
          }]} />
          <View style={{ flex: 1 }}>
            <Text style={styles.statusTitle}>
              {status === 'ok' && 'Backend connected'}
              {status === 'error' && 'Backend offline'}
              {status === 'unknown' && 'Checking…'}
            </Text>
            <Text style={styles.statusSub}>
              {status === 'ok' && `mode: ${mode}`}
              {status === 'error' && (discovering ? discoverMsg : 'Tap Auto-detect below')}
              {status === 'unknown' && (discovering ? discoverMsg : 'Pinging /health…')}
            </Text>
          </View>
          <Pressable onPress={test} hitSlop={10} style={styles.refreshBtn}>
            <Ionicons name="refresh" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

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
          <Text style={styles.hint}>LAN IP or ngrok URL.</Text>
          <View style={styles.btnRow}>
            {discovering ? (
              <Button mode="outlined" onPress={stopDiscover} textColor={colors.fake} style={{ flex: 1, borderColor: colors.fake + '55' }}>
                Stop
              </Button>
            ) : (
              <Button mode="outlined" onPress={discover} textColor={colors.primary} style={{ flex: 1, borderColor: colors.border }} icon="magnify">
                Auto-detect
              </Button>
            )}
            <Button mode="contained" onPress={save} loading={saving} disabled={discovering} buttonColor={colors.primary} style={{ flex: 1 }}>
              Save
            </Button>
          </View>
          {isCustom && !discovering && (
            <Pressable onPress={reset} style={styles.resetLink}>
              <Ionicons name="refresh" size={12} color={colors.primary} />
              <Text style={styles.resetLinkText}>Reset to auto-detected</Text>
            </Pressable>
          )}
        </View>

        <Text style={styles.section}>About</Text>
        <View style={styles.card}>
          <Row icon="hardware-chip" label="ML model" value="LightGBM" isFirst />
          <Row icon="layers" label="Datasets" value="IG + Twitter bot" />
          <Row icon="globe" label="Platforms" value="Instagram · X · Facebook" />
          <Row icon="shield-checkmark" label="Version" value="1.0.0" isLast />
        </View>

        <Text style={styles.disclaimer}>
          Heuristic checks work offline. ML + link scraping need the backend.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ icon, label, value, isFirst, isLast }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; isFirst?: boolean; isLast?: boolean }) {
  return (
    <View style={[styles.row, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={16} color={colors.primary} /></View>
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
  hint: { color: colors.textMuted, fontSize: 11, marginTop: 6 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },

  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  rowIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.primarySubtle, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { color: colors.text, fontSize: 13, flex: 1 },
  rowVal: { color: colors.textMuted, fontSize: 12 },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radii.lg, borderWidth: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  statusSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  refreshBtn: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border },

  resetLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingHorizontal: 2 },
  resetLinkText: { color: colors.primary, fontSize: 11, fontWeight: '600' },

  disclaimer: { color: colors.textMuted, fontSize: 11, marginTop: 16, lineHeight: 16, textAlign: 'center' },
});
