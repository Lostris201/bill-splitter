import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useGroupStore } from '../store/groupStore';

const NewGroupSheet = forwardRef<BottomSheet>((_, ref) => {
  const [name, setName] = useState('');
  const addGroup = useGroupStore((s) => s.addGroup);

  function handleCreate() {
    if (!name.trim()) return;
    addGroup(name.trim());
    setName('');
    (ref as React.RefObject<BottomSheet>)?.current?.close();
  }

  return (
    <BottomSheet ref={ref} index={-1} snapPoints={['40%']} enablePanDownToClose>
      <BottomSheetView className="flex-1 px-6 pt-4">
        <Text className="text-xl font-bold text-gray-900 mb-4">New Group</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Apartment, Trip to Berlin"
          placeholderTextColor="#9CA3AF"
          className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
          autoFocus
        />
        <TouchableOpacity
          onPress={handleCreate}
          className="bg-brand-green rounded-2xl py-4 items-center"
        >
          <Text className="text-white font-semibold text-base">Create Group</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheet>
  );
});

export default NewGroupSheet;
