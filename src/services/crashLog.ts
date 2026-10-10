import { Alert, Linking } from 'react-native';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';

import { SUPPORT_EMAIL } from '@/data/privacy';
import { t } from '@/i18n/core';

/**
 * Tiny crash catcher (no third-party service): a fatal JavaScript error is
 * written to a file just before the app closes. On the next launch the user
 * can email it to support in one tap, so crashes can be fixed exactly.
 */
const crashFile = () => new File(Paths.document, 'last-crash.txt');

type Handler = (error: unknown, isFatal?: boolean) => void;
declare const ErrorUtils: { getGlobalHandler(): Handler; setGlobalHandler(h: Handler): void } | undefined;

export function installCrashLog() {
  if (typeof ErrorUtils === 'undefined') return;
  const previous = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    if (isFatal) {
      try {
        const e = error as { name?: string; message?: string; stack?: string };
        const f = crashFile();
        f.create({ overwrite: true });
        f.write(
          [
            `time: ${new Date().toISOString()}`,
            `version: ${Constants.expoConfig?.version ?? '?'} (${Constants.expoConfig?.android?.versionCode ?? '?'})`,
            `error: ${e?.name ?? 'Error'}: ${e?.message ?? String(error)}`,
            '',
            String(e?.stack ?? '').slice(0, 4000),
          ].join('\n'),
        );
      } catch {
        // Never let the crash logger itself fail the crash handling.
      }
    }
    previous(error, isFatal);
  });
}

/** If the app crashed last time, offer to email the details to support. */
export function offerCrashReport() {
  let text = '';
  try {
    const f = crashFile();
    if (!f.exists) return;
    text = f.textSync();
    f.delete();
  } catch {
    return;
  }
  if (!text) return;
  Alert.alert(t('The app closed unexpectedly'), t('Sorry about that. Send the details to support so we can fix it? Only the error is included, none of your habits.'), [
    { text: t('Not now'), style: 'cancel' },
    {
      text: t('Send'),
      onPress: () => {
        const subject = encodeURIComponent('Habit Tracker crash report');
        const body = encodeURIComponent(`${text.slice(0, 1800)}\n\nWhat were you doing when it happened?\n`);
        Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
      },
    },
  ]);
}
