import { AppState, Platform } from 'react-native';
import {
  deepLinkToSubscriptions,
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

import { SKU, SUB_SKUS, useLicense, type Plan } from '@/store/useLicense';

/**
 * Google Play Billing for Habit Tracker Pro: monthly / yearly subscriptions
 * and a one-time lifetime unlock. Play confirms purchases on the device;
 * ownership is re-checked on every launch, so cancellations, refunds and
 * reinstalls are all reflected automatically.
 */

export type BuyResult = 'purchased' | 'pending' | 'cancelled' | 'unavailable' | 'error';

const ALL = [SKU.monthly, SKU.yearly, SKU.lifetime] as string[];
const planOf = (sku: string): Plan | null => (sku === SKU.monthly ? 'monthly' : sku === SKU.yearly ? 'yearly' : sku === SKU.lifetime ? 'lifetime' : null);

let ready: Promise<boolean> | null = null;
let waiter: ((r: BuyResult) => void) | null = null;
/** Offer token per subscription (Play needs it to start a subscription). */
const offerTokens: Partial<Record<string, string>> = {};

/** Play couldn't be reached or couldn't sell right now (its own sheet may already have said so). */
const UNAVAILABLE: string[] = [
  ErrorCode.BillingUnavailable,
  ErrorCode.ItemUnavailable,
  ErrorCode.IapNotAvailable,
  ErrorCode.NetworkError,
  ErrorCode.ServiceError,
  ErrorCode.ServiceTimeout,
  ErrorCode.ServiceDisconnected,
  ErrorCode.RemoteError,
];
const resultOf = (code: string | undefined): BuyResult =>
  code === ErrorCode.UserCancelled ? 'cancelled' : code && UNAVAILABLE.includes(code) ? 'unavailable' : 'error';

function settle(r: BuyResult) {
  waiter?.(r);
  waiter = null;
}

/** Turn Play's list of what the user holds into our ownership flags. */
function applyOwnership(purchases: Purchase[]) {
  const held = purchases.filter((p) => ALL.includes(p.productId) && p.purchaseState === 'purchased');
  const lifetime = held.some((p) => p.productId === SKU.lifetime);
  const sub = held.find((p) => p.productId === SKU.yearly) ?? held.find((p) => p.productId === SKU.monthly);
  useLicense.getState().setOwnership({ lifetime, subscription: sub ? (planOf(sub.productId) as 'monthly' | 'yearly') : null });
  return held;
}

async function grant(p: Purchase) {
  if (!ALL.includes(p.productId)) return;
  if (p.purchaseState === 'pending') return settle('pending');
  if (p.purchaseState !== 'purchased') return;
  const s = useLicense.getState();
  const plan = planOf(p.productId);
  if (plan === 'lifetime') s.setOwnership({ lifetime: true, subscription: s.subscription });
  else if (plan) s.setOwnership({ lifetime: s.lifetime, subscription: plan });
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
        else settle(resultOf(e.code));
      });
      return true;
    } catch {
      ready = null; // try again next time
      return false;
    }
  })();
  return ready;
}

/** Load localized prices and what the user currently holds. */
export async function refresh(): Promise<void> {
  if (!(await connect())) return;
  const prices: Partial<Record<Plan, string>> = {};
  try {
    const one = await fetchProducts({ skus: [SKU.lifetime], type: 'in-app' });
    const p = (one ?? []).find((x) => x.id === SKU.lifetime);
    if (p) prices.lifetime = p.displayPrice;
  } catch {
    // Offline or not set up yet — keep cached prices.
  }
  try {
    const subs = await fetchProducts({ skus: SUB_SKUS, type: 'subs' });
    for (const s of subs ?? []) {
      if (s.type !== 'subs') continue;
      // The plain base plan (no promo offer) — its first offer is the full price.
      const offers = s.subscriptionOffers ?? [];
      const offer = offers.find((o) => !o.offerTagsAndroid?.length) ?? offers[0];
      if (offer?.offerTokenAndroid) offerTokens[s.id] = offer.offerTokenAndroid;
      const plan = planOf(s.id);
      if (plan) prices[plan] = offer?.displayPrice ?? s.displayPrice;
    }
  } catch {
    // Keep cached prices.
  }
  for (const k of Object.keys(prices) as Plan[]) if (!prices[k]?.trim()) delete prices[k];
  if (Object.keys(prices).length) useLicense.getState().setPrices(prices);

  try {
    const held = applyOwnership(await getAvailablePurchases());
    for (const p of held) await finishTransaction({ purchase: p, isConsumable: false }).catch(() => {});
  } catch {
    // Can't reach Play right now — keep what we knew.
  }
}

/** Open Google Play's purchase sheet for a plan; resolves when Play reports back. */
export async function buy(plan: Plan): Promise<BuyResult> {
  if (!(await connect())) return 'unavailable';
  settle('cancelled'); // a previous, abandoned attempt
  const result = new Promise<BuyResult>((resolve) => (waiter = resolve));
  try {
    if (plan === 'lifetime') {
      await requestPurchase({ request: { google: { skus: [SKU.lifetime] } }, type: 'in-app' });
    } else {
      const sku = SKU[plan];
      if (!offerTokens[sku]) await refresh();
      const offerToken = offerTokens[sku];
      if (!offerToken) {
        settle('unavailable');
        return result;
      }
      await requestPurchase({ request: { google: { skus: [sku], subscriptionOffers: [{ sku, offerToken }] } }, type: 'subs' });
    }
  } catch (e) {
    settle(resultOf((e as { code?: string })?.code));
  }
  return result;
}

/** "Restore purchase": true if Play says the user has Pro. */
export async function restorePurchases(): Promise<boolean> {
  await refresh();
  const s = useLicense.getState();
  return s.lifetime || s.subscription != null;
}

/** Google Play's page to change or cancel the subscription. */
export function manageSubscription() {
  const plan = useLicense.getState().subscription;
  return deepLinkToSubscriptions({ packageNameAndroid: 'app.mykavo.habittracker', skuAndroid: plan ? SKU[plan] : undefined }).catch(() => {});
}

/** Check ownership on launch and whenever the app comes back. */
export function startBilling() {
  refresh().catch(() => {});
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') refresh().catch(() => {});
  });
  return () => sub.remove();
}
