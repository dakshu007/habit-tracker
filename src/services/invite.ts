import { Share } from 'react-native';

import { useHabitStore } from '@/store/useHabitStore';
import { challengeCode, type Challenge } from '@/data/challenges';
import { t } from '@/i18n';

/** Play Store page (works once the app is published). */
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=app.mykavo.habittracker';

/**
 * Friends without accounts: invites and challenge codes go out through the
 * share sheet (WhatsApp, SMS…). Finding contacts who already use the app and
 * live leaderboards need cloud sync, so they come with it.
 */
export function inviteFriends() {
  const name = useHabitStore.getState().profile.name;
  const message = [
    name ? t('{name} invited you to Habit Tracker', { name }) : t('Join me on Habit Tracker'),
    t('Build habits with beautiful cards, streaks and challenges. Free.'),
    PLAY_URL,
  ].join('\n');
  return Share.share({ message });
}

export function shareChallengeCode(c: Challenge, startDay: string) {
  const code = challengeCode(c.id, startDay);
  const message = [
    t('I’m doing the “{challenge}” challenge. Join me!', { challenge: t(c.title) }),
    t('1. Get Habit Tracker: {url}', { url: PLAY_URL }),
    t('2. Open Challenges → “Have a code?” and enter: {code}', { code }),
  ].join('\n');
  return Share.share({ message });
}

export function shareChallengeProgress(c: Challenge, startDay: string, day: number, done: number) {
  const message = [
    t('Day {day} of {total} on “{challenge}”: {done} days done so far. How are you doing?', { day, total: c.days, challenge: t(c.title), done }),
    t('Join with code {code}', { code: challengeCode(c.id, startDay) }),
  ].join('\n');
  return Share.share({ message });
}
