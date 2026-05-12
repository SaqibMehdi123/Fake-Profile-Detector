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
 * Auto-detect the backend URL from the Expo dev server's host IP.
 * Since the backend runs on the same machine, we just swap the port to 8000.
 */
function getAutoDetectedBase(): string {
  try {
    const debuggerHost =
      (Constants as any).expoGoConfig?.debuggerHost ??
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ??
      Constants.expoConfig?.hostUri;
    if (debuggerHost) {
      const ip = debuggerHost.split(':')[0];
      if (ip) return `http://${ip}:8000`;
    }
  } catch {}
  return 'http://10.0.2.2:8000'; // fallback for Android emulator
}

export const DEFAULT_BASE = getAutoDetectedBase();

export async function getApiBase(): Promise<string> {
  const stored = await AsyncStorage.getItem(API_KEY);
  return stored || DEFAULT_BASE;
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
