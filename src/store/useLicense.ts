import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { PAYWALL } from '@/buildFlags';

/**
 * Habit Tracker Pro — Google Play product ids (create them in Play Console,
 * see docs/play-store/monetization.md):
 *  - pro_monthly      subscription, ₹59 / month
 *  - pro_yearly       subscription, ₹399 / year
 *  - lifetime_unlock  one-time in-app product, ₹999
 */
export const SKU = { monthly: 'pro_monthly', yearly: 'pro_yearly', lifetime: 'lifetime_unlock' } as const;
export type Plan = keyof typeof SKU;
export const SUB_SKUS: string[] = [SKU.monthly, SKU.yearly];

export const TRIAL_DAYS = 7;
/** Shown until Google Play returns the real localized prices. */
export const FALLBACK_PRICES: Record<Plan, string> = { monthly: '₹59', yearly: '₹399', lifetime: '₹999' };

/**
 * 'live'    — Play Store builds: 7-day trial, then logging needs Pro.
 * 'preview' — test APKs from GitHub (not signed for Play Billing): the paywall
 *             can be opened and tried, but nothing ever locks.
 * Set per build by CI (src/buildFlags.ts).
 */
export const PAYWALL_MODE: 'live' | 'preview' = PAYWALL;

const DAY = 86_400_000;

interface LicenseState {
  /** Epoch ms the free trial began (null until onboarding finishes). */
  trialStart: number | null;
  /** Lifetime unlock owned (confirmed by Google Play). */
  lifetime: boolean;
  /** Which subscription is active right now (confirmed by Google Play), if any. */
  subscription: 'monthly' | 'yearly' | null;
  /** Localized prices from Google Play, e.g. "₹399.00". */
  prices: Partial<Record<Plan, string>>;
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
export function trialDaysLeft(trialStart: number | null, now = Date.now()): number {
  if (trialStart == null) return TRIAL_DAYS;
  return Math.max(0, Math.ceil((trialStart + TRIAL_DAYS * DAY - now) / DAY));
}

type Ownership = Pick<LicenseState, 'trialStart' | 'lifetime' | 'subscription'>;

export const isPro = (s: Pick<LicenseState, 'lifetime' | 'subscription'>) => s.lifetime || s.subscription != null;

export function unlockedFrom(s: Ownership, now = Date.now()): boolean {
  return PAYWALL_MODE !== 'live' || isPro(s) || trialDaysLeft(s.trialStart, now) > 0;
}

/** Can the user log right now? (Outside React.) */
export const isUnlocked = () => unlockedFrom(useLicense.getState());

/** Same, as a hook. */
export function useUnlocked(): boolean {
  const trialStart = useLicense((s) => s.trialStart);
  const lifetime = useLicense((s) => s.lifetime);
  const subscription = useLicense((s) => s.subscription);
  return unlockedFrom({ trialStart, lifetime, subscription });
}

export const usePro = () => useLicense((s) => isPro(s));

export function usePrices(): Record<Plan, string> {
  const p = useLicense((s) => s.prices);
  return { monthly: p.monthly ?? FALLBACK_PRICES.monthly, yearly: p.yearly ?? FALLBACK_PRICES.yearly, lifetime: p.lifetime ?? FALLBACK_PRICES.lifetime };
}
