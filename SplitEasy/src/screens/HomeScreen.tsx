import { useRef, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import { getDebtsForGroup } from '../selectors/debtSelectors';
import DebtListItem from '../components/DebtListItem';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import AddExpenseSheet from '../sheets/AddExpenseSheet';
import { RootStackParamList } from '../navigation/types';

// Hard-coded "me" for MVP — first person in default group acts as the user
const MY_ID = 'me';

type Tab = 'owe_me' | 'i_owe';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sheetRef = useRef<BottomSheet>(null);
  const [activeTab, setActiveTab] = useState<Tab>('owe_me');

  const groups = useGroupStore((s) => s.groups);
  const persons = useGroupStore((s) => s.persons);
  const expenses = useExpenseStore((s) => s.expenses);

  const defaultGroup = groups[0];
  const groupId = defaultGroup?.id ?? '';

  const allDebts = useMemo(
    () => getDebtsForGroup(groupId, MY_ID, expenses, persons),
    [groupId, expenses, persons]
  );

  const debts =
    activeTab === 'owe_me'
      ? allDebts.filter((d) => d.netAmount > 0)
      : allDebts.filter((d) => d.netAmount < 0);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">SplitEasy</Text>
        <Text className="text-sm text-gray-400 mt-0.5">
          {defaultGroup?.name ?? 'Default'}
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-4 my-2 bg-gray-100 rounded-xl p-1">
        {(['owe_me', 'i_owe'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === tab ? 'bg-white shadow' : ''
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {tab === 'owe_me' ? 'They owe you' : 'You owe them'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Debt list */}
      {debts.length === 0 ? (
        <EmptyState
          message="All clear!"
          subMessage="Tap + to add an expense and start splitting."
        />
      ) : (
        <FlatList
          data={debts}
          keyExtractor={(item) => item.personId}
          renderItem={({ item }) => (
            <DebtListItem
              debt={item}
              onPress={() =>
                navigation.navigate('DebtDetail', {
                  personId: item.personId,
                  groupId,
                  myId: MY_ID,
                })
              }
            />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <FAB onPress={() => sheetRef.current?.expand()} />

      <AddExpenseSheet ref={sheetRef} />
    </View>
  );
}
