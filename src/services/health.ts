import { AppState, Linking, Platform } from 'react-native';
import {
  aggregateRecord,
  getGrantedPermissions,
  getSdkStatus,
  initialize,
  readRecords,
  requestPermission,
  SdkAvailabilityStatus,
  type Permission,
} from 'react-native-health-connect';

import type { Habit, HealthSource } from '@/data/types';
import { useHabitStore } from '@/store/useHabitStore';
import { isUnlocked } from '@/store/useLicense';
import { addDays, dayKey, fromKey } from '@/utils/date';
import { t } from '@/i18n';

/**
 * Health Connect auto-tracking. Habits with a `sync` source get their daily
 * value filled from the phone's health data (Samsung Health, Google Fit,
 * Fitbit, watches…). Values only ever go up, so a manual log or a locked
 * completion is never overwritten downwards.
 */

export interface HealthSourceInfo {
  id: HealthSource;
  label: string;
  unit: string;
}

export const HEALTH_SOURCES: HealthSourceInfo[] = [
  { id: 'steps', label: 'Steps', unit: 'steps' },
  { id: 'distance', label: 'Distance (any activity)', unit: 'km' },
  { id: 'run-km', label: 'Running distance', unit: 'km' },
  { id: 'run-min', label: 'Running time', unit: 'min' },
  { id: 'walk-km', label: 'Walking distance', unit: 'km' },
  { id: 'walk-min', label: 'Walking time', unit: 'min' },
  { id: 'bike-km', label: 'Cycling distance', unit: 'km' },
  { id: 'bike-min', label: 'Cycling time', unit: 'min' },
  { id: 'swim-min', label: 'Swimming time', unit: 'min' },
  { id: 'yoga-min', label: 'Yoga time', unit: 'min' },
  { id: 'dance-min', label: 'Dancing time', unit: 'min' },
  { id: 'workout-min', label: 'Any workout time', unit: 'min' },
  { id: 'floors', label: 'Floors climbed', unit: 'floors' },
  { id: 'sleep-h', label: 'Sleep', unit: 'hours' },
];

export const sourceInfo = (id?: HealthSource) => HEALTH_SOURCES.find((s) => s.id === id);

// Health Connect exercise type ids (androidx.health.connect.client.records.ExerciseSessionRecord).
const EX = { BIKING: 8, BIKING_STATIONARY: 9, DANCING: 16, RUNNING: 56, RUNNING_TREADMILL: 57, SWIMMING_OPEN_WATER: 73, SWIMMING_POOL: 74, WALKING: 79, YOGA: 83 };
const EXERCISE_FOR: Partial<Record<HealthSource, number[]>> = {
  'run-km': [EX.RUNNING, EX.RUNNING_TREADMILL],
  'run-min': [EX.RUNNING, EX.RUNNING_TREADMILL],
  'walk-km': [EX.WALKING],
  'walk-min': [EX.WALKING],
  'bike-km': [EX.BIKING, EX.BIKING_STATIONARY],
  'bike-min': [EX.BIKING, EX.BIKING_STATIONARY],
  'swim-min': [EX.SWIMMING_POOL, EX.SWIMMING_OPEN_WATER],
  'yoga-min': [EX.YOGA],
  'dance-min': [EX.DANCING],
};

const PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'Distance' },
  { accessType: 'read', recordType: 'ExerciseSession' },
  { accessType: 'read', recordType: 'FloorsClimbed' },
  { accessType: 'read', recordType: 'SleepSession' },
];

export type HealthStatus = 'unavailable' | 'needs-install' | 'needs-permission' | 'ready';

let initialized = false;

async function ensureInit(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  if (initialized) return true;
  try {
    initialized = await initialize();
  } catch {
    initialized = false;
  }
  return initialized;
}

export async function healthStatus(): Promise<HealthStatus> {
  if (Platform.OS !== 'android') return 'unavailable';
  try {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'needs-install';
    if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) return 'needs-install';
    if (!(await ensureInit())) return 'unavailable';
    const granted = await getGrantedPermissions();
    return granted.length ? 'ready' : 'needs-permission';
  } catch {
    return 'unavailable';
  }
}

/** Open the Play Store page for Health Connect (needed on Android 13 and older). */
export function installHealthConnect() {
  Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() =>
    Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'),
  );
}

