import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export type Platform = 'instagram' | 'twitter' | 'facebook';
export type RiskLevel = 'safe' | 'suspicious' | 'likely_fake';
export type Confidence = 'low' | 'medium' | 'high';

export interface FeatureInput {
  platform: Platform;
  username?: string;
  full_name?: string;
  bio?: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  has_profile_pic?: boolean;
  has_external_url?: boolean;
  is_private?: boolean;
}

export interface Reason {
  label: string;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface PredictionResult {
  is_fake: boolean;
  fake_probability: number;
  confidence: Confidence;
  risk_level: RiskLevel;
  reasons: Reason[];
  top_features?: { feature: string; importance: number; value: number }[];
  extracted?: FeatureInput;
  notes?: string[];
}

export interface AnalyzeResult {
  suspicion_score: number;
  risk_level: RiskLevel;
  reasons: Reason[];
}

const API_KEY = 'API_BASE_URL';

/**
 * Auto-detect the backend URL from the Expo dev server's host IP each time.
 * Lazy so a Wi-Fi reconnect / IP change is picked up automatically.
 */
export function getDefaultBase(): string {
  try {
    const c: any = Constants;
    const sources: any[] = [
      c.expoGoConfig?.debuggerHost,
      c.expoGoConfig?.hostUri,
      c.manifest2?.extra?.expoGo?.debuggerHost,
      c.expoConfig?.hostUri,
      c.manifest?.debuggerHost,
      c.manifest?.hostUri,
      c.linkingUri,
    ];
    for (const src of sources) {
      if (typeof src !== 'string' || !src) continue;
      // src looks like "192.168.1.5:8081" or "exp://192.168.1.5:8081"
      const m = src.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
      if (m && m[1]) return `http://${m[1]}:8000`;
    }
  } catch {}
  return 'http://10.0.2.2:8000'; // Android emulator fallback
}

// Kept for any imports that still reference the old constant (e.g. Settings UI)
export const DEFAULT_BASE = getDefaultBase();

export async function getApiBase(): Promise<string> {
  const stored = await AsyncStorage.getItem(API_KEY);
  // If user saved a custom URL, use it; otherwise recompute auto-detected base each call.
  return stored || getDefaultBase();
}

export async function setApiBase(url: string) {
  await AsyncStorage.setItem(API_KEY, url.replace(/\/+$/, ''));
}

export async function resetApiBase() {
  await AsyncStorage.removeItem(API_KEY);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const base = await getApiBase();
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export const api = {
  health: async () => {
    const base = await getApiBase();
    const res = await fetch(`${base}/health`, { method: 'GET' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<{ status: string; mode: 'heuristic' | 'ml' }>;
  },
  predictFeatures: (inp: FeatureInput) => post<PredictionResult>('/predict/features', inp),
  predictLink: (url: string) => post<PredictionResult>('/predict/link', { url }),
  analyzeUsername: (username: string, platform: Platform = 'instagram') =>
    post<AnalyzeResult & { username: string; platform: Platform }>('/analyze/username', { username, platform }),
  analyzeBio: (text: string) => post<AnalyzeResult & { text: string }>('/analyze/bio', { text }),
};
