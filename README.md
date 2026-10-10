# Habit Tracker

An illustrated, gesture-driven habit tracker for Android, built with Expo (SDK 57) and React Native. It's offline-first: all data stays on the phone.

## Features
- **Card stack home:** 22 hand-drawn illustrations, tilt parallax, slide-to-complete (with no take-backs), a background that changes colour as you swipe, and a date wheel
- **Flexible habits:** any goal and unit, daily / chosen weekdays / N times a week, quick-log step, exact value entry
- **Quit mode:** days clean, money saved, slips
- **Health Connect auto-tracking:** steps, distance, running, walking, cycling, swimming, yoga, dance, workouts, floors, sleep
- **GPS runs:** live map (free OpenFreeMap tiles), distance, pace, km splits, pace-coloured route; records with the screen off (foreground service, no background-location permission); logs to your running habit; stored on device and included in backups
- **Sleep from phone use:** bedtime window + screen on/off history (Usage access) → hours slept, no watch needed
- **Voice logging:** "2 glasses of water", "ran 5 km", "done meditating" (English + Hindi) via the phone's speech recognizer; app-icon shortcuts (Voice log / Quick log / Start a run)
- **Monthly report:** designed one-page PDF or CSV of every entry, made on device
- **Friends:** invite link, challenge codes to do a challenge together, share progress
- **Past days are view-only:** only today can be logged
- **Streaks:** streak freezes (earned every 7 days, applied automatically) and rest days
- **Challenges:** 7/21/30 days, milestones, trophies
- **Routines:** play habits one card at a time
- **Focus mode:** countdown, generated ambient sounds, end chime, ongoing notification
- **Mood check-ins** after completing a habit, with insights in Stats
- **Stats, calendar heatmap, weekly review story,** levels, 12 achievements with unlockable themes
- **Share cards** (streak / today / week) and an offline accountability buddy via WhatsApp
- **Reminders:** per-habit, a smart evening nudge, and the Sunday review
- **Widgets:** habit card and today list (slide deep-links to the real slider); Quick Settings tile
- **Customisation:** 7 animation styles, light/dark, haptics, English + हिन्दी
- **Your data:** backup export/restore, Android Auto Backup, privacy policy in-app

## Pricing
Free download, 7-day full trial, then **Habit Tracker Pro**: ₹59/month, ₹399/year or ₹999 lifetime via Google Play Billing. Setup: `docs/play-store/monetization.md`. CI sets `src/buildFlags.ts` per output: the Google Play `.aab` is `live` (locks after the trial), the GitHub test `.apk` is `preview` (never locks).

## Native code
`modules/device-signals` is a local Expo module (Kotlin): screen on/off events via `UsageStatsManager` for sleep, and `RecognizerIntent` for voice. It's auto-linked from `./modules`.

## Develop
```bash
npm install
npx expo run:android   # needs Android Studio / SDK
```

## Builds
Every push runs `.github/workflows/android.yml`, which builds a release APK and publishes it as a GitHub pre-release (`build-N`).

### Optional GitHub secrets
| Secret | Effect |
|---|---|
| `SENTRY_DSN` | Turns on crash reporting (no personal data). |
| `ANDROID_KEYSTORE_BASE64` + `ANDROID_KEYSTORE_PASSWORD` + `ANDROID_KEY_ALIAS` + `ANDROID_KEY_PASSWORD` | Signs with your Play upload key and also builds an `.aab` for Google Play. |

Without them, builds are signed with the shared debug key, which is fine for testing.

## Before publishing
- Choose the brand name (the package id `app.mykavo.habittracker` is permanent once live)
- Host `PRIVACY.md` at a public URL (support email: support@mykavo.app)
- Fill in Play Console using `docs/play-store/listing.md` and `docs/play-store/data-safety.md` (includes the Health Connect declaration)
