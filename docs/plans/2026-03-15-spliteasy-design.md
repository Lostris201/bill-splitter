# SplitEasy — Design Document

*Date: 2026-03-15*

---

## Product Summary

Private, offline-first iOS bill splitter. No account, no backend, no sync. Designed to make Splitwise users switch in 10 seconds.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 51+ (managed workflow) |
| Language | TypeScript |
| Styling | NativeWind v4 + Tailwind config |
| Navigation | React Navigation v6 — Native Stack + Bottom Tabs |
| Modals | `@gorhom/bottom-sheet` |
| State | Zustand with `persist` middleware |
| Storage | `@react-native-async-storage/async-storage` |
| Payments | `react-native-purchases` (RevenueCat SDK) |
| IDs | `react-native-uuid` |

---

## Monetization

| Product | Price | RevenueCat Product ID |
|---|---|---|
| Pro Weekly | $0.99/week | `com.spliteasy.pro.weekly` |
| Pro Monthly | $1.99/month *(most popular)* | `com.spliteasy.pro.monthly` |
| Pro Lifetime | $2.99 once | `com.spliteasy.pro.lifetime` |

---

## Folder Structure

```
SplitEasy/
├── app/
│   └── index.tsx               # Registers RootNavigator
├── src/
│   ├── navigation/
│   │   ├── RootNavigator.tsx   # Stack: MainTabs + Paywall (modal)
│   │   ├── TabNavigator.tsx    # Bottom tabs: Home, Groups, History
│   │   └── types.ts            # Navigation param types
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── DebtDetailScreen.tsx
│   │   ├── GroupsScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── PaywallScreen.tsx
│   ├── sheets/
│   │   ├── AddExpenseSheet.tsx
│   │   ├── SettleConfirmSheet.tsx
│   │   └── NewGroupSheet.tsx
│   ├── components/
│   ├── store/
│   │   ├── groupStore.ts
│   │   ├── expenseStore.ts
│   │   └── proStore.ts
│   ├── selectors/
│   │   └── debtSelectors.ts
│   ├── lib/
│   │   └── revenuecat.ts
│   └── types.ts
└── tailwind.config.js
```

---

## Data Model

```ts
type Group = {
  id: string        // uuid v4
  name: string      // "Default" for free tier
  createdAt: number // timestamp ms
}

type Person = {
  id: string
  name: string
  groupId: string   // FK → Group
}

type Expense = {
  id: string
  groupId: string
  description: string
  totalAmount: number
  paidById: string  // FK → Person
  splits: Split[]
  createdAt: number
}

type Split = {
  personId: string
  amount: number
  settled: boolean
  settledAt: number | null
}
```

Storage keys:
```
@spliteasy/groups
@spliteasy/persons
@spliteasy/expenses
@spliteasy/pro_status
```

---

## State (Zustand)

**`groupStore`** — `Group[]` + `Person[]`, persisted
- `addGroup`, `deleteGroup`, `addPerson`, `deletePerson`
- `canAddGroup()` selector — false if `!isPro && groups.length >= 1`

**`expenseStore`** — `Expense[]`, persisted
- `addExpense`, `deleteExpense`, `settleSplit`, `settleAllForPerson`

**`proStore`** — synced from RevenueCat on launch
- `{ isPro: boolean, purchaseType: 'weekly' | 'monthly' | 'lifetime' | null }`
- `syncProStatus()` — calls `Purchases.getCustomerInfo()` and updates slice

**`debtSelectors.ts`** — pure, never stored
- `getDebtsForGroup(groupId)` → `DebtSummary[]`
- `getDebtDetail(groupId, personId)` → `ExpenseRow[]`

Debt computation: scan all `Expense[]` → for each unsettled `Split`, pair `(paidById ↔ personId)` → net amounts → surface as `DebtSummary`.

---

## Navigation Structure

```
RootNavigator (Native Stack)
├── MainTabs (Bottom Tab Navigator)
│   ├── Home
│   │   └── DebtDetail (pushed onto stack)
│   ├── Groups
│   └── History
└── Paywall (full-screen modal)

Bottom Sheets (mounted at root via SheetManager ref)
├── AddExpenseSheet     (FAB on Home)
├── SettleConfirmSheet  (Settle button on DebtDetail)
└── NewGroupSheet       (+ on Groups)
```

---

## Screens

**Home** — Two tabs (They owe you / You owe them). Debt list from selector. Empty state when no debts. FAB → AddExpenseSheet. Tap row → DebtDetail.

**DebtDetail** — Person name + total at top. Expense breakdown list. Settle up → SettleConfirmSheet. Share icon in nav bar copies plain-text summary to clipboard.

**Groups** — All groups with outstanding total. Free: 1 group + locked "Add" card → paywall. Pro: + button → NewGroupSheet.

**History** — Settled debts, newest first. Free: first 3 visible, rest blurred + paywall overlay. Pro: full list.

**Paywall** — Full-screen modal. "Go Pro. Stay private." headline. "Your data stays on your phone. Always." subheadline. Feature bullets. Three PricingOption cards (weekly / monthly / lifetime). Restore purchases link. Legal line. X always visible.

**AddExpenseSheet** — 3-step flow:
1. Amount + description
2. Person picker (saved names + free-type)
3. Split method (equal / custom) → saves instantly, sheet closes

---

## RevenueCat Integration

- Init `Purchases.configure({ apiKey, appUserID: null })` on app launch (anonymous mode — no account)
- `syncProStatus()` called on launch and after every purchase
- Paywall renders RevenueCat `Offerings` → maps `Package[]` to pricing cards
- Restore purchases → `Purchases.restorePurchases()` → `syncProStatus()`

---

## Paywall Trigger Rules

- Tap Groups when `groups.length >= 1` and `!isPro`
- Scroll past 3 items in History and `!isPro`
- Tap Export and `!isPro`
- Never mid-expense-add flow
- Max once per session

---

## Development Environment

- Code written on Windows
- Expo Go on physical iPhone for dev loop
- Mac + Xcode for TestFlight / App Store builds (EAS Build for distribution)
