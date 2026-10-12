import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface CoachMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  at: number;
}

interface CoachState {
  /** Kept on the phone only (the server doesn't store conversations). */
  messages: CoachMessage[];
  /** Agreed to the coach terms (18+, AI can be wrong, not medical advice). */
  consent: boolean;
  /** Replies left in the current period, as last reported by the server. */
  remaining: number | null;
  /** This week's AI insight, cached so it isn't regenerated. */
  weekly: { week: string; text: string } | null;
  add: (m: CoachMessage) => void;
  setConsent: (v: boolean) => void;
  setRemaining: (n: number | null) => void;
  setWeekly: (w: { week: string; text: string }) => void;
  clear: () => void;
}

const MAX = 60;

export const useCoachStore = create<CoachState>()(
  persist(
    (set) => ({
      messages: [],
      consent: false,
      remaining: null,
      weekly: null,
      add: (m) => set((s) => ({ messages: [...s.messages, m].slice(-MAX) })),
      setConsent: (consent) => set({ consent }),
      setRemaining: (remaining) => set({ remaining }),
      setWeekly: (weekly) => set({ weekly }),
      clear: () => set({ messages: [] }),
    }),
    { name: 'coach-v1', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
