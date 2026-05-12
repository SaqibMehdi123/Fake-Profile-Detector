import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform as RNPlatform, Switch } from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, RouteProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme';
import { api, FeatureInput, Platform as PlatformType } from '../api';
import { useStore } from '../store';
import PlatformPicker from '../components/PlatformPicker';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList, 'DetectByFeatures'>;
type Rt = RouteProp<RootStackParamList, 'DetectByFeatures'>;

export default function DetectByFeaturesScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Rt>();
  const add = useStore((s) => s.add);
  const prefill = route.params?.prefill as Partial<FeatureInput> | undefined;

  const [platform, setPlatform] = useState<PlatformType>((prefill?.platform as PlatformType) || 'instagram');
  const [username, setUsername] = useState(prefill?.username || '');
  const [fullName, setFullName] = useState(prefill?.full_name || '');
  const [bio, setBio] = useState(prefill?.bio || '');
  const [followers, setFollowers] = useState(String(prefill?.followers_count ?? ''));
  const [following, setFollowing] = useState(String(prefill?.following_count ?? ''));
  const [posts, setPosts] = useState(String(prefill?.posts_count ?? ''));
  const [hasPic, setHasPic] = useState(prefill?.has_profile_pic ?? true);
  const [hasUrl, setHasUrl] = useState(prefill?.has_external_url ?? false);
  const [isPrivate, setIsPrivate] = useState(prefill?.is_private ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      const inp: FeatureInput = {
        platform,
        username: username.trim(),
        full_name: fullName.trim(),
        bio,
        followers_count: parseInt(followers || '0') || 0,
        following_count: parseInt(following || '0') || 0,
        posts_count: parseInt(posts || '0') || 0,
        has_profile_pic: hasPic,
        has_external_url: hasUrl,
        is_private: isPrivate,
      };
      const result = await api.predictFeatures(inp);
      const label = username ? '@' + username : 'Manual entry';
      await add({ method: 'features', platform, label, risk_level: result.risk_level, fake_probability: result.fake_probability, result });
      nav.replace('Result', { result, method: 'features', label });
    } catch (e: any) {
      setError(e?.message || 'Request failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={RNPlatform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {prefill && (
          <View style={styles.prefillBanner}>
            <Ionicons name="information-circle" size={18} color={colors.primary} />
            <Text style={styles.prefillText}>
              Some fields were pre-filled from the link you provided. Adjust anything that looks off, then submit.
            </Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Platform</Text>
        <PlatformPicker value={platform} onChange={setPlatform} />

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Profile basics</Text>
        <Field label="Username (without @)" value={username} onChangeText={setUsername} placeholder="e.g. johndoe" />
        <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="e.g. John Doe" />
        <Field label="Bio / Description" value={bio} onChangeText={setBio} placeholder="Profile bio text" multiline numberOfLines={3} />

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Numbers</Text>
        <View style={styles.row}>
          <Field label="Followers" value={followers} onChangeText={setFollowers} keyboardType="numeric" half />
          <Field label="Following" value={following} onChangeText={setFollowing} keyboardType="numeric" half />
        </View>
        <Field label="Posts / Tweets" value={posts} onChangeText={setPosts} keyboardType="numeric" />

        <Text style={[styles.sectionLabel, { marginTop: 22 }]}>Flags</Text>
        <View style={styles.toggleGroup}>
          <Toggle label="Has profile picture" value={hasPic} onValueChange={setHasPic} />
          <Toggle label="Has external URL in bio" value={hasUrl} onValueChange={setHasUrl} divider />
          <Toggle label="Account is private" value={isPrivate} onValueChange={setIsPrivate} divider isLast />
        </View>

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
          disabled={loading}
          buttonColor={colors.primary}
          textColor="#fff"
          style={{ borderRadius: radii.md, marginTop: 24 }}
          contentStyle={{ paddingVertical: 6 }}
          labelStyle={{ fontWeight: '700', fontSize: 14 }}
        >
          Run Detection
        </Button>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field(props: any) {
  const { label, half, ...rest } = props;
  return (
    <View style={[{ marginTop: 10 }, half && { flex: 1 }]}>
      <TextInput
        mode="outlined"
        label={label}
        outlineColor={colors.border}
        activeOutlineColor={colors.primary}
        textColor={colors.text}
        style={{ backgroundColor: colors.bgSurface }}
        {...rest}
      />
    </View>
  );
}

function Toggle({ label, value, onValueChange, divider, isLast }: { label: string; value: boolean; onValueChange: (v: boolean) => void; divider?: boolean; isLast?: boolean }) {
  return (
    <View style={[styles.toggleRow, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ true: colors.primary, false: colors.borderStrong }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 60 },
  sectionLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },

  toggleGroup: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    overflow: 'hidden',
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
  },
  toggleLabel: { color: colors.text, fontSize: 14 },

  prefillBanner: {
    flexDirection: 'row', gap: 10, alignItems: 'center',
    backgroundColor: colors.primarySubtle,
    borderColor: colors.primary + '33', borderWidth: 1,
    padding: 12, borderRadius: radii.md, marginBottom: 16,
  },
  prefillText: { color: colors.text, fontSize: 12, flex: 1, lineHeight: 18 },

  errBox: {
    flexDirection: 'row', gap: 8, alignItems: 'center',
    backgroundColor: colors.fakeBg, borderColor: colors.fake + '33',
    borderWidth: 1, padding: 12, borderRadius: radii.md, marginTop: 14,
  },
  errText: { color: colors.fake, fontSize: 12, flex: 1 },
});
