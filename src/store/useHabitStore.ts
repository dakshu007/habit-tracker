import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ActiveTimer, Habit, Logs } from '@/data/types';
import { dayKey } from '@/utils/date';
import { dueOn, weeklyHabits } from '@/logic/habits';
import type { MotionPreset } from '@/theme/motion';

export type ThemeMode = 'light' | 'dark' | 'system';
export type TaskFilter = 'today' | 'weekly';
export type ProgressView = 'now' | 'today' | 'week';

export interface Settings {
  themeMode: ThemeMode;
  haptics: boolean;
  /** Gyroscope tilt / parallax on the card stack. */
  motion: boolean;
  /** App-wide animation style (see theme/motion). */
  motionPreset: MotionPreset;

  weekStart: 0 | 1;
  /** Evening nudge if day habits are still open. */
  nudge: { enabled: boolean; hour: number; minute: number };
}

export interface Profile {
  name: string;
  onboarded: boolean;
  /** file:// URI of the profile photo copied into app storage. */
  photoUri?: string;
  /** Profile card gradient (see data/profileStyles). */
  cardStyle?: string;
  /** Personal motto shown on the profile. */
  motto?: string;
  /** ISO date the user finished onboarding. */
  joinedAt?: string;
}

/** Shape written to disk and to backup files. */
export interface Snapshot {
  habits: Habit[];
  logs: Logs;
  settings: Settings;
  profile: Profile;
}

interface HabitState extends Snapshot {
  // UI (not persisted)
  today: string;
  selectedDay: string;
  activeHabitId: string | null;
  filter: TaskFilter;
  view: ProgressView;
  timer: ActiveTimer | null;
  /** Bumped when every day habit gets done → triggers confetti. */
  celebrateAt: number;

  // Habits
  addHabit: (h: Habit) => void;
  updateHabit: (h: Habit) => void;
  deleteHabit: (id: string) => void;
  setArchived: (id: string, archived: boolean) => void;
  moveHabit: (id: string, dir: -1 | 1) => void;

  // Progress
  setValue: (id: string, day: string, value: number) => void;
  addValue: (id: string, day: string, delta: number) => void;
  complete: (id: string, day: string) => void;

  // Timer
  startTimer: (id: string, day: string) => void;
  stopTimer: () => void;
  cancelTimer: () => void;

  // UI
  setActive: (id: string) => void;
  setFilter: (f: TaskFilter) => void;
  setView: (v: ProgressView) => void;
  setSelectedDay: (day: string) => void;
  rollover: () => void;

  // Settings / profile / data
  updateSettings: (patch: Partial<Settings>) => void;
  setProfile: (patch: Partial<Profile>) => void;
  finishOnboarding: (name: string, habits: Habit[]) => void;
  importSnapshot: (s: Snapshot) => void;
  resetAll: () => void;
}

const defaultSettings: Settings = {
  themeMode: 'system',
  haptics: true,
  motion: true,
  motionPreset: 'smooth',
  weekStart: 1,
  nudge: { enabled: true, hour: 20, minute: 30 },
};

const defaultProfile: Profile = { name: '', onboarded: false };

/** Clamp to [0, goal·10] and round away float noise (0.1 + 0.2…). */
const clean = (v: number) => Math.max(0, Math.round(v * 100) / 100);

