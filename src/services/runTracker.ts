import { Linking } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { useLiveRun } from '@/store/useRunStore';
import { t } from '@/i18n/core';

export const RUN_TASK = 'habit-run-gps';

/**
 * Receives GPS fixes while a run is recording — in the app, with the screen
 * off, or headless after the app was swiped away (the foreground service keeps
 * it alive). Must be defined at module scope, so this file is imported from index.ts.
 */
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(RUN_TASK, async ({ data, error }) => {
  if (error || !data?.locations?.length) return;
  await useLiveRun.getState().load();
  useLiveRun.getState().addFixes(
    data.locations.map((l) => ({ lng: l.coords.longitude, lat: l.coords.latitude, time: l.timestamp, accuracy: l.coords.accuracy })),
  );
});

export type GpsAccess = 'granted' | 'denied' | 'blocked' | 'off';

/** Ask for "while using the app" location (never "all the time") and make sure GPS is on. */
export async function ensureGps(): Promise<GpsAccess> {
  let perm = await Location.getForegroundPermissionsAsync();
  if (!perm.granted) {
    if (!perm.canAskAgain) return 'blocked';
    perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return perm.canAskAgain ? 'denied' : 'blocked';
  }
  if (!(await Location.hasServicesEnabledAsync())) {
    // Shows Android's "turn on location" dialog.
    await Location.enableNetworkProviderAsync().catch(() => {});
    if (!(await Location.hasServicesEnabledAsync())) return 'off';
  }
  return 'granted';
}

export async function hasGpsPermission(): Promise<boolean> {
  return (await Location.getForegroundPermissionsAsync()).granted;
}

export const openAppSettings = () => Linking.openSettings().catch(() => {});

/** Start (or restart) GPS recording as a foreground service with an ongoing notification. */
export async function startRunUpdates() {
  if (await isRecording()) return;
  await Location.startLocationUpdatesAsync(RUN_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 2000,
    distanceInterval: 3,
    // With the screen off, deliver fixes in batches to save battery — no fix is lost.
    deferredUpdatesInterval: 15_000,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: t('Run in progress'),
      notificationBody: t('Tap to see your distance and pace'),
      notificationColor: '#4C8DF6',
      killServiceOnDestroy: false,
    },
  });
}

export async function stopRunUpdates() {
  if (await isRecording()) await Location.stopLocationUpdatesAsync(RUN_TASK).catch(() => {});
}

export async function isRecording(): Promise<boolean> {
  return TaskManager.isTaskRegisteredAsync(RUN_TASK)
    .then((registered) => (registered ? Location.hasStartedLocationUpdatesAsync(RUN_TASK) : false))
    .catch(() => false);
}
