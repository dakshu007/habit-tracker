import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { MainTabs } from './MainTabs';
import { OnboardingScreen } from '@/screens/OnboardingScreen';
import { HabitEditorScreen } from '@/screens/HabitEditorScreen';
import { HabitDetailScreen } from '@/screens/HabitDetailScreen';
import { ManageHabitsScreen } from '@/screens/ManageHabitsScreen';
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
        </>
      )}
    </Stack.Navigator>
  );
}
