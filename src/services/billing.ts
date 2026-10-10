import { AppState, Platform } from 'react-native';
import {
  ErrorCode,
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
  type Purchase,
} from 'expo-iap';

import { LIFETIME_SKU, useLicense } from '@/store/useLicense';

/**
 * Google Play Billing for the one-time lifetime unlock. Purchases are
 * confirmed by Play on the device; owning the product is re-checked on every
 * launch, so a refund removes it and a reinstall restores it.
 */

export type BuyResult = 'purchased' | 'pending' | 'cancelled' | 'unavailable' | 'error';

let ready: Promise<boolean> | null = null;
let waiter: ((r: BuyResult) => void) | null = null;

function settle(r: BuyResult) {
  waiter?.(r);
  waiter = null;
}

async function grant(p: Purchase) {
  if (p.productId !== LIFETIME_SKU) return;
  if (p.purchaseState === 'pending') return settle('pending');
  if (p.purchaseState !== 'purchased') return;
  useLicense.getState().setOwned(true);
  // Acknowledge within 3 days or Google refunds it automatically.
  await finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
  settle('purchased');
}

function connect(): Promise<boolean> {
  if (Platform.OS !== 'android') return Promise.resolve(false);
  ready ??= (async () => {
    try {
      await initConnection();
      purchaseUpdatedListener((p) => {
        grant(p).catch(() => {});
      });
      purchaseErrorListener((e) => {
        if (e.code === ErrorCode.UserCancelled) settle('cancelled');
        else if (e.code === ErrorCode.AlreadyOwned) refresh().then(() => settle('purchased'));
        else settle('error');
      });
      return true;
    } catch {
      ready = null; // try again next time
      return false;
    }
  })();
  return ready;
}

/** Load the localized price and whether the unlock is owned. */
export async function refresh(): Promise<void> {
  if (!(await connect())) return;
  try {
    const products = await fetchProducts({ skus: [LIFETIME_SKU], type: 'in-app' });
    const p = (products ?? []).find((x) => x.id === LIFETIME_SKU);
    if (p) useLicense.getState().setPrice(p.displayPrice);
  } catch {
    // Offline or not set up yet — keep the cached price.
  }
  try {
    const purchases = await getAvailablePurchases();
    const mine = purchases.filter((p) => p.productId === LIFETIME_SKU && p.purchaseState === 'purchased');
    useLicense.getState().setOwned(mine.length > 0);
    for (const p of mine) await finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
  } catch {
    // Can't reach Play right now — keep what we knew.
  }
}

/** Open Google Play's purchase sheet; resolves when Play reports back. */
export async function buyLifetime(): Promise<BuyResult> {
  if (!(await connect())) return 'unavailable';
  settle('cancelled'); // a previous, abandoned attempt
  const result = new Promise<BuyResult>((resolve) => (waiter = resolve));
  try {
    await requestPurchase({ request: { google: { skus: [LIFETIME_SKU] } }, type: 'in-app' });
  } catch (e) {
    const code = (e as { code?: string })?.code;
    settle(code === ErrorCode.UserCancelled ? 'cancelled' : code === ErrorCode.ItemUnavailable || code === ErrorCode.BillingUnavailable ? 'unavailable' : 'error');
  }
  return result;
}

/** "Restore purchase": true if Play says the unlock is owned. */
export async function restoreLifetime(): Promise<boolean> {
  await refresh();
  return useLicense.getState().owned;
}

/** Check ownership on launch and whenever the app comes back. */
export function startBilling() {
  refresh().catch(() => {});
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') refresh().catch(() => {});
  });
  return () => sub.remove();
}
