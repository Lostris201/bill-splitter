# SplitEasy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build SplitEasy — a private, offline-first iOS bill splitter with RevenueCat paywall.

**Architecture:** Expo managed workflow with React Navigation (stack + tabs), Zustand persisted stores for all data, and pure selector functions for debt computation. RevenueCat handles all IAP — requires a development build (not Expo Go) for payment testing.

**Tech Stack:** Expo SDK 51+, TypeScript, NativeWind v4, React Navigation v6, @gorhom/bottom-sheet, Zustand + persist, AsyncStorage, react-native-purchases (RevenueCat), react-native-uuid

---

> **Important dev note:** Standard Expo Go supports everything EXCEPT `react-native-purchases`. For Tasks 1–12, Expo Go on iPhone works fine. Task 13 (RevenueCat) requires an EAS development build. Keep this in mind when testing.

---

### Task 1: Scaffold Expo Project

**Files:**
- Create: `SplitEasy/` (Expo project root, inside `/c/proje/bill_splitter/`)

**Step 1: Initialize Expo project**

Run inside `/c/proje/bill_splitter/`:
```bash
npx create-expo-app SplitEasy --template blank-typescript
cd SplitEasy
```

**Step 2: Verify it runs**

```bash
npx expo start
```
Expected: QR code appears, scan with Expo Go on iPhone → blank white screen loads.

**Step 3: Remove boilerplate**

Delete `SplitEasy/App.tsx` contents and replace with:
```tsx
import { Text, View } from 'react-native';
export default function App() {
  return <View><Text>SplitEasy</Text></View>;
}
```

**Step 4: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold expo project"
```

---

### Task 2: Install and Configure Dependencies

**Files:**
- Modify: `SplitEasy/babel.config.js`
- Modify: `SplitEasy/metro.config.js` (create if missing)
- Create: `SplitEasy/tailwind.config.js`
- Modify: `SplitEasy/app.json`
- Modify: `SplitEasy/tsconfig.json`

**Step 1: Install all dependencies**

```bash
cd SplitEasy

# Navigation
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
npx expo install react-native-screens react-native-safe-area-context

# Gesture + Animation (required by bottom-sheet)
npx expo install react-native-gesture-handler react-native-reanimated

# Bottom sheet
npm install @gorhom/bottom-sheet

# State + Storage
npm install zustand
npx expo install @react-native-async-storage/async-storage

# Styling
npm install nativewind@^4.0.0
npm install --save-dev tailwindcss@3.3.2

# Utilities
npm install react-native-uuid

# RevenueCat
npx expo install react-native-purchases
```

**Step 2: Configure NativeWind — babel.config.js**

Replace contents of `babel.config.js`:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: [
      'nativewind/babel',
      'react-native-reanimated/plugin', // must be last
    ],
  };
};
```

**Step 3: Configure NativeWind — tailwind.config.js**

Create `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          green: '#1D9E75',
          'green-dark': '#0F6E56',
          purple: '#534AB7',
          amber: '#BA7517',
          red: '#A32D2D',
        },
      },
    },
  },
  plugins: [],
};
```

**Step 4: Configure metro — metro.config.js**

Create `metro.config.js`:
```js
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

**Step 5: Create global.css**

Create `SplitEasy/global.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Step 6: Update App.tsx to import global.css**

```tsx
import './global.css';
import { Text, View } from 'react-native';
export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-semibold text-gray-900">SplitEasy</Text>
    </View>
  );
}
```

**Step 7: Verify NativeWind works**

```bash
npx expo start
```
Expected: "SplitEasy" renders centered in bold on iPhone via Expo Go.

**Step 8: Configure nativewind types — add to tsconfig.json**

Add to `compilerOptions`:
```json
{
  "compilerOptions": {
    "types": ["nativewind/types"]
  }
}
```

**Step 9: Commit**

```bash
git add .
git commit -m "feat: install and configure all dependencies"
```

---

### Task 3: TypeScript Types

**Files:**
- Create: `SplitEasy/src/types.ts`

**Step 1: Write types**

Create `src/types.ts`:
```ts
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
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: add typescript types"
```

---

### Task 4: Zustand Stores

**Files:**
- Create: `SplitEasy/src/store/groupStore.ts`
- Create: `SplitEasy/src/store/expenseStore.ts`
- Create: `SplitEasy/src/store/proStore.ts`
- Create: `SplitEasy/src/__tests__/stores.test.ts`

**Step 1: Write failing tests**

Create `src/__tests__/stores.test.ts`:
```ts
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
```

**Step 2: Run tests to verify they fail**

```bash
cd SplitEasy
npx jest src/__tests__/stores.test.ts
```
Expected: FAIL — "Cannot find module '../store/groupStore'"

**Step 3: Implement groupStore**

Create `src/store/groupStore.ts`:
```ts
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
```

**Step 4: Implement expenseStore**

Create `src/store/expenseStore.ts`:
```ts
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
```

**Step 5: Implement proStore**

Create `src/store/proStore.ts`:
```ts
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
```

**Step 6: Run tests to verify they pass**

```bash
npx jest src/__tests__/stores.test.ts
```
Expected: PASS — 4 tests passing.

**Step 7: Commit**

```bash
git add src/store/ src/__tests__/stores.test.ts
git commit -m "feat: add zustand stores with persistence"
```

---

### Task 5: Debt Selectors (Core Business Logic)

**Files:**
- Create: `SplitEasy/src/selectors/debtSelectors.ts`
- Create: `SplitEasy/src/__tests__/debtSelectors.test.ts`

**Step 1: Write failing tests**

Create `src/__tests__/debtSelectors.test.ts`:
```ts
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
```

**Step 2: Run to verify they fail**

