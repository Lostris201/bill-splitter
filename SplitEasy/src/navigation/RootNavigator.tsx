import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import TabNavigator from './TabNavigator';
import DebtDetailScreen from '../screens/DebtDetailScreen';
import PaywallScreen from '../screens/PaywallScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DebtDetail"
          component={DebtDetailScreen}
          options={{ title: 'Debt Detail' }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'fullScreenModal', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
