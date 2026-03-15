import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Expense, Split } from '../types';
import uuid from 'react-native-uuid';

type NewExpenseInput = Omit<Expense, 'id' | 'createdAt'>;

type ExpenseStore = {
  expenses: Expense[];
  addExpense: (input: NewExpenseInput) => void;
  deleteExpense: (id: string) => void;
  settleSplit: (expenseId: string, personId: string) => void;
  settleAllForPerson: (groupId: string, paidById: string, personId: string) => void;
};

export const useExpenseStore = create<ExpenseStore>()(
  persist(
    (set) => ({
      expenses: [],

      addExpense: (input) =>
        set((state) => ({
          expenses: [
            ...state.expenses,
            { ...input, id: uuid.v4() as string, createdAt: Date.now() },
          ],
        })),

      deleteExpense: (id) =>
        set((state) => ({
          expenses: state.expenses.filter((e) => e.id !== id),
        })),

      settleSplit: (expenseId, personId) =>
        set((state) => ({
          expenses: state.expenses.map((e) =>
            e.id !== expenseId
              ? e
              : {
                  ...e,
                  splits: e.splits.map((s) =>
                    s.personId === personId
                      ? { ...s, settled: true, settledAt: Date.now() }
                      : s
                  ),
                }
          ),
        })),

      settleAllForPerson: (groupId, paidById, personId) =>
        set((state) => ({
          expenses: state.expenses.map((e) => {
            if (e.groupId !== groupId || e.paidById !== paidById) return e;
            return {
              ...e,
              splits: e.splits.map((s) =>
                s.personId === personId && !s.settled
                  ? { ...s, settled: true, settledAt: Date.now() }
                  : s
              ),
            };
          }),
        })),
    }),
    {
      name: '@spliteasy/expenses',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
