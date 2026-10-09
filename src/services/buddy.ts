import { Linking, Share } from 'react-native';

import { useHabitStore } from '@/store/useHabitStore';
import { bestCurrentStreak, dueOn, isDoneOn } from '@/logic/habits';
import { t } from '@/i18n';

/**
 * Accountability buddy (offline): one tap sends today's progress to a friend
 * via WhatsApp (if a number is saved) or the share sheet. A real two-way
 * buddy feature needs cloud sync and comes later.
 */
export function buddyMessage(): string {
  const { habits, logs, today, settings, profile } = useHabitStore.getState();
  const due = dueOn(habits, today);
  const done = due.filter((h) => isDoneOn(h, logs, today));
  const best = bestCurrentStreak(habits, logs, today, settings.weekStart);
  const lines = [
    profile.name ? t('{name}’s habit check-in', { name: profile.name }) : t('My habit check-in'),
    t('{done} of {total} done today', { done: done.length, total: due.length }),
    ...due.map((h) => `${isDoneOn(h, logs, today) ? '[x]' : '[ ]'} ${h.title}`),
  ];
  if (best?.streak.current) lines.push(t('Longest streak: {n} days of {habit}', { n: best.streak.current, habit: best.habit.title }));
  lines.push(t('Keep me honest!'));
  return lines.join('\n');
}

export async function sendToBuddy() {
  const buddy = useHabitStore.getState().extras.buddy;
  const message = buddyMessage();
  const digits = buddy?.phone?.replace(/[^\d]/g, '');
  if (digits) {
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
      return;
    } catch {
      /* fall through to the share sheet */
    }
  }
  await Share.share({ message });
}
