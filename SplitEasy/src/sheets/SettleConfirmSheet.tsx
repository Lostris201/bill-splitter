import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type Props = {
  personName: string;
  amount: number;
  onConfirm: () => void;
};

const SettleConfirmSheet = forwardRef<BottomSheet, Props>(
  ({ personName, amount, onConfirm }, ref) => (
    <BottomSheet ref={ref} index={-1} snapPoints={['35%']} enablePanDownToClose>
      <BottomSheetView className="flex-1 px-6 pt-4">
        <Text className="text-xl font-bold text-gray-900 text-center mb-2">
          Mark as paid?
        </Text>
        <Text className="text-base text-gray-500 text-center mb-8">
          Mark ${amount.toFixed(2)} from {personName} as settled?
        </Text>
        <TouchableOpacity
          onPress={() => {
            onConfirm();
            (ref as React.RefObject<BottomSheet>)?.current?.close();
          }}
          className="bg-brand-green rounded-2xl py-4 items-center mb-3"
        >
          <Text className="text-white font-semibold text-base">Yes, mark as paid</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => (ref as React.RefObject<BottomSheet>)?.current?.close()}
          className="py-3 items-center"
        >
          <Text className="text-gray-400 text-base">Cancel</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  )
);

export default SettleConfirmSheet;
