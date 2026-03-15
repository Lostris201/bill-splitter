import { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import { useProStore } from '../store/proStore';
import { RootStackParamList } from '../navigation/types';

const FREE_LIMIT = 3;
const MY_ID = 'me';

type SettledItem = {
  id: string;
  personName: string;
  amount: number;
  description: string;
  settledAt: number;
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const persons = useGroupStore((s) => s.persons);
  const expenses = useExpenseStore((s) => s.expenses);
  const isPro = useProStore((s) => s.isPro);

  const settledItems = useMemo((): SettledItem[] => {
    const items: SettledItem[] = [];
    for (const expense of expenses) {
      if (expense.paidById !== MY_ID) continue;
      for (const split of expense.splits) {
        if (!split.settled) continue;
        const person = persons.find((p) => p.id === split.personId);
        items.push({
          id: `${expense.id}-${split.personId}`,
          personName: person?.name ?? 'Unknown',
          amount: split.amount,
          description: expense.description,
          settledAt: split.settledAt ?? 0,
        });
      }
    }
    return items.sort((a, b) => b.settledAt - a.settledAt);
  }, [expenses, persons]);

  const visibleItems = isPro ? settledItems : settledItems.slice(0, FREE_LIMIT);
  const hiddenCount = settledItems.length - FREE_LIMIT;
  const showPaywallOverlay = !isPro && hiddenCount > 0;

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <View className="px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">History</Text>
        <Text className="text-sm text-gray-400 mt-0.5">Settled debts</Text>
      </View>

      {settledItems.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">✓</Text>
          <Text className="text-lg font-semibold text-gray-700">Nothing settled yet</Text>
          <Text className="text-sm text-gray-400 mt-1">Settled debts appear here</Text>
        </View>
      ) : (
        <View className="flex-1">
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="flex-row justify-between items-center px-4 py-4 bg-white border-b border-gray-50">
                <View className="flex-1">
                  <Text className="text-base text-gray-900">{item.personName}</Text>
                  <Text className="text-sm text-gray-400 mt-0.5">{item.description}</Text>
                </View>
                <View className="items-end ml-4">
                  <Text className="text-base font-semibold text-gray-900">
                    ${item.amount.toFixed(2)}
                  </Text>
                  <Text className="text-xs text-gray-400">{formatDate(item.settledAt)}</Text>
                </View>
              </View>
            )}
          />

          {showPaywallOverlay && (
            <View className="mx-4 mt-2 overflow-hidden rounded-2xl">
              <BlurView intensity={20} className="p-6 items-center">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  +{hiddenCount} more settled {hiddenCount === 1 ? 'debt' : 'debts'}
                </Text>
                <Text className="text-sm text-gray-500 text-center mb-4">
                  Unlock full history with SplitEasy Pro
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Paywall', { trigger: 'history' })}
                  className="bg-brand-green rounded-xl px-6 py-3"
                >
                  <Text className="text-white font-semibold">Go Pro</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
