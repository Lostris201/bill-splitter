import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';

// Reset stores between tests
beforeEach(() => {
  useGroupStore.setState({ groups: [], persons: [] });
  useExpenseStore.setState({ expenses: [] });
});

describe('groupStore', () => {
  it('adds a group', () => {
    const { addGroup } = useGroupStore.getState();
    addGroup('Apartment');
    const { groups } = useGroupStore.getState();
    expect(groups).toHaveLength(1);
    expect(groups[0].name).toBe('Apartment');
    expect(groups[0].id).toBeDefined();
  });

  it('adds a person to a group', () => {
    const { addGroup, addPerson } = useGroupStore.getState();
    addGroup('Default');
    const groupId = useGroupStore.getState().groups[0].id;
    addPerson('Alex', groupId);
    const { persons } = useGroupStore.getState();
    expect(persons).toHaveLength(1);
    expect(persons[0].name).toBe('Alex');
    expect(persons[0].groupId).toBe(groupId);
  });

  it('deletes a person', () => {
    const { addGroup, addPerson, deletePerson } = useGroupStore.getState();
    addGroup('Default');
    const groupId = useGroupStore.getState().groups[0].id;
    addPerson('Alex', groupId);
    const personId = useGroupStore.getState().persons[0].id;
    deletePerson(personId);
    expect(useGroupStore.getState().persons).toHaveLength(0);
  });
});

describe('expenseStore', () => {
  it('adds an expense', () => {
    const { addExpense } = useExpenseStore.getState();
    addExpense({
      groupId: 'g1',
      description: 'Dinner',
      totalAmount: 60,
      paidById: 'p1',
      splits: [
        { personId: 'p1', amount: 30, settled: false, settledAt: null },
        { personId: 'p2', amount: 30, settled: false, settledAt: null },
      ],
    });
    const { expenses } = useExpenseStore.getState();
    expect(expenses).toHaveLength(1);
    expect(expenses[0].description).toBe('Dinner');
  });

  it('settles all splits for a person', () => {
    const { addExpense, settleAllForPerson } = useExpenseStore.getState();
    addExpense({
      groupId: 'g1',
      description: 'Dinner',
      totalAmount: 60,
      paidById: 'p1',
      splits: [
        { personId: 'p2', amount: 30, settled: false, settledAt: null },
      ],
    });
    settleAllForPerson('g1', 'p1', 'p2');
    const { expenses } = useExpenseStore.getState();
    expect(expenses[0].splits[0].settled).toBe(true);
    expect(expenses[0].splits[0].settledAt).not.toBeNull();
  });
});
