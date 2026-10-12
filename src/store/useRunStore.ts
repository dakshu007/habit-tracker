import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Run, RunSummary } from '@/data/types';
import { addFixes, finishRun, newLiveRun, pauseRun, resumeRun, sketchPath, type Fix, type LiveRun } from '@/logic/run';
import { deleteRoute, saveRoute } from '@/services/runFiles';

/* ------------------------------------------------------------------ */
/* The run being recorded                                              */
/* ------------------------------------------------------------------ */

const LIVE_KEY = 'run-live-v1';
let pending: ReturnType<typeof setTimeout> | null = null;

/**
 * Save the live run. GPS fixes arrive every ~2 s in the app, so those writes
 * are batched (≤5 s); start/pause/finish and background batches write at once.
 */
function persistLive(immediate: boolean) {
  if (pending) {
    if (!immediate) return;
    clearTimeout(pending);
    pending = null;
  }
  const write = () => {
    pending = null;
    const live = useLiveRun.getState().live;
    (live ? AsyncStorage.setItem(LIVE_KEY, JSON.stringify(live)) : AsyncStorage.removeItem(LIVE_KEY)).catch(() => {});
  };
  if (immediate) write();
  else pending = setTimeout(write, 5000);
}

interface LiveState {
  live: LiveRun | null;
  loaded: boolean;
  /** Read the saved live run (app start, or the location task running headless). */
  load: () => Promise<void>;
  start: (habitId?: string) => LiveRun;
  addFixes: (fixes: Fix[]) => void;
  pause: () => void;
  resume: () => void;
  clear: () => void;
}

export const useLiveRun = create<LiveState>()((set, get) => {
  const update = (live: LiveRun | null, immediate = true) => {
    set({ live });
    persistLive(immediate);
  };
  return {
    live: null,
    loaded: false,
    load: async () => {
      if (get().loaded) return;
      const raw = await AsyncStorage.getItem(LIVE_KEY).catch(() => null);
      let saved: LiveRun | null = null;
      try {
        saved = raw ? (JSON.parse(raw) as LiveRun) : null;
      } catch {
        saved = null;
      }
      if (!get().loaded) set({ live: get().live ?? saved, loaded: true });
    },
    start: (habitId) => {
      const live = newLiveRun(`run-${Date.now().toString(36)}`, Date.now(), habitId);
      set({ loaded: true });
      update(live);
      return live;
    },
    addFixes: (fixes) => {
      const live = get().live;
      if (!live) return;
      const next = addFixes(live, fixes);
      if (next !== live) update(next, AppState.currentState !== 'active');
    },
    pause: () => {
      const live = get().live;
      if (live) update(pauseRun(live, Date.now()));
    },
    resume: () => {
      const live = get().live;
      if (live) update(resumeRun(live, Date.now()));
    },
    clear: () => update(null),
  };
});

/* ------------------------------------------------------------------ */
/* Finished runs                                                       */
/* ------------------------------------------------------------------ */

/** Run list entry: everything but the route, plus a tiny drawing of it. */
function summarize(run: Run): RunSummary {
  const { points, gaps, ...rest } = run;
  return { ...rest, sketch: sketchPath(points, gaps, 64, 64, 7, 80) };
}

interface RunState {
  /** Finished runs, newest first. Routes are in files (services/runFiles). */
  runs: RunSummary[];
  /** End the live run and save it; returns it with its route, or null if too short. */
  finish: () => Run | null;
  setLogged: (id: string, habitId: string, amount: number) => void;
  deleteRun: (id: string) => void;
  /** Replace all runs (backup restore). */
  replaceRuns: (runs: Run[]) => void;
}

/** GPS runs, kept apart from the habit store, stored only on this phone. */
export const useRunStore = create<RunState>()(
  persist(
    (set, get) => ({
      runs: [],
      finish: () => {
        const live = useLiveRun.getState().live;
        if (!live) return null;
        const run = finishRun(live, Date.now());
        useLiveRun.getState().clear();
        // A run with no real movement isn't worth keeping.
        if (run.points.length < 2 || run.distance < 10) return null;
        try {
          saveRoute(run.id, run);
        } catch {
          // Keep the stats even if the route couldn't be written.
        }
        set((s) => ({ runs: [summarize(run), ...s.runs] }));
        return run;
      },
      setLogged: (id, habitId, amount) => set((s) => ({ runs: s.runs.map((r) => (r.id === id ? { ...r, habitId, logged: amount } : r)) })),
      deleteRun: (id) => {
        deleteRoute(id);
        set((s) => ({ runs: s.runs.filter((r) => r.id !== id) }));
      },
      replaceRuns: (runs) => {
        const keep = new Set(runs.map((r) => r.id));
        for (const r of get().runs) if (!keep.has(r.id)) deleteRoute(r.id);
        for (const r of runs) {
          try {
            saveRoute(r.id, r);
          } catch {
            // Skip a route that can't be written; its stats still restore.
          }
        }
        set({ runs: runs.map(summarize).sort((a, b) => b.startedAt - a.startedAt) });
      },
    }),
    {
      name: 'runs-v2',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ runs: s.runs }),
    },
  ),
);
