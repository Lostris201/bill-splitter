import { useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import { useProStore } from '../store/proStore';
import { getDebtsForGroup } from '../selectors/debtSelectors';
import GroupCard from '../components/GroupCard';
import NewGroupSheet from '../sheets/NewGroupSheet';
import { RootStackParamList } from '../navigation/types';

const MY_ID = 'me';

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sheetRef = useRef<BottomSheet>(null);

  const groups = useGroupStore((s) => s.groups);
  const persons = useGroupStore((s) => s.persons);
  const expenses = useExpenseStore((s) => s.expenses);
  const isPro = useProStore((s) => s.isPro);

  function getOutstanding(groupId: string) {
    const debts = getDebtsForGroup(groupId, MY_ID, expenses, persons);
    return debts
      .filter((d) => d.netAmount > 0)
      .reduce((sum, d) => sum + d.netAmount, 0);
  }

  function handleAddGroup() {
    if (!isPro && groups.length >= 1) {
      navigation.navigate('Paywall', { trigger: 'groups' });
      return;
    }
    sheetRef.current?.expand();
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Groups</Text>
        <TouchableOpacity onPress={handleAddGroup} className="w-8 h-8 items-center justify-center">
          <Text className="text-3xl text-brand-green font-light leading-none">+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            outstandingAmount={getOutstanding(item.id)}
            onPress={() => {}}
          />
        )}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
      />

      {!isPro && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Paywall', { trigger: 'groups' })}
          className="mx-4 mb-4 p-4 border-2 border-dashed border-gray-200 rounded-2xl items-center"
        >
          <Text className="text-gray-400 text-sm">🔒 Unlock multiple groups with Pro</Text>
        </TouchableOpacity>
      )}

      <NewGroupSheet ref={sheetRef} />
    </View>
  );
}
