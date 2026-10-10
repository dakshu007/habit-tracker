import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  HabitEditor: { id?: string; templateKey?: string } | undefined;
  HabitDetail: { id: string };
  ManageHabits: undefined;
  QuickComplete: { id: string };
  Focus: { habitId: string };
  Challenges: { code?: string } | undefined;
  Routines: undefined;
  RoutineEdit: { id?: string } | undefined;
  RoutinePlay: { id: string };
  Review: { week?: string } | undefined;
  Share: { habitId?: string; kind?: 'streak' | 'today' | 'week' } | undefined;
  QuickLog: undefined;
  Privacy: undefined;
  Run: { habitId?: string } | undefined;
  Runs: undefined;
  VoiceLog: undefined;
  Paywall: undefined;
  RunDetail: { id: string; fresh?: boolean };
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabName = 'Home' | 'Stats' | 'Calendar' | 'Reminders' | 'Profile';
