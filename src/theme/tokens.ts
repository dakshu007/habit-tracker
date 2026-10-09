import type { TextStyle } from 'react-native';

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

  danger: '#FF5A5F',

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
 * Plus Jakarta Sans everywhere — embedded at build time by the expo-font
 * config plugin (app.json) and also loaded at runtime in App.tsx. Android
 * ignores fontWeight for custom families, so each weight maps to its own file.
 */
export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

type FontWeightName = keyof typeof fonts;

const make = (weight: FontWeightName, s: Omit<TextStyle, 'fontFamily' | 'fontWeight'>): TextStyle => ({
  fontFamily: fonts[weight],
  includeFontPadding: false,
  ...s,
});

export const type = {
  // Original Figma ramp
  weekday: make('semibold', { fontSize: 15 }),
  pillToggle: make('medium', { fontSize: 15 }),
  countBadge: make('bold', { fontSize: 11 }),

  cardTitle: make('bold', { fontSize: 23, letterSpacing: -0.4 }),
  cardSubtitle: make('regular', { fontSize: 13.5, lineHeight: 18 }),
  goalLabel: make('medium', { fontSize: 12.5 }),
  goalValue: make('bold', { fontSize: 15 }),
  slideLabel: make('medium', { fontSize: 15 }),
  statusChip: make('semibold', { fontSize: 11.5 }),

  progressHeading: make('bold', { fontSize: 18, letterSpacing: -0.2 }),
  segmentLabel: make('semibold', { fontSize: 13.5 }),
  progressTitle: make('bold', { fontSize: 21, letterSpacing: -0.3 }),
  progressSubtitle: make('regular', { fontSize: 13.5 }),
  bigValue: make('extrabold', { fontSize: 42, letterSpacing: -1.2 }),
  bigValueUnit: make('semibold', { fontSize: 18 }),
  axisLabel: make('semibold', { fontSize: 12.5 }),
  lastUpdated: make('regular', { fontSize: 12.5 }),
  statusLabel: make('semibold', { fontSize: 12.5 }),
  caption: make('medium', { fontSize: 12.5 }),

  // App-wide ramp
  display: make('extrabold', { fontSize: 32, letterSpacing: -0.9, lineHeight: 38 }),
  title: make('bold', { fontSize: 26, letterSpacing: -0.6 }),
  h2: make('bold', { fontSize: 19, letterSpacing: -0.3 }),
  h3: make('semibold', { fontSize: 16 }),
  body: make('medium', { fontSize: 15, lineHeight: 21 }),
  bodyRegular: make('regular', { fontSize: 15, lineHeight: 21 }),
  small: make('medium', { fontSize: 13, lineHeight: 18 }),
  label: make('semibold', { fontSize: 13 }),
  micro: make('bold', { fontSize: 10.5, letterSpacing: 0.9, textTransform: 'uppercase' }),
  button: make('bold', { fontSize: 15.5 }),
  stat: make('extrabold', { fontSize: 26, letterSpacing: -0.6 }),
  statSmall: make('bold', { fontSize: 18, letterSpacing: -0.3 }),
} as const;

export type TypeVariant = keyof typeof type;
