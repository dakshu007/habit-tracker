import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { DeviceMotion } from 'expo-sensors';

export interface DeviceTilt {
  /** Left-right tilt, normalised to roughly -1..1. */
  tiltX: SharedValue<number>;
  /** Front-back tilt, normalised to roughly -1..1. */
  tiltY: SharedValue<number>;
}

// How many radians of tilt map to the full -1..1 range (~28°). Smaller = more
// sensitive. The card effects keep their own (subtle) magnitude on top of this.
const RANGE = 0.5;
const UPDATE_MS = 40; // ~25 Hz — smooth enough, easy on the battery
const RECENTER = 0.015; // per-sample drift correction toward the held angle

/**
 * Exposes the device's tilt (relative to however the phone is being held) as
 * two reanimated shared values on the UI thread. Auto-calibrates to the first
 * reading and slowly follows posture changes so it never drifts to an extreme.
 * No-ops (stays at 0) on devices/platforms without device-motion.
 */
export function useDeviceTilt(enabled = true): DeviceTilt {
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);

  useEffect(() => {
    if (!enabled) {
      // Sensors off (setting disabled or screen hidden): settle flat, save battery.
      tiltX.value = withTiming(0, { duration: 300 });
      tiltY.value = withTiming(0, { duration: 300 });
      return;
    }
    let mounted = true;
    let origin: { beta: number; gamma: number } | null = null;
    let sub: { remove: () => void } | null = null;

    const clamp = (v: number) => (v < -1 ? -1 : v > 1 ? 1 : v);

    (async () => {
      try {
        const available = await DeviceMotion.isAvailableAsync();
        if (!available || !mounted) return;
        // Permission only matters on mobile web. On Android it would ask for
        // "Physical activity", which motion sensors don't need.
        if (Platform.OS === 'web') {
          try {
            await DeviceMotion.requestPermissionsAsync();
          } catch {
            /* ignore */
          }
        }
        DeviceMotion.setUpdateInterval(UPDATE_MS);
        sub = DeviceMotion.addListener((data) => {
          const rot = data?.rotation;
          if (!rot) return;
          const { beta, gamma } = rot; // radians: beta = front-back, gamma = left-right
          if (origin === null) {
            origin = { beta, gamma };
            return;
          }
          const dBeta = beta - origin.beta;
          const dGamma = gamma - origin.gamma;
          // Slowly let the neutral point follow the current posture (drift fix).
          origin.beta += dBeta * RECENTER;
          origin.gamma += dGamma * RECENTER;

          tiltX.value = withTiming(clamp(dGamma / RANGE), { duration: 120 });
          tiltY.value = withTiming(clamp(dBeta / RANGE), { duration: 120 });
        });
      } catch {
        /* sensors unavailable — tilt stays at 0 */
      }
    })();

    return () => {
      mounted = false;
      sub?.remove();
    };
  }, [enabled, tiltX, tiltY]);

  return { tiltX, tiltY };
}
