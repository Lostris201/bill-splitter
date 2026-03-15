import { Expense, Person, DebtSummary, DebtDetail } from '../types';

/**
 * Computes net debt between `myId` and all other persons in a group.
 * Positive netAmount = they owe me. Negative = I owe them.
 */
export function getDebtsForGroup(
  groupId: string,
  myId: string,
  expenses: Expense[],
  persons: Person[]
): DebtSummary[] {
  // net[personId] = amount they owe me (can be negative)
  const net: Record<string, number> = {};
  const lastExpense: Record<string, string> = {};

  const groupExpenses = expenses.filter((e) => e.groupId === groupId);

  for (const expense of groupExpenses) {
    for (const split of expense.splits) {
      if (split.settled) continue;

      if (expense.paidById === myId && split.personId !== myId) {
        // They owe me
        net[split.personId] = (net[split.personId] ?? 0) + split.amount;
        lastExpense[split.personId] = expense.description;
      } else if (split.personId === myId && expense.paidById !== myId) {
        // I owe them
        net[expense.paidById] = (net[expense.paidById] ?? 0) - split.amount;
        lastExpense[expense.paidById] = expense.description;
      }
    }
  }

  return Object.entries(net)
    .filter(([, amount]) => amount !== 0)
    .map(([personId, netAmount]) => {
      const person = persons.find((p) => p.id === personId);
      return {
        personId,
        personName: person?.name ?? 'Unknown',
        netAmount,
        lastExpenseDescription: lastExpense[personId] ?? '',
      };
    });
}

/**
 * Returns all unsettled expense rows where paidById owes personId or vice versa.
 */
export function getDebtDetail(
  groupId: string,
  paidById: string,
  personId: string,
  expenses: Expense[]
): DebtDetail[] {
  return expenses
    .filter((e) => e.groupId === groupId && e.paidById === paidById)
    .flatMap((e) => {
      const split = e.splits.find(
        (s) => s.personId === personId && !s.settled
      );
      if (!split) return [];
      return [
        {
          expenseId: e.id,
          description: e.description,
          totalAmount: e.totalAmount,
          yourShare: split.amount,
          createdAt: e.createdAt,
        },
      ];
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}
