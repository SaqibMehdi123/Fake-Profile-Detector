import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PredictionResult, Platform } from './api';

const HISTORY_KEY = 'detection_history_v1';
const MAX_HISTORY = 50;

export interface HistoryEntry {
  id: string;
  timestamp: number;
  method: 'link' | 'features' | 'username' | 'bio';
  platform?: Platform;
  label: string;       // username / URL / first words of bio
  risk_level: 'safe' | 'suspicious' | 'likely_fake';
  fake_probability: number;
  result: PredictionResult;
}

interface State {
  history: HistoryEntry[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => Promise<void>;
  clear: () => Promise<void>;
}

export const useStore = create<State>((set, get) => ({
  history: [],
  loaded: false,
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(HISTORY_KEY);
      const history: HistoryEntry[] = raw ? JSON.parse(raw) : [];
      set({ history, loaded: true });
    } catch {
      set({ history: [], loaded: true });
    }
  },
  add: async (entry) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      timestamp: Date.now(),
    };
    const next = [newEntry, ...get().history].slice(0, MAX_HISTORY);
    set({ history: next });
    try { await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch {}
  },
  clear: async () => {
    set({ history: [] });
    try { await AsyncStorage.removeItem(HISTORY_KEY); } catch {}
  },
}));
