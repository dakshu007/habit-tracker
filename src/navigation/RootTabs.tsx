import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import {
  HomeScreen,
  StatsScreen,
  CalendarScreen,
  NotificationsScreen,
  ProfileScreen,
} from '@/screens';
import { CustomTabBar } from '@/components/tabbar/CustomTabBar';

export type RootTabParamList = {
  Home: undefined;
  Stats: undefined;
  Calendar: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function RootTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: 'transparent' },
        // Cross-fade between tabs instead of an instant cut.
        animation: 'fade',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Stats" component={StatsScreen} />
      <Tab.Screen name="Calendar" component={CalendarScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
