import { View, Text } from 'react-native';

type Props = {
  message: string;
  subMessage?: string;
};

export default function EmptyState({ message, subMessage }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-4xl mb-4">💸</Text>
      <Text className="text-lg font-semibold text-gray-900 text-center">{message}</Text>
      {subMessage && (
        <Text className="text-sm text-gray-400 text-center mt-2">{subMessage}</Text>
      )}
    </View>
  );
}
