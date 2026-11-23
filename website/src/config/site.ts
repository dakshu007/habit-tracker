/** One place for the facts every page repeats. Change a price here and the whole site follows. */
export const SITE = {
  name: 'Habit Tracker',
  fullName: 'Habit Tracker: Daily Routine',
  url: 'https://habbittrackz.netlify.app',
  company: 'Mykavo',
  email: 'support@mykavo.app',
  playUrl: 'https://play.google.com/store/apps/details?id=app.mykavo.habittracker',
  googleVerification: '4N5b9mUevn2OzdIqgR_kUHPo2D-JTpIfd1gN0cCx03s',
  defaultDescription:
    'Build habits that stick with illustrated habit cards, slide-to-complete, streaks, an AI coach, GPS runs, sleep tracking and home-screen widgets. 7 days free on Android.',
};

/** Blog author. Leave a link empty to hide its button. */
export const AUTHOR = {
  name: 'Dakshesh',
  role: 'Founder, MyKavo',
  short: 'Founder',
  photo: '/img/dakshesh.webp',
  bio: 'I spent years building WooCommerce plugins used by hundreds of thousands of stores, and learned that small, boring improvements done every day beat big bursts of effort. I built Habit Tracker to make those small daily wins feel good enough to keep.',
  credentials: [
    'WooCommerce plugin developer, 100K+ stores',
    'Maker of the free MyKavo plugin on WordPress.org',
    'Founder @MyKavo, maker of Habit Tracker: Daily Routine',
  ],
  linkedin: '',
  website: 'https://mykavo.app',
};

/** Play Store link tagged with where on the site the tap came from (shows up in Play Console acquisition reports). */
export const playLink = (from: string) =>
  `${SITE.playUrl}&referrer=${encodeURIComponent(`utm_source=website&utm_medium=${from}`)}`;

export interface Plan {
  id: 'monthly' | 'yearly' | 'lifetime';
  name: string;
  price: string;
  amount: number;
  period: string;
  note: string;
  badge?: string;
}

/** Matches FALLBACK_PRICES in the app (src/store/useLicense.ts). Google Play shows the final local price. */
export const PLANS: Plan[] = [
  { id: 'monthly', name: 'Monthly', price: '₹99', amount: 99, period: '/month', note: 'Cancel anytime' },
  { id: 'yearly', name: 'Yearly', price: '₹499', amount: 499, period: '/year', note: 'Just ₹42 a month', badge: 'Save 58%' },
  { id: 'lifetime', name: 'Lifetime', price: '₹1,499', amount: 1499, period: ' once', note: 'Pay once, yours forever' },
];

export const TRIAL_DAYS = 7;
export const FREE_HABITS = 5;

/** Every Pro plan unlocks the same things (docs/app-facts.md). */
export const PRO_FEATURES = [
  'Unlimited habits, all 22 illustrations',
  'AI coach chat in English, Hindi or Hinglish',
  'Steps, runs and sleep from Health Connect',
  'Sleep tracking from phone use, no watch',
  'GPS runs with a live map',
  'Voice logging in English and Hindi',
  'All 5 home-screen widgets',
  'Insights, Year in Review and PDF/CSV reports',
];

/** What stays free after the trial. */
export const FREE_FEATURES = [
  `${FREE_HABITS} habits with streaks, freezes and rest days`,
  'Reminders, nudges and alarms',
  "Today's habits widget and Quick Settings tile",
  'Focus timer, routines and mood check-ins',
  'Challenges, achievements and themes',
  'Calendar, stats and the weekly review',
  'One free AI weekly insight every week',
  'File and Google Drive backup',
];
