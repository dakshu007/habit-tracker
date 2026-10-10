import { AppState, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { useHabitStore, type SmartNudges } from '@/store/useHabitStore';
import type { Habit, Logs } from '@/data/types';
import { dueOn, isDoneOn } from '@/logic/habits';
import { dayKey, shiftKey, fromKey } from '@/utils/date';
import { t } from '@/i18n';

const CHANNEL = 'reminders';
const NUDGE_DAYS = 7;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function setupNotifications() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Habit reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 180, 120, 180],
      lightColor: '#4C8DF6',
    });
  }
}

export async function hasPermission(): Promise<boolean> {
  const p = await Notifications.getPermissionsAsync();
  return p.granted;
}

/** Ask for notification permission (Android 13+ shows the system prompt). */
export async function ensurePermission(): Promise<boolean> {
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

const NUDGE_LINES = [
  'keep your streak alive.',
  'a few minutes is all it takes.',
  'future you says thanks.',
  'small steps, big change.',
];

/**
 * Rebuild every scheduled notification from current state. Cheap and
 * idempotent, so we simply call it whenever habits/settings/today's logs change.
 *  - Per-habit reminders: repeating daily, or weekly on the habit's weekdays.
 *  - Evening nudge: one-shot for each of the next 7 days, skipped when that
 *    day is already complete (today) or has nothing due.
 */
export async function syncNotifications() {
  if (!(await hasPermission())) return;
  const { habits, logs, settings, profile } = useHabitStore.getState();

  // Only replace the notifications this function owns (focus sessions schedule their own).
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => OWNED.includes(String(n.content.data?.kind ?? 'reminder')))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );

  for (const h of habits) {
    if (h.archived || !h.reminder.enabled) continue;
    const content: Notifications.NotificationContentInput = {
      title: h.title,
      body: `Time for ${h.title.toLowerCase()}: goal ${h.goalValue} ${h.unit}. ${h.subtitle}`.trim(),
      data: { kind: 'reminder', habitId: h.id, url: `habittracker://complete/${h.id}` },
    };
    const { hour, minute } = h.reminder;
    if (h.schedule.kind === 'days') {
      for (const d of h.schedule.days) {
        await Notifications.scheduleNotificationAsync({
          content,
          trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: d + 1, hour, minute, channelId: CHANNEL },
        });
      }
    } else {
      await Notifications.scheduleNotificationAsync({
        content,
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
      });
    }
  }

  if (settings.nudge.enabled) {
    const today = dayKey();
    const now = Date.now();
    for (let i = 0; i < NUDGE_DAYS; i++) {
      const key = shiftKey(today, i);
      const at = fromKey(key);
      at.setHours(settings.nudge.hour, settings.nudge.minute, 0, 0);
      if (at.getTime() <= now + 30_000) continue;
      const due = dueOn(habits, key);
      const open = i === 0 ? due.filter((h) => !isDoneOn(h, logs, key)) : due;
      if (!open.length) continue;
      const line = NUDGE_LINES[(at.getDate() + open.length) % NUDGE_LINES.length];
      await Notifications.scheduleNotificationAsync({
        content: {
          title: open.length === 1 ? t('{habit} is still open', { habit: open[0].title }) : t('{n} habits left today', { n: open.length }),
          body: `${t('Check them off before bed:')} ${t(line)}`,
          data: { kind: 'nudge' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at, channelId: CHANNEL },
      });
    }
  }

  await scheduleSmart(habits, logs, settings.smart, profile.name);

  if (settings.weeklyReview && habits.some((h) => !h.archived)) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('Your week in habits is ready'),
        body: t('See your best day, longest streak and one idea for next week.'),
        data: { kind: 'review', url: 'habittracker://review' },
      },
      // Sunday (1) at 7 PM.
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 19, minute: 0, channelId: CHANNEL },
    });
  }
}

/** Notification kinds owned (and rebuilt) by syncNotifications. */
const OWNED = ['reminder', 'nudge', 'review', 'smart'];

const SMART_DAYS = 3;
const isWater = (h: Habit) => h.artId === 'aura-drop' || /water|पानी/i.test(h.title) || /glass/i.test(h.unit);

/** Bedtime, good-morning plan and water breaks (Reminders → Daily nudges). */
async function scheduleSmart(habits: Habit[], logs: Logs, smart: SmartNudges, name: string) {
  const at = (key: string, hour: number, minute: number) => {
    const d = fromKey(key);
    d.setHours(hour, minute, 0, 0);
    return d;
  };
  const later = (d: Date) => d.getTime() > Date.now() + 30_000;
  const today = dayKey();
  const hi = name ? `, ${name}` : '';

  if (smart.bedtime.enabled) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: t('Time to sleep{name} 🌙', { name: hi }),
        body: t('Phone down, lights low. Good sleep makes tomorrow’s habits easy.'),
        data: { kind: 'smart' },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: smart.bedtime.hour, minute: smart.bedtime.minute, channelId: CHANNEL },
    });
  }

  for (let i = 0; i < SMART_DAYS; i++) {
    const key = shiftKey(today, i);

    if (smart.morning.enabled) {
      const when = at(key, smart.morning.hour, smart.morning.minute);
      const due = dueOn(habits, key);
      if (later(when) && due.length) {
        const names = due.slice(0, 3).map((h) => h.title).join(', ');
        await Notifications.scheduleNotificationAsync({
          content: {
            title: t('Good morning{name} ☀️', { name: hi }),
            body: due.length === 1 ? t('1 habit today: {list}.', { list: names }) : t('{n} habits today: {list}{more}.', { n: due.length, list: names, more: due.length > 3 ? '…' : '' }),
            data: { kind: 'smart', url: 'habittracker://' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
        });
      }
    }

    if (smart.water.enabled) {
      // Skip the rest of a day once the water habit is done.
      const water = habits.find((h) => !h.archived && isWater(h));
      if (water && isDoneOn(water, logs, key)) continue;
      for (let hour = smart.water.from; hour <= smart.water.to; hour += Math.max(1, smart.water.every)) {
        const when = at(key, hour, 0);
        if (!later(when)) continue;
        await Notifications.scheduleNotificationAsync({
          content: {
            title: t('Water break 💧'),
            body: t('A glass now keeps you sharp. Tap to log it.'),
            data: { kind: 'smart', url: water ? `habittracker://complete/${water.id}` : 'habittracker://' },
          },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
        });
      }
    }
  }
}

/** Open the deep link carried by a tapped notification. */
export function startNotificationTaps() {
  const open = (r: Notifications.NotificationResponse | null) => {
    const url = r?.notification.request.content.data?.url;
    if (typeof url === 'string') Linking.openURL(url).catch(() => {});
  };
  Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}

let timer: ReturnType<typeof setTimeout> | null = null;
function scheduleSync() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    syncNotifications().catch(() => {});
  }, 1200);
}

/** Keep notifications in sync with the store; returns an unsubscribe. */
export function startNotificationSync() {
  scheduleSync();
  const unsub = useHabitStore.subscribe((s, prev) => {
    if (s.habits !== prev.habits || s.settings !== prev.settings || s.logs !== prev.logs) scheduleSync();
  });
  const app = AppState.addEventListener('change', (st) => {
    if (st === 'active') scheduleSync();
  });
  return () => {
    unsub();
    app.remove();
  };
}
