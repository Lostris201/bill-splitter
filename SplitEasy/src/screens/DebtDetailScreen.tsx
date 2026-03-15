import { useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Share } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import { getDebtDetail, getDebtsForGroup } from '../selectors/debtSelectors';
import SettleConfirmSheet from '../sheets/SettleConfirmSheet';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'DebtDetail'>;

export default function DebtDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const { personId, groupId, myId } = route.params;

  const persons = useGroupStore((s) => s.persons);
  const expenses = useExpenseStore((s) => s.expenses);
  const settleAllForPerson = useExpenseStore((s) => s.settleAllForPerson);

  const person = persons.find((p) => p.id === personId);
  const debts = getDebtsForGroup(groupId, myId, expenses, persons);
  const debt = debts.find((d) => d.personId === personId);
  const detail = useMemo(
    () => getDebtDetail(groupId, myId, personId, expenses),
    [groupId, myId, personId, expenses]
  );

  const netAmount = debt?.netAmount ?? 0;

  function handleSettle() {
    settleAllForPerson(groupId, myId, personId);
    navigation.goBack();
  }

  async function handleShare() {
    const lines = detail.map(
      (d) => `  • ${d.description}: $${d.yourShare.toFixed(2)}`
    );
    const message = `${person?.name} owes you $${netAmount.toFixed(2)}\n\n${lines.join('\n')}`;
    await Share.share({ message });
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
      {/* Total header */}
      <View className="px-4 py-6 bg-gray-50 border-b border-gray-100">
        <Text className="text-sm text-gray-400 mb-1">{person?.name}</Text>
        <Text className="text-4xl font-bold text-gray-900">
          ${Math.abs(netAmount).toFixed(2)}
        </Text>
        <Text className="text-sm text-gray-400 mt-1">
          {netAmount > 0 ? 'owes you' : 'you owe'}
        </Text>
        <TouchableOpacity onPress={handleShare} className="absolute top-6 right-4">
          <Text className="text-brand-green text-sm font-medium">Share</Text>
        </TouchableOpacity>
      </View>

      {/* Expense breakdown */}
      <FlatList
        data={detail}
        keyExtractor={(item) => item.expenseId}
        renderItem={({ item }) => (
          <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-50">
            <View className="flex-1">
              <Text className="text-base text-gray-900">{item.description}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                Total: ${item.totalAmount.toFixed(2)}
              </Text>
            </View>
            <Text className="text-base font-semibold text-gray-900 ml-4">
              ${item.yourShare.toFixed(2)}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Settle up button */}
      {netAmount !== 0 && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-white border-t border-gray-100">
          <TouchableOpacity
            onPress={() => sheetRef.current?.expand()}
            className="bg-brand-green rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">
              Settle up · ${Math.abs(netAmount).toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <SettleConfirmSheet
        ref={sheetRef}
        personName={person?.name ?? ''}
        amount={Math.abs(netAmount)}
        onConfirm={handleSettle}
      />
    </View>
  );
}
