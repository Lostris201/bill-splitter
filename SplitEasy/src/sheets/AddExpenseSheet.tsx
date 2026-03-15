import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import AmountInput from '../components/AmountInput';

type Step = 1 | 2 | 3;
const MY_ID = 'me';

const AddExpenseSheet = forwardRef<BottomSheet>((_, ref) => {
  const [step, setStep] = useState<Step>(1);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const groups = useGroupStore((s) => s.groups);
  const persons = useGroupStore((s) => s.persons);
  const addPerson = useGroupStore((s) => s.addPerson);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const [newName, setNewName] = useState('');

  const groupId = groups[0]?.id ?? '';
  const groupPersons = persons.filter((p) => p.groupId === groupId && p.id !== MY_ID);

  function reset() {
    setStep(1);
    setAmount('');
    setDescription('');
    setSelectedPersonIds([]);
    setSplitMethod('equal');
    setCustomAmounts({});
    setNewName('');
  }

  function togglePerson(id: string) {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function addNewPerson() {
    if (!newName.trim()) return;
    addPerson(newName.trim(), groupId);
    setNewName('');
  }

  function confirm() {
    const total = parseFloat(amount);
    if (isNaN(total) || selectedPersonIds.length === 0) return;

    const splits = selectedPersonIds.map((personId) => {
      const share =
        splitMethod === 'equal'
          ? total / selectedPersonIds.length
          : parseFloat(customAmounts[personId] ?? '0');
      return {
        personId,
        amount: parseFloat(share.toFixed(2)),
        settled: false,
        settledAt: null,
      };
    });

    addExpense({
      groupId,
      description: description || 'Expense',
      totalAmount: total,
      paidById: MY_ID,
      splits,
    });

    reset();
    (ref as React.RefObject<BottomSheet>)?.current?.close();
  }

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['90%']}
      enablePanDownToClose
      onClose={reset}
    >
      <BottomSheetScrollView className="flex-1 px-5">
        {/* Step indicators */}
        <View className="flex-row justify-center gap-2 py-3">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className={`w-2 h-2 rounded-full ${
                step === s ? 'bg-brand-green' : 'bg-gray-200'
              }`}
            />
          ))}
        </View>

        {step === 1 && (
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              How much?
            </Text>
            <AmountInput value={amount} onChange={setAmount} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's it for? (optional)"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mt-2"
            />
            <TouchableOpacity
              onPress={() => parseFloat(amount) > 0 && setStep(2)}
              className="bg-brand-green rounded-2xl py-4 items-center mt-6"
            >
              <Text className="text-white font-semibold text-base">Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              Who's involved?
            </Text>
            {groupPersons.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => togglePerson(p.id)}
                className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-2 border ${
                  selectedPersonIds.includes(p.id)
                    ? 'border-brand-green bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Text className="text-base text-gray-900">{p.name}</Text>
                {selectedPersonIds.includes(p.id) && (
                  <Text className="text-brand-green font-bold">✓</Text>
                )}
              </TouchableOpacity>
            ))}
            {/* Add new person */}
            <View className="flex-row gap-2 mt-2">
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Add person..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base"
              />
              <TouchableOpacity
                onPress={addNewPerson}
                className="bg-gray-100 rounded-xl px-4 items-center justify-center"
              >
                <Text className="text-gray-600 font-semibold">Add</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => selectedPersonIds.length > 0 && setStep(3)}
              className="bg-brand-green rounded-2xl py-4 items-center mt-6"
            >
              <Text className="text-white font-semibold text-base">Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              How to split?
            </Text>
            <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
              {(['equal', 'custom'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSplitMethod(m)}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    splitMethod === m ? 'bg-white shadow' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-medium capitalize ${
                      splitMethod === m ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {splitMethod === 'equal' && (
              <View className="bg-gray-50 rounded-xl p-4 mb-4">
                {selectedPersonIds.map((id) => {
                  const person = persons.find((p) => p.id === id);
                  const share = (parseFloat(amount) / selectedPersonIds.length).toFixed(2);
                  return (
                    <View key={id} className="flex-row justify-between py-1">
                      <Text className="text-gray-700">{person?.name}</Text>
                      <Text className="font-semibold text-gray-900">${share}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {splitMethod === 'custom' &&
              selectedPersonIds.map((id) => {
                const person = persons.find((p) => p.id === id);
                return (
                  <View key={id} className="flex-row items-center justify-between mb-3">
                    <Text className="text-gray-700 flex-1">{person?.name}</Text>
                    <View className="flex-row items-center border border-gray-200 rounded-xl px-3 py-2">
                      <Text className="text-gray-400 mr-1">$</Text>
                      <TextInput
                        value={customAmounts[id] ?? ''}
                        onChangeText={(v) =>
                          setCustomAmounts((prev) => ({ ...prev, [id]: v }))
                        }
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        className="text-base text-gray-900 w-16"
                      />
                    </View>
                  </View>
                );
              })}

            <TouchableOpacity
              onPress={confirm}
              className="bg-brand-green rounded-2xl py-4 items-center mt-4"
            >
              <Text className="text-white font-semibold text-base">
                Add Expense · ${parseFloat(amount || '0').toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View className="h-8" />
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

export default AddExpenseSheet;
