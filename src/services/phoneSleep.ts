import { AppState, Platform } from 'react-native';

import { DeviceSignals } from '../../modules/device-signals';
import { useHabitStore } from '@/store/useHabitStore';
import { detectSleep, LOOKBACK_MS, sleepValue, sleepWindow, type SleepResult } from '@/logic/sleep';
import { addDays, dayKey, fromKey } from '@/utils/date';

/**
 * Phone-based sleep tracking: reads when the screen was on/off during each
 * habit's bedtime window and logs the time asleep to the morning it ended.
 * Android keeps this history for several days, so opening the app once
 * every few days is enough. Values only go up (like Health Connect).
 */

export const hasUsageAccess = () => (Platform.OS === 'android' ? (DeviceSignals?.hasUsageAccess() ?? false) : false);
export const openUsageAccess = () => DeviceSignals?.openUsageAccessSettings();
export const phoneSleepSupported = () => Platform.OS === 'android' && Number(Platform.Version) >= 28 && !!DeviceSignals;

/** Sleep for the window ending on `key` (null if not over yet or no data). */
export async function readSleep(bed: number, wake: number, key: string): Promise<(SleepResult & { start: number; end: number }) | null> {
  if (!DeviceSignals || !hasUsageAccess()) return null;
  const [start, end] = sleepWindow(key, bed, wake);
  const until = Math.min(end, Date.now());
  if (until <= start) return null;
  const events = await DeviceSignals.getScreenEvents(start - LOOKBACK_MS, until);
  const r = detectSleep(events, start, until);
  return r ? { ...r, start, end } : null;
}

let syncing = false;

export async function syncPhoneSleep(days = 7): Promise<number> {
  if (syncing || !phoneSleepSupported() || !hasUsageAccess()) return 0;
  const habits = useHabitStore.getState().habits.filter((h) => h.phoneSleep && !h.archived);
  if (!habits.length) return 0;
  syncing = true;
  let updates = 0;
  try {
    const today = fromKey(dayKey());
    for (let i = 0; i < days; i++) {
      const key = dayKey(addDays(today, -i));
      for (const h of habits) {
        if (key < h.createdAt.slice(0, 10)) continue;
        const { bed, wake } = h.phoneSleep!;
        // Only log nights that are over.
        if (sleepWindow(key, bed, wake)[1] > Date.now()) continue;
        const r = await readSleep(bed, wake, key).catch(() => null);
        if (!r) continue;
        const v = sleepValue(h.unit, r, r.start);
        const store = useHabitStore.getState();
        if (v > (store.logs[key]?.[h.id]?.value ?? 0)) {
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

/** Sync on launch and whenever the app comes back (e.g. after granting usage access). */
export function startPhoneSleepSync() {
  syncPhoneSleep().catch(() => {});
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') syncPhoneSleep().catch(() => {});
  });
  return () => sub.remove();
}
