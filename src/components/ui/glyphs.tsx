import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Line glyphs on a 24×24 grid, drawn with round caps/joins so they read well
 * both tiny (pickers) and huge (aura covers). Stroke-only by design.
 */
const PATHS = {
  book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v14H6.5A1.5 1.5 0 0 0 5 18.5zM5 18.5A1.5 1.5 0 0 0 6.5 20H19M9 7h6',
  drop: 'M12 3c3.5 4.2 6 7.6 6 10.6a6 6 0 0 1-12 0C6 10.6 8.5 7.2 12 3zM9.5 14a2.5 2.5 0 0 0 2.5 2.5',
  lotus:
    'M12 19c-4 0-7.6-2-8.6-5.6 3 0 6 1.1 8.6 3.6 2.6-2.5 5.6-3.6 8.6-3.6C19.6 17 16 19 12 19zM12 17c-2-2.8-2-7.4 0-11 2 3.6 2 8.2 0 11z',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sun: 'M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  pen: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4',
  dumbbell: 'M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11',
  steps:
    'M8 3c1.7 0 2.5 2 2.5 4.5S9.5 12 8 12 5.5 10 5.5 7.5 6.3 3 8 3zM6 14.5h4v2a2 2 0 0 1-4 0zM16 7c1.7 0 2.5 2 2.5 4.5S17.5 16 16 16s-2.5-2-2.5-4.5S14.3 7 16 7zM14 18.5h4v.5a2 2 0 0 1-4 0z',
  leaf: 'M5 19C5 10 11 5 20 4c-1 9-6 15-15 15zM5 19l7-7',
  heart: 'M12 20s-7.5-4.4-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20z',
  music: 'M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3z',
  code: 'M8 8l-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14',
  phoneOff: 'M7.5 3h9a1.5 1.5 0 0 1 1.5 1.5v15a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7.5 3zM3 3l18 18',
  flame: 'M12 21a6.5 6.5 0 0 1-6.5-6.5c0-4 3.5-6 4-10.5 2.5 1.5 4 4 4.5 6 .8-.7 1.3-1.8 1.4-3 1.9 1.7 3.1 4.4 3.1 7.5A6.5 6.5 0 0 1 12 21z',
} as const;

export type GlyphName = keyof typeof PATHS;
export const glyphNames = Object.keys(PATHS) as GlyphName[];

interface GlyphProps {
  name: GlyphName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Glyph({ name, size = 24, color = '#1C1B22', strokeWidth = 1.8 }: GlyphProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'sun' && <Circle cx={12} cy={12} r={4.2} stroke={color} strokeWidth={strokeWidth} />}
      <Path d={PATHS[name]} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
