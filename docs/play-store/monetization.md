# Habit Tracker Pro — pricing & Play Console setup

Free download · **7-day free trial** of everything (in the app, no card needed) · then **Pro**:

| Plan | Play product | Type | Price (India) |
|---|---|---|---|
| Monthly | `pro_monthly` | Subscription, base plan `monthly`, auto-renews every 1 month | ₹59 |
| **Yearly** (pre-selected, "Save 44%") | `pro_yearly` | Subscription, base plan `yearly`, auto-renews every 1 year | ₹399 |
| Lifetime | `lifetime_unlock` | In-app product (one-time, non-consumable) | ₹999 |

IDs must match `SKU` in `src/store/useLicense.ts`. After the trial, history stays viewable; logging needs Pro.
People who bought `lifetime_unlock` during testing (at ₹199) keep lifetime.

## One-time setup
1. **Payments profile**: Play Console → Settings → Payments profile.
2. **Upload the first `.aab`** (from the GitHub release) to Internal testing — Play only allows products after a build with the `BILLING` permission is uploaded.
3. **Subscriptions** (Monetize → Products → Subscriptions):
   - Create `pro_monthly` → add base plan `monthly` → Auto-renewing, billing period 1 month, price ₹59 → Activate.
   - Create `pro_yearly` → add base plan `yearly` → Auto-renewing, billing period 1 year, price ₹399 → Activate.
   - Don't add a Play free-trial offer: the app already gives everyone 7 days free.
4. **One-time product** (Monetize → Products → In-app products): `lifetime_unlock`, name "Lifetime", ₹999 → Activate.
5. Let Play convert prices for other countries, or set them yourself.

## Testing without paying
- **License testers**: Settings → License testing → add testers' Gmail addresses. Their purchases use test cards and cost nothing; test subscriptions renew every few minutes (monthly ≈ 5 min, yearly ≈ 30 min) and stop after 6 renewals.
- Testers must install from the **Play testing link** (not the GitHub APK).
- GitHub test APKs run in **preview**: the paywall opens, nothing ever locks.

## Closed test (12 testers × 14 days)
The trial is 7 days; ask testers to tap **Continue** on any plan after the trial (free for license testers) and keep using the app until day 14.

## Notes
- Google keeps 15% on subscriptions and one-time products (first $1M/year); prices include GST, which Google remits in India.
- Ownership is re-checked with Google Play on every launch: cancellations, refunds and reinstalls are reflected automatically ("Restore purchase" also works).
- Play policy: the paywall shows price, billing period, auto-renewal and how to cancel (it does).
- Data safety: payments are processed by Google Play; the app does not collect financial info.
