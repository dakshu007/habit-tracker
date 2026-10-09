# Habit Tracker

An illustrated, gesture-driven habit tracker for Android, built with Expo (SDK 57) and React Native. It's offline-first: all data stays on the phone.

## Features
- **Card stack home:** swipeable illustrated habit cards with tilt parallax, slide-to-complete, and a background that changes colour live as you swipe
- **Date wheel:** scroll to any day to log or review it; dots show how complete each day was
- **Flexible habits:** any goal and unit, daily / specific weekdays / N times a week, quick-log step, exact value entry, focus timer for timed habits
- **Stats:** level & XP, streaks, 7/30-day completion charts, best-weekday insight, per-habit rates
- **Calendar:** monthly heatmap (all habits or one), day sheet with quick check-off
- **Reminders:** per-habit reminders + a smart evening nudge that only fires when habits are still open
- **Profile:** light/dark/system theme, haptics, motion, week start, backup export/restore, erase data
- **Android glass UI:** real-time blur via `expo-blur` BlurTargetView + layered gloss/rim, native Android haptics

## Develop
```bash
npm install
npx expo run:android   # needs Android Studio / SDK
```

## Builds
Every push runs `.github/workflows/android.yml`, which builds a release APK and publishes it as a GitHub pre-release (`build-N`).
