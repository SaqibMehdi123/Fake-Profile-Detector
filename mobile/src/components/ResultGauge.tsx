import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, riskColor } from '../theme';
import type { RiskLevel } from '../api';

const SIZE = 200;
const STROKE = 14;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

interface Props {
  probability: number;
  riskLevel: RiskLevel;
}

// Plain JS animation (no Reanimated dependency) for max compatibility.
export default function ResultGauge({ probability, riskLevel }: Props) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 900;
    let raf: number;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setAnimated(eased * probability);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [probability]);

  const color = riskColor(riskLevel);
  const pct = Math.round(probability * 100);
  const dashOffset = CIRC - CIRC * animated;

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          stroke={colors.bgSubtle} strokeWidth={STROKE} fill="none"
        />
        <Circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          stroke={color} strokeWidth={STROKE} fill="none"
          strokeDasharray={`${CIRC} ${CIRC}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={[styles.pct, { color: colors.text }]}>{pct}%</Text>
        <Text style={styles.label}>fake probability</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  pct: { fontSize: 46, fontWeight: '800', letterSpacing: -1 },
  label: { color: colors.textMuted, fontSize: 11, marginTop: -2, textTransform: 'uppercase', letterSpacing: 0.8 },
});
