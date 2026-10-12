import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, AppState, Platform, ToastAndroid } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DeviceSignals } from '../../modules/device-signals';
import { useHabitStore } from '@/store/useHabitStore';
import { useRunStore } from '@/store/useRunStore';
import { applyBackup, buildBackup, parseBackup } from '@/services/backup';
import { bestCurrentStreak } from '@/logic/habits';
import { dayKey, formatLastUpdated } from '@/utils/date';
import { haptic } from '@/utils/haptics';
import { t } from '@/i18n';

/**
 * WhatsApp-style backup to the user's own Google Drive, in the hidden app
 * folder (drive.appdata): only this app can read it, it doesn't show in their
 * Drive, and we never see it. One file, overwritten on each backup.
 */

const FILE_NAME = 'habits-backup.json';
const DRIVE = 'https://www.googleapis.com/drive/v3';
const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
/** Back up on leaving the app at most this often (and only if something changed). */
const AUTO_EVERY = 6 * 3600_000;

export interface DriveFile {
  id: string;
  modifiedTime: string;
  /** Summary written with the backup, for the restore prompt. */
  appProperties?: { habits?: string; streak?: string };
}

interface DriveState {
  /** Google account the backup goes to ('' if Google didn't say); null = backup off. */
  email: string | null;
  /** Epoch ms of the last successful backup or restore. */
  lastAt: number | null;
  /** Fingerprint of the data last backed up, to skip unchanged backups. */
  lastSig: string | null;
  /** Drive's modifiedTime of the file we last wrote or read. */
  remoteTime: string | null;
  /** Google wants the user to sign in again (password changed, access removed). */
  needsReconnect: boolean;
  /** Drive holds a newer backup than this phone (another phone, or an older restore). */
  newerInDrive: boolean;
  busy: boolean;
  set: (p: Partial<Omit<DriveState, 'set'>>) => void;
}

export const useDriveBackup = create<DriveState>()(
  persist(
    (set) => ({
      email: null,
      lastAt: null,
      lastSig: null,
      remoteTime: null,
      needsReconnect: false,
      newerInDrive: false,
      busy: false,
      set: (p) => set(p),
    }),
    {
      name: 'drive-backup-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ busy: _busy, set: _set, ...rest }) => rest,
    },
  ),
);

export const driveBackupAvailable = () => Platform.OS === 'android' && !!DeviceSignals?.authorizeDrive;

/* ------------------------------------------------------------------ */
/* Drive REST                                                          */
/* ------------------------------------------------------------------ */

class DriveError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function drive<T>(token: string, url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } });
  if (!res.ok) throw new DriveError(`Drive ${res.status}`, res.status);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

async function accountEmail(token: string): Promise<string | null> {
  const r = await drive<{ user?: { emailAddress?: string } }>(token, `${DRIVE}/about?fields=user(emailAddress)`).catch(() => null);
  return r?.user?.emailAddress ?? null;
}

export async function findBackup(token: string): Promise<DriveFile | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const r = await drive<{ files: DriveFile[] }>(
    token,
    `${DRIVE}/files?spaces=appDataFolder&q=${q}&orderBy=modifiedTime desc&fields=files(id,modifiedTime,appProperties)`,
  );
  return r.files?.[0] ?? null;
}

