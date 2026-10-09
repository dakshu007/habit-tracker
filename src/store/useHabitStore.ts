import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ActiveTimer, ChallengeTrophy, Habit, Logs, Routine } from '@/data/types';
import { dayKey } from '@/utils/date';
import { dueOn, isDoneOn, isScheduledOn, REST_KEY, streakFor, weeklyHabits } from '@/logic/habits';
import { shiftKey } from '@/utils/date';
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
  /** Ask "how do you feel?" after a slide. */
  moodPrompt: boolean;
  /** Sunday-evening weekly review notification. */
  weeklyReview: boolean;
  /** UI language. */
  language: 'system' | 'en' | 'hi';
  /** Currency symbol for "quit" savings. */
  currency: string;
}

/** Everything that isn't habits/logs/settings/profile but should persist and back up. */
export interface Extras {
  /** Streak freezes in the bank (max 3). */
  freezes: number;
  /** habitId → highest 7-day streak milestone already rewarded. */
  freezeMilestones: Record<string, number>;
  routines: Routine[];
  trophies: ChallengeTrophy[];
  buddy?: { name: string; phone?: string };
  /** In-app rating prompt bookkeeping. */
  rating: { askedAt?: string };
  /** Week (start day key) of the last weekly review the user opened. */
  lastReviewWeek?: string;
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
  extras?: Extras;
}

interface HabitState extends Snapshot {
  extras: Extras;
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

  // Mood, freezes, rest days, quit
  setMood: (id: string, day: string, mood: 1 | 2 | 3 | 4, note?: string) => void;
  applyFreezes: () => void;
  toggleRestDay: (day: string) => void;
  slip: (id: string, day: string) => void;

  // Routines, challenges, buddy, rating, review
  saveRoutine: (r: Routine) => void;
  deleteRoutine: (id: string) => void;
  addTrophy: (t: ChallengeTrophy) => void;
  setBuddy: (b: Extras['buddy']) => void;
  markRatingAsked: () => void;
  markReviewSeen: (weekKey: string) => void;

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
  moodPrompt: true,
  weeklyReview: true,
  language: 'system',
  currency: '₹',
};

const defaultExtras: Extras = { freezes: 0, freezeMilestones: {}, routines: [], trophies: [], rating: {} };

