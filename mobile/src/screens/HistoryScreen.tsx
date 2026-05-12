import React, { useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors, radii, riskColor, riskLabel } from '../theme';
import { useStore, type HistoryEntry } from '../store';
import type { RootStackParamList } from '../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function HistoryScreen() {
  const nav = useNavigation<Nav>();
  const history = useStore((s) => s.history);
  const load = useStore((s) => s.load);
  const clear = useStore((s) => s.clear);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(React.useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        {history.length > 0 && (
          <Button mode="text" onPress={clear} textColor={colors.fake} compact>Clear</Button>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="time-outline" size={32} color={colors.textDim} />
          </View>
          <Text style={styles.emptyTitle}>No checks yet</Text>
          <Text style={styles.emptySub}>Run any detection from the Home tab — your results will appear here.</Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          renderItem={({ item, index }) => (
            <HistoryRow
              item={item}
              isFirst={index === 0}
              isLast={index === history.length - 1}
              onPress={() => nav.navigate('Result', { result: item.result, method: item.method, label: item.label })}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function HistoryRow({ item, onPress, isFirst, isLast }: { item: HistoryEntry; onPress: () => void; isFirst: boolean; isLast: boolean }) {
  const date = new Date(item.timestamp);
  const dateStr = date.toLocaleDateString() + ' · ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [
      styles.row,
      isFirst && { borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, borderTopWidth: 1 },
      isLast && { borderBottomLeftRadius: radii.lg, borderBottomRightRadius: radii.lg, borderBottomWidth: 1 },
      !isLast && styles.rowDivider,
      pressed && { backgroundColor: colors.bgHover },
    ]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={1}>{item.label}</Text>
        <Text style={styles.meta}>{item.method}{item.platform ? ' · ' + item.platform : ''} · {dateStr}</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: riskColor(item.risk_level) + '14' }]}>
        <Text style={[styles.badgeText, { color: riskColor(item.risk_level) }]}>
          {Math.round(item.fake_probability * 100)}%
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 14 },
  title: { color: colors.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  emptySub: { color: colors.textMuted, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },

  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 16, paddingVertical: 14,
    gap: 10,
    borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border,
  },
  rowDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  label: { color: colors.text, fontSize: 14, fontWeight: '600' },
  meta: { color: colors.textMuted, fontSize: 11, marginTop: 2, textTransform: 'capitalize' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },
});
