import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabs } from './MainTabs';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { HabitEditorScreen } from '@/screens/HabitEditorScreen';
import { HabitDetailScreen } from '@/screens/HabitDetailScreen';
import { ManageHabitsScreen } from '@/screens/ManageHabitsScreen';
import { QuickCompleteScreen } from '@/screens/QuickCompleteScreen';
import { FocusScreen } from '@/screens/FocusScreen';
import { ChallengesScreen } from '@/screens/ChallengesScreen';
import { RoutineEditScreen, RoutinesScreen } from '@/screens/RoutinesScreen';
import { RoutinePlayScreen } from '@/screens/RoutinePlayScreen';
import { ReviewScreen } from '@/screens/ReviewScreen';
import { ShareScreen } from '@/screens/ShareScreen';
import { PrivacyScreen } from '@/screens/PrivacyScreen';
import { QuickLogScreen } from '@/screens/QuickLogScreen';
import { RunScreen } from '@/screens/RunScreen';
import { RunDetailScreen, RunsScreen } from '@/screens/RunsScreen';
import { useHabitStore } from '@/store/useHabitStore';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const onboarded = useHabitStore((s) => s.profile.onboarded);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'ios_from_right' }}>
      {!onboarded ? (
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />
      ) : (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />
          <Stack.Screen name="HabitEditor" component={HabitEditorScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="HabitDetail" component={HabitDetailScreen} />
          <Stack.Screen name="ManageHabits" component={ManageHabitsScreen} />
          <Stack.Screen name="Focus" component={FocusScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Challenges" component={ChallengesScreen} />
          <Stack.Screen name="Routines" component={RoutinesScreen} />
          <Stack.Screen name="RoutineEdit" component={RoutineEditScreen} />
          <Stack.Screen name="RoutinePlay" component={RoutinePlayScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Review" component={ReviewScreen} options={{ animation: 'fade' }} />
          <Stack.Screen name="Share" component={ShareScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Privacy" component={PrivacyScreen} />
          <Stack.Screen name="Run" component={RunScreen} options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="Runs" component={RunsScreen} />
          <Stack.Screen name="RunDetail" component={RunDetailScreen} />
          <Stack.Screen
            name="QuickLog"
            component={QuickLogScreen}
            options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
          />
          <Stack.Screen
            name="QuickComplete"
            component={QuickCompleteScreen}
            options={{ presentation: 'transparentModal', animation: 'fade', contentStyle: { backgroundColor: 'transparent' } }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
