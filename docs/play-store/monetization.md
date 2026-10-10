# Lifetime unlock (₹199) + 7-day trial — Play Console setup

The app is **free to download**. Everyone gets a **7-day full trial** (from onboarding). After that, logging needs the one-time **lifetime unlock**; history stays viewable.

| Thing | Value |
|---|---|
| Product type | In-app product (one-time, **non-consumable**) |
| Product ID | `lifetime_unlock` (must match `LIFETIME_SKU` in `src/store/useLicense.ts`) |
| Price | ₹199 (Play converts for other countries; you can edit per country) |
| Code | `src/services/billing.ts` (expo-iap / Google Play Billing), `src/screens/PaywallScreen.tsx` |

## One-time setup
1. **Payments profile**: Play Console → Settings → Payments profile (needed to sell anything).
2. **Signing secrets** in GitHub (see README). With them, CI also builds the Google Play `.aab` with the paywall live (`src/buildFlags.ts`); the GitHub `.apk` stays in preview and never locks.
3. **Upload the first `.aab`** to Internal testing. Play only lets you create products after a build with the `BILLING` permission is uploaded.
4. **Create the product**: Monetize → Products → In-app products → Create → ID `lifetime_unlock`, name "Lifetime unlock", price ₹199 → Activate.

## Testing without paying
- **License testers**: Settings → License testing → add the testers' Gmail addresses.
  Their purchases use test cards ("Test card, always approves") and **cost nothing**. They can "buy" the unlock as often as needed, and refund it from Order management to test again.
- Testers must install from the **Play testing link** (not the GitHub APK) for billing to work.
- GitHub test APKs (no signing secrets) run in **preview**: the paywall opens, nothing ever locks.

## Closed test (12 testers × 14 days)
The trial is only 7 days, so ask testers (license testers) to tap **Unlock** after the trial — it's free for them — and keep using the app until day 14.

## Notes
- Google keeps 15% (first $1M/year); the ₹199 price includes GST, which Google remits in India.
- The unlock is re-checked with Google Play on every launch: refunds remove it, reinstalling restores it ("Restore purchase" also works).
- Data safety: payments are processed by Google Play; the app does not collect financial info.
