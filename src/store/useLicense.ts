import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Google Play in-app product id for the one-time lifetime unlock (create it in Play Console). */
export const LIFETIME_SKU = 'lifetime_unlock';
export const TRIAL_DAYS = 7;
/** Shown until the store returns the real localized price. */
export const FALLBACK_PRICE = '₹199';

/**
 * 'live'    — Play Store builds: 7-day trial, then logging needs the lifetime unlock.
 * 'preview' — test APKs from GitHub (not signed for Play Billing): the paywall
 *             can be opened and tried, but nothing ever locks.
 * Set by CI through EXPO_PUBLIC_PAYWALL.
 */
export const PAYWALL_MODE: 'live' | 'preview' = process.env.EXPO_PUBLIC_PAYWALL === 'live' ? 'live' : 'preview';

const DAY = 86_400_000;

interface LicenseState {
  /** Epoch ms the free trial began (null until onboarding finishes). */
  trialStart: number | null;
  /** The lifetime unlock was bought (confirmed by Google Play). */
  owned: boolean;
  /** Localized price from Google Play, e.g. "₹199.00". */
  price: string | null;
  startTrial: () => void;
  setOwned: (owned: boolean) => void;
  setPrice: (price: string | null) => void;
}

export const useLicense = create<LicenseState>()(
  persist(
    (set, get) => ({
      trialStart: null,
      owned: false,
      price: null,
      startTrial: () => {
        const begin = () => {
          if (get().trialStart == null) set({ trialStart: Date.now() });
        };
        // Wait for the saved state, or a fresh start date would be overwritten by it.
        if (useLicense.persist.hasHydrated()) begin();
        else useLicense.persist.onFinishHydration(begin);
      },
      setOwned: (owned) => set({ owned }),
      setPrice: (price) => set({ price }),
    }),
    { name: 'license-v1', version: 1, storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** Whole days left in the trial (0 when it's over). */
export function trialDaysLeft(trialStart: number | null, now = Date.now()): number {
  if (trialStart == null) return TRIAL_DAYS;
  return Math.max(0, Math.ceil((trialStart + TRIAL_DAYS * DAY - now) / DAY));
}

export function unlockedFrom(s: Pick<LicenseState, 'trialStart' | 'owned'>, now = Date.now()): boolean {
  return PAYWALL_MODE !== 'live' || s.owned || trialDaysLeft(s.trialStart, now) > 0;
}

/** Can the user log right now? (Outside React.) */
export const isUnlocked = () => unlockedFrom(useLicense.getState());

/** Same, as a hook. */
export function useUnlocked(): boolean {
  const trialStart = useLicense((s) => s.trialStart);
  const owned = useLicense((s) => s.owned);
  return unlockedFrom({ trialStart, owned });
}

export const usePrice = () => useLicense((s) => s.price) ?? FALLBACK_PRICE;
