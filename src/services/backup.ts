import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useHabitStore, type Snapshot } from '@/store/useHabitStore';
import { useRunStore } from '@/store/useRunStore';
import { useLicense } from '@/store/useLicense';
import { loadRoute } from '@/services/runFiles';
import type { Run } from '@/data/types';
import { dayKey } from '@/utils/date';

const FORMAT = 'habit-tracker-backup';
const VERSION = 1;

/** What a backup holds: the habit snapshot plus GPS runs. */
export type Backup = Snapshot & { runs?: Run[] };

interface BackupFile extends Backup {
  format: typeof FORMAT;
  version: number;
  exportedAt: string;
}

/** Everything on this phone as one JSON string (file export and Google Drive backup). */
export async function buildBackup(): Promise<string> {
  const { habits, logs, settings, profile, extras } = useHabitStore.getState();
  const runs: Run[] = await Promise.all(
    useRunStore.getState().runs.map(async ({ sketch: _sketch, ...r }) => ({ ...r, ...((await loadRoute(r.id)) ?? { points: [], gaps: [] }) })),
  );
  const payload: BackupFile = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), habits, logs, settings, profile, extras, runs };
  return JSON.stringify(payload);
}

/** Write a JSON backup to cache and open the Android share sheet. */
export async function exportBackup(): Promise<void> {
  const file = new File(Paths.cache, `habits-backup-${dayKey()}.json`);
  file.create({ overwrite: true });
  file.write(await buildBackup());
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your habit backup' });
}

/** Parse backup JSON; throws a readable error if it isn't one. */
export function parseBackup(text: string): Backup {
  let data: Partial<BackupFile>;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t a valid backup.');
  }
  if (data.format !== FORMAT || !Array.isArray(data.habits) || typeof data.logs !== 'object') {
    throw new Error('That file isn’t a habit backup.');
  }
  return {
    habits: data.habits,
    logs: data.logs ?? {},
    settings: data.settings!,
    profile: data.profile!,
    extras: data.extras,
    runs: Array.isArray(data.runs) ? data.runs : undefined,
  };
}

/** Let the user pick a backup file; returns the parsed snapshot or throws a readable error. */
export async function pickBackup(): Promise<Backup | null> {
  const res = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (res.canceled || !res.result) return null;
  return parseBackup(await res.result.text());
}

/** Replace this phone's data with a backup. */
export function applyBackup(snap: Backup) {
  // A profile photo lives in app storage, which a reinstall wipes.
  const photo = snap.profile?.photoUri;
  let photoGone = false;
  try {
    photoGone = !!photo && !new File(photo).exists;
  } catch {
    photoGone = true;
  }
  const profile = photoGone ? { ...snap.profile, photoUri: undefined } : snap.profile;
  useHabitStore.getState().importSnapshot({ ...snap, profile });
  if (snap.runs) useRunStore.getState().replaceRuns(snap.runs);
  // Restoring during onboarding skips the step that starts the free week.
  useLicense.getState().startTrial();
}
