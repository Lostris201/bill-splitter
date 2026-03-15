import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import GroupsScreen from '../screens/GroupsScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1D9E75',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F3F4F6' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Debts',
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>💸</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Groups"
        component={GroupsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>👥</Text>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>✓</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
}
