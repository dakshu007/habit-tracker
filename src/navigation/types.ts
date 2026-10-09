import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  HabitEditor: { id?: string; templateKey?: string } | undefined;
  HabitDetail: { id: string };
  ManageHabits: undefined;
};

export type RootNav = NativeStackNavigationProp<RootStackParamList>;
export type RootScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type TabName = 'Home' | 'Stats' | 'Calendar' | 'Reminders' | 'Profile';
