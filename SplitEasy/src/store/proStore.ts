import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProStatus } from '../types';

type ProStore = ProStatus & {
  setProStatus: (status: ProStatus) => void;
};

export const useProStore = create<ProStore>()(
  persist(
    (set) => ({
      isPro: false,
      purchaseType: null,
      setProStatus: (status) => set(status),
    }),
    {
      name: '@spliteasy/pro_status',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
