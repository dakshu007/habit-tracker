import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { useHabitStore } from '@/store/useHabitStore';
import { dueOn, isDoneOn } from '@/logic/habits';
import { dayKey } from '@/utils/date';
import { CARD_WIDGET, LIST_WIDGET, renderCardWidget, renderTodayWidget } from './TodayWidget';
import { resolveLang, setLang } from '@/i18n/core';
import { MINI_WIDGET, renderMiniWidget, renderSleepWidget, renderStreakWidget, SLEEP_WIDGET, STREAK_WIDGET } from './MoreWidgets';
import { syncPhoneSleep } from '@/services/phoneSleep';

const ALL_WIDGETS = [LIST_WIDGET, CARD_WIDGET, STREAK_WIDGET, SLEEP_WIDGET, MINI_WIDGET];

/** Current store state shaped for widgets (always "today", not the app's selected day). */
export function widgetData() {
  const s = useHabitStore.getState();
  return { habits: s.habits, logs: s.logs, day: dayKey(), name: s.profile.name, weekStart: s.settings.weekStart };
}

const cardKey = (widgetId: number) => `widget-card:${widgetId}`;

/** Which habit a card widget shows: its saved pick, else the first open habit today. */
export async function cardHabitFor(widgetId: number): Promise<string | null> {
  const { habits, logs, day } = widgetData();
  const due = dueOn(habits, day);
  const saved = await AsyncStorage.getItem(cardKey(widgetId)).catch(() => null);
  if (saved && due.some((h) => h.id === saved)) return saved;
  return (due.find((h) => !isDoneOn(h, logs, day)) ?? due[0])?.id ?? null;
}

async function stepCard(widgetId: number, currentId: string, dir: 1 | -1) {
  const { habits, day } = widgetData();
  const due = dueOn(habits, day);
  if (!due.length) return;
  const i = Math.max(0, due.findIndex((h) => h.id === currentId));
  const next = due[(i + dir + due.length) % due.length];
  await AsyncStorage.setItem(cardKey(widgetId), next.id).catch(() => {});
}

/**
 * Runs in a headless JS task whenever Android asks for a widget (added,
 * periodic update, resize) or the user taps an action on it. Shares the app's
 * persisted store, so a change here shows up in the app instantly (if open)
 * or on next launch. Completing happens in-app via the slide (deep link).
 */
export async function widgetTaskHandler({ widgetInfo, widgetAction, clickAction, clickActionData, renderWidget }: WidgetTaskHandlerProps) {
  const { widgetName, widgetId, width, height } = widgetInfo;
  if (!ALL_WIDGETS.includes(widgetName)) return;
  if (widgetAction === 'WIDGET_DELETED') {
    await AsyncStorage.removeItem(cardKey(widgetId)).catch(() => {});
    return;
  }

  // Headless start: make sure persisted data is loaded before reading/writing it.
  if (!useHabitStore.persist.hasHydrated()) await useHabitStore.persist.rehydrate();
  setLang(resolveLang(useHabitStore.getState().settings.language));

  if (widgetAction === 'WIDGET_CLICK') {
    const id = typeof clickActionData?.id === 'string' ? clickActionData.id : null;
    const store = useHabitStore.getState();
    if (id && clickAction === 'ADD') {
      const h = store.habits.find((x) => x.id === id);
      if (h) store.addValue(id, dayKey(), h.step);
    }
    if (id && (clickAction === 'NEXT' || clickAction === 'PREV')) await stepCard(widgetId, id, clickAction === 'NEXT' ? 1 : -1);
  }

  if (widgetName === CARD_WIDGET) {
    renderWidget(renderCardWidget(widgetData(), await cardHabitFor(widgetId), width, height));
  } else if (widgetName === MINI_WIDGET) {
    renderWidget(renderMiniWidget(widgetData(), await cardHabitFor(widgetId), width, height));
  } else if (widgetName === STREAK_WIDGET) {
    renderWidget(renderStreakWidget(widgetData()));
  } else if (widgetName === SLEEP_WIDGET) {
    // Periodic updates pick up last night's phone sleep without opening the app.
    await syncPhoneSleep().catch(() => 0);
    renderWidget(renderSleepWidget(widgetData(), width));
  } else {
    renderWidget(renderTodayWidget(widgetData(), width, height));
  }
}