export const useHabitStore = create<HabitState>()(
  persist(
    (set, get) => {
      /** Write a value and fire the "perfect day" celebration if this completed the set. */
      const write = (id: string, day: string, value: number) => {
        const before = get();
        // Completion is final: once a habit hits its goal for a day it can't drop back below it.
        const habit = before.habits.find((h) => h.id === id);
        const current = before.logs[day]?.[id]?.value ?? 0;
        if (habit && current >= habit.goalValue && value < habit.goalValue) return;
        const allDoneBefore = allDayHabitsDone(before.habits, before.logs, day);
        set((s) => ({
          logs: {
            ...s.logs,
            [day]: { ...s.logs[day], [id]: { value: clean(value), at: new Date().toISOString() } },
          },
        }));
        const after = get();
        if (!allDoneBefore && allDayHabitsDone(after.habits, after.logs, day)) {
          set({ celebrateAt: Date.now() });
        }
      };

      return {
        habits: [],
        logs: {},
        settings: defaultSettings,
        profile: defaultProfile,

        today: dayKey(),
        selectedDay: dayKey(),
        activeHabitId: null,
        filter: 'today',
        view: 'now',
        timer: null,
        celebrateAt: 0,

        addHabit: (h) => set((s) => ({ habits: [...s.habits, h], activeHabitId: h.id, filter: h.schedule.kind === 'weekly' ? 'weekly' : 'today' })),
        updateHabit: (h) => set((s) => ({ habits: s.habits.map((x) => (x.id === h.id ? h : x)) })),
        deleteHabit: (id) =>
          set((s) => {
            const logs: Logs = {};
            for (const [k, day] of Object.entries(s.logs)) {
              if (!day[id]) {
                logs[k] = day;
                continue;
              }
              const { [id]: _drop, ...rest } = day;
              if (Object.keys(rest).length) logs[k] = rest;
            }
            return {
              habits: s.habits.filter((h) => h.id !== id),
              logs,
              timer: s.timer?.habitId === id ? null : s.timer,
              activeHabitId: s.activeHabitId === id ? null : s.activeHabitId,
            };
          }),
        setArchived: (id, archived) =>
          set((s) => ({ habits: s.habits.map((h) => (h.id === id ? { ...h, archived } : h)) })),
        moveHabit: (id, dir) =>
          set((s) => {
            const i = s.habits.findIndex((h) => h.id === id);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= s.habits.length) return s;
            const habits = [...s.habits];
            [habits[i], habits[j]] = [habits[j], habits[i]];
            return { habits };
          }),

        setValue: (id, day, value) => write(id, day, value),
        addValue: (id, day, delta) => write(id, day, (get().logs[day]?.[id]?.value ?? 0) + delta),
        complete: (id, day) => {
          const h = get().habits.find((x) => x.id === id);
          if (h) write(id, day, Math.max(h.goalValue, get().logs[day]?.[id]?.value ?? 0));
        },

        startTimer: (id, day) => set({ timer: { habitId: id, day, startedAt: Date.now() } }),
        stopTimer: () => {
          const t = get().timer;
          if (!t) return;
          const minutes = (Date.now() - t.startedAt) / 60000;
          set({ timer: null });
          const h = get().habits.find((x) => x.id === t.habitId);
          if (!h) return;
          // Timers log in the habit's unit: hours or minutes.
          const amount = h.unit === 'hours' ? minutes / 60 : minutes;
          if (amount >= 0.05) get().addValue(t.habitId, t.day, Math.round(amount * 10) / 10);
        },
        cancelTimer: () => set({ timer: null }),

        setActive: (id) => set({ activeHabitId: id }),
        setFilter: (filter) => set({ filter }),
        setView: (view) => set({ view }),
        setSelectedDay: (selectedDay) => set({ selectedDay }),
        rollover: () => {
          const now = dayKey();
          const s = get();
          if (s.today === now) return;
          // If the user was looking at "today", follow the calendar into the new day.
          set({ today: now, selectedDay: s.selectedDay === s.today ? now : s.selectedDay });
        },

        updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
        setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
        finishOnboarding: (name, habits) =>
          set({
            profile: { ...get().profile, name: name.trim(), onboarded: true, joinedAt: new Date().toISOString() },
            habits,
            activeHabitId: habits[0]?.id ?? null,
          }),
        importSnapshot: (snap) =>
          set({
            habits: snap.habits,
            logs: snap.logs,
            settings: { ...defaultSettings, ...snap.settings },
            profile: { ...defaultProfile, ...snap.profile, onboarded: true },
            activeHabitId: snap.habits[0]?.id ?? null,
            timer: null,
          }),
        resetAll: () =>
          set({
            habits: [],
            logs: {},
            settings: defaultSettings,
            profile: defaultProfile,
            activeHabitId: null,
            timer: null,
            selectedDay: dayKey(),
          }),
      };
    },
    {
      name: 'habits-v2',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        habits: s.habits,
        logs: s.logs,
        settings: s.settings,
        profile: s.profile,
        activeHabitId: s.activeHabitId,
        filter: s.filter,
        view: s.view,
        timer: s.timer,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<HabitState>;
        return {
          ...current,
          ...p,
          settings: { ...defaultSettings, ...p.settings },
          profile: { ...defaultProfile, ...p.profile },
        };
      },
    },
  ),
);

function allDayHabitsDone(habits: Habit[], logs: Logs, day: string): boolean {
  const due = dueOn(habits, day);
  return due.length > 0 && due.every((h) => (logs[day]?.[h.id]?.value ?? 0) >= h.goalValue);
}

/* ------------------------------------------------------------------ */
/* Derived hooks                                                       */
/* ------------------------------------------------------------------ */
/**
 * Never compute derived arrays inside a Zustand selector — a fresh reference
 * each render fails Object.is and loops. Select stable state, derive with useMemo.
 */

/** Habits shown in the card stack for the selected day + filter. */
export function useVisibleHabits(): Habit[] {
  const habits = useHabitStore((s) => s.habits);
  const filter = useHabitStore((s) => s.filter);
  const day = useHabitStore((s) => s.selectedDay);
  return useMemo(() => (filter === 'today' ? dueOn(habits, day) : weeklyHabits(habits)), [habits, filter, day]);
}

/** The active habit among the visible ones (falls back to the first). */
export function useActiveHabit(): Habit | null {
  const visible = useVisibleHabits();
  const activeId = useHabitStore((s) => s.activeHabitId);
  return useMemo(() => visible.find((h) => h.id === activeId) ?? visible[0] ?? null, [visible, activeId]);
}

export function useHabit(id: string | undefined): Habit | null {
  const habits = useHabitStore((s) => s.habits);
  return useMemo(() => habits.find((h) => h.id === id) ?? null, [habits, id]);
}

export const getSettings = () => useHabitStore.getState().settings;
