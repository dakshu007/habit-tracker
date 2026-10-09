import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { seedTasks } from '@/data/tasks';
import type { Task } from '@/data/types';
import { dayKey } from '@/utils/date';
import type { ThemeMode } from '@/theme/ThemeContext';

export type TaskFilter = 'today' | 'weekly';
export type ProgressView = 'now' | 'today' | 'week';

interface TaskState {
  tasks: Task[];
  activeTaskId: string;
  filter: TaskFilter;
  view: ProgressView;
  themeMode: ThemeMode;
  /** YYYY-MM-DD of the last day the app applied a daily reset. */
  lastResetDay: string;

  // actions
  setActive: (id: string) => void;
  setFilter: (filter: TaskFilter) => void;
  setView: (view: ProgressView) => void;
  setThemeMode: (mode: ThemeMode) => void;
  completeTask: (id: string) => void;
  addProgress: (id: string, amount: number) => void;
  resetDailyIfNewDay: () => void;
}

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: seedTasks,
      activeTaskId: 'cycling',
      filter: 'today',
      view: 'now',
      themeMode: 'system',
      lastResetDay: dayKey(),

      setActive: (id) => set({ activeTaskId: id }),
      setFilter: (filter) => set({ filter }),
      setView: (view) => set({ view }),
      setThemeMode: (themeMode) => set({ themeMode }),

      completeTask: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? { ...t, status: 'done', currentValue: t.goalValue, lastUpdated: new Date().toISOString() }
              : t,
          ),
        })),

      addProgress: (id, amount) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const next = Math.min(t.goalValue, Math.max(0, t.currentValue + amount));
            return {
              ...t,
              currentValue: next,
              status: next >= t.goalValue ? 'done' : 'inProgress',
              lastUpdated: new Date().toISOString(),
            };
          }),
        })),

      resetDailyIfNewDay: () => {
        const today = dayKey();
        if (get().lastResetDay === today) return;
        set((s) => ({
          lastResetDay: today,
          tasks: s.tasks.map((t) =>
            t.isDaily ? { ...t, currentValue: 0, status: 'inProgress' } : t,
          ),
        }));
      },
    }),
    {
      name: 'habit-tracker-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Persist progress/completion + user prefs; seed metadata stays in code.
      partialize: (s) => ({
        tasks: s.tasks,
        activeTaskId: s.activeTaskId,
        filter: s.filter,
        view: s.view,
        themeMode: s.themeMode,
        lastResetDay: s.lastResetDay,
      }),
      onRehydrateStorage: () => (state) => {
        // Apply the daily reset as soon as persisted state is restored.
        state?.resetDailyIfNewDay();
      },
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Derived hooks                                                       */
/* ------------------------------------------------------------------ */
/**
 * IMPORTANT: never compute derived arrays/objects inside a Zustand selector
 * (e.g. `useTaskStore((s) => s.tasks.filter(...))`) — a fresh reference each
 * render fails the store's Object.is check and causes an infinite re-render
 * loop. Instead select primitive/stable state and derive with useMemo here.
 */

/** The active task (stable reference unless tasks/activeTaskId change). */
export function useActiveTask(): Task {
  const tasks = useTaskStore((s) => s.tasks);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  return useMemo(() => tasks.find((t) => t.id === activeTaskId) ?? tasks[0], [tasks, activeTaskId]);
}

/** Tasks visible under the current filter (memoised, stable across renders). */
export function useVisibleTasks(): Task[] {
  const tasks = useTaskStore((s) => s.tasks);
  const filter = useTaskStore((s) => s.filter);
  // All seed tasks are daily for now, so "Weekly" shows the full set as a
  // placeholder until weekly activities exist. See TODO in tasks.ts.
  return useMemo(() => (filter === 'today' ? tasks.filter((t) => t.isDaily) : tasks), [tasks, filter]);
}
