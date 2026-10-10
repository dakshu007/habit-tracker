import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { useHabitStore } from '@/store/useHabitStore';
import { CARD_WIDGET, LIST_WIDGET, renderCardWidget, renderTodayWidget } from './TodayWidget';
import { cardHabitFor, widgetData } from './widgetTaskHandler';
import { MINI_WIDGET, renderMiniWidget, renderSleepWidget, renderStreakWidget, SLEEP_WIDGET, STREAK_WIDGET } from './MoreWidgets';

let timer: ReturnType<typeof setTimeout> | null = null;

export function refreshWidgets() {
  if (Platform.OS !== 'android') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    requestWidgetUpdate({
      widgetName: LIST_WIDGET,
      renderWidget: (info) => renderTodayWidget(widgetData(), info.width, info.height),
      widgetNotFound: () => {},
    }).catch(() => {});
    requestWidgetUpdate({
      widgetName: MINI_WIDGET,
      renderWidget: async (info) => renderMiniWidget(widgetData(), await cardHabitFor(info.widgetId), info.width, info.height),
      widgetNotFound: () => {},
    }).catch(() => {});
    requestWidgetUpdate({ widgetName: STREAK_WIDGET, renderWidget: () => renderStreakWidget(widgetData()), widgetNotFound: () => {} }).catch(() => {});
    requestWidgetUpdate({ widgetName: SLEEP_WIDGET, renderWidget: (info) => renderSleepWidget(widgetData(), info.width), widgetNotFound: () => {} }).catch(() => {});
    requestWidgetUpdate({
      widgetName: CARD_WIDGET,
      renderWidget: async (info) => renderCardWidget(widgetData(), await cardHabitFor(info.widgetId), info.width, info.height),
      widgetNotFound: () => {},
    }).catch(() => {});
  }, 400);
}

/** Re-render home-screen widgets whenever habits or logs change in the app. */
export function startWidgetSync() {
  refreshWidgets();
  return useHabitStore.subscribe((s, prev) => {
    if (s.habits !== prev.habits || s.logs !== prev.logs || s.profile !== prev.profile || s.today !== prev.today) refreshWidgets();
  });
}
