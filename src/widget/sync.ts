import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { useHabitStore } from '@/store/useHabitStore';
import { renderTodayWidget, WIDGET_NAME } from './TodayWidget';
import { widgetData } from './widgetTaskHandler';

let timer: ReturnType<typeof setTimeout> | null = null;

export function refreshWidget() {
  if (Platform.OS !== 'android') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    requestWidgetUpdate({
      widgetName: WIDGET_NAME,
      renderWidget: (info) => renderTodayWidget(widgetData(), info.width, info.height),
      widgetNotFound: () => {},
    }).catch(() => {});
  }, 400);
}

/** Re-render home-screen widgets whenever habits or logs change in the app. */
export function startWidgetSync() {
  refreshWidget();
  return useHabitStore.subscribe((s, prev) => {
    if (s.habits !== prev.habits || s.logs !== prev.logs || s.profile !== prev.profile || s.today !== prev.today) refreshWidget();
  });
}
