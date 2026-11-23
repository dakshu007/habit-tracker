import { PLANS, TRIAL_DAYS, FREE_HABITS } from '../config/site';

const [monthly, yearly, lifetime] = PLANS;

/** Home page FAQ; also emitted as FAQPage structured data. */
export const HOME_FAQ = [
  {
    q: 'Is Habit Tracker free?',
    a: `You get ${TRIAL_DAYS} days of the full app free, no card needed. After that you can keep ${FREE_HABITS} habits free forever, or unlock everything with Habit Tracker Pro: ${monthly.price}/month, ${yearly.price}/year or ${lifetime.price} once for lifetime. Your history always stays viewable.`,
  },
  {
    q: 'What does the AI coach do?',
    a: 'It reads a short summary of your habits (goals, streaks, the last 14 days and your mood) and answers questions like “why do I keep skipping?” with personal, practical tips, in English, Hindi or Hinglish. Chat is part of Pro and the free trial, and everyone gets one free AI weekly insight every week.',
  },
  {
    q: 'How do I get 3 months of Pro free?',
    a: 'Share your invite link from Profile. You get 14 days of Pro for every friend who installs from your link and uses the app on 3 different days, plus a 20-day bonus at your 5th friend: 5 friends add up to 90 days. Your friends get a 14-day free trial instead of 7.',
  },
  {
    q: 'Is it available on iPhone?',
    a: 'Not yet. Habit Tracker is built for Android, with home-screen widgets, a Quick Settings tile and Health Connect support.',
  },
  {
    q: 'Where is my data stored?',
    a: 'On your phone. There is no account and no ads. Habits, routes, sleep and moods stay on your device unless you back them up to your own Google Drive or share a card yourself. Only the optional AI coach and invites use our small server.',
  },
  {
    q: 'How does sleep tracking work without a watch?',
    a: 'Set a bedtime window, for example 10 PM to 6 AM. The app counts the time your screen stayed off in that window as sleep. Short glances at the clock don’t count as waking up.',
  },
  {
    q: 'Can it track steps and runs automatically?',
    a: 'Yes. Steps, distance, workouts, floors and sleep come from Health Connect (your phone, Samsung Health, Google Fit, Fitbit or a watch). Runs can also be recorded with GPS and a live map, even with the screen off.',
  },
  {
    q: 'What happens if I miss a day?',
    a: 'Every 7-day streak milestone earns a streak freeze (you can bank up to 3) that covers a missed day automatically, and you can plan rest days that pause your streak.',
  },
  {
    q: 'Does it work in Hindi?',
    a: 'Yes. The whole app is available in English and हिन्दी, voice logging understands both, and the AI coach replies in Hindi or Hinglish too.',
  },
  {
    q: 'How do I cancel a subscription?',
    a: 'Subscriptions are billed by Google Play. Cancel anytime in the Play Store under Payments & subscriptions → Subscriptions.',
  },
];
