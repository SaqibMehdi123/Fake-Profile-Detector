import React from 'react';
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii } from '../theme';
import type { Platform } from '../api';

interface Props {
  value: Platform;
  onChange: (p: Platform) => void;
}

const opts: { key: Platform; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { key: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: colors.instagram },
  { key: 'twitter',   label: 'X / Twitter', icon: 'logo-twitter', color: colors.twitter },
  { key: 'facebook',  label: 'Facebook',  icon: 'logo-facebook', color: colors.facebook },
];

export default function PlatformPicker({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      {opts.map((o) => {
        const active = value === o.key;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[
              styles.btn,
              active && { borderColor: o.color, backgroundColor: o.color + '12' },
            ]}
          >
            <Ionicons name={o.icon} size={18} color={active ? o.color : colors.textMuted} />
            <Text style={[styles.label, active && { color: o.color, fontWeight: '700' }]}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    gap: 6,
  },
  label: { color: colors.textMuted, fontSize: 13 },
});
