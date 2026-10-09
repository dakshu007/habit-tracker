import { StubScreen } from './StubScreen';
import { StatsIcon, CalendarIcon, BellIcon, ProfileIcon } from '@/components/tabbar/TabIcons';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { useTheme, type ThemeMode } from '@/theme/ThemeContext';

export { HomeScreen } from './HomeScreen';

const THEME_OPTIONS: SegmentOption<ThemeMode>[] = [
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
  { key: 'system', label: 'System' },
];

function ThemeSwitcher() {
  const { mode, setMode } = useTheme();
  return <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />;
}

export const StatsScreen = () => (
  <StubScreen title="Stats" subtitle="Trends and streaks for your activities will live here." Icon={StatsIcon} />
);

export const CalendarScreen = () => (
  <StubScreen title="Calendar" subtitle="A day-by-day view of completed habits is coming soon." Icon={CalendarIcon} />
);

export const NotificationsScreen = () => (
  <StubScreen title="Notifications" subtitle="Reminders and nudges to keep your streak alive." Icon={BellIcon} />
);

export const ProfileScreen = () => (
  <StubScreen
    title="Profile"
    subtitle="Your goals, preferences and theme settings."
    Icon={ProfileIcon}
    footer={<ThemeSwitcher />}
  />
);
