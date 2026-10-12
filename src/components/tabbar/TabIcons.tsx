import Svg, { Circle, Path, Rect } from 'react-native-svg';

export interface TabIconProps {
  color: string;
  size?: number;
  /** Filled (solid) when active; outline when inactive. */
  filled?: boolean;
}

const SW = 1.9;

export function HomeIcon({ color, size = 24, filled }: TabIconProps) {
  const d = 'M4 10.5 L12 4 L20 10.5 V19 a1 1 0 0 1 -1 1 h-4 v-5 h-6 v5 H5 a1 1 0 0 1 -1 -1 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={d}
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={filled ? 0 : SW}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function StatsIcon({ color, size = 24, filled }: TabIconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Rect x="3.7" y="11" width="2.6" height="9" rx="1.3" fill={color} />
        <Rect x="10.7" y="4" width="2.6" height="16" rx="1.3" fill={color} />
        <Rect x="17.7" y="14" width="2.6" height="6" rx="1.3" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 20 V11" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M12 20 V4" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M19 20 V14" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

export function CalendarIcon({ color, size = 24, filled }: TabIconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M8.5 3.5 V6.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M15.5 3.5 V6.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
        <Rect x="4" y="5.5" width="16" height="15" rx="3" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="4" y="5.5" width="16" height="15" rx="3" stroke={color} strokeWidth={SW} />
      <Path d="M4 10 H20" stroke={color} strokeWidth={SW} />
      <Path d="M8.5 3.5 V7" stroke={color} strokeWidth={SW} strokeLinecap="round" />
      <Path d="M15.5 3.5 V7" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

export function BellIcon({ color, size = 24, filled }: TabIconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6 16 V11 a6 6 0 0 1 12 0 V16 l1.5 2.5 H4.5 Z" fill={color} />
        <Path d="M10 19.2 a2 2 0 0 0 4 0 Z" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 16 V11 a6 6 0 0 1 12 0 V16 l1.5 2.5 H4.5 Z"
        stroke={color}
        strokeWidth={SW}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path d="M10 19.5 a2 2 0 0 0 4 0" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

export function ProfileIcon({ color, size = 24, filled }: TabIconProps) {
  if (filled) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="8" r="4" fill={color} />
        <Path d="M4.5 20 a7.5 7.5 0 0 1 15 0 Z" fill={color} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.5" r="4" stroke={color} strokeWidth={SW} />
      <Path d="M4.5 20 a7.5 7.5 0 0 1 15 0" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </Svg>
  );
}

export const TAB_ICONS = {
  Home: HomeIcon,
  Stats: StatsIcon,
  Calendar: CalendarIcon,
  Reminders: BellIcon,
  Profile: ProfileIcon,
} as const;

export type TabName = keyof typeof TAB_ICONS;
