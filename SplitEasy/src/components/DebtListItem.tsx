import { TouchableOpacity, View, Text } from 'react-native';
import { DebtSummary } from '../types';

type Props = {
  debt: DebtSummary;
  onPress: () => void;
};

export default function DebtListItem({ debt, onPress }: Props) {
  const isPositive = debt.netAmount > 0;
  const amount = Math.abs(debt.netAmount).toFixed(2);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100"
      activeOpacity={0.7}
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">{debt.personName}</Text>
        <Text className="text-sm text-gray-400 mt-0.5" numberOfLines={1}>
          {debt.lastExpenseDescription}
        </Text>
      </View>
      <View className="items-end ml-4">
        <Text
          className={`text-base font-bold ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}
        >
          {isPositive ? '+' : '-'}${amount}
        </Text>
        <Text className="text-xs text-gray-400 mt-0.5">
          {isPositive ? 'owes you' : 'you owe'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
