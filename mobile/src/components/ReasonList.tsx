import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme';
import type { Reason } from '../api';

interface Props {
  reasons: Reason[];
  title?: string;
}

const iconFor = (impact: Reason['impact']) => {
  if (impact === 'negative') return { name: 'alert-circle' as const, color: colors.fake };
  if (impact === 'positive') return { name: 'checkmark-circle' as const, color: colors.safe };
  return { name: 'information-circle' as const, color: colors.primary };
};

export default function ReasonList({ reasons, title = 'Why we flagged it' }: Props) {
  if (!reasons.length) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {reasons.map((r, i) => {
        const ic = iconFor(r.impact);
        return (
          <View key={i} style={[styles.row, i === reasons.length - 1 && { borderBottomWidth: 0 }]}>
            <Ionicons name={ic.name} size={18} color={ic.color} style={styles.icon} />
            <Text style={styles.text}>{r.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgSurface,
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.textMuted, fontSize: 11, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  row: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { marginRight: 10, marginTop: 1 },
  text: { color: colors.textSecondary, flex: 1, fontSize: 14, lineHeight: 20 },
});
