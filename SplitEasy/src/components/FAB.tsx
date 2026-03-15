import { TouchableOpacity, Text } from 'react-native';

type Props = { onPress: () => void };

export default function FAB({ onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="absolute bottom-6 right-6 w-14 h-14 rounded-full bg-brand-green items-center justify-center shadow-lg"
      activeOpacity={0.8}
    >
      <Text className="text-white text-3xl font-light leading-none">+</Text>
    </TouchableOpacity>
  );
}
