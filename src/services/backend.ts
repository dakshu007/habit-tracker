import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { DeviceSignals } from '../../modules/device-signals';
import { backendEnabled, SUPABASE_KEY, SUPABASE_URL } from '@/config/backend';
import { REFERRED_TRIAL_DAYS, useLicense } from '@/store/useLicense';
import { dayKey } from '@/utils/date';

/**
 * Tiny Supabase client over fetch (no SDK): anonymous sign-in, database
 * functions and Edge Functions. The user never sees an account; a random
 * anonymous id is created on first use and kept on the phone.
 */

const SESSION_KEY = 'backend-session';
const FLAGS_KEY = 'backend-flags';
/** Secret that lets a Google Drive restore reclaim this install's invites and rewards. */
const RESTORE_KEY = 'backend-restore-key';

interface Session {
  access_token: string;
  refresh_token: string;
  /** Epoch ms. */
  expires_at: number;
  user_id: string;
}

interface Flags {
  /** Install referrer read (once per install). */
  referrerChecked?: boolean;
  /** Last day mark_active ran. */
  activeDay?: string;
  /** Told the backend this invited install bought Pro. */
  paidReported?: boolean;
  /** The restore key's hash is on the server. */
  restoreKeySet?: boolean;
  /** A restored backup's key still has to be claimed (we were offline). */
  adoptPending?: boolean;
}

let session: Session | null = null;
let pending: Promise<Session | null> | null = null;

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

const base = () => ({ apikey: SUPABASE_KEY, 'Content-Type': 'application/json' });

function toSession(r: { access_token?: string; refresh_token?: string; expires_in?: number; user?: { id?: string } }): Session | null {
  if (!r?.access_token || !r.refresh_token || !r.user?.id) return null;
  return { access_token: r.access_token, refresh_token: r.refresh_token, expires_at: Date.now() + (r.expires_in ?? 3600) * 1000, user_id: r.user.id };
}

async function authRequest(path: string, body: unknown): Promise<Session | null> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, { method: 'POST', headers: base(), body: JSON.stringify(body) });
  if (!res.ok) return null;
  return toSession(await res.json());
}

/** A valid session: stored, refreshed, or a new anonymous user. */
async function getSession(): Promise<Session | null> {
  if (!backendEnabled()) return null;
  if (session && session.expires_at - 60_000 > Date.now()) return session;
  if (pending) return pending;
  pending = (async () => {
    const stored = session ?? (await readJson<Session>(SESSION_KEY));
    let next: Session | null = null;
    if (stored && stored.expires_at - 60_000 > Date.now()) next = stored;
    else if (stored) next = await authRequest('token?grant_type=refresh_token', { refresh_token: stored.refresh_token });
    // Refresh failed (or first run): start a new anonymous user.
    if (!next) next = await authRequest('signup', { data: {} });
    if (next) {
      session = next;
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next)).catch(() => {});
    }
    return next;
  })().finally(() => {
    pending = null;
  });
  return pending;
}

/** Call a database function (supabase/schema.sql). Throws on failure. */
export async function rpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const s = await getSession();
  if (!s) throw new Error('offline');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { ...base(), Authorization: `Bearer ${s.access_token}` },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`rpc ${name} ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

/** Call an Edge Function. Resolves with the status and JSON body (never throws on HTTP errors). */
export async function callFunction<T>(name: string, body: unknown): Promise<{ status: number; data: T | null }> {
  const s = await getSession();
  if (!s) return { status: 0, data: null };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { ...base(), Authorization: `Bearer ${s.access_token}` },
    body: JSON.stringify(body),
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    /* empty */
  }
  return { status: res.status, data };
}

/* ------------------------------------------------------------------ */
/* Invites                                                             */
/* ------------------------------------------------------------------ */

export interface Referrals {
  code: string;
  /** Friends who installed from your link. */
  joined: number;
  /** Friends who used the app on 3 days (each one earns you Pro time). */
  qualified: number;
  reward_until: string | null;
}

const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T) => Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);

/** "utm_source=google-play&ref=AB12CD" → "AB12CD". */
export function codeFromReferrer(referrer: string): string | null {
  const m = /(?:^|[&?])ref=([A-Za-z0-9]{4,12})/.exec(referrer);
  return m ? m[1].toUpperCase() : null;
}

/** Invite link: Play passes `ref` back to the app on first launch. */
export const inviteLink = (code: string) =>
  `https://play.google.com/store/apps/details?id=app.mykavo.habittracker&referrer=${encodeURIComponent(`utm_source=invite&ref=${code}`)}`;

