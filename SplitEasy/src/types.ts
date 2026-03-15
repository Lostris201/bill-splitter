export type Group = {
  id: string;
  name: string;
  createdAt: number;
};

export type Person = {
  id: string;
  name: string;
  groupId: string;
};

export type Split = {
  personId: string;
  amount: number;
  settled: boolean;
  settledAt: number | null;
};

export type Expense = {
  id: string;
  groupId: string;
  description: string;
  totalAmount: number;
  paidById: string;
  splits: Split[];
  createdAt: number;
};

export type ProStatus = {
  isPro: boolean;
  purchaseType: 'weekly' | 'monthly' | 'lifetime' | null;
};

// Computed types (never stored)
export type DebtSummary = {
  personId: string;
  personName: string;
  netAmount: number; // positive = they owe you, negative = you owe them
  lastExpenseDescription: string;
};

export type DebtDetail = {
  expenseId: string;
  description: string;
  totalAmount: number;
  yourShare: number;
  createdAt: number;
};
