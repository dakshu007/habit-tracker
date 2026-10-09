import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

import { getSettings } from '@/store/useHabitStore';

/**
 * App haptics. On Android we use the system's native haptic constants (crisp
 * View#performHapticFeedback ticks, no vibrator permission) instead of the
 * generic vibration fallback; elsewhere the standard iOS-style feedback.
 * Every call respects the user's Haptics setting.
 */
const android = Platform.OS === 'android';
const on = () => getSettings().haptics;
const run = (p: Promise<void>) => p.catch(() => {});

export const haptic = {
  /** Wheel ticks, segment switches. */
  tick: () => {
    if (!on()) return;
    run(android ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick) : Haptics.selectionAsync());
  },
  /** Button presses. */
  light: () => {
    if (!on()) return;
    run(
      android
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    );
  },
  medium: () => {
    if (!on()) return;
    run(
      android
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Long_Press)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
    );
  },
  success: () => {
    if (!on()) return;
    run(
      android
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
    );
  },
  warning: () => {
    if (!on()) return;
    run(
      android
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Reject)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
    );
  },
};
