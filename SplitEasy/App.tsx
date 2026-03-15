import './global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { initRevenueCat, syncProStatus } from './src/lib/revenuecat';
import { useGroupStore } from './src/store/groupStore';

export default function App() {
  const groups = useGroupStore((s) => s.groups);
  const addGroup = useGroupStore((s) => s.addGroup);

  useEffect(() => {
    // Seed default group on first launch
    if (groups.length === 0) {
      addGroup('Default');
    }
    initRevenueCat();
    syncProStatus();
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
