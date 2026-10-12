import { palette } from './tokens';

/**
 * Semantic, theme-level color roles. Components reference these roles — never
 * raw hex — so light/dark swaps are a single source change. Per-task accent
 * colors are layered on top via the Task model + ThemeContext, not here.
 *
 * All dark values are read exactly from the Figma "Dark mode" frame
 * (node 1:1727). Note several elements stay white/light in BOTH themes
 * (segment active pill, tab active circle, slide knob, status chip) — their
 * content colors are therefore fixed, not theme-driven.
 */
export interface Theme {
  mode: 'light' | 'dark';

  // Backgrounds
  screenBase: string; // base color behind the task-accent gradient
  cardSurface: string; // progress card surface
  cardElevated: string; // the info card inside a task card
  segmentTrack: string; // Now/Today/Week track
  progressTrack: string; // progress-bar groove

  // Text
  textPrimary: string;
  textSecondary: string; // #8A8A95 — same in both themes (min/max, last updated, card subtitle)
  textSecondaryStrong: string; // lighter in dark (progress subtitle, unit, tab inactive)
  textTertiary: string;

  // Controls / overlays
  segmentActiveBg: string; // selected pill — white in both themes
  slideTrack: string;
  tabBarTrack: string;
  tabActiveBg: string; // active tab circle — white in both themes

  // Glass + chrome
  glassFill: string; // translucent card fill over tinted backgrounds
  glassRim: string; // 1px highlight edge on glass
  hairline: string; // dividers
  inputBg: string;
  iconMuted: string;
  overlay: string; // sheet backdrop tint

  // Status + fixed gradients
  success: string;
  danger: string;
  progressFillFrom: string;
  progressFillTo: string;
}

export const lightTheme: Theme = {
  mode: 'light',

  screenBase: palette.white,
  cardSurface: palette.surface,
  cardElevated: palette.white,
  segmentTrack: palette.surface,
  progressTrack: palette.progressTrack,

  textPrimary: palette.ink,
  textSecondary: palette.inkMuted,
  textSecondaryStrong: palette.inkMuted,
  textTertiary: palette.inkFaint,

  segmentActiveBg: palette.white,
  slideTrack: palette.slideTrack,
  tabBarTrack: palette.tabBarTrack,
  tabActiveBg: palette.white,

  glassFill: 'rgba(255,255,255,0.62)',
  glassRim: 'rgba(255,255,255,0.9)',
  hairline: 'rgba(28,27,34,0.07)',
  inputBg: palette.surface,
  iconMuted: palette.inkMuted,
  overlay: 'rgba(20,20,28,0.28)',

  success: palette.success,
  danger: palette.danger,
  progressFillFrom: palette.progressFillFrom,
  progressFillTo: palette.progressFillTo,
};

/** Exact values from the Figma dark frame (node 1:1727). */
export const darkTheme: Theme = {
  mode: 'dark',

  screenBase: '#1C1B22',
  cardSurface: 'rgba(243,247,250,0.08)',
  cardElevated: '#2D2D33',
  segmentTrack: '#2D2D33',
  progressTrack: 'rgba(228,233,237,0.2)',

  textPrimary: '#FDFDFD',
  textSecondary: palette.inkMuted, // #8A8A95 — unchanged in dark
  textSecondaryStrong: '#B0B3B7',
  textTertiary: 'rgba(185,185,194,0.5)', // #B9B9C2 @ 0.5

  segmentActiveBg: palette.white, // active pill stays white
  slideTrack: 'rgba(255,255,255,0.08)',
  tabBarTrack: palette.tabBarTrack, // same rgba(0,0,0,0.08) as light, per frame
  tabActiveBg: palette.white, // active tab circle stays white

  glassFill: 'rgba(255,255,255,0.07)',
  glassRim: 'rgba(255,255,255,0.14)',
  hairline: 'rgba(255,255,255,0.08)',
  inputBg: '#2D2D33',
  iconMuted: '#B0B3B7',
  overlay: 'rgba(0,0,0,0.5)',

  success: palette.success,
  danger: palette.danger,
  progressFillFrom: palette.progressFillFrom,
  progressFillTo: palette.progressFillTo,
};

export const themes = { light: lightTheme, dark: darkTheme } as const;
