import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Group, Person } from '../types';
import uuid from 'react-native-uuid';

type GroupStore = {
  groups: Group[];
  persons: Person[];
  addGroup: (name: string) => void;
  deleteGroup: (id: string) => void;
  addPerson: (name: string, groupId: string) => void;
  deletePerson: (id: string) => void;
  canAddGroup: (isPro: boolean) => boolean;
};

export const useGroupStore = create<GroupStore>()(
  persist(
    (set, get) => ({
      groups: [],
      persons: [],

      addGroup: (name) =>
        set((state) => ({
          groups: [
            ...state.groups,
            { id: uuid.v4() as string, name, createdAt: Date.now() },
          ],
        })),

      deleteGroup: (id) =>
        set((state) => ({
          groups: state.groups.filter((g) => g.id !== id),
          persons: state.persons.filter((p) => p.groupId !== id),
        })),

      addPerson: (name, groupId) =>
        set((state) => ({
          persons: [
            ...state.persons,
            { id: uuid.v4() as string, name, groupId },
          ],
        })),

      deletePerson: (id) =>
        set((state) => ({
          persons: state.persons.filter((p) => p.id !== id),
        })),

      canAddGroup: (isPro) => isPro || get().groups.length < 1,
    }),
    {
      name: '@spliteasy/groups',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
