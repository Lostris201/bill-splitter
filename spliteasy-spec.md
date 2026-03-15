# SplitEasy — Full Product Spec

> No-account bill splitter for iOS. Built in 4 days. Designed to make Splitwise users switch in 10 seconds.

---

## Product Identity

| Field | Value |
|---|---|
| App name | SplitEasy – Bill & Debt Tracker |
| Subtitle | Split bills, track who owes you |
| Platform | iOS first (Expo / React Native) |
| Category | Finance |
| Differentiator | Zero account, 100% local, instant |
| Enemy | Splitwise ("too complicated, forced signup") |

**Positioning line:**
> "Split bills instantly. No account. No cloud. No one sees your money but you."

---

## Core Features (MVP Only)

- Add an expense: amount + description + who's involved
- Even split OR custom amounts per person
- Persistent debt list: "Alex owes you $18.50"
- Settle up button — marks a debt paid with one tap
- History log of settled debts *(pro)*
- Multiple groups *(pro — free gets 1)*
- Export summary to share via iMessage / clipboard

## Explicitly Out of Scope (v1)

- No accounts, no login, no backend
- No syncing between devices
- No recurring expenses
- No bank or payment integration
- No graphs or charts
- No multi-currency

---

## Screen Map

### 1 — Home (debt list)
Primary screen. Two tabs: "They owe you" / "You owe them." Each row shows person name, amount, last expense name. Tap row → debt detail. FAB (+) → add expense. Empty state with big + button when no debts exist.

**Components:** `DebtListItem`, `TabBar`, `EmptyState`, `FAB`

---

### 2 — Add expense
Bottom sheet modal. Three steps:
1. Amount + description
2. Pick people from saved names or type a new name
3. Split method — equal or custom

Confirm saves instantly. No network call. Updates all affected debt totals.

**Components:** `AmountInput`, `PersonPicker`, `SplitMethodToggle`, `CustomAmountRow`

---

### 3 — Debt detail
Per-person breakdown. Shows all expenses contributing to this debt. Total outstanding at top. Settle up button at bottom — confirmation sheet "Mark $18.50 from Alex as paid?" — then moves to history. Share button generates plain-text summary.

**Components:** `ExpenseRow`, `SettleButton`, `ShareSummary`

---

### 4 — History *(pro gate)*
All settled debts sorted by date. Free users see a blurred list with paywall overlay after the 3rd settled debt. Pro users see full history: person, amount, date.

**Components:** `HistoryRow`, `PaywallOverlay`

---

### 5 — Groups *(pro gate)*
Free users get 1 default group. Pro unlocks unlimited named groups (e.g. "Apartment," "Trip to Berlin"). Groups screen shows all groups with total outstanding per group.

**Components:** `GroupCard`, `NewGroupSheet`, `PaywallGate`

---

### 6 — Paywall
Full-screen sheet. Lead with: "Your data stays on your phone. Always." Three pricing options: monthly $1.99, one-time $2.99, restore purchase. Monthly highlighted as "most popular." Simple bullet feature list. No dark patterns.

**Components:** `PricingOption (×3)`, `FeatureList`, `RestorePurchase`

---

## Data Model

100% local. AsyncStorage with JSON. No Supabase, no Firebase, no auth.

### Group
```ts
{
  id: string         // uuid v4
  name: string       // "Default" for free tier
  createdAt: number  // timestamp ms
}
```

### Person
```ts
{
  id: string         // uuid v4
  name: string       // display name
  groupId: string    // FK → Group
}
```

### Expense
```ts
{
  id: string         // uuid v4
  groupId: string    // FK → Group
  description: string  // "Dinner at Luca's"
  totalAmount: number
  paidById: string   // FK → Person (who paid)
  splits: Split[]
  createdAt: number  // timestamp ms
}
```

### Split *(embedded in Expense.splits[])*
```ts
{
  personId: string      // FK → Person
  amount: number        // what this person owes
  settled: boolean      // default false
  settledAt: number | null
}
```

### Storage Keys
```
@spliteasy/groups       → Group[]
@spliteasy/persons      → Person[]
@spliteasy/expenses     → Expense[]
@spliteasy/pro_status   → { isPro, purchaseType, purchasedAt }
```

### Key Architecture Decision
Never store a "debt" entity. Always compute it on the fly from `Expense[]` + `Split[]`. Group all unsettled splits by `(paidById ↔ personId)` pair and net the amounts. This keeps data consistent — settling is just flipping `settled: true` on a Split.

---

## Monetization

### Tiers

| | Free | Pro Monthly | Pro Lifetime |
|---|---|---|---|
| Price | $0 | $1.99/mo | $2.99 once |
| 1 group | ✓ | ✓ | ✓ |
| Unlimited expenses | ✓ | ✓ | ✓ |
| Active debt list | ✓ | ✓ | ✓ |
| Settle up | ✓ | ✓ | ✓ |
| Full history | ✗ (3 max) | ✓ | ✓ |
| Multiple groups | ✗ | ✓ | ✓ |
| Export summary | ✗ | ✓ | ✓ |

### Paywall Trigger Logic
- Trigger when tapping Groups and >1 group exists
- Trigger when scrolling past 3 settled debts in History
- Trigger when tapping Export
- **Never trigger mid-expense-add** — let them complete the flow first
- Show paywall max once per session

### StoreKit 2 Product IDs
```
com.spliteasy.pro.monthly    → auto-renewable subscription
com.spliteasy.pro.lifetime   → non-consumable IAP
```