async function upload(token: string, json: string, existingId: string | null, props: Record<string, string>): Promise<DriveFile> {
  const boundary = `ht${Date.now()}`;
  const meta = existingId ? { appProperties: props } : { name: FILE_NAME, parents: ['appDataFolder'], appProperties: props };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${json}\r\n--${boundary}--`;
  const url = existingId
    ? `${UPLOAD}/files/${existingId}?uploadType=multipart&fields=id,modifiedTime,appProperties`
    : `${UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime,appProperties`;
  return drive<DriveFile>(token, url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });
}

/* ------------------------------------------------------------------ */
/* Backup and restore                                                  */
/* ------------------------------------------------------------------ */

/** Cheap fingerprint of everything a backup holds. */
function signature(): string {
  const { habits, logs, settings, profile, extras } = useHabitStore.getState();
  const runs = useRunStore.getState().runs.map((r) => r.id).join(',');
  const s = JSON.stringify({ habits, logs, settings, profile, extras }) + runs;
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `${s.length}:${h >>> 0}`;
}

function summary(): Record<string, string> {
  const { habits, logs, settings } = useHabitStore.getState();
  const best = bestCurrentStreak(habits, logs, dayKey(), settings.weekStart);
  return { habits: String(habits.filter((h) => !h.archived).length), streak: String(best?.streak.current ?? 0) };
}

/** Token for the saved account; asks the user only when `interactive`. */
async function token(interactive: boolean): Promise<string | null> {
  const st = useDriveBackup.getState();
  if (!DeviceSignals) return null;
  const email = st.email || null;
  const silent = await DeviceSignals.authorizeDrive(email, false).catch(() => null);
  if (silent || !interactive) return silent;
  return DeviceSignals.authorizeDrive(email, true);
}

let running: Promise<unknown> | null = null;
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = (running ?? Promise.resolve()).catch(() => {}).then(fn);
  running = next.finally(() => {
    if (running === next) running = null;
  });
  return next;
}

/**
 * Back up now. Returns false if there's nothing to do or Drive has a newer
 * backup (unless `force`). Throws on network or Google errors.
 */
export function backupNow({ interactive = false, force = false } = {}): Promise<boolean> {
  return exclusive(async () => {
    const st = useDriveBackup.getState();
    if (st.email == null) return false;
    st.set({ busy: true });
    try {
      const tok = await token(interactive);
      if (!tok) {
        useDriveBackup.getState().set({ needsReconnect: true });
        return false;
      }
      const remote = await findBackup(tok);
      // Another phone (or a restore of older data) wrote since we last did: don't overwrite it silently.
      if (!force && remote && st.remoteTime && remote.modifiedTime > st.remoteTime) {
        useDriveBackup.getState().set({ newerInDrive: true, needsReconnect: false });
        return false;
      }
      const sig = signature();
      const saved = await upload(tok, await buildBackup(), remote?.id ?? null, summary());
      useDriveBackup.getState().set({ lastAt: Date.now(), lastSig: sig, remoteTime: saved.modifiedTime, needsReconnect: false, newerInDrive: false });
      return true;
    } finally {
      useDriveBackup.getState().set({ busy: false });
    }
  });
}

/** Restore the Drive backup onto this phone. */
export function restoreFromDrive(file: DriveFile, tok: string): Promise<void> {
  return exclusive(async () => {
    useDriveBackup.getState().set({ busy: true });
    try {
      const res = await fetch(`${DRIVE}/files/${file.id}?alt=media`, { headers: { Authorization: `Bearer ${tok}` } });
      if (!res.ok) throw new DriveError(`Drive ${res.status}`, res.status);
      applyBackup(parseBackup(await res.text()));
      useDriveBackup.getState().set({ lastAt: Date.now(), lastSig: signature(), remoteTime: file.modifiedTime, newerInDrive: false, needsReconnect: false });
    } finally {
      useDriveBackup.getState().set({ busy: false });
    }
  });
}

/** Quiet backup when the user leaves the app (at most every 6 hours, only if something changed). */
async function autoBackup() {
  const st = useDriveBackup.getState();
  if (st.email == null || st.newerInDrive) return;
  if (st.lastAt && Date.now() - st.lastAt < AUTO_EVERY) return;
  if (st.lastSig === signature()) return;
  await backupNow().catch(() => {});
}

/** Wire up automatic backups. Returns a cleanup function. */
export function startDriveBackup(): () => void {
  if (!driveBackupAvailable()) return () => {};
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'background') autoBackup();
  });
  // Catch up if the last backup is over a day old (e.g. the app was swiped away).
  const id = setTimeout(() => {
    const { lastAt } = useDriveBackup.getState();
    if (!lastAt || Date.now() - lastAt > 24 * 3600_000) autoBackup();
  }, 8000);
  return () => {
    sub.remove();
    clearTimeout(id);
  };
}

/* ------------------------------------------------------------------ */
/* Flows with prompts (Profile and onboarding)                         */
/* ------------------------------------------------------------------ */

const toast = (msg: string) => ToastAndroid.show(msg, ToastAndroid.SHORT);

function ask<K extends string>(title: string, message: string, buttons: { key: K; text: string; style?: 'cancel' | 'destructive' }[]): Promise<K | null> {
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      buttons.map((b) => ({ text: b.text, style: b.style, onPress: () => resolve(b.key) })),
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

function describe(file: DriveFile): string {
  const habits = Number(file.appProperties?.habits ?? 0);
  const streak = Number(file.appProperties?.streak ?? 0);
  const parts = [t('Last backup: {when}', { when: formatLastUpdated(file.modifiedTime) })];
  if (habits) parts.push(habits === 1 ? t('1 habit') : t('{n} habits', { n: habits }));
  if (streak > 1) parts.push(t('{n}-day streak', { n: streak }));
  return parts.join('\n');
}

function explain(e: unknown) {
  haptic.warning();
  const offline = e instanceof TypeError; // fetch network failure
  Alert.alert(
    t('Google Drive backup'),
    offline ? t('You seem to be offline. Try again when you’re connected.') : t('Something went wrong talking to Google Drive. Please try again.'),
  );
}

export type ConnectResult = 'restored' | 'backed-up' | 'connected' | 'none' | 'cancelled';

/**
 * Turn on Google Drive backup: pick an account, then restore a backup found
 * there or make the first one. During onboarding it only looks for a backup.
 */
export async function connectDrive({ onboarding = false } = {}): Promise<ConnectResult> {
  if (!DeviceSignals) return 'cancelled';
  const st = useDriveBackup.getState();
  st.set({ busy: true });
  try {
    const tok = await DeviceSignals.authorizeDrive(null, true);
    if (!tok) return 'cancelled';
    const email = await accountEmail(tok);
    const remote = await findBackup(tok);

    if (onboarding) {
      if (!remote) {
        const pick = await ask(
          t('No backup found'),
          email ? t('There’s no habit backup in {email}.', { email }) : t('There’s no habit backup in this Google account.'),
          [
            { key: 'ok', text: t('OK') },
            { key: 'other', text: t('Try another account') },
          ],
        );
        if (email) await DeviceSignals.revokeDrive(email).catch(() => {});
        return pick === 'other' ? connectDrive({ onboarding }) : 'none';
      }
      const pick = await ask(t('Backup found'), `${email ?? ''}\n${describe(remote)}`.trim(), [
        { key: 'no', text: t('Not now'), style: 'cancel' },
        { key: 'restore', text: t('Restore') },
      ]);
      if (pick !== 'restore') return 'cancelled';
      useDriveBackup.getState().set({ email: email ?? '' });
      await restoreFromDrive(remote, tok);
      haptic.success();
      toast(t('Welcome back! Your habits are restored'));
      return 'restored';
    }

    useDriveBackup.getState().set({ email: email ?? '', needsReconnect: false });
    if (remote) {
      const pick = await ask(
        t('You already have a backup'),
        `${describe(remote)}\n\n${t('Restore it to this phone, or replace it with what’s on this phone now?')}`,
        [
          { key: 'cancel', text: t('Cancel'), style: 'cancel' },
          { key: 'replace', text: t('Replace') },
          { key: 'restore', text: t('Restore') },
        ],
      );
      if (pick === 'restore') {
        await restoreFromDrive(remote, tok);
        haptic.success();
        toast(t('Backup restored'));
        return 'restored';
      }
      if (pick !== 'replace') {
        // Stay connected but never overwrite that backup without asking.
        useDriveBackup.getState().set({ remoteTime: remote.modifiedTime, newerInDrive: true });
        return 'connected';
      }
    }
    await backupNow({ interactive: true, force: true });
    haptic.success();
    toast(t('Backed up to Google Drive'));
    return 'backed-up';
  } catch (e) {
    explain(e);
    return 'cancelled';
  } finally {
    useDriveBackup.getState().set({ busy: false });
  }
}

/** "Back up now" button. */
export async function backupNowWithUi() {
  try {
    const ok = await backupNow({ interactive: true });
    const st = useDriveBackup.getState();
    if (ok) {
      haptic.success();
      toast(t('Backed up to Google Drive'));
    } else if (st.newerInDrive) {
      const pick = await ask(t('Newer backup in Drive'), t('Your Google Drive has a newer backup, maybe from another phone. Replace it with this phone’s data?'), [
        { key: 'cancel', text: t('Cancel'), style: 'cancel' },
        { key: 'replace', text: t('Replace') },
      ]);
      if (pick === 'replace') {
        await backupNow({ interactive: true, force: true });
        haptic.success();
        toast(t('Backed up to Google Drive'));
      }
    } else if (st.needsReconnect) {
      Alert.alert(t('Google Drive backup'), t('Google needs you to allow access again. Tap the backup row to reconnect.'));
    }
  } catch (e) {
    explain(e);
  }
}

/** "Restore from Drive" button. */
export async function restoreWithUi() {
  try {
    const tok = await token(true);
    if (!tok) return;
    const remote = await findBackup(tok);
    if (!remote) {
      Alert.alert(t('No backup found'), t('There’s no habit backup in this Google account yet.'));
      return;
    }
    const pick = await ask(t('Restore this backup?'), `${describe(remote)}\n\n${t('Your current data on this phone will be replaced.')}`, [
      { key: 'cancel', text: t('Cancel'), style: 'cancel' },
      { key: 'restore', text: t('Restore'), style: 'destructive' },
    ]);
    if (pick !== 'restore') return;
    await restoreFromDrive(remote, tok);
    haptic.success();
    toast(t('Backup restored'));
  } catch (e) {
    explain(e);
  }
}

/** Turn backup off. The file stays in Drive, so it can be restored later. */
export async function disconnectDrive() {
  const { email } = useDriveBackup.getState();
  if (email) await DeviceSignals?.revokeDrive(email).catch(() => {});
  useDriveBackup.getState().set({ email: null, lastAt: null, lastSig: null, remoteTime: null, needsReconnect: false, newerInDrive: false });
}
