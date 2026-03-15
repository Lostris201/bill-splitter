import { View, Text, TextInput } from 'react-native';

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function AmountInput({ value, onChange }: Props) {
  return (
    <View className="items-center py-6">
      <View className="flex-row items-center">
        <Text className="text-4xl font-light text-gray-400 mr-1">$</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          className="text-5xl font-semibold text-gray-900 min-w-[80px]"
          style={{ fontSize: 48 }}
          autoFocus
        />
      </View>
    </View>
  );
}