Use `expo-iap` or `react-native-iap`. Always include a Restore Purchases button (App Store requirement).

---

## ASO Strategy

### Metadata

**App name (30 chars):**
```
SplitEasy – Bill & Debt Tracker
```

**Subtitle (30 chars):**
```
Split bills, track who owes you
```

**Keyword field (100 chars, no spaces after commas):**
```
split,bill,owe,debt,expense,share,calculator,money,owing,tab,pay,iou,settle,friends,cost
```

### Primary ASA Keyword Targets

| Keyword | Intent | Match Type | Notes |
|---|---|---|---|
| split bill app | very high | exact | core keyword |
| who owes me money | very high | exact | emotional, high CVR |
| bill splitter | high | exact | broad category |
| debt tracker | high | broad | adjacent intent |
| iou app | high | exact | low competition |
| splitwise alternative | high | exact | steal their users |

### Screenshot Strategy (6 screenshots)

1. "Split bills in seconds. No account needed." + home screen
2. "Add an expense in 3 taps" + add expense sheet
3. "Always know who owes you" + debt list with real names/amounts
4. "Settle up with one tap" + debt detail + settle button
5. "Your data never leaves your phone" + privacy visual
6. "No Splitwise required" + implicit feature comparison

> Note: Don't name Splitwise directly in screenshots — Apple may reject. Use "No account required. No friends list. Just split." — same knife, no risk.

---

## 4-Day Execution Plan

### Day 1 — Research + Scaffold
**Goal:** Data layer works. Navigation skeleton renders all 6 screens.

- Validate all 6 keyword targets in ASA (check blue dot density)
- Read top 20 Splitwise 1-star reviews → steal exact pain phrases for screenshots
- `expo init SplitEasy` + navigation setup (Expo Router or React Navigation)
- AsyncStorage wrapper + full data model implemented + tested
- Debt computation function written + unit tested
- `expo-iap` installed + StoreKit sandbox configured

---

### Day 2 — Core Flow
**Goal:** Full core loop works — add expense → see debt → settle → see history.

- Home screen: debt list, both tabs, empty state, FAB
- Add expense sheet: amount input → person picker → split method → save
- Debt detail: expense breakdown + settle up + confirmation
- History screen: list view (free limit at 3 items)
- Pro gate logic: checks purchase status before unlocking features

---

### Day 3 — Paywall + Polish
**Goal:** TestFlight build is demo-ready. Screenshots are done.

- Paywall screen: 3 pricing options, feature list, restore button
- StoreKit purchase + restore flow tested in sandbox
- UI polish: typography, spacing, colors, micro-animations
- App icon + splash screen designed and wired
- 6 screenshots designed (Figma or Canva)
- TestFlight build submitted and tested on device

---

### Day 4 — Submit + Launch
**Goal:** In review before you sleep. ASA campaign ready to fire.

- App Store Connect: fill all metadata (name, subtitle, description, keywords)
- Privacy policy URL (freeprivacypolicy.com — 5 minutes)
- Submit for review
- ASA campaign: 6 exact-match keywords, $20 test budget, $2 max CPT bid
- Set up App Store Connect notifications for review status

---

## App Store Description

### Short description (first 3 lines — visible without expanding)
```
Split bills instantly. No account. No sign-up. Just open and go.

Track who owes you and who you owe — all stored privately on your phone.
```

### Full description
```
SplitEasy is the fastest way to split bills and track debts with friends,
roommates, or anyone you share expenses with.

No account required. No cloud. No one can see your data — ever.

HOW IT WORKS
Add an expense, choose who's involved, split evenly or by custom amount.
SplitEasy remembers every balance and updates in real time. When someone
pays you back, settle up with one tap.

PERFECT FOR
• Splitting dinner, groceries, or rent with roommates
• Tracking who owes you from a group trip
• Keeping tabs on small ongoing debts with friends
• Anyone who's tired of Splitwise's complexity

PRIVACY FIRST
Everything is stored locally on your device. No servers. No tracking.
No account creation. Your financial data is yours alone.

PRO FEATURES
Upgrade to SplitEasy Pro for unlimited groups, full settlement history,
and expense export — one-time purchase or monthly subscription.

Download free. Start splitting in seconds.
```

---

## Paywall Screen Copy

### Headline
```
Go Pro. Stay private.
```

### Subheadline
```
Your data stays on your phone. Always.
```

### Feature list
```
✓ Unlimited groups
✓ Full settlement history
✓ Export expense summaries
✓ Everything stored locally — no cloud
```

### Pricing options

**Monthly (highlighted as "most popular"):**
```
Pro Monthly
$1.99 / month
Cancel anytime
```

**Lifetime:**
```
Pro — One Time
$2.99
Pay once, yours forever
```

**Free tier reminder (bottom, small):**
```
Free version includes 1 group and up to 3 history items.
```

### CTA buttons
```
[Start for $1.99/month]
[Buy once for $2.99]
[Restore purchase]
```

### Legal line (required)
```
Payment charged to your Apple ID. Subscription renews monthly unless
cancelled at least 24 hours before the end of the current period.
```

---

## Next App: Return Deadline Tracker

Park this for after SplitEasy ships. Same playbook:
- Zero dedicated competitors
- High search intent ("when can I return this", "return window tracker")
- Universal pain: everyone has lost money to an expired return window
- Monetize: $0.99–$1.99 one-time purchase
- Core feature: add item + store + return window length → countdown + notification before deadline
- Build time: 2 days

---

*Spec version 1.0 — March 2026*



