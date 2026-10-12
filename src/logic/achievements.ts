import type { Habit, Logs } from '@/data/types';
import { Dumbbell, Flame, Medal, MoonStar, MountainSnow, Palette, Rainbow, Sparkles, Sprout, Star, Sunrise, Zap, type LucideIcon } from '@/components/ui/lucide';
import { levelFor, perfectDays, streakFor, totalCompletions, xpFor } from './habits';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  /** Gradient for the unlocked badge. */
  colors: [string, string];
  value: number;
  target: number;
  unlocked: boolean;
}

interface Ctx {
  habits: Habit[];
  logs: Logs;
  today: string;
  weekStart: 0 | 1;
}

/** Count completions made within an hour window (uses each entry's last-updated time). */
function completionsAt(ctx: Ctx, test: (hour: number) => boolean): number {
  const goal = new Map(ctx.habits.map((h) => [h.id, h.goalValue]));
  let n = 0;
  for (const day of Object.values(ctx.logs)) {
    for (const [id, e] of Object.entries(day)) {
      const g = goal.get(id);
      if (g !== undefined && e.value >= g && e.at && test(new Date(e.at).getHours())) n++;
    }
  }
  return n;
}

export function computeAchievements(ctx: Ctx): Achievement[] {
  const live = ctx.habits.filter((h) => !h.archived);
  const total = totalCompletions(ctx.habits, ctx.logs);
  const perfect = perfectDays(ctx.habits, ctx.logs);
  const bestStreak = Math.max(0, ...ctx.habits.map((h) => (h.schedule.kind === 'weekly' ? 0 : streakFor(h, ctx.logs, ctx.today, ctx.weekStart).best)));
  const level = levelFor(xpFor(ctx.habits, ctx.logs)).level;
  const early = completionsAt(ctx, (h) => h < 8);
  const late = completionsAt(ctx, (h) => h >= 22);

  const defs: Omit<Achievement, 'unlocked'>[] = [
    { id: 'first', title: 'First step', description: 'Complete your very first habit.', icon: Sprout, colors: ['#B9E68A', '#5CC48E'], value: total, target: 1 },
    { id: 'streak3', title: 'On a roll', description: 'Keep any habit going 3 days in a row.', icon: Flame, colors: ['#FFC48A', '#F07B3F'], value: bestStreak, target: 3 },
    { id: 'streak7', title: 'Week warrior', description: 'A 7-day streak on any habit.', icon: Zap, colors: ['#FFE08A', '#F5A623'], value: bestStreak, target: 7 },
    { id: 'streak30', title: 'Unstoppable', description: 'A 30-day streak. Legendary.', icon: MountainSnow, colors: ['#9AA3F0', '#4F5BD5'], value: bestStreak, target: 30 },
    { id: 'perfect1', title: 'Perfect day', description: 'Finish every habit due in a day.', icon: Sparkles, colors: ['#E3C6FF', '#9B6BF2'], value: perfect, target: 1 },
    { id: 'perfect7', title: 'Perfect week', description: 'Seven perfect days.', icon: Rainbow, colors: ['#F59AB8', '#9A72F4'], value: perfect, target: 7 },
    { id: 'check50', title: 'Fifty strong', description: '50 habit check-ins.', icon: Dumbbell, colors: ['#7FE0D6', '#1F9FE6'], value: total, target: 50 },
    { id: 'check100', title: 'Centurion', description: '100 habit check-ins.', icon: Medal, colors: ['#FF9A9A', '#E0457B'], value: total, target: 100 },
    { id: 'early', title: 'Early bird', description: 'Complete a habit before 8 AM.', icon: Sunrise, colors: ['#FFD9A0', '#FF986D'], value: early, target: 1 },
    { id: 'night', title: 'Night owl', description: 'Complete a habit after 10 PM.', icon: MoonStar, colors: ['#6B6FA8', '#2B2D4A'], value: late, target: 1 },
    { id: 'collector', title: 'Collector', description: 'Track 5 habits at once.', icon: Palette, colors: ['#A3D9FF', '#4C8DF6'], value: live.length, target: 5 },
    { id: 'level5', title: 'Rising star', description: 'Reach level 5.', icon: Star, colors: ['#FFE08A', '#D49A00'], value: level, target: 5 },
  ];
  return defs.map((d) => ({ ...d, value: Math.min(d.value, d.target), unlocked: d.value >= d.target }));
}
