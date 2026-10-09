import { Platform, TextStyle } from 'react-native';

/**
 * Design tokens — values harvested EXACTLY from the Figma Home frame
 * (file UWc0pewlgRZQFFdecE7I7D, node 1:110 "Cycling").
 * Never approximate; if a value isn't here yet, read it from the frame.
 *
 * Per-task accent colors live on the Task model (see src/data), NOT here —
 * theming is data-driven off the active task. These tokens are the neutral,
 * theme-level (light/dark) values shared across all tasks.
 */

/* ------------------------------------------------------------------ */
/* Raw palette (light mode, from Figma)                               */
/* ------------------------------------------------------------------ */
export const palette = {
  white: '#FFFFFF',
  black: '#000000',

  // Text
  ink: '#1C1B22', // primary text
  inkMuted: '#8A8A95', // secondary text / units / subtitles
  inkFaint: '#B9B9C2', // caption / tertiary

  // Surfaces
  surface: '#F3F7FA', // progress card + segmented-control track
  progressTrack: '#E4E9ED', // progress-bar groove

  // Status
  success: '#34C759', // "Done" green, completed slide knob

  // Progress-bar fill (fixed orange→blue gradient per Figma, not task-derived)
  progressFillFrom: '#FF986D',
  progressFillTo: '#A3D9FF',
  progressFillStop: 0.84, // gradient stop ~83.98%

  // Misc accents seen in-frame
  countBadgeText: '#4387BA', // "Today's task" count badge number

  // Translucent overlays (sit on top of the tinted background)
  slideTrack: 'rgba(0,0,0,0.04)', // slide-to-complete groove
  pillActive: 'rgba(255,255,255,0.14)', // active segment of the white pill toggle
  tabBarTrack: 'rgba(0,0,0,0.08)', // bottom tab bar track
} as const;

/* ------------------------------------------------------------------ */
/* Corner radii (from Figma)                                          */
/* ------------------------------------------------------------------ */
export const radius = {
  goalBadge: 8,
  innerCard: 24, // white card inside a task card
  card: 32, // task card (front of stack)
  progressCard: 24,
  pill: 50, // toggle / segmented pills
  segmentTrack: 60, // Now/Today/Week track
  countBadge: 30,
  statusChip: 50,
  slideTrack: 80,
  progressBar: 30,
  tabBar: 70,
  tabCircle: 40,
  full: 9999,
} as const;

/* ------------------------------------------------------------------ */
/* Spacing (key values from Figma; px == dp at 1x)                    */
/* ------------------------------------------------------------------ */
export const spacing = {
  screenX: 16, // screen horizontal padding
  cardPad: 16, // inner white-card padding
  cardGap: 24, // gap between card title-row and slide control
  badgePad: 10, // goal badge padding
  pillPadX: 16,
  pillPadY: 10,
} as const;

/* ------------------------------------------------------------------ */
/* Layout constants (from the 390×1206 frame)                         */
/* ------------------------------------------------------------------ */
export const layout = {
  frameWidth: 390,
  frameHeight: 1206,
  contentWidth: 358, // 390 - 16*2
  statusBarHeight: 47,
} as const;

/* ------------------------------------------------------------------ */
/* Typography                                                         */
/* ------------------------------------------------------------------ */
/**
 * Figma uses "SF Pro Display" (large/headings) and "SF Pro Text" (body).
 * On iOS the native system font IS San Francisco and applies the correct
 * optical variant by size automatically, so we use the system font + the
 * exact weights. Android falls back to its system font (per design call).
 */
const systemFont = Platform.select({ ios: undefined, default: undefined });

type Weight = TextStyle['fontWeight'];
const W = {
  regular: '400' as Weight,
  medium: '500' as Weight,
  semibold: '600' as Weight,
};

const make = (s: Omit<TextStyle, 'fontFamily'>): TextStyle => ({
  fontFamily: systemFont,
  ...s,
});

export const type = {
  statusBarTime: make({ fontSize: 17, fontWeight: W.semibold, lineHeight: 22, letterSpacing: -0.408 }),
  weekday: make({ fontSize: 16, fontWeight: W.medium }),
  pillToggle: make({ fontSize: 16, fontWeight: W.regular }),
  countBadge: make({ fontSize: 12, fontWeight: W.medium }),

  cardTitle: make({ fontSize: 24, fontWeight: W.semibold }), // SF Pro Display Semibold
  cardSubtitle: make({ fontSize: 14, fontWeight: W.regular }),
  goalLabel: make({ fontSize: 14, fontWeight: W.medium }),
  goalValue: make({ fontSize: 16, fontWeight: W.medium }),
  slideLabel: make({ fontSize: 16, fontWeight: W.regular }),
  statusChip: make({ fontSize: 12, fontWeight: W.regular }),

  progressHeading: make({ fontSize: 18, fontWeight: W.semibold }),
  segmentLabel: make({ fontSize: 14, fontWeight: W.medium }),
  progressTitle: make({ fontSize: 22, fontWeight: W.semibold }),
  progressSubtitle: make({ fontSize: 14, fontWeight: W.regular }),
  bigValue: make({ fontSize: 42, fontWeight: W.semibold }),
  bigValueUnit: make({ fontSize: 20, fontWeight: W.medium }),
  axisLabel: make({ fontSize: 14, fontWeight: W.semibold }),
  lastUpdated: make({ fontSize: 13, fontWeight: W.regular }),
  statusLabel: make({ fontSize: 13, fontWeight: W.medium }),
  caption: make({ fontSize: 13, fontWeight: W.regular }),
} as const;

export const weights = W;
