# Habit Tracker Pro: pricing & Play Console setup

Free download · **7-day trial** of everything (14 days when invited by a friend; in the app, no card) · then a **free plan forever** (5 habits) or **Pro**.

| Plan | Play product | India | Other countries (approx.) |
|---|---|---|---|
| Monthly | `pro_monthly`, base plan `monthly` | ₹99 | $3.99 (set ₹349 for all countries, then India ₹99) |
| **Yearly** (pre-selected) | `pro_yearly`, base plan `yearly` | ₹499 | $24.99 (₹2,199, then India ₹499) |
| Lifetime | `pro_lifetime` (one-time, purchase option `buy`) | ₹1,499 | $59.99 (₹5,299, then India ₹1,499) |

IDs must match `SKU` in `src/store/useLicense.ts`. Don't use `lifetime_unlock` (burned on a deleted subscription).

**Free plan** (after the trial, forever): 5 habits with logging, streaks, reminders and alarms, the Today widget, backup and export, challenges, weekly review, 1 AI weekly insight per week.
**Pro**: unlimited habits, auto-tracking (Health Connect), GPS runs, sleep from phone use, voice logging, insights, Year in Review, PDF/CSV reports, all 5 widgets, AI coach chat.

No founder discount at launch. To run one later, lower the Play prices and set `FOUNDER_UNTIL` in `useLicense.ts`: the paywall then shows a "Founder price" tag with the regular rupee price struck through (India only).

## One-time setup
1. **Payments profile**: Play Console → Settings → Payments profile.
2. **Upload the first `.aab`** (from the GitHub release) to Internal testing: Play only allows products after a build with the `BILLING` permission is uploaded.
3. **Subscriptions** (Monetize → Products → Subscriptions):
   - Create `pro_monthly` → add base plan `monthly` → Auto-renewing, billing period 1 month, price ₹99 (India) → Activate.
   - Create `pro_yearly` → add base plan `yearly` → Auto-renewing, billing period 1 year, price ₹399 → Activate.
   - Don't add a Play free-trial offer: the app already gives everyone a free trial and a free plan.
4. **One-time product** (Monetize → Products → In-app products): `pro_lifetime`, name "Habit Tracker Pro (Lifetime)", ₹999 → Activate.
5. Let Play convert prices for other countries, or set them yourself.

## Testing without paying
- **License testers**: Settings → License testing → add testers' Gmail addresses. Their purchases use test cards and cost nothing; test subscriptions renew every few minutes (monthly ≈ 5 min, yearly ≈ 30 min) and stop after 6 renewals.
- Testers must install from the **Play testing link** (not the GitHub APK).
- GitHub test APKs run in **preview**: the paywall opens, nothing ever locks.

## Closed test (12 testers × 14 days)
The trial is 7 days, then the free plan keeps 5 habits. Ask testers to try buying any plan (free for license testers) and keep using the app until day 14.

## Notes
- Google keeps 15% on subscriptions and one-time products (first $1M/year); prices include GST, which Google remits in India.
- Ownership is re-checked with Google Play on every launch: cancellations, refunds and reinstalls are reflected automatically ("Restore purchase" also works).
- Play policy: the paywall shows price, billing period, auto-renewal and how to cancel (it does).
- Data safety: payments are processed by Google Play; the app does not collect financial info.
