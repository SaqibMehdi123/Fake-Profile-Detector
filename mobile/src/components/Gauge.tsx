import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, riskColor, riskLabel } from '../theme';
import type { RiskLevel } from '../api';

const W = 260;
const H = 170;
const CX = W / 2;
const CY = 140;
const R = 100;
const STROKE = 22;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const pointAt = (deg: number, radius: number = R) => ({
  x: CX + radius * Math.cos(toRad(deg)),
  y: CY - radius * Math.sin(toRad(deg)),
});

// Build a half-circle as 5 colored segments for a smoother speedometer feel:
// 180-144°: green, 144-108°: light-green, 108-72°: amber, 72-36°: orange, 36-0°: red
const SEGMENTS: { from: number; to: number; color: string }[] = [
  { from: 180, to: 144, color: '#16A34A' }, // green
  { from: 144, to: 108, color: '#84CC16' }, // lime
  { from: 108, to: 72,  color: '#F59E0B' }, // amber
  { from: 72,  to: 36,  color: '#F97316' }, // orange
  { from: 36,  to: 0,   color: '#DC2626' }, // red
];

const seg = (from: number, to: number) => {
  const a = pointAt(from);
  const b = pointAt(to);
  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
};

interface Props {
  probability: number; // 0-1
  riskLevel: RiskLevel;
}

export default function Gauge({ probability, riskLevel }: Props) {
  const [t, setT] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const duration = 1200;
    let raf: number;
    const tick = () => {
      const k = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setT(eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [probability]);

  const animatedProb = t * probability;
  const angle = 180 - animatedProb * 180;
  const needleTip = pointAt(angle, R - 4);
  const needleLeft = pointAt(angle + 90, 6);
  const needleRight = pointAt(angle - 90, 6);

  const pct = Math.round(probability * 100);
  const color = riskColor(riskLevel);

  return (
    <View style={styles.wrap}>
      <Svg width={W} height={H}>
        <Defs>
          <LinearGradient id="needleGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1F2937" />
            <Stop offset="1" stopColor="#4B5563" />
          </LinearGradient>
        </Defs>

        {/* Track segments */}
        <G>
          {SEGMENTS.map((s, i) => (
            <Path
              key={i}
              d={seg(s.from, s.to)}
              stroke={s.color}
              strokeWidth={STROKE}
              strokeLinecap={i === 0 || i === SEGMENTS.length - 1 ? 'round' : 'butt'}
              fill="none"
            />
          ))}
        </G>

        {/* Inner subtle highlight ring */}
        <Path
          d={seg(180, 0)}
          stroke="rgba(255,255,255,0.18)"
          strokeWidth={4}
          fill="none"
        />

        {/* Needle (triangle from base to tip) */}
        <Path
          d={`M ${needleLeft.x} ${needleLeft.y} L ${needleTip.x} ${needleTip.y} L ${needleRight.x} ${needleRight.y} Z`}
          fill="url(#needleGrad)"
        />

        {/* Pivot */}
        <Circle cx={CX} cy={CY} r={10} fill="#1F2937" />
        <Circle cx={CX} cy={CY} r={5}  fill="#fff" />
      </Svg>

      <View style={styles.center}>
        <Text style={[styles.pct, { color }]}>{pct}%</Text>
        <Text style={[styles.label, { color }]}>{riskLabel(riskLevel)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: W, alignSelf: 'center', alignItems: 'center' },
  center: { alignItems: 'center', marginTop: 4 },
  pct: { fontSize: 44, fontWeight: '800', letterSpacing: -1.5 },
  label: { fontSize: 14, fontWeight: '700', marginTop: -2 },
});
