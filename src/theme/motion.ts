import { useMemo } from 'react';
import { FadeIn, FadeInDown, type BaseAnimationBuilder } from 'react-native-reanimated';

import { useHabitStore } from '@/store/useHabitStore';

/**
 * Motion system. Every animation in the app pulls its physics from the active
 * preset, so the user can pick how the whole app *feels* in one place
 * (Profile → Animations). "off" additionally switches Reanimated into
 * reduced-motion mode globally (see App.tsx).
 */

export type MotionPreset = 'smooth' | 'snappy' | 'gentle' | 'bouncy' | 'elastic' | 'minimal' | 'off';

export interface SpringCfg {
  damping: number;
  stiffness: number;
  mass: number;
  overshootClamping?: boolean;
}

export interface Motion {
  id: MotionPreset;
  label: string;
  description: string;
  /** Indicators, toggles, segment pills, rings, bars. */
  ui: SpringCfg;
  /** Card carousel snapping. */
  card: SpringCfg;
  /** Release after a press. */
  release: SpringCfg;
  /** How far things shrink while pressed (1 = no shrink). */
  pressScale: number;
  /** Little celebratory pops (tab icon bounce, lens stretch, check pop). */
  pop: boolean;
  /** Screen-section entrance style. */
  enter: 'spring' | 'fade' | 'none';
  enterSpring: SpringCfg;
  /** Multiplier for fixed-duration timings (fades, sheens). */
  speed: number;
}

/** ζ≈1 (critically damped) springs read as "clean": fast, no wobble. */
const crit = (stiffness: number, mass = 1, zeta = 1): SpringCfg => ({
  stiffness,
  mass,
  damping: 2 * Math.sqrt(stiffness * mass) * zeta,
});

export const MOTION_PRESETS: Record<MotionPreset, Motion> = {
  smooth: {
    id: 'smooth',
    label: 'Smooth',
    description: 'Clean and fluid — no wobble',
    ui: crit(320, 1, 0.92),
    card: crit(230, 0.9, 0.95),
    release: crit(420, 1, 0.9),
    pressScale: 0.97,
    pop: true,
    enter: 'spring',
    enterSpring: crit(170, 1, 1),
    speed: 1,
  },
  snappy: {
    id: 'snappy',
    label: 'Snappy',
    description: 'Quick and precise',
    ui: crit(700, 1, 0.95),
    card: crit(480, 0.8, 0.95),
    release: crit(800, 1, 0.95),
    pressScale: 0.96,
    pop: true,
    enter: 'spring',
    enterSpring: crit(420, 1, 1),
    speed: 0.7,
  },
  gentle: {
    id: 'gentle',
    label: 'Gentle',
    description: 'Slow, soft and calm',
    ui: crit(140, 1, 1),
    card: crit(110, 1, 1),
    release: crit(200, 1, 1),
    pressScale: 0.98,
    pop: false,
    enter: 'spring',
    enterSpring: crit(90, 1, 1),
    speed: 1.4,
  },
  bouncy: {
    id: 'bouncy',
    label: 'Bouncy',
    description: 'Playful with a little bounce',
    ui: { damping: 18, stiffness: 210, mass: 0.7 },
    card: { damping: 20, stiffness: 160, mass: 0.6 },
    release: { damping: 12, stiffness: 260, mass: 1 },
    pressScale: 0.95,
    pop: true,
    enter: 'spring',
    enterSpring: { damping: 16, stiffness: 150, mass: 1 },
    speed: 1,
  },
  elastic: {
    id: 'elastic',
    label: 'Elastic',
    description: 'Extra springy, full of life',
    ui: { damping: 10, stiffness: 190, mass: 0.8 },
    card: { damping: 13, stiffness: 150, mass: 0.7 },
    release: { damping: 8, stiffness: 240, mass: 1 },
    pressScale: 0.93,
    pop: true,
    enter: 'spring',
    enterSpring: { damping: 11, stiffness: 140, mass: 1 },
    speed: 1,
  },
  minimal: {
    id: 'minimal',
    label: 'Minimal',
    description: 'Subtle fades, almost no movement',
    ui: { ...crit(600, 1, 1), overshootClamping: true },
    card: { ...crit(420, 1, 1), overshootClamping: true },
    release: { ...crit(800, 1, 1), overshootClamping: true },
    pressScale: 0.99,
    pop: false,
    enter: 'fade',
    enterSpring: crit(400, 1, 1),
    speed: 0.6,
  },
  off: {
    id: 'off',
    label: 'Off',
    description: 'No animations (reduce motion)',
    ui: { ...crit(1000, 1, 1), overshootClamping: true },
    card: { ...crit(1000, 1, 1), overshootClamping: true },
    release: { ...crit(1000, 1, 1), overshootClamping: true },
    pressScale: 1,
    pop: false,
    enter: 'none',
    enterSpring: crit(1000, 1, 1),
    speed: 0.01,
  },
};

export const MOTION_ORDER: MotionPreset[] = ['smooth', 'snappy', 'gentle', 'bouncy', 'elastic', 'minimal', 'off'];

export function getMotion(): Motion {
  return MOTION_PRESETS[useHabitStore.getState().settings.motionPreset] ?? MOTION_PRESETS.smooth;
}

export function useMotion(): Motion {
  const id = useHabitStore((s) => s.settings.motionPreset);
  return MOTION_PRESETS[id] ?? MOTION_PRESETS.smooth;
}

/** Entrance animation for a screen section, honouring the preset. */
export function useEnter() {
  const m = useMotion();
  return useMemo(
    () =>
      (delay = 0): BaseAnimationBuilder | undefined => {
        if (m.enter === 'none') return undefined;
        if (m.enter === 'fade') return FadeIn.delay(delay * 0.5).duration(200);
        const s = m.enterSpring;
        return FadeInDown.delay(delay).springify().damping(s.damping).stiffness(s.stiffness).mass(s.mass);
      },
    [m],
  );
}
