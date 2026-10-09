import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Run } from '@/data/types';
import { addFixes, finishRun, newLiveRun, pauseRun, resumeRun, type Fix, type LiveRun } from '@/logic/run';

interface RunState {
  /** Finished runs, newest first. Stored only on this phone. */
  runs: Run[];
  /** The run being recorded, if any (persisted so it survives the app closing). */
  live: LiveRun | null;

  start: (habitId?: string) => LiveRun;
  addFixes: (fixes: Fix[]) => void;
  pause: () => void;
  resume: () => void;
  setLiveHabit: (habitId?: string) => void;
  /** Ends the live run and saves it; returns the saved run. */
  finish: () => Run | null;
  discard: () => void;
  setLogged: (id: string, habitId: string, amount: number) => void;
  deleteRun: (id: string) => void;
  /** Replace all runs (backup restore). */
  replaceRuns: (runs: Run[]) => void;
}

/**
 * GPS runs, kept apart from the habit store: routes are large, and the habit
 * store is rewritten on every tap.
 */
export const useRunStore = create<RunState>()(
  persist(
    (set, get) => ({
      runs: [],
      live: null,

      start: (habitId) => {
        const live = newLiveRun(`run-${Date.now().toString(36)}`, Date.now(), habitId);
        set({ live });
        return live;
      },
      addFixes: (fixes) => {
        const live = get().live;
        if (!live) return;
        const next = addFixes(live, fixes);
        if (next !== live) set({ live: next });
      },
      pause: () => {
        const live = get().live;
        if (live) set({ live: pauseRun(live, Date.now()) });
      },
      resume: () => {
        const live = get().live;
        if (live) set({ live: resumeRun(live, Date.now()) });
      },
      setLiveHabit: (habitId) => {
        const live = get().live;
        if (live) set({ live: { ...live, habitId } });
      },
      finish: () => {
        const live = get().live;
        if (!live) return null;
        const run = finishRun(live, Date.now());
        // A run with no real movement isn't worth keeping.
        if (run.points.length < 2 || run.distance < 10) {
          set({ live: null });
          return null;
        }
        set((s) => ({ live: null, runs: [run, ...s.runs] }));
        return run;
      },
      discard: () => set({ live: null }),
      setLogged: (id, habitId, amount) => set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, habitId, logged: amount } : r)) })),
      deleteRun: (id) => set((s) => ({ runs: s.runs.filter((r) => r.id !== id) })),
      replaceRuns: (runs) => set({ runs: [...runs].sort((a, b) => b.startedAt - a.startedAt) }),
    }),
    {
      name: 'runs-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ runs: s.runs, live: s.live }),
    },
  ),
);

/** Load persisted runs when running headless (location task) before touching state. */
export async function ensureRunsHydrated() {
  if (!useRunStore.persist.hasHydrated()) await useRunStore.persist.rehydrate();
}
