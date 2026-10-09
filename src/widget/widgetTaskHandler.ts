import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { useHabitStore } from '@/store/useHabitStore';
import { dayKey } from '@/utils/date';
import { renderTodayWidget, WIDGET_NAME } from './TodayWidget';

/** Current store state shaped for the widget (always "today", not the app's selected day). */
export function widgetData() {
  const s = useHabitStore.getState();
  return { habits: s.habits, logs: s.logs, day: dayKey(), name: s.profile.name };
}

/**
 * Runs in a headless JS task whenever Android asks for the widget (added,
 * periodic update, resize) or the user taps an action on it. Shares the app's
 * persisted store, so a check-off here shows up in the app instantly (if open)
 * or on next launch.
 */
export async function widgetTaskHandler({ widgetInfo, widgetAction, clickAction, clickActionData, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetInfo.widgetName !== WIDGET_NAME || widgetAction === 'WIDGET_DELETED') return;

  // Headless start: make sure persisted data is loaded before reading/writing it.
  if (!useHabitStore.persist.hasHydrated()) await useHabitStore.persist.rehydrate();

  if (widgetAction === 'WIDGET_CLICK') {
    const id = typeof clickActionData?.id === 'string' ? clickActionData.id : null;
    const today = dayKey();
    const store = useHabitStore.getState();
    if (id && clickAction === 'COMPLETE') store.complete(id, today);
    if (id && clickAction === 'ADD') {
      const h = store.habits.find((x) => x.id === id);
      if (h) store.addValue(id, today, h.step);
    }
  }

  renderWidget(renderTodayWidget(widgetData(), widgetInfo.width, widgetInfo.height));
}
