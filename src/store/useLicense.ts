import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { PAYWALL } from '@/buildFlags';

import type { Habit } from '@/data/types';

/**
 * Habit Tracker Pro: Google Play product ids (create them in Play Console,
 * see docs/play-store/monetization.md). Prices live in Play Console:
 *  - pro_monthly      subscription, ₹99 / month   (other countries about $3.99)
 *  - pro_yearly       subscription, ₹499 / year   (about $24.99)
 *  - pro_lifetime     one-time in-app product, ₹1,499 (about $59.99)
 *                     (`lifetime_unlock` is taken by a deleted subscription)
 */
export const SKU = { monthly: 'pro_monthly', yearly: 'pro_yearly', lifetime: 'pro_lifetime' } as const;
export type Plan = keyof typeof SKU;
export const SUB_SKUS: string[] = [SKU.monthly, SKU.yearly];

export const TRIAL_DAYS = 7;
/** Friends who join from an invite link get a longer trial. */
export const REFERRED_TRIAL_DAYS = 14;
/** Free plan after the trial: this many habits stay fully usable, forever. */
export const FREE_HABITS = 5;
/** Shown until Google Play returns the real localized prices. */
export const FALLBACK_PRICES: Record<Plan, string> = { monthly: '₹99', yearly: '₹499', lifetime: '₹1,499' };
/**
 * Optional launch offer: set FOUNDER_UNTIL to a date and lower the Play prices
 * to show a "Founder price" tag with these regular prices struck through
 * (India only). Off by default.
 */
export const REGULAR_PRICES: Partial<Record<Plan, string>> = { yearly: '₹499', lifetime: '₹1,499' };
export const FOUNDER_UNTIL = 0;
export const isFounderTime = (now = Date.now()) => now < FOUNDER_UNTIL;

/**
 * 'live'    — Play Store builds: 7-day trial, then logging needs Pro.
 * 'preview' — test APKs from GitHub (not signed for Play Billing): the paywall
 *             can be opened and tried, but nothing ever locks.
 * Set per build by CI (src/buildFlags.ts).
 */
export const PAYWALL_MODE: 'live' | 'preview' = PAYWALL;

const DAY = 86_400_000;

/**
 * Access code for Google Play reviewers (they can't buy or use free trials).
 * Give it only in Play Console → App content → Sign in details. It unlocks
 * Pro on that phone for CODE_DAYS; change it here if it ever leaks.
 */
const ACCESS_CODES = ['PLAYREVIEW-HT26'];
const CODE_DAYS = 30;
const normalize = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '');

interface LicenseState {
  /** Epoch ms the free trial began (null until onboarding finishes). */
  trialStart: number | null;
  /** Lifetime unlock owned (confirmed by Google Play). */
  lifetime: boolean;
  /** Which subscription is active right now (confirmed by Google Play), if any. */
  subscription: 'monthly' | 'yearly' | null;
  /** Localized prices from Google Play, e.g. "₹399.00". */
  prices: Partial<Record<Plan, string>>;
  /** Epoch ms an access code keeps Pro unlocked until (reviewers). */
  codeUntil: number | null;
  /** Epoch ms Pro earned by inviting friends lasts until (from the backend). */
  rewardUntil: number | null;
  /** Length of this install's free trial (longer when invited by a friend). */
  trialDays: number;
  setRewardUntil: (ms: number | null) => void;
  setTrialDays: (days: number) => void;
  /** Returns true when the code is valid (and unlocks Pro). */
  redeemCode: (code: string) => boolean;
  startTrial: () => void;
  setOwnership: (o: { lifetime: boolean; subscription: LicenseState['subscription'] }) => void;
  setPrices: (p: Partial<Record<Plan, string>>) => void;
}

