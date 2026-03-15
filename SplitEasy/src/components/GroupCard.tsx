import { TouchableOpacity, View, Text } from 'react-native';
import { Group } from '../types';

type Props = {
  group: Group;
  outstandingAmount: number;
  onPress: () => void;
};

export default function GroupCard({ group, outstandingAmount, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mx-4 mb-3 p-4 bg-white border border-gray-100 rounded-2xl"
      activeOpacity={0.7}
    >
      <Text className="text-base font-semibold text-gray-900">{group.name}</Text>
      <Text className="text-sm text-gray-400 mt-1">
        {outstandingAmount > 0
          ? `$${outstandingAmount.toFixed(2)} outstanding`
          : 'All settled'}
      </Text>
    </TouchableOpacity>
  );
}