const MAX_FREEZES = 3;

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
            [day]: { ...s.logs[day], [id]: { ...s.logs[day]?.[id], value: clean(value), at: new Date().toISOString(), frozen: undefined } },
          },
        }));
        const after = get();
        if (!allDoneBefore && allDayHabitsDone(after.habits, after.logs, day)) {
          set({ celebrateAt: Date.now() });
        }
        if (habit) awardFreeze(habit);
      };

      /** Every new 7-day streak milestone on a habit earns one freeze (bank holds 3). */
      const awardFreeze = (habit: Habit) => {
        const s = get();
        if (habit.schedule.kind === 'weekly') return;
        const streak = streakFor(habit, s.logs, s.today, s.settings.weekStart).current;
        const milestone = Math.floor(streak / 7) * 7;
        const prev = s.extras.freezeMilestones[habit.id] ?? 0;
        if (milestone < 7 || milestone <= prev) return;
        set({
          extras: {
            ...s.extras,
            freezes: Math.min(MAX_FREEZES, s.extras.freezes + 1),
            freezeMilestones: { ...s.extras.freezeMilestones, [habit.id]: milestone },
          },
        });
      };

      return {
        habits: [],
        logs: {},
        settings: defaultSettings,
        profile: defaultProfile,
        extras: defaultExtras,

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

        setMood: (id, day, mood, note) =>
          set((s) => {
            const e = s.logs[day]?.[id];
            if (!e) return s;
            return { logs: { ...s.logs, [day]: { ...s.logs[day], [id]: { ...e, mood, note: note?.trim() || undefined } } } };
          }),

        /**
         * Spend banked freezes on yesterday's misses so streaks survive one bad
         * day. Runs on launch and at midnight rollover.
         */
        applyFreezes: () => {
          const s = get();
          const y = shiftKey(s.today, -1);
          if (s.logs[y]?.[REST_KEY]) return;
          let freezes = s.extras.freezes;
          if (freezes <= 0) return;
          const day = { ...s.logs[y] };
          let used = false;
          for (const h of s.habits) {
            if (freezes <= 0) break;
            if (h.archived || h.schedule.kind === 'weekly' || h.quit || !isScheduledOn(h, y)) continue;
            if (isDoneOn(h, s.logs, y) || day[h.id]?.frozen) continue;
            // Only worth a freeze if there's a streak to protect.
            if (streakFor(h, s.logs, shiftKey(y, -1), s.settings.weekStart).current < 1) continue;
            day[h.id] = { ...day[h.id], value: day[h.id]?.value ?? 0, at: new Date().toISOString(), frozen: true };
            freezes--;
            used = true;
          }
          if (used) set({ logs: { ...s.logs, [y]: day }, extras: { ...s.extras, freezes } });
        },

        toggleRestDay: (day) =>
          set((s) => {
            const cur = { ...s.logs[day] };
            if (cur[REST_KEY]) delete cur[REST_KEY];
            else cur[REST_KEY] = { value: 1, at: new Date().toISOString() };
            const logs = { ...s.logs };
            if (Object.keys(cur).length) logs[day] = cur;
            else delete logs[day];
            return { logs };
          }),

        /** Quit mode: record a slip (the one action allowed to undo a clean day). */
        slip: (id, day) =>
          set((s) => ({
            habits: s.habits.map((h) =>
              h.id === id && h.quit ? { ...h, quit: { ...h.quit, slips: [...h.quit.slips.filter((d) => d !== day), day] } } : h,
            ),
            logs: { ...s.logs, [day]: { ...s.logs[day], [id]: { value: 0, at: new Date().toISOString() } } },
          })),

        saveRoutine: (r) =>
          set((s) => ({
            extras: {
              ...s.extras,
              routines: s.extras.routines.some((x) => x.id === r.id) ? s.extras.routines.map((x) => (x.id === r.id ? r : x)) : [...s.extras.routines, r],
            },
          })),
        deleteRoutine: (id) => set((s) => ({ extras: { ...s.extras, routines: s.extras.routines.filter((r) => r.id !== id) } })),
        addTrophy: (t) =>
          set((s) => (s.extras.trophies.some((x) => x.id === t.id && x.completedAt.slice(0, 10) === t.completedAt.slice(0, 10)) ? s : { extras: { ...s.extras, trophies: [...s.extras.trophies, t] } })),
        setBuddy: (buddy) => set((s) => ({ extras: { ...s.extras, buddy } })),
        markRatingAsked: () => set((s) => ({ extras: { ...s.extras, rating: { askedAt: new Date().toISOString() } } })),
        markReviewSeen: (lastReviewWeek) => set((s) => ({ extras: { ...s.extras, lastReviewWeek } })),

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
          get().applyFreezes();
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
            extras: { ...defaultExtras, ...snap.extras },
            activeHabitId: snap.habits[0]?.id ?? null,
            timer: null,
          }),
        resetAll: () =>
          set({
            habits: [],
            logs: {},
            settings: defaultSettings,
            profile: defaultProfile,
            extras: defaultExtras,
            activeHabitId: null,
            timer: null,
            selectedDay: dayKey(),
          }),
      };
    },
    {
      name: 'habits-v2',
      version: 2,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<Snapshot>;
        // v2: the default profile card became Sky; the old default (Aurora) moves over with it.
        if (version < 2 && p.profile?.cardStyle === 'aurora') p.profile = { ...p.profile, cardStyle: undefined };
        return p as HabitState;
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        habits: s.habits,
        logs: s.logs,
        settings: s.settings,
        profile: s.profile,
        extras: s.extras,
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
          extras: { ...defaultExtras, ...p.extras },
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
