/**
 * Privacy policy text, shown in-app (Profile → Privacy policy) and mirrored in
 * PRIVACY.md for the Play Store listing. Keep the two in sync.
 */
export const PRIVACY_UPDATED = '10 October 2026';

/** Public support address shown in the policy and Profile. */
export const SUPPORT_EMAIL = 'support@mykavo.app';

export const PRIVACY_SECTIONS: { title: string; body: string }[] = [
  {
    title: 'The short version',
    body: 'Habit Tracker works offline. Your habits, history, notes, moods and profile photo are stored only on your phone. We don’t have servers that receive your data, we don’t sell data, and there are no ads or third-party trackers.',
  },
  {
    title: 'What the app stores on your device',
    body: 'Habits you create, daily progress, streaks, moods and notes you choose to add, your name, motto and optional profile photo, and app settings. You can export it at any time (Profile → Export backup) and erase it (Profile → Erase all data).',
  },
  {
    title: 'Health Connect',
    body: 'If you turn on auto-tracking for a habit, the app reads steps, distance, exercise sessions, floors climbed and sleep from Health Connect — only the types you allow, only to fill in your habit progress on this device. Health data is never sent anywhere, never used for advertising, and never shared. You can revoke access at any time in Health Connect settings.',
  },
  {
    title: 'Location and runs',
    body: 'When you start a run, the app uses your precise location (only while the run is recording — never "all the time") to draw your route and measure distance and pace. Routes are stored only on this phone. Map images are loaded from OpenFreeMap (openfreemap.org, OpenStreetMap data); like any website, their server sees which map area is being loaded and your IP address, but no account, name or route is sent. You can delete any run, and turn location off in Android settings at any time.',
  },
  {
    title: 'Sleep from phone use',
    body: 'If you turn on "Sleep from phone use" for a habit, the app reads only the times your screen turned on and off during your bedtime window, using Android\'s Usage access (which you grant in Settings and can turn off at any time). It never reads which apps you used. The times are processed on your phone to estimate your sleep, and are never stored elsewhere or sent anywhere.',
  },
  {
    title: 'Voice logging',
    body: 'Voice logging opens your phone\'s own speech recognizer (usually Google voice typing). That service turns your words into text under its own privacy policy; Habit Tracker never records audio and only receives the text, which is used once to find the habit and amount and is not kept.',
  },
  {
    title: 'Reports',
    body: 'Monthly reports (PDF or CSV) are created on your phone and only leave it when you choose where to share them.',
  },
  {
    title: 'Purchases',
    body: 'Pro subscriptions and the lifetime unlock are bought through Google Play. Google handles the payment; the app only learns which plan you have, and never sees your card or UPI details.',
  },
  {
    title: 'Notifications',
    body: 'Reminders, the evening nudge, focus timers and the weekly review are scheduled locally on your phone. No push server is involved.',
  },
  {
    title: 'Backups',
    body: 'Android may back up the app’s data to your own Google account (Android Auto Backup), so it can be restored on a new phone. This is handled by Google under your account settings. Manual backup files you export stay wherever you save them.',
  },
  {
    title: 'Crash reports',
    body: 'If crash reporting is enabled in a release, technical crash details (device model, Android version, error stack) are sent to Sentry to help fix bugs. They don’t include your habits, notes or health data.',
  },
  {
    title: 'Sharing',
    body: 'Share cards and buddy messages are only sent when you tap Share, through the app you pick.',
  },
  {
    title: 'Children',
    body: 'The app isn’t directed at children under 13.',
  },
  {
    title: 'Contact',
    body: 'Questions about privacy? Email {email}.',
  },
];