```bash
npx jest src/__tests__/debtSelectors.test.ts
```
Expected: FAIL — "Cannot find module '../selectors/debtSelectors'"

**Step 3: Implement debtSelectors**

Create `src/selectors/debtSelectors.ts`:
```ts
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
```

**Step 4: Run tests to verify they pass**

```bash
npx jest src/__tests__/debtSelectors.test.ts
```
Expected: PASS — 5 tests passing.

**Step 5: Commit**

```bash
git add src/selectors/ src/__tests__/debtSelectors.test.ts
git commit -m "feat: add debt selectors with full test coverage"
```

---

### Task 6: Navigation Skeleton

**Files:**
- Create: `SplitEasy/src/navigation/types.ts`
- Create: `SplitEasy/src/navigation/RootNavigator.tsx`
- Create: `SplitEasy/src/navigation/TabNavigator.tsx`
- Create: `SplitEasy/src/screens/HomeScreen.tsx`
- Create: `SplitEasy/src/screens/DebtDetailScreen.tsx`
- Create: `SplitEasy/src/screens/GroupsScreen.tsx`
- Create: `SplitEasy/src/screens/HistoryScreen.tsx`
- Create: `SplitEasy/src/screens/PaywallScreen.tsx`
- Modify: `SplitEasy/App.tsx`

**Step 1: Define navigation types**

Create `src/navigation/types.ts`:
```ts
import { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Groups: undefined;
  History: undefined;
};

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<TabParamList>;
  DebtDetail: { personId: string; groupId: string; myId: string };
  Paywall: { trigger: 'groups' | 'history' | 'export' };
};
```

**Step 2: Create stub screens**

Create each stub screen (repeat pattern for all 5 screens):

`src/screens/HomeScreen.tsx`:
```tsx
import { View, Text } from 'react-native';
export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-lg font-medium text-gray-900">Home</Text>
    </View>
  );
}
```

Create identical stubs for: `DebtDetailScreen.tsx`, `GroupsScreen.tsx`, `HistoryScreen.tsx`, `PaywallScreen.tsx` — just change the label text.

**Step 3: Create TabNavigator**

Create `src/navigation/TabNavigator.tsx`:
```tsx
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TabParamList } from './types';
import HomeScreen from '../screens/HomeScreen';
import GroupsScreen from '../screens/GroupsScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator<TabParamList>();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1D9E75',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#F3F4F6' },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Debts' }} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}
```

**Step 4: Create RootNavigator**

Create `src/navigation/RootNavigator.tsx`:
```tsx
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import TabNavigator from './TabNavigator';
import DebtDetailScreen from '../screens/DebtDetailScreen';
import PaywallScreen from '../screens/PaywallScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={TabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="DebtDetail"
          component={DebtDetailScreen}
          options={{ title: 'Debt Detail' }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ presentation: 'fullScreenModal', headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

**Step 5: Wire App.tsx**

Replace `App.tsx`:
```tsx
import './global.css';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView className="flex-1">
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
```

**Step 6: Verify on device**

```bash
npx expo start
```
Expected: Tab bar at bottom with Debts / Groups / History. All tabs tap without crash. "Paywall" unreachable yet.

**Step 7: Commit**

```bash
git add src/navigation/ src/screens/ App.tsx
git commit -m "feat: add navigation skeleton — all 5 screens stubbed"
```

---

### Task 7: RevenueCat Integration

> **Note:** `react-native-purchases` does NOT work in Expo Go. You need an EAS development build to test this task. Build with: `eas build --platform ios --profile development` — install on device, then test.

**Files:**
- Create: `SplitEasy/src/lib/revenuecat.ts`
- Modify: `SplitEasy/src/store/proStore.ts`
- Modify: `SplitEasy/App.tsx`
- Create: `SplitEasy/eas.json`

**Step 1: Create eas.json for development builds**

```json
{
  "cli": { "version": ">= 5.9.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  }
}
```

**Step 2: Create RevenueCat lib**

Create `src/lib/revenuecat.ts`:
```ts
import Purchases, {
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { useProStore } from '../store/proStore';
import { ProStatus } from '../types';

// Replace with your actual RevenueCat iOS API key from dashboard
const RC_API_KEY = 'appl_REPLACE_WITH_YOUR_KEY';

export function initRevenueCat() {
  Purchases.setLogLevel(LOG_LEVEL.DEBUG); // remove for production
  Purchases.configure({ apiKey: RC_API_KEY });
}

function mapCustomerInfo(info: CustomerInfo): ProStatus {
  const entitlement = info.entitlements.active['pro'];
  if (!entitlement) return { isPro: false, purchaseType: null };

  const productId = entitlement.productIdentifier;
  let purchaseType: ProStatus['purchaseType'] = null;
  if (productId.includes('weekly')) purchaseType = 'weekly';
  else if (productId.includes('monthly')) purchaseType = 'monthly';
  else if (productId.includes('lifetime')) purchaseType = 'lifetime';

  return { isPro: true, purchaseType };
}

export async function syncProStatus() {
  try {
    const info = await Purchases.getCustomerInfo();
    useProStore.getState().setProStatus(mapCustomerInfo(info));
  } catch (e) {
    console.warn('RevenueCat syncProStatus failed:', e);
  }
}

export async function getOfferings() {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  } catch (e) {
    console.warn('RevenueCat getOfferings failed:', e);
    return [];
  }
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    useProStore.getState().setProStatus(mapCustomerInfo(customerInfo));
    return true;
  } catch (e: any) {
    if (!e.userCancelled) console.warn('Purchase failed:', e);
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const info = await Purchases.restorePurchases();
    const status = mapCustomerInfo(info);
    useProStore.getState().setProStatus(status);
    return status.isPro;
  } catch (e) {
    console.warn('Restore failed:', e);
    return false;
  }
}
```

**Step 3: Initialize RevenueCat on app launch**

Update `App.tsx`:
```tsx
import './global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { initRevenueCat, syncProStatus } from './src/lib/revenuecat';

