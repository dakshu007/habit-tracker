import Svg, { Circle, Path, Rect } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/** Stroke icon on a 24×24 grid. */
function line(d: string, extra?: (p: Required<IconProps>) => React.ReactNode) {
  return function Icon({ size = 22, color = '#1C1B22', strokeWidth = 2 }: IconProps) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {extra?.({ size, color, strokeWidth })}
        <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    );
  };
}

export const CheckIcon = line('M5 12.5 L10 17.5 L19 7');
export const ChevronsRight = line('M6 5 L13 12 L6 19M13 5 L20 12 L13 19');
export const ChevronLeft = line('M15 5l-7 7 7 7');
export const ChevronRight = line('M9 5l7 7-7 7');
export const ChevronDown = line('M5 9l7 7 7-7');
export const PlusIcon = line('M12 5v14M5 12h14');
export const MinusIcon = line('M5 12h14');
export const CloseIcon = line('M6 6l12 12M18 6L6 18');
export const EditIcon = line('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4');
export const TrashIcon = line('M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5');
export const ArchiveIcon = line('M3.5 4.5h17v4h-17zM5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5M10 12.5h4');
export const ClockIcon = line('M12 7v5l3 2', ({ color, strokeWidth }) => (
  <Circle cx={12} cy={12} r={8.5} stroke={color} strokeWidth={strokeWidth} />
));
export const PlayIcon = line('M8 5.5v13l10.5-6.5z');
export const StopIcon = ({ size = 22, color = '#1C1B22' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Rect x={6.5} y={6.5} width={11} height={11} rx={2.5} fill={color} />
  </Svg>
);
export const FlameIcon = ({ size = 22, color = '#FF7A2F' }: IconProps) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M12 22a7 7 0 0 1-7-7c0-4.3 3.7-6.4 4.3-11.2 2.7 1.6 4.3 4.3 4.8 6.4.9-.7 1.4-1.9 1.5-3.2 2 1.8 3.4 4.7 3.4 8A7 7 0 0 1 12 22z"
      fill={color}
    />
    <Path d="M12 22a3.2 3.2 0 0 1-3.2-3.2c0-2 1.7-3 2-5.2 1.3.8 2 2 2.2 3 .4-.3.7-.9.7-1.5.9.8 1.5 2.2 1.5 3.7A3.2 3.2 0 0 1 12 22z" fill="#FFD36B" />
  </Svg>
);
export const TrophyIcon = line('M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5M12 14v4M8.5 20.5h7');
export const GearIcon = line(
  'M12 2.8l1.6 2.3 2.8-.6.6 2.8 2.3 1.6-1.2 2.6 1.2 2.6-2.3 1.6-.6 2.8-2.8-.6L12 21.2l-1.6-2.3-2.8.6-.6-2.8-2.3-1.6 1.2-2.6-1.2-2.6 2.3-1.6.6-2.8 2.8.6z',
  ({ color, strokeWidth }) => <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={strokeWidth} />,
);
export const ShareIcon = line('M12 3v12M7.5 7.5L12 3l4.5 4.5M5 13v6a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-6');
export const DownloadIcon = line('M12 3v12M7.5 10.5L12 15l4.5-4.5M5 17v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2');
export const SparkleIcon = line('M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z');
export const MoonIcon = line('M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z');
export const VibrateIcon = line('M8 4h8v16H8zM4 8v8M20 8v8');
export const MotionIcon = line('M4 12a8 8 0 0 1 8-8M20 12a8 8 0 0 1-8 8M12 9v6M9 12h6');
export const RefreshIcon = line('M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4');
export const CalendarSmallIcon = line('M4 9.5h16M8.5 3.5v3M15.5 3.5v3', ({ color, strokeWidth }) => (
  <Rect x={4} y={5.5} width={16} height={15} rx={3} stroke={color} strokeWidth={strokeWidth} />
));
export const BellSmallIcon = line('M6 16v-5a6 6 0 0 1 12 0v5l1.5 2.5h-15zM10 19.5a2 2 0 0 0 4 0');
export const UndoIcon = line('M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11');
