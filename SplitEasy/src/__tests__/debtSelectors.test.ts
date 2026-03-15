import { getDebtsForGroup, getDebtDetail } from '../selectors/debtSelectors';
import { Expense, Person } from '../types';

const persons: Person[] = [
  { id: 'me', name: 'Me', groupId: 'g1' },
  { id: 'alex', name: 'Alex', groupId: 'g1' },
  { id: 'sam', name: 'Sam', groupId: 'g1' },
];

const expenses: Expense[] = [
  {
    id: 'e1',
    groupId: 'g1',
    description: 'Dinner',
    totalAmount: 60,
    paidById: 'me',
    createdAt: 1000,
    splits: [
      { personId: 'alex', amount: 30, settled: false, settledAt: null },
      { personId: 'sam', amount: 20, settled: false, settledAt: null },
    ],
  },
  {
    id: 'e2',
    groupId: 'g1',
    description: 'Taxi',
    totalAmount: 20,
    paidById: 'alex',
    createdAt: 2000,
    splits: [
      { personId: 'me', amount: 10, settled: false, settledAt: null },
    ],
  },
  {
    // sam paid, me owes sam 30 → net: sam 20 - 30 = -10 (I owe sam)
    id: 'e3',
    groupId: 'g1',
    description: 'Groceries',
    totalAmount: 30,
    paidById: 'sam',
    createdAt: 3000,
    splits: [
      { personId: 'me', amount: 30, settled: false, settledAt: null },
    ],
  },
];

describe('getDebtsForGroup', () => {
  it('computes net amounts between pairs', () => {
    const debts = getDebtsForGroup('g1', 'me', expenses, persons);
    const alexDebt = debts.find((d) => d.personId === 'alex');
    // alex owes me 30, i owe alex 10 → net: alex owes me 20
    expect(alexDebt?.netAmount).toBe(20);
    expect(alexDebt?.personName).toBe('Alex');
  });

  it('only returns non-zero debts', () => {
    const debts = getDebtsForGroup('g1', 'me', expenses, persons);
    expect(debts.every((d) => d.netAmount !== 0)).toBe(true);
  });

  it('excludes settled splits', () => {
    const settledExpenses: Expense[] = [
      {
        id: 'e3',
        groupId: 'g1',
        description: 'Coffee',
        totalAmount: 10,
        paidById: 'me',
        createdAt: 3000,
        splits: [
          { personId: 'alex', amount: 10, settled: true, settledAt: 4000 },
        ],
      },
    ];
    const debts = getDebtsForGroup('g1', 'me', settledExpenses, persons);
    expect(debts).toHaveLength(0);
  });

  it('separates they-owe-you from you-owe-them', () => {
    const debts = getDebtsForGroup('g1', 'me', expenses, persons);
    const theyOweMe = debts.filter((d) => d.netAmount > 0);
    const iOweThem = debts.filter((d) => d.netAmount < 0);
    expect(theyOweMe.length).toBeGreaterThan(0);
    expect(iOweThem.length).toBeGreaterThan(0);
  });
});

describe('getDebtDetail', () => {
  it('returns expenses where the person owes the payer', () => {
    const detail = getDebtDetail('g1', 'me', 'alex', expenses);
    expect(detail).toHaveLength(1);
    expect(detail[0].description).toBe('Dinner');
    expect(detail[0].yourShare).toBe(30);
  });
});