export const useLicense = create<LicenseState>()(
  persist(
    (set, get) => ({
      trialStart: null,
      lifetime: false,
      subscription: null,
      prices: {},
      codeUntil: null,
      rewardUntil: null,
      trialDays: TRIAL_DAYS,
      setRewardUntil: (ms) => set({ rewardUntil: ms }),
      setTrialDays: (days) => set({ trialDays: days }),
      redeemCode: (code) => {
        const ok = ACCESS_CODES.some((c) => normalize(c) === normalize(code));
        if (ok) set({ codeUntil: Date.now() + CODE_DAYS * DAY });
        return ok;
      },
      startTrial: () => {
        const begin = () => {
          if (get().trialStart == null) set({ trialStart: Date.now() });
        };
        // Wait for the saved state, or a fresh start date would be overwritten by it.
        if (useLicense.persist.hasHydrated()) begin();
        else useLicense.persist.onFinishHydration(begin);
      },
      setOwnership: (o) => set(o),
      setPrices: (p) => set((s) => ({ prices: { ...s.prices, ...p } })),
    }),
    {
      name: 'license-v1',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // v2: one-time "owned" became `lifetime` when monthly/yearly plans arrived.
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<LicenseState> & { owned?: boolean; price?: string };
        if (version < 2) return { trialStart: p.trialStart ?? null, lifetime: !!p.owned, subscription: null, prices: {} } as unknown as LicenseState;
        return p as LicenseState;
      },
    },
  ),
);

/** Whole days left in the trial (0 when it's over). */
export function trialDaysLeft(trialStart: number | null, now = Date.now(), days = useLicense.getState().trialDays ?? TRIAL_DAYS): number {
  if (trialStart == null) return days;
  return Math.max(0, Math.ceil((trialStart + days * DAY - now) / DAY));
}

type Ownership = Pick<LicenseState, 'trialStart' | 'lifetime' | 'subscription' | 'codeUntil' | 'rewardUntil' | 'trialDays'>;

/** Paid (or earned) Pro: a subscription, lifetime, a reviewer code or invite rewards. Not the trial. */
export const isPro = (s: Pick<LicenseState, 'lifetime' | 'subscription' | 'codeUntil' | 'rewardUntil'>, now = Date.now()) =>
  s.lifetime || s.subscription != null || (s.codeUntil ?? 0) > now || (s.rewardUntil ?? 0) > now;

/** Every Pro feature available right now: Pro, the trial, or a test build. */
export function unlockedFrom(s: Ownership, now = Date.now()): boolean {
  return PAYWALL_MODE !== 'live' || isPro(s, now) || trialDaysLeft(s.trialStart, now, s.trialDays ?? TRIAL_DAYS) > 0;
}

/** Are Pro features available right now? (Outside React.) */
export const isUnlocked = () => unlockedFrom(useLicense.getState());

/** Same, as a hook. */
export function useUnlocked(): boolean {
  const trialStart = useLicense((s) => s.trialStart);
  const lifetime = useLicense((s) => s.lifetime);
  const subscription = useLicense((s) => s.subscription);
  const codeUntil = useLicense((s) => s.codeUntil);
  const rewardUntil = useLicense((s) => s.rewardUntil);
  const trialDays = useLicense((s) => s.trialDays);
  return unlockedFrom({ trialStart, lifetime, subscription, codeUntil, rewardUntil, trialDays });
}

/**
 * Free plan: the first FREE_HABITS active habits (oldest first) stay fully
 * usable after the trial. The rest stay visible, with their history, but
 * need Pro to log.
 */
export function freeHabitIds(habits: Habit[]): Set<string> {
  const live = habits.filter((h) => !h.archived).sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  return new Set(live.slice(0, FREE_HABITS).map((h) => h.id));
}

/** Can this habit be logged right now? (Outside React; pass the current habits.) */
export const canLogHabit = (habits: Habit[], id: string) => isUnlocked() || freeHabitIds(habits).has(id);

/** Can another habit be added right now? */
export const canAddHabit = (habits: Habit[]) => isUnlocked() || habits.filter((h) => !h.archived).length < FREE_HABITS;

export const usePro = () => useLicense((s) => isPro(s));

/** Which plan the AI coach should meter against. */
export function aiPlan(): 'subscription' | 'lifetime' | 'trial' | 'free' {
  const s = useLicense.getState();
  if (s.subscription != null || (s.codeUntil ?? 0) > Date.now() || (s.rewardUntil ?? 0) > Date.now() || PAYWALL_MODE !== 'live') return 'subscription';
  if (s.lifetime) return 'lifetime';
  if (trialDaysLeft(s.trialStart) > 0) return 'trial';
  return 'free';
}

export function usePrices(): Record<Plan, string> {
  const p = useLicense((s) => s.prices);
  // `||`, not `??`: Google Play can return an empty price before a product is live.
  return { monthly: p.monthly || FALLBACK_PRICES.monthly, yearly: p.yearly || FALLBACK_PRICES.yearly, lifetime: p.lifetime || FALLBACK_PRICES.lifetime };
}