/** Ask for read access. Returns true if at least one permission was granted. */
export async function connectHealth(): Promise<boolean> {
  if (!(await ensureInit())) return false;
  try {
    const granted = await requestPermission(PERMISSIONS);
    return granted.length > 0;
  } catch {
    return false;
  }
}

function range(key: string) {
  const start = fromKey(key);
  const end = addDays(start, 1);
  return { operator: 'between' as const, startTime: start.toISOString(), endTime: end.toISOString() };
}

/** Read one source's total for one local day (in the source's unit). */
export async function readDay(source: HealthSource, key: string): Promise<number> {
  const timeRangeFilter = range(key);

  if (source === 'steps') {
    const r = await aggregateRecord({ recordType: 'Steps', timeRangeFilter });
    return r.COUNT_TOTAL ?? 0;
  }
  if (source === 'distance') {
    const r = await aggregateRecord({ recordType: 'Distance', timeRangeFilter });
    return round(r.DISTANCE?.inKilometers ?? 0, 2);
  }
  if (source === 'floors') {
    const r = await aggregateRecord({ recordType: 'FloorsClimbed', timeRangeFilter });
    return Math.floor(r.FLOORS_CLIMBED_TOTAL ?? 0);
  }
  if (source === 'sleep-h') {
    // Sleep that *ended* on this day (last night's sleep counts for today).
    const start = addDays(fromKey(key), 0);
    start.setHours(-12);
    const end = addDays(fromKey(key), 0);
    end.setHours(14);
    const { records } = await readRecords('SleepSession', { timeRangeFilter: { operator: 'between', startTime: start.toISOString(), endTime: end.toISOString() } });
    const ms = records.reduce((sum, r) => sum + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()), 0);
    return round(ms / 3_600_000, 1);
  }

  // Exercise-based sources.
  const { records } = await readRecords('ExerciseSession', { timeRangeFilter });
  const types = EXERCISE_FOR[source];
  const sessions = types ? records.filter((r) => types.includes(r.exerciseType)) : records;
  if (source.endsWith('-min')) {
    const ms = sessions.reduce((sum, r) => sum + (new Date(r.endTime).getTime() - new Date(r.startTime).getTime()), 0);
    return Math.round(ms / 60_000);
  }
  // Distance covered during matching sessions.
  let km = 0;
  for (const r of sessions) {
    const d = await aggregateRecord({ recordType: 'Distance', timeRangeFilter: { operator: 'between', startTime: r.startTime, endTime: r.endTime } });
    km += d.DISTANCE?.inKilometers ?? 0;
  }
  return round(km, 2);
}

const round = (n: number, p: number) => Math.round(n * 10 ** p) / 10 ** p;

let syncing = false;

/** Pull the last `days` days for every synced habit into the log. */
export async function syncHealth(days = 7): Promise<number> {
  // Auto-tracking is a Pro feature (the trial includes it).
  if (syncing || Platform.OS !== 'android' || !isUnlocked()) return 0;
  const habits = useHabitStore.getState().habits.filter((h): h is Habit & { sync: HealthSource } => !!h.sync && !h.archived);
  if (!habits.length) return 0;
  if ((await healthStatus()) !== 'ready') return 0;
  syncing = true;
  let updates = 0;
  try {
    const today = fromKey(dayKey());
    for (let i = 0; i < days; i++) {
      const key = dayKey(addDays(today, -i));
      for (const h of habits) {
        if (key < h.createdAt.slice(0, 10)) continue;
        let v = 0;
        try {
          v = await readDay(h.sync, key);
        } catch {
          continue;
        }
        const store = useHabitStore.getState();
        const cur = store.logs[key]?.[h.id]?.value ?? 0;
        if (v > cur) {
          store.setValue(h.id, key, v);
          updates++;
        }
      }
    }
  } finally {
    syncing = false;
  }
  return updates;
}

/** Sync on launch and whenever the app returns to the foreground. */
export function startHealthSync() {
  syncHealth().catch(() => {});
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') syncHealth().catch(() => {});
  });
  return () => sub.remove();
}

export const healthCopy = {
  title: () => t('Auto-track with Health Connect'),
  body: () => t('Fill this habit automatically from Samsung Health, Google Fit, Fitbit or your watch.'),
};
