import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useHabitStore, type Snapshot } from '@/store/useHabitStore';
import { useRunStore } from '@/store/useRunStore';
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

/** Write a JSON backup to cache and open the Android share sheet. */
export async function exportBackup(): Promise<void> {
  const { habits, logs, settings, profile } = useHabitStore.getState();
  const runs = useRunStore.getState().runs;
  const payload: BackupFile = { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), habits, logs, settings, profile, runs };
  const file = new File(Paths.cache, `habits-backup-${dayKey()}.json`);
  file.create({ overwrite: true });
  file.write(JSON.stringify(payload));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Save your habit backup' });
}

/** Let the user pick a backup file; returns the parsed snapshot or throws a readable error. */
export async function pickBackup(): Promise<Backup | null> {
  const res = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (res.canceled || !res.result) return null;
  const text = await res.result.text();
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
    runs: Array.isArray(data.runs) ? data.runs : undefined,
  };
}