export default function App() {
  useEffect(() => {
    initRevenueCat();
    syncProStatus();
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
```

**Step 4: Add your RevenueCat API key**

- Go to RevenueCat dashboard → your app → API Keys
- Copy the iOS public key (starts with `appl_`)
- Replace `appl_REPLACE_WITH_YOUR_KEY` in `src/lib/revenuecat.ts`

**Step 5: Build dev client and test**

```bash
eas build --platform ios --profile development
```
Install the `.ipa` on your iPhone via Mac + Xcode (or TestFlight internal). Launch app. Check Xcode console — should see RevenueCat debug logs.

**Step 6: Commit**

```bash
git add src/lib/revenuecat.ts src/store/proStore.ts App.tsx eas.json
git commit -m "feat: integrate revenuecat for IAP"
```

---

### Task 8: Home Screen

**Files:**
- Modify: `SplitEasy/src/screens/HomeScreen.tsx`
- Create: `SplitEasy/src/components/DebtListItem.tsx`
- Create: `SplitEasy/src/components/EmptyState.tsx`
- Create: `SplitEasy/src/components/FAB.tsx`
- Create: `SplitEasy/src/sheets/AddExpenseSheet.tsx` (stub — full impl in Task 9)

**Step 1: Create DebtListItem component**

Create `src/components/DebtListItem.tsx`:
```tsx
import { TouchableOpacity, View, Text } from 'react-native';
import { DebtSummary } from '../types';

type Props = {
  debt: DebtSummary;
  onPress: () => void;
};

export default function DebtListItem({ debt, onPress }: Props) {
  const isPositive = debt.netAmount > 0;
  const amount = Math.abs(debt.netAmount).toFixed(2);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100"
      activeOpacity={0.7}
    >
      <View className="flex-1">
        <Text className="text-base font-semibold text-gray-900">{debt.personName}</Text>
        <Text className="text-sm text-gray-400 mt-0.5" numberOfLines={1}>
          {debt.lastExpenseDescription}
        </Text>
      </View>
      <View className="items-end ml-4">
        <Text
          className={`text-base font-bold ${isPositive ? 'text-brand-green' : 'text-brand-red'}`}
        >
          {isPositive ? '+' : '-'}${amount}
        </Text>
        <Text className="text-xs text-gray-400 mt-0.5">
          {isPositive ? 'owes you' : 'you owe'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
```

**Step 2: Create EmptyState component**

Create `src/components/EmptyState.tsx`:
```tsx
import { View, Text } from 'react-native';

type Props = {
  message: string;
  subMessage?: string;
};

export default function EmptyState({ message, subMessage }: Props) {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="text-4xl mb-4">💸</Text>
      <Text className="text-lg font-semibold text-gray-900 text-center">{message}</Text>
      {subMessage && (
        <Text className="text-sm text-gray-400 text-center mt-2">{subMessage}</Text>
      )}
    </View>
  );
}
```

**Step 3: Create FAB component**

Create `src/components/FAB.tsx`:
```tsx
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
```

**Step 4: Create AddExpenseSheet stub**

Create `src/sheets/AddExpenseSheet.tsx`:
```tsx
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef } from 'react';
import { Text } from 'react-native';

const AddExpenseSheet = forwardRef<BottomSheet>((_, ref) => (
  <BottomSheet ref={ref} index={-1} snapPoints={['90%']} enablePanDownToClose>
    <BottomSheetView className="flex-1 p-6">
      <Text className="text-lg font-semibold">Add Expense (coming soon)</Text>
    </BottomSheetView>
  </BottomSheet>
));

export default AddExpenseSheet;
```

**Step 5: Implement HomeScreen**

Replace `src/screens/HomeScreen.tsx`:
```tsx
import { useRef, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import { getDebtsForGroup } from '../selectors/debtSelectors';
import DebtListItem from '../components/DebtListItem';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import AddExpenseSheet from '../sheets/AddExpenseSheet';
import { RootStackParamList } from '../navigation/types';

// Hard-coded "me" for MVP — first person in default group acts as the user
const MY_ID = 'me';

type Tab = 'owe_me' | 'i_owe';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sheetRef = useRef<BottomSheet>(null);
  const [activeTab, setActiveTab] = useState<Tab>('owe_me');

  const groups = useGroupStore((s) => s.groups);
  const persons = useGroupStore((s) => s.persons);
  const expenses = useExpenseStore((s) => s.expenses);

  const defaultGroup = groups[0];
  const groupId = defaultGroup?.id ?? '';

  const allDebts = useMemo(
    () => getDebtsForGroup(groupId, MY_ID, expenses, persons),
    [groupId, expenses, persons]
  );

  const debts =
    activeTab === 'owe_me'
      ? allDebts.filter((d) => d.netAmount > 0)
      : allDebts.filter((d) => d.netAmount < 0);

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top }}>
      {/* Header */}
      <View className="px-4 pt-4 pb-2">
        <Text className="text-2xl font-bold text-gray-900">SplitEasy</Text>
        <Text className="text-sm text-gray-400 mt-0.5">
          {defaultGroup?.name ?? 'Default'}
        </Text>
      </View>

      {/* Tabs */}
      <View className="flex-row mx-4 my-2 bg-gray-100 rounded-xl p-1">
        {(['owe_me', 'i_owe'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg items-center ${
              activeTab === tab ? 'bg-white shadow' : ''
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                activeTab === tab ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {tab === 'owe_me' ? 'They owe you' : 'You owe them'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Debt list */}
      {debts.length === 0 ? (
        <EmptyState
          message="All clear!"
          subMessage="Tap + to add an expense and start splitting."
        />
      ) : (
        <FlatList
          data={debts}
          keyExtractor={(item) => item.personId}
          renderItem={({ item }) => (
            <DebtListItem
              debt={item}
              onPress={() =>
                navigation.navigate('DebtDetail', {
                  personId: item.personId,
                  groupId,
                  myId: MY_ID,
                })
              }
            />
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      )}

      <FAB onPress={() => sheetRef.current?.expand()} />

      <AddExpenseSheet ref={sheetRef} />
    </View>
  );
}
```

**Step 6: Verify on device**

```bash
npx expo start
```
Expected: Home tab shows tabs ("They owe you" / "You owe them"), empty state with message, FAB in bottom right. Tapping FAB opens stub bottom sheet.

**Step 7: Commit**

```bash
git add src/screens/HomeScreen.tsx src/components/ src/sheets/AddExpenseSheet.tsx
git commit -m "feat: implement home screen with debt list and FAB"
```

---

### Task 9: AddExpenseSheet (3-Step Flow)

**Files:**
- Modify: `SplitEasy/src/sheets/AddExpenseSheet.tsx`
- Create: `SplitEasy/src/components/AmountInput.tsx`

**Step 1: Create AmountInput component**

Create `src/components/AmountInput.tsx`:
```tsx
import { View, Text, TextInput } from 'react-native';

type Props = {
  value: string;
  onChange: (v: string) => void;
};

export default function AmountInput({ value, onChange }: Props) {
  return (
    <View className="items-center py-6">
      <View className="flex-row items-center">
        <Text className="text-4xl font-light text-gray-400 mr-1">$</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#9CA3AF"
          className="text-5xl font-semibold text-gray-900 min-w-[80px]"
          style={{ fontSize: 48 }}
          autoFocus
        />
      </View>
    </View>
  );
}
```

**Step 2: Implement full AddExpenseSheet**

Replace `src/sheets/AddExpenseSheet.tsx`:
```tsx
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import AmountInput from '../components/AmountInput';
import uuid from 'react-native-uuid';

type Step = 1 | 2 | 3;
const MY_ID = 'me';

const AddExpenseSheet = forwardRef<BottomSheet>((_, ref) => {
  const [step, setStep] = useState<Step>(1);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom'>('equal');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  const groups = useGroupStore((s) => s.groups);
  const persons = useGroupStore((s) => s.persons);
  const addPerson = useGroupStore((s) => s.addPerson);
  const addExpense = useExpenseStore((s) => s.addExpense);
  const [newName, setNewName] = useState('');

  const groupId = groups[0]?.id ?? '';
  const groupPersons = persons.filter((p) => p.groupId === groupId && p.id !== MY_ID);

  function reset() {
    setStep(1);
    setAmount('');
    setDescription('');
    setSelectedPersonIds([]);
    setSplitMethod('equal');
    setCustomAmounts({});
    setNewName('');
  }

  function togglePerson(id: string) {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function addNewPerson() {
    if (!newName.trim()) return;
    addPerson(newName.trim(), groupId);
    setNewName('');
  }

  function confirm() {
    const total = parseFloat(amount);
    if (isNaN(total) || selectedPersonIds.length === 0) return;

    const splits = selectedPersonIds.map((personId) => {
      const share =
        splitMethod === 'equal'
          ? total / selectedPersonIds.length
          : parseFloat(customAmounts[personId] ?? '0');
      return {
        personId,
        amount: parseFloat(share.toFixed(2)),
        settled: false,
        settledAt: null,
      };
    });

    addExpense({
      groupId,
      description: description || 'Expense',
      totalAmount: total,
      paidById: MY_ID,
      splits,
    });

    reset();
    (ref as React.RefObject<BottomSheet>)?.current?.close();
  }

  return (
    <BottomSheet
      ref={ref}
      index={-1}
      snapPoints={['90%']}
      enablePanDownToClose
      onClose={reset}
    >
      <BottomSheetScrollView className="flex-1 px-5">
        {/* Step indicators */}
        <View className="flex-row justify-center gap-2 py-3">
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              className={`w-2 h-2 rounded-full ${
                step === s ? 'bg-brand-green' : 'bg-gray-200'
              }`}
            />
          ))}
        </View>

        {step === 1 && (
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              How much?
            </Text>
            <AmountInput value={amount} onChange={setAmount} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What's it for? (optional)"
              placeholderTextColor="#9CA3AF"
              className="border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mt-2"
            />
            <TouchableOpacity
              onPress={() => parseFloat(amount) > 0 && setStep(2)}
              className="bg-brand-green rounded-2xl py-4 items-center mt-6"
            >
              <Text className="text-white font-semibold text-base">Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              Who's involved?
            </Text>
            {groupPersons.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => togglePerson(p.id)}
                className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-2 border ${
                  selectedPersonIds.includes(p.id)
                    ? 'border-brand-green bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <Text className="text-base text-gray-900">{p.name}</Text>
                {selectedPersonIds.includes(p.id) && (
                  <Text className="text-brand-green font-bold">✓</Text>
                )}
              </TouchableOpacity>
            ))}
            {/* Add new person */}
            <View className="flex-row gap-2 mt-2">
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Add person..."
                placeholderTextColor="#9CA3AF"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-base"
              />
              <TouchableOpacity
                onPress={addNewPerson}
                className="bg-gray-100 rounded-xl px-4 items-center justify-center"
              >
                <Text className="text-gray-600 font-semibold">Add</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              onPress={() => selectedPersonIds.length > 0 && setStep(3)}
              className="bg-brand-green rounded-2xl py-4 items-center mt-6"
            >
              <Text className="text-white font-semibold text-base">Next →</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text className="text-xl font-bold text-gray-900 mb-4 text-center">
              How to split?
            </Text>
            <View className="flex-row bg-gray-100 rounded-xl p-1 mb-4">
              {(['equal', 'custom'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setSplitMethod(m)}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    splitMethod === m ? 'bg-white shadow' : ''
                  }`}
                >
                  <Text
                    className={`text-sm font-medium capitalize ${
                      splitMethod === m ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {splitMethod === 'equal' && (
              <View className="bg-gray-50 rounded-xl p-4 mb-4">
                {selectedPersonIds.map((id) => {
                  const person = persons.find((p) => p.id === id);
                  const share = (parseFloat(amount) / selectedPersonIds.length).toFixed(2);
                  return (
                    <View key={id} className="flex-row justify-between py-1">
                      <Text className="text-gray-700">{person?.name}</Text>
                      <Text className="font-semibold text-gray-900">${share}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {splitMethod === 'custom' &&
              selectedPersonIds.map((id) => {
                const person = persons.find((p) => p.id === id);
                return (
                  <View key={id} className="flex-row items-center justify-between mb-3">
                    <Text className="text-gray-700 flex-1">{person?.name}</Text>
                    <View className="flex-row items-center border border-gray-200 rounded-xl px-3 py-2">
                      <Text className="text-gray-400 mr-1">$</Text>
                      <TextInput
                        value={customAmounts[id] ?? ''}
                        onChangeText={(v) =>
                          setCustomAmounts((prev) => ({ ...prev, [id]: v }))
                        }
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        className="text-base text-gray-900 w-16"
                      />
                    </View>
                  </View>
                );
              })}

            <TouchableOpacity
              onPress={confirm}
              className="bg-brand-green rounded-2xl py-4 items-center mt-4"
            >
              <Text className="text-white font-semibold text-base">
                Add Expense · ${parseFloat(amount || '0').toFixed(2)}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <View className="h-8" />
      </BottomSheetScrollView>
    </BottomSheet>
  );
});

export default AddExpenseSheet;
```

**Step 3: Verify on device**

Open app → Tap FAB → Step 1: enter amount → Next → Step 2: tap a person or add one → Next → Step 3: choose split method → Add Expense. Debt should appear on Home screen.

**Step 4: Commit**

```bash
git add src/sheets/AddExpenseSheet.tsx src/components/AmountInput.tsx
git commit -m "feat: implement add expense sheet — 3-step flow"
```

---

### Task 10: Debt Detail Screen + Settle Confirm Sheet

**Files:**
- Modify: `SplitEasy/src/screens/DebtDetailScreen.tsx`
- Create: `SplitEasy/src/sheets/SettleConfirmSheet.tsx`

**Step 1: Create SettleConfirmSheet**

Create `src/sheets/SettleConfirmSheet.tsx`:
```tsx
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
```

**Step 2: Implement DebtDetailScreen**

Replace `src/screens/DebtDetailScreen.tsx`:
```tsx
import { useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, Share, Alert } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomSheet from '@gorhom/bottom-sheet';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import { getDebtDetail, getDebtsForGroup } from '../selectors/debtSelectors';
import SettleConfirmSheet from '../sheets/SettleConfirmSheet';
import { RootStackParamList } from '../navigation/types';

type Route = RouteProp<RootStackParamList, 'DebtDetail'>;

export default function DebtDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<BottomSheet>(null);

  const { personId, groupId, myId } = route.params;

  const persons = useGroupStore((s) => s.persons);
  const expenses = useExpenseStore((s) => s.expenses);
  const settleAllForPerson = useExpenseStore((s) => s.settleAllForPerson);

  const person = persons.find((p) => p.id === personId);
  const debts = getDebtsForGroup(groupId, myId, expenses, persons);
  const debt = debts.find((d) => d.personId === personId);
  const detail = useMemo(
    () => getDebtDetail(groupId, myId, personId, expenses),
    [groupId, myId, personId, expenses]
  );

  const netAmount = debt?.netAmount ?? 0;

  function handleSettle() {
    settleAllForPerson(groupId, myId, personId);
    navigation.goBack();
  }

  async function handleShare() {
    const lines = detail.map(
      (d) => `  • ${d.description}: $${d.yourShare.toFixed(2)}`
    );
    const message = `${person?.name} owes you $${netAmount.toFixed(2)}\n\n${lines.join('\n')}`;
    await Share.share({ message });
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingBottom: insets.bottom }}>
      {/* Total header */}
      <View className="px-4 py-6 bg-gray-50 border-b border-gray-100">
        <Text className="text-sm text-gray-400 mb-1">{person?.name}</Text>
        <Text className="text-4xl font-bold text-gray-900">
          ${Math.abs(netAmount).toFixed(2)}
        </Text>
        <Text className="text-sm text-gray-400 mt-1">
          {netAmount > 0 ? 'owes you' : 'you owe'}
        </Text>
        <TouchableOpacity onPress={handleShare} className="absolute top-6 right-4">
          <Text className="text-brand-green text-sm font-medium">Share</Text>
        </TouchableOpacity>
      </View>

      {/* Expense breakdown */}
      <FlatList
        data={detail}
        keyExtractor={(item) => item.expenseId}
        renderItem={({ item }) => (
          <View className="flex-row justify-between items-center px-4 py-4 border-b border-gray-50">
            <View className="flex-1">
              <Text className="text-base text-gray-900">{item.description}</Text>
              <Text className="text-xs text-gray-400 mt-0.5">
                Total: ${item.totalAmount.toFixed(2)}
              </Text>
            </View>
            <Text className="text-base font-semibold text-gray-900 ml-4">
              ${item.yourShare.toFixed(2)}
            </Text>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Settle up button */}
      {netAmount !== 0 && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-white border-t border-gray-100">
          <TouchableOpacity
            onPress={() => sheetRef.current?.expand()}
            className="bg-brand-green rounded-2xl py-4 items-center"
          >
            <Text className="text-white font-semibold text-base">
              Settle up · ${Math.abs(netAmount).toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <SettleConfirmSheet
        ref={sheetRef}
        personName={person?.name ?? ''}
        amount={Math.abs(netAmount)}
        onConfirm={handleSettle}
      />
    </View>
  );
}
```

**Step 3: Verify on device**

Add an expense → see debt on Home → tap debt row → see DebtDetail → tap "Settle up" → confirmation sheet → confirm → back to Home (debt gone).

**Step 4: Commit**

```bash
git add src/screens/DebtDetailScreen.tsx src/sheets/SettleConfirmSheet.tsx
git commit -m "feat: implement debt detail screen and settle confirm sheet"
```

---

### Task 11: Groups Screen + NewGroupSheet

**Files:**
- Modify: `SplitEasy/src/screens/GroupsScreen.tsx`
- Create: `SplitEasy/src/sheets/NewGroupSheet.tsx`
- Create: `SplitEasy/src/components/GroupCard.tsx`

**Step 1: Create GroupCard**

Create `src/components/GroupCard.tsx`:
```tsx
import { TouchableOpacity, View, Text } from 'react-native';
import { Group } from '../types';

type Props = {
  group: Group;
  outstandingAmount: number;
  onPress: () => void;
};

export default function GroupCard({ group, outstandingAmount, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mx-4 mb-3 p-4 bg-white border border-gray-100 rounded-2xl"
      activeOpacity={0.7}
    >
      <Text className="text-base font-semibold text-gray-900">{group.name}</Text>
      <Text className="text-sm text-gray-400 mt-1">
        {outstandingAmount > 0
          ? `$${outstandingAmount.toFixed(2)} outstanding`
          : 'All settled'}
      </Text>
    </TouchableOpacity>
  );
}
```

**Step 2: Create NewGroupSheet**

Create `src/sheets/NewGroupSheet.tsx`:
```tsx
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
```

**Step 3: Implement GroupsScreen**

Replace `src/screens/GroupsScreen.tsx`:
```tsx
import { useRef, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BottomSheet from '@gorhom/bottom-sheet';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import { useProStore } from '../store/proStore';
import { getDebtsForGroup } from '../selectors/debtSelectors';
import GroupCard from '../components/GroupCard';
import NewGroupSheet from '../sheets/NewGroupSheet';
import { RootStackParamList } from '../navigation/types';

const MY_ID = 'me';

export default function GroupsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const sheetRef = useRef<BottomSheet>(null);

  const groups = useGroupStore((s) => s.groups);
  const persons = useGroupStore((s) => s.persons);
  const expenses = useExpenseStore((s) => s.expenses);
  const isPro = useProStore((s) => s.isPro);

  function getOutstanding(groupId: string) {
    const debts = getDebtsForGroup(groupId, MY_ID, expenses, persons);
    return debts
      .filter((d) => d.netAmount > 0)
      .reduce((sum, d) => sum + d.netAmount, 0);
  }

  function handleAddGroup() {
    if (!isPro && groups.length >= 1) {
      navigation.navigate('Paywall', { trigger: 'groups' });
      return;
    }
    sheetRef.current?.expand();
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">Groups</Text>
        <TouchableOpacity onPress={handleAddGroup} className="w-8 h-8 items-center justify-center">
          <Text className="text-3xl text-brand-green font-light leading-none">+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => g.id}
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            outstandingAmount={getOutstanding(item.id)}
            onPress={() => {}}
          />
        )}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
      />

      {!isPro && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Paywall', { trigger: 'groups' })}
          className="mx-4 mb-4 p-4 border-2 border-dashed border-gray-200 rounded-2xl items-center"
        >
          <Text className="text-gray-400 text-sm">🔒 Unlock multiple groups with Pro</Text>
        </TouchableOpacity>
      )}

      <NewGroupSheet ref={sheetRef} />
    </View>
  );
}
```

**Step 4: Verify on device**

Groups tab shows Default group. Free user tapping + → goes to Paywall stub.

**Step 5: Commit**

```bash
git add src/screens/GroupsScreen.tsx src/sheets/NewGroupSheet.tsx src/components/GroupCard.tsx
git commit -m "feat: implement groups screen with pro gate"
```

---

### Task 12: History Screen

**Files:**
- Modify: `SplitEasy/src/screens/HistoryScreen.tsx`

**Step 1: Implement HistoryScreen**

Replace `src/screens/HistoryScreen.tsx`:
```tsx
import { useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGroupStore } from '../store/groupStore';
import { useExpenseStore } from '../store/expenseStore';
import { useProStore } from '../store/proStore';
import { RootStackParamList } from '../navigation/types';

const FREE_LIMIT = 3;
const MY_ID = 'me';

type SettledItem = {
  id: string;
  personName: string;
  amount: number;
  description: string;
  settledAt: number;
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const persons = useGroupStore((s) => s.persons);
  const expenses = useExpenseStore((s) => s.expenses);
  const isPro = useProStore((s) => s.isPro);

  const settledItems = useMemo((): SettledItem[] => {
    const items: SettledItem[] = [];
    for (const expense of expenses) {
      if (expense.paidById !== MY_ID) continue;
      for (const split of expense.splits) {
        if (!split.settled) continue;
        const person = persons.find((p) => p.id === split.personId);
        items.push({
          id: `${expense.id}-${split.personId}`,
          personName: person?.name ?? 'Unknown',
          amount: split.amount,
          description: expense.description,
          settledAt: split.settledAt ?? 0,
        });
      }
    }
    return items.sort((a, b) => b.settledAt - a.settledAt);
  }, [expenses, persons]);

  const visibleItems = isPro ? settledItems : settledItems.slice(0, FREE_LIMIT);
  const hiddenCount = settledItems.length - FREE_LIMIT;
  const showPaywallOverlay = !isPro && hiddenCount > 0;

  function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  }

  return (
    <View className="flex-1 bg-gray-50" style={{ paddingTop: insets.top }}>
      <View className="px-4 pt-4 pb-3">
        <Text className="text-2xl font-bold text-gray-900">History</Text>
        <Text className="text-sm text-gray-400 mt-0.5">Settled debts</Text>
      </View>

      {settledItems.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-4xl mb-3">✓</Text>
          <Text className="text-lg font-semibold text-gray-700">Nothing settled yet</Text>
          <Text className="text-sm text-gray-400 mt-1">Settled debts appear here</Text>
        </View>
      ) : (
        <View className="flex-1">
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="flex-row justify-between items-center px-4 py-4 bg-white border-b border-gray-50">
                <View className="flex-1">
                  <Text className="text-base text-gray-900">{item.personName}</Text>
                  <Text className="text-sm text-gray-400 mt-0.5">{item.description}</Text>
                </View>
                <View className="items-end ml-4">
                  <Text className="text-base font-semibold text-gray-900">
                    ${item.amount.toFixed(2)}
                  </Text>
                  <Text className="text-xs text-gray-400">{formatDate(item.settledAt)}</Text>
                </View>
              </View>
            )}
          />

          {showPaywallOverlay && (
            <View className="mx-4 mt-2 overflow-hidden rounded-2xl">
              <BlurView intensity={20} className="p-6 items-center">
                <Text className="text-base font-semibold text-gray-900 mb-1">
                  +{hiddenCount} more settled {hiddenCount === 1 ? 'debt' : 'debts'}
                </Text>
                <Text className="text-sm text-gray-500 text-center mb-4">
                  Unlock full history with SplitEasy Pro
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Paywall', { trigger: 'history' })}
                  className="bg-brand-green rounded-xl px-6 py-3"
                >
                  <Text className="text-white font-semibold">Go Pro</Text>
                </TouchableOpacity>
              </BlurView>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
```

**Step 2: Install expo-blur (for BlurView)**

```bash
npx expo install expo-blur
```

**Step 3: Verify on device**

Add and settle 4+ debts → History shows 3 with blur overlay below. Pro users see all.

**Step 4: Commit**

```bash
git add src/screens/HistoryScreen.tsx
git commit -m "feat: implement history screen with free tier blur overlay"
```

---

### Task 13: Paywall Screen

> This screen needs a RevenueCat dev build to test purchasing. UI works in Expo Go; purchases will fail gracefully.

**Files:**
- Modify: `SplitEasy/src/screens/PaywallScreen.tsx`

**Step 1: Implement PaywallScreen**

Replace `src/screens/PaywallScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { PurchasesPackage } from 'react-native-purchases';
import { getOfferings, purchasePackage, restorePurchases } from '../lib/revenuecat';
import { useProStore } from '../store/proStore';

const FEATURES = [
  'Unlimited groups',
  'Full settlement history',
  'Export expense summaries',
  'Everything stored locally — no cloud',
];

function packageLabel(pkg: PurchasesPackage): { title: string; price: string; sub: string } {
  const id = pkg.product.identifier;
  const price = pkg.product.priceString;
  if (id.includes('weekly')) return { title: 'Pro Weekly', price, sub: 'per week' };
  if (id.includes('monthly')) return { title: 'Pro Monthly', price, sub: 'per month · most popular' };
  return { title: 'Pro Lifetime', price, sub: 'pay once, yours forever' };
}

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const isPro = useProStore((s) => s.isPro);

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (isPro) { navigation.goBack(); return; }
    getOfferings().then((pkgs) => {
      setPackages(pkgs);
      setLoading(false);
    });
  }, [isPro]);

  async function handlePurchase(pkg: PurchasesPackage) {
    setPurchasing(true);
    const success = await purchasePackage(pkg);
    setPurchasing(false);
    if (success) navigation.goBack();
  }

  async function handleRestore() {
    setPurchasing(true);
    const restored = await restorePurchases();
    setPurchasing(false);
    if (restored) {
      navigation.goBack();
    } else {
      Alert.alert('No purchases found', 'No active Pro subscription found for this Apple ID.');
    }
  }

  return (
    <View className="flex-1 bg-white" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      {/* Close button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="absolute top-4 right-4 z-10 w-8 h-8 items-center justify-center"
        style={{ top: insets.top + 12 }}
      >
        <Text className="text-gray-400 text-xl">✕</Text>
      </TouchableOpacity>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 40 }}>
        {/* Headline */}
        <Text className="text-3xl font-bold text-gray-900 text-center mt-4">
          Go Pro. Stay private.
        </Text>
        <Text className="text-base text-gray-500 text-center mt-2 mb-8">
          Your data stays on your phone. Always.
        </Text>

        {/* Feature list */}
        <View className="bg-gray-50 rounded-2xl p-5 mb-8">
          {FEATURES.map((f) => (
            <View key={f} className="flex-row items-center mb-3 last:mb-0">
              <Text className="text-brand-green font-bold mr-3">✓</Text>
              <Text className="text-base text-gray-700">{f}</Text>
            </View>
          ))}
        </View>

        {/* Pricing options */}
        {loading ? (
          <ActivityIndicator color="#1D9E75" size="large" className="my-8" />
        ) : (
          packages.map((pkg) => {
            const label = packageLabel(pkg);
            const isMonthly = pkg.product.identifier.includes('monthly');
            return (
              <TouchableOpacity
                key={pkg.identifier}
                onPress={() => !purchasing && handlePurchase(pkg)}
                className={`mb-3 p-4 rounded-2xl border-2 ${
                  isMonthly
                    ? 'border-brand-green bg-green-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {isMonthly && (
                  <View className="absolute -top-3 left-4 bg-brand-green px-3 py-0.5 rounded-full">
                    <Text className="text-white text-xs font-semibold">Most popular</Text>
                  </View>
                )}
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-base font-semibold text-gray-900">{label.title}</Text>
                    <Text className="text-sm text-gray-400">{label.sub}</Text>
                  </View>
                  <Text className="text-xl font-bold text-gray-900">{label.price}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Free tier reminder */}
        <Text className="text-xs text-gray-400 text-center mt-4">
          Free version includes 1 group and up to 3 history items.
        </Text>

        {/* Restore */}
        <TouchableOpacity onPress={handleRestore} className="py-4 items-center">
          <Text className="text-sm text-gray-400">Restore purchase</Text>
        </TouchableOpacity>

        {/* Legal */}
        <Text className="text-xs text-gray-300 text-center px-4 mb-4">
          Payment charged to your Apple ID. Subscription renews unless cancelled at least 24 hours before the end of the current period.
        </Text>
      </ScrollView>

      {purchasing && (
        <View className="absolute inset-0 bg-black/30 items-center justify-center">
          <ActivityIndicator color="white" size="large" />
        </View>
      )}
    </View>
  );
}
```

**Step 2: Verify on device (Expo Go)**

Navigate to any pro-gated feature → Paywall opens → shows headline, feature list, loading spinner (offerings fail silently in Expo Go). Close button works. No crash.

**Step 3: Verify purchases (EAS dev build)**

With dev build: Paywall loads all 3 pricing options → tap monthly → StoreKit sandbox prompts → purchase succeeds → screen closes → pro features unlocked.

**Step 4: Commit**

```bash
git add src/screens/PaywallScreen.tsx
git commit -m "feat: implement paywall screen with revenuecat integration"
```

---

### Task 14: Seed Default Group + Polish Pass

**Files:**
- Modify: `SplitEasy/App.tsx` (seed default group)
- Modify: All screens (minor spacing / color fixes)

**Step 1: Seed default group on first launch**

Update `App.tsx` — add seeding logic:
```tsx
import './global.css';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import RootNavigator from './src/navigation/RootNavigator';
import { initRevenueCat, syncProStatus } from './src/lib/revenuecat';
import { useGroupStore } from './src/store/groupStore';

export default function App() {
  const groups = useGroupStore((s) => s.groups);
  const addGroup = useGroupStore((s) => s.addGroup);

  useEffect(() => {
    // Seed default group on first launch
    if (groups.length === 0) {
      addGroup('Default');
    }
    initRevenueCat();
    syncProStatus();
  }, []);

  return (
    <GestureHandlerRootView className="flex-1">
      <RootNavigator />
    </GestureHandlerRootView>
  );
}
```

**Step 2: Polish tab bar icons**

Update `TabNavigator.tsx` to add icons using built-in emoji (no icon library needed for MVP):
```tsx
// In screenOptions for each tab, add tabBarIcon:
// Home: '💸'   Groups: '👥'   History: '✓'
// Add to each Tab.Screen:
options={{
  tabBarIcon: ({ focused }) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.4 }}>💸</Text>
  ),
}}
```

**Step 3: Verify complete flow on device**

Run through the full core loop:
1. App opens → Default group exists, Home shows empty state
2. Tap + → Add expense sheet → enter $60, "Dinner", add "Alex", equal split → confirm
3. Home shows "Alex owes you $30.00"
4. Tap Alex → DebtDetail shows Dinner $30
5. Tap "Settle up" → confirm → back to Home, debt gone
6. History tab shows settled debt

**Step 4: Commit**

```bash
git add App.tsx src/navigation/TabNavigator.tsx
git commit -m "feat: seed default group, polish tab bar"
```

---

### Task 15: EAS Build for TestFlight

**Files:**
- Modify: `SplitEasy/app.json`

**Step 1: Configure app.json for App Store**

Update `app.json`:
```json
{
  "expo": {
    "name": "SplitEasy",
    "slug": "spliteasy",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "backgroundColor": "#1D9E75"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.spliteasy.app",
      "buildNumber": "1"
    },
    "extra": {
      "eas": { "projectId": "YOUR_EAS_PROJECT_ID" }
    }
  }
}
```

**Step 2: Initialize EAS project**

```bash
eas init
eas build:configure
```

**Step 3: Submit production build to TestFlight**

```bash
eas build --platform ios --profile production
```
Then:
```bash
eas submit --platform ios
```

**Step 4: Final commit**

```bash
git add app.json eas.json
git commit -m "chore: configure eas build for app store submission"
```

---

## Summary

| Task | Deliverable |
|---|---|
| 1 | Expo project scaffolded |
| 2 | All dependencies installed + NativeWind configured |
| 3 | TypeScript types defined |
| 4 | Zustand stores with persistence + tests |
| 5 | Debt selectors + full test coverage |
| 6 | Navigation skeleton — all screens stubbed |
| 7 | RevenueCat integrated |
| 8 | Home screen — debt list, tabs, FAB |
| 9 | AddExpenseSheet — 3-step flow |
| 10 | DebtDetail + SettleConfirmSheet |
| 11 | Groups screen + NewGroupSheet + pro gate |
| 12 | History screen + blur overlay |
| 13 | Paywall screen — pricing, purchase, restore |
| 14 | Default group seed + polish |
| 15 | EAS build → TestFlight |
