import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radii } from '../theme';

interface Props {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  onPress: () => void;
  isLast?: boolean;
}

export default function ListRow({ title, subtitle, icon, iconColor, iconBg, onPress, isLast }: Props) {
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.divider,
        pressed && { backgroundColor: colors.bgHover },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: iconBg || colors.primarySubtle }]}>
        <Ionicons name={icon} size={20} color={iconColor || colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: colors.bgSurface,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  iconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { color: colors.text, fontSize: 15, fontWeight: '600', letterSpacing: -0.1 },
  subtitle: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
});