export async function fetchReferrals(): Promise<Referrals | null> {
  if (!backendEnabled()) return null;
  try {
    const r = await rpc<Referrals>('my_referrals');
    if (r) applyReward(r.reward_until);
    return r;
  } catch {
    return null;
  }
}

function applyReward(until: string | null | undefined) {
  const ms = until ? Date.parse(until) : NaN;
  useLicense.getState().setRewardUntil(Number.isFinite(ms) ? ms : null);
}

/** This install's restore key (created on first use). Goes into the Drive backup. */
export async function getRestoreKey(): Promise<string | null> {
  try {
    const have = await AsyncStorage.getItem(RESTORE_KEY);
    if (have) return have;
    const key = DeviceSignals?.randomKey();
    if (!key) return null;
    await AsyncStorage.setItem(RESTORE_KEY, key);
    return key;
  } catch {
    return null;
  }
}

/**
 * After restoring a Google Drive backup: take over the old install's invite
 * code, invited friends and earned Pro time. Retried on launch if offline.
 */
export async function adoptRestoredAccount(key: string): Promise<void> {
  const flags = (await readJson<Flags>(FLAGS_KEY)) ?? {};
  await AsyncStorage.setItem(RESTORE_KEY, key).catch(() => {});
  flags.adoptPending = true;
  flags.restoreKeySet = true; // the server already has this key's hash
  await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(flags)).catch(() => {});
  if (backendEnabled()) await startBackend();
}

/**
 * On launch: make sure this install has a profile, claim the invite it came
 * from (once), count today as an active day, report a purchase by an invited
 * friend, and pick up Pro time earned from invites.
 */
let backendRun: Promise<void> = Promise.resolve();
export function startBackend(): Promise<void> {
  // One at a time, so two runs never overwrite each other's flags.
  backendRun = backendRun.then(runBackend, runBackend);
  return backendRun;
}

async function runBackend() {
  if (!backendEnabled() || Platform.OS !== 'android') return;
  try {
    const flags = (await readJson<Flags>(FLAGS_KEY)) ?? {};
    const profile = await rpc<{ code: string; referred: boolean; reward_until: string | null }>('ensure_profile', {
      p_device: DeviceSignals?.getDeviceId() ?? '',
    });
    applyReward(profile?.reward_until);

    // One trial per phone: the server remembers when this phone's trial began,
    // so uninstalling and reinstalling doesn't start a new one.
    const lic0 = useLicense.getState();
    if (lic0.trialStart != null) {
      const started = await rpc<string | null>('trial_start', {
        p_device: DeviceSignals?.getDeviceId() ?? '',
        p_local: new Date(lic0.trialStart).toISOString(),
      }).catch(() => null);
      const ms = started ? Date.parse(started) : NaN;
      if (Number.isFinite(ms) && ms < (useLicense.getState().trialStart ?? Infinity)) useLicense.getState().setTrialStart(ms);
    }

    // A restored backup: reclaim the old install's invites and rewards.
    if (flags.adoptPending) {
      const key = await AsyncStorage.getItem(RESTORE_KEY).catch(() => null);
      const r = key ? await rpc<string>('adopt_profile', { p_key: key }).catch(() => null) : 'none';
      // Retry only on network errors; 'unknown' etc. are final.
      if (r != null) {
        flags.adoptPending = false;
        flags.referrerChecked = true; // a returning user isn't a new invite
      }
    }
    if (!flags.restoreKeySet) {
      const key = await getRestoreKey();
      if (key) {
        const ok = await rpc('set_restore_key', { p_key: key }).then(() => true, () => false);
        if (ok) flags.restoreKeySet = true;
      }
    }

    if (!flags.referrerChecked) {
      const referrer = DeviceSignals ? await withTimeout(DeviceSignals.getInstallReferrer(), 6000, '') : '';
      const code = codeFromReferrer(referrer);
      if (code && !profile?.referred) {
        const result = await rpc<string>('claim_referral', { p_code: code }).catch(() => null);
        // Invited friends get a longer trial.
        if (result === 'ok') useLicense.getState().setTrialDays(REFERRED_TRIAL_DAYS);
      }
      flags.referrerChecked = true;
    }

    const today = dayKey();
    if (flags.activeDay !== today) {
      await rpc('mark_active').catch(() => {});
      flags.activeDay = today;
    }

    const lic = useLicense.getState();
    if (!flags.paidReported && (lic.lifetime || lic.subscription)) {
      await rpc('report_paid').catch(() => {});
      flags.paidReported = true;
    }

    await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify(flags)).catch(() => {});
    await fetchReferrals();
  } catch {
    // Offline or backend not set up: try again next launch.
  }
}
