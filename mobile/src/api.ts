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

// ---------- Auto-discovery (LAN scan) ----------
async function probeHost(host: string, timeoutMs = 1200): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(`http://${host}:8000/health`, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const j: any = await res.json();
    if (j && (j.mode === 'ml' || j.mode === 'heuristic')) return `http://${host}:8000`;
  } catch {}
  return null;
}

/**
 * Scan likely LAN subnets for a running backend on port 8000.
 * Priority order:
 *  1. Last-saved URL's subnet (fastest — covers DHCP IP changes on same network)
 *  2. Expo dev-server subnet (Constants.hostUri, works in dev mode)
 *  3. Common home/office router subnets (192.168.1.x, 192.168.0.x, 10.0.0.x, ...)
 * Returns the first /health that responds with a valid mode, else null.
 */
export async function discoverBackend(
  onProgress?: (msg: string) => void,
  signal?: AbortSignal,
): Promise<string | null> {
  const subnets = new Set<string>();
  const ipv4Of = (s: string): string | null => {
    const m = s.match(/(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}/);
    return m ? m[1] : null;
  };
  // 1. Last-saved
  try {
    const stored = await AsyncStorage.getItem(API_KEY);
    if (stored) { const n = ipv4Of(stored); if (n) subnets.add(n); }
  } catch {}
  // 2. Dev server
  try {
    const c: any = Constants;
    for (const src of [c.expoGoConfig?.debuggerHost, c.expoGoConfig?.hostUri, c.expoConfig?.hostUri]) {
      if (typeof src === 'string') { const n = ipv4Of(src); if (n) subnets.add(n); }
    }
  } catch {}
  // 3. Common subnets
  ['192.168.1', '192.168.0', '10.0.0', '192.168.43', '172.20.10'].forEach((s) => subnets.add(s));

  const subnetList = [...subnets];
  const totalIps = subnetList.length * 254;
  let scanned = 0;
  for (const subnet of subnetList) {
    if (signal?.aborted) return null;
    onProgress?.(`Scanning ${subnet}.0/24…`);
    const ips = Array.from({ length: 254 }, (_, i) => `${subnet}.${i + 1}`);
    const BATCH = 16;
    for (let i = 0; i < ips.length; i += BATCH) {
      if (signal?.aborted) return null;
      const batch = ips.slice(i, i + BATCH);
      const results = await Promise.all(batch.map((ip) => probeHost(ip)));
      scanned += batch.length;
      onProgress?.(`Scanned ${scanned}/${totalIps}`);
      const found = results.find((r) => r !== null);
      if (found) return found;
    }
  }
  return null;
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
