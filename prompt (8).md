# Shop Finance Management System — AI Build Prompt (`prompt.md`)

> **Read this entire file before writing any code.** This is the single source of truth for architecture, business logic, security, and build order. Follow the **Loop Engineering Protocol** in Section 12 — build one phase, verify it against its checklist, then move to the next. Do not skip ahead.

---

## 0. Role Instructions for the Build Agent

You are acting simultaneously as four professionals. Every decision must satisfy all four lenses before code is written:

| Role | Responsibility |
|---|---|
| **Senior Software Developer** | Clean architecture, correct state management, no dead code, proper error boundaries, typed data contracts front-to-back |
| **Chartered Accountant (CA)** | Every formula must be accounting-correct, auditable, non-destructive (no hard deletes of financial records), and reconcilable to the rupee |
| **Cyber Security Expert** | Every input is hostile until validated; every financial number must be tamper-evident; every export must not leak more than requested |
| **UI/UX Designer** | Interface must communicate financial truth at a glance — no ambiguity between "cash in hand" vs "profit," color must never contradict meaning (red never means "good") |

If any implementation choice would fail one of these four lenses, stop and redesign — do not proceed with a shortcut.

---

## 1. Project Summary

A **personal shop finance management system** (not billing, not inventory). Single shop owner (with optional staff sub-accounts) manually logs daily cash/online sales, three tiers of expenses, and owner withdrawals. The system derives gross profit, net profit, and true remaining cash/online/business balance in real time, visualizes trends, and answers natural-language questions about the shop's finances via an AI assistant that queries structured data — never raw free-text SQL.

---

## 2. Tech Stack

```
Frontend:      React 18 + Vite + TypeScript + TailwindCSS
State:         Zustand (client state) + TanStack Query (server state/caching)
Charts:        Recharts
Backend:       Node.js + Express + TypeScript
ORM/DB:        Prisma + PostgreSQL (financial data needs ACID transactions — not MongoDB)
Auth:          JWT (short-lived access token) + HttpOnly refresh token cookie
Validation:    Zod (shared schema between frontend and backend)
Caching/Rate-limit: Redis
Query Assistant: Fully local, rule-based intent-matcher + `chrono-node` (free, offline date parsing) — NO external AI API, NO per-query cost, NO model of any kind
PDF Export:    Puppeteer (server-side render) or PDFKit
Excel Export:  ExcelJS
Password hash: bcrypt (cost factor 12)
Monitoring:    pino (structured logs) + Sentry (error tracking)
```

**Why PostgreSQL over MongoDB:** financial ledgers require atomic multi-row transactions (a sale + its cash/online split + dashboard aggregate must commit together or not at all), foreign-key integrity between Sales → Expenses → Withdrawals → Balance, and precise `DECIMAL` arithmetic — Mongo's document model and floating-point defaults are a liability for money.

**Money handling rule:** store all currency as `DECIMAL(12,2)` in Postgres and as integer paise/cents in transit (never raw JS floats) to avoid rounding drift.

---

## 3. Database Schema (Prisma)

```prisma
model Shop {
  id            String   @id @default(cuid())
  name          String
  ownerName     String
  mobile        String   @unique
  email         String?  @unique
  passwordHash  String
  currency      String   @default("INR")
  theme         String   @default("light")
  createdAt     DateTime @default(now())
  users         User[]
  sales         Sale[]
  materialExp   MaterialExpense[]
  shopExp       ShopExpense[]
  miscExp       MiscExpense[]
  withdrawals   Withdrawal[]
  auditLogs     AuditLog[]
}

model User {
  id           String   @id @default(cuid())
  shopId       String
  shop         Shop     @relation(fields: [shopId], references: [id])
  role         Role     @default(OWNER)
  mobile       String   @unique
  passwordHash String
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
}
enum Role { OWNER STAFF }

model Sale {
  id          String    @id @default(cuid())
  shopId      String
  shop        Shop      @relation(fields: [shopId], references: [id])
  type        SaleType  // CASH | ONLINE
  amount      Decimal   @db.Decimal(12,2)
  paymentMethod String? // UPI/Bank/Card — only for ONLINE
  note        String?
  saleDate    DateTime  // business date (not just createdAt)
  createdAt   DateTime  @default(now())
  createdBy   String
  voidedAt    DateTime? // soft-void, never hard delete
  voidReason  String?
  @@index([shopId, saleDate])
}
enum SaleType { CASH ONLINE }

model MaterialExpense {
  id        String   @id @default(cuid())
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id])
  category  String
  amount    Decimal  @db.Decimal(12,2)
  mode      PayMode  // CASH | ONLINE
  note      String?
  expDate   DateTime
  createdAt DateTime @default(now())
  createdBy String
  voidedAt  DateTime?
  voidReason String?
  @@index([shopId, expDate])
}
enum PayMode { CASH ONLINE }

model ShopExpense {
  id        String   @id @default(cuid())
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id])
  category  String   // Rent/Electricity/Internet/Salary/Maintenance/Misc
  mode      PayMode
  amount    Decimal  @db.Decimal(12,2)
  note      String?
  expDate   DateTime
  isRecurring Boolean @default(false)
  createdAt DateTime @default(now())
  createdBy String
  voidedAt  DateTime?
  voidReason String?
  @@index([shopId, expDate])
}

model MiscExpense {
  id        String   @id @default(cuid())
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id])
  name      String
  mode      PayMode
  amount    Decimal  @db.Decimal(12,2)
  note      String?
  expDate   DateTime
  createdAt DateTime @default(now())
  createdBy String
  voidedAt  DateTime?
  voidReason String?
  @@index([shopId, expDate])
}

model Withdrawal {
  id        String   @id @default(cuid())
  shopId    String
  shop      Shop     @relation(fields: [shopId], references: [id])
  mode      PayMode
  amount    Decimal  @db.Decimal(12,2)
  note      String?
  wDate     DateTime
  createdAt DateTime @default(now())
  createdBy String
  voidedAt  DateTime?
  voidReason String?
  @@index([shopId, wDate])
}

// Immutable financial audit trail — every write to money tables logs here
model AuditLog {
  id         String   @id @default(cuid())
  shopId     String
  shop       Shop     @relation(fields: [shopId], references: [id])
  entityType String   // "Sale" | "MaterialExpense" | ...
  entityId   String
  action     String   // CREATE | VOID
  amount     Decimal  @db.Decimal(12,2)
  performedBy String
  ipAddress  String
  createdAt  DateTime @default(now())
  @@index([shopId, createdAt])
}
```

**CA rule baked into the schema:** nothing is ever hard-deleted. Every correction is a `voidedAt` + `voidReason` soft-void, and a **new offsetting entry** is created if needed. This keeps every historical report reproducible and audit-proof — exactly how real bookkeeping corrections work (reversal entries, not erasure).

---

## 4. Core Formulas (single source of truth — implement ONCE in a shared `financeEngine` module, never recompute inline elsewhere)

```
Total Cash Sales    = Σ Sale.amount WHERE type=CASH AND voidedAt IS NULL
Total Online Sales  = Σ Sale.amount WHERE type=ONLINE AND voidedAt IS NULL
Total Sales         = Total Cash Sales + Total Online Sales

Gross Profit        = Total Sales − Total Material Expenses

Net Profit           = Gross Profit − Total Shop Expenses − Total Misc Expenses

Total Withdrawals    = Cash Withdrawals + Online Withdrawals

Remaining Business Balance = Net Profit − Total Withdrawals

Cash Balance   = Cash Sales − Cash Expenses(material+shop+misc) − Cash Withdrawals
Online Balance = Online Sales − Online Expenses(material+shop+misc) − Online Withdrawals
```

**Reconciliation invariant (CA check, must be a unit test):**
```
Cash Balance + Online Balance === Remaining Business Balance
```
If this ever fails in production, it means a mode (cash/online) was mis-tagged somewhere — surface this as a hard error, not a silent rounding fix.

All formulas are date-range parameterized (`from`, `to`) so the same engine powers "today's dashboard," "custom report," and "AI assistant answers" — one function, many callers, zero formula drift.

---

## 5. REST API Contract

```
Auth
POST   /api/auth/signup
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password

Sales
POST   /api/sales                 { type, amount, paymentMethod?, note, saleDate }
GET    /api/sales?from=&to=&type=
PATCH  /api/sales/:id/void        { reason }

Material Expenses
POST   /api/expenses/material
GET    /api/expenses/material?from=&to=&category=
PATCH  /api/expenses/material/:id/void

Shop Expenses      (same pattern)   /api/expenses/shop
Misc Expenses      (same pattern)   /api/expenses/misc
Withdrawals        (same pattern)   /api/withdrawals

Dashboard
GET    /api/dashboard/today
GET    /api/dashboard/summary?range=week|month|year

Reports
GET    /api/reports?from=&to=
GET    /api/reports/export/pdf?from=&to=
GET    /api/reports/export/xlsx?from=&to=

Analytics
GET    /api/analytics/sales-trend?granularity=day|week|month
GET    /api/analytics/expense-breakdown?from=&to=
GET    /api/analytics/profit-trend?from=&to=

AI Assistant
POST   /api/assistant/ask         { question }   // returns natural-language answer + source figures

Settings
GET/PATCH /api/settings/shop
POST   /api/settings/backup
POST   /api/settings/restore
```

Every mutating endpoint requires: `Authorization: Bearer <accessToken>`, CSRF token header, and writes an `AuditLog` row in the same DB transaction as the financial write (never as an afterthought).

---

## 6. Query Assistant — Rule-Based, Zero-API-Cost Design

**No external AI API is used anywhere in this module.** Instead of sending questions to an LLM, the assistant is a deterministic **intent-matcher + template-responder** that runs entirely inside your own Node backend, free forever, with no per-query cost and no prompt-injection surface at all (there is no model to inject into).

### 6.1 How it works — three local, free steps

```
User question (text)
      │
      ▼
[1] Intent Matcher   →  keyword/pattern scoring against a fixed intent table
      │
      ▼
[2] Slot Extractor    →  pulls date-range + category out of the sentence
      │                  (uses the free, local npm package "chrono-node" for
      │                   dates — "this month", "last week", "yesterday" — and
      │                   a simple keyword lookup for categories like "rent",
      │                   "material", "electricity")
      ▼
[3] Answer Composer   →  calls the SAME financeEngine functions from Section 4
                          with the extracted range/category, then fills the
                          numbers into a canned sentence template
      │
      ▼
Natural-language answer + the raw numbers (for the UI to also show as a card)
```

No network call, no API key, no per-token billing, no model — just string matching + your existing database queries. This can run on the cheapest possible server and even offline.

### 6.2 Intent Table (covers every example question from your SRS)

```js
const INTENTS = [
  { id: "TOTAL_SALES",       keywords: ["total sale", "kitni sale", "total bikri"], needsRange: true },
  { id: "CASH_SALES",        keywords: ["cash sale", "cash mein kitna"],            needsRange: true },
  { id: "ONLINE_SALES",      keywords: ["online sale", "online kitna"],             needsRange: true },
  { id: "GROSS_PROFIT",      keywords: ["gross profit"],                           needsRange: true },
  { id: "NET_PROFIT",        keywords: ["net profit", "profit kitna", "munafa"],   needsRange: true },
  { id: "MATERIAL_EXPENSE",  keywords: ["material expense", "material kharch"],   needsRange: true },
  { id: "CATEGORY_EXPENSE",  keywords: ["rent", "electricity", "internet", "bijli"], needsRange: true, needsCategory: true },
  { id: "LAST_RANGE_REPORT", keywords: ["last week", "last month report", "pichhle hafte"] },
  { id: "BEST_MONTH",        keywords: ["highest profit", "best month", "sabse zyada profit"] },
  { id: "AVERAGE_DAILY",     keywords: ["average daily sale", "average sale", "औसत"] },
  { id: "COMPARE_MONTHS",    keywords: ["compare this month", "compare last month"] },
  { id: "CASH_AVAILABLE",    keywords: ["cash available", "kitna cash hai", "cash balance"] },
  { id: "ONLINE_AVAILABLE",  keywords: ["online available", "online balance"] },
  { id: "WITHDRAWN",         keywords: ["withdrawn", "nikala", "withdrawal kitna"], needsRange: true },
  { id: "TOP_INCREASING_CAT",keywords: ["increasing the most", "sabse zyada badha"] },
  { id: "PREDICT_PROFIT",    keywords: ["predict", "expected profit", "anumaan"] },
];
```

Match by scoring: lowercase the question, strip punctuation, count how many of an intent's keywords appear as substrings, pick the highest-scoring intent above a minimum threshold. If nothing scores high enough, respond with: *"Mujhe yeh sawaal samajh nahi aaya — kripya dobara poochein, jaise: 'aaj ka total sale kitna hua?'"* and show 4-5 example questions as tappable chips in the UI (no typing needed — this also protects against the user typing something totally unrelated).

### 6.3 Slot extraction (dates & categories) — still zero-API

- **Dates:** use `chrono-node` (free, open-source npm package, runs 100% locally, no network call) to turn phrases like *"last week," "yesterday," "this month," "July," "pichhle mahine"* into an actual `{from, to}` date range in JS. If no date phrase is found, default range = today.
- **Categories:** simple exact/fuzzy match against your known category list (Rent, Electricity, Internet, Maintenance, Salary, Material sub-categories) — a plain JS array `.includes()` / Levenshtein-distance check, nothing fancy needed.

### 6.4 Answer templates (examples)

```js
const TEMPLATES = {
  TOTAL_SALES:  ({from, to, amount}) => `${labelRange(from,to)} total sale ₹${amount} hua hai.`,
  NET_PROFIT:   ({from, to, amount}) => `${labelRange(from,to)} net profit ₹${amount} raha.`,
  CASH_AVAILABLE: ({amount}) => `Abhi cash mein ₹${amount} available hai.`,
  TOP_INCREASING_CAT: ({category, pct}) => `Sabse zyada badhne wala expense category hai "${category}" — pichhle mahine se ${pct}% zyada.`,
  PREDICT_PROFIT: ({amount}) => `Is mahine ka anumaanit (estimated) profit lagbhag ₹${amount} ho sakta hai, ab tak ke trend ke aadhar par.`,
  // ...one template per intent, bilingual (Hindi-English mix, matching how you naturally ask)
};
```

### 6.5 The two "smart-sounding" features, done without any ML

- **`COMPARE_MONTHS` / `BEST_MONTH`:** just SQL `GROUP BY` on month + `ORDER BY net_profit DESC` — pure arithmetic, no AI needed, feels smart to the user anyway.
- **`PREDICT_PROFIT`:** a simple linear projection —
  ```
  estimatedMonthProfit = (netProfitSoFarThisMonth / daysElapsedThisMonth) × totalDaysInMonth
  ```
  This is basic arithmetic (a CA would recognize it as a straight-line run-rate projection), not a forecasting model — cheap, instant, and transparent about being an estimate (always phrase it as "anumaanit / estimated," never as a guarantee).
- **`TOP_INCREASING_CAT`:** compare this month's per-category totals to last month's, compute `%` change per category, return the one with the highest positive delta.

### 6.6 Why this is actually a good fit for your app (not just a cost workaround)

- **$0 forever** — no API key, no per-query billing, no risk of a surprise bill if usage spikes.
- **No prompt-injection attack surface** — there's no model to manipulate; worst case is an unmatched question gets the fallback message.
- **Fully offline-capable** — works even if the shop's internet is patchy, since it's just your own database + your own code.
- **Deterministic & auditable** — a CA-lens benefit: every answer traces to an exact SQL aggregation, never a model's "best guess" at your numbers.
- **Trade-off to accept:** it only answers questions matching the intent table — it cannot have an open-ended conversation the way an LLM could. Mitigate this with tappable example-question chips in the UI so the owner rarely has to free-type a question that misses.
- **Room to grow later:** if you ever do want free-form natural language, the exact same `financeEngine` functions from Section 4 become the "tools" an LLM could call — this design doesn't box you out of upgrading, it just doesn't require it today.

---

## 7. Frontend Structure

```
src/
  pages/
    Login.tsx, Signup.tsx, ForgotPassword.tsx
    Dashboard.tsx
    Sales.tsx
    Expenses/Material.tsx  Expenses/Shop.tsx  Expenses/Misc.tsx
    Withdrawals.tsx
    Reports.tsx
    Analytics.tsx
    Assistant.tsx
    Settings.tsx
  components/
    dashboard/  SalesSummaryCard, ProfitSummaryCard, BalanceWidget, TrendChart
    forms/      SaleEntryForm, ExpenseEntryForm, WithdrawalForm  (all Zod-validated, shared schema with backend)
    reports/    ReportFilterBar, ExportButtons, ReportTable
    shared/     ConfirmVoidDialog, DateRangePicker, CurrencyInput, EmptyState
  stores/       useAuthStore, useShopStore  (Zustand)
  api/          typed API client (one function per endpoint, all typed with shared Zod schemas)
  lib/          financeFormatters.ts (currency/date display), financeEngine types (mirrors backend)
```

**Critical UI rule (CA + UX lens combined):** Cash-in-hand, Online balance, Gross Profit, and Net Profit must **never share the same color** on the dashboard — a shop owner glancing quickly must not confuse "money I can spend right now" with "profit on paper." Suggested semantic mapping:
- Cash Balance → deep teal
- Online Balance → indigo
- Gross Profit → slate (neutral, it's an intermediate figure)
- Net Profit → forest green (only when positive; deep amber-red when negative — this is the one place red legitimately means "loss")

---

## 8. Design System

```css
:root {
  --color-primary: #0F766E;      /* teal — trust, cash */
  --color-secondary: #4338CA;    /* indigo — online/digital */
  --color-profit-positive: #15803D;
  --color-profit-negative: #B91C1C;
  --color-neutral-text: #1E293B;
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-border: #E2E8F0;
  --color-warning: #D97706;
}
```
- Typography: **Inter** or **IBM Plex Sans** — a financial app must read as precise, not decorative.
- Numbers are always right-aligned in tables, tabular-nums font-feature enabled, ₹ symbol consistent placement.
- Dark theme is a genuine second theme (not just inverted grays) — toggle in Settings, but light is default since this is a daytime, at-the-counter tool.
- No skeuomorphic "cash register" clichés — clean data-dashboard aesthetic (think Stripe Dashboard, not a game UI).

---

## 9. Security — Full Threat-Model Checklist

### 9.1 Authentication & Session
- [ ] Passwords hashed with **bcrypt, cost 12**; never logged, never returned in any API response
- [ ] JWT access token: 15-minute expiry, signed with rotating secret (env-managed)
- [ ] Refresh token: HttpOnly, Secure, SameSite=Strict cookie, 7-day expiry, rotated on every use (refresh token reuse detection → force logout all sessions)
- [ ] Rate-limit login attempts: 5 attempts / 15 min per mobile+IP combo, exponential backoff, then temporary lockout
- [ ] Optional PIN/biometric app-lock on frontend (WebAuthn where available) for re-entry after backgrounding

### 9.2 Input Validation & Injection Defense
- [ ] Every request body validated with Zod **before** touching the database — reject unknown fields
- [ ] All DB access through Prisma's parameterized queries — never raw string-concatenated SQL
- [ ] Amount fields validated as positive decimals with max 2 decimal places and a sane upper bound (reject absurd values like 10^15)
- [ ] Date fields validated as real dates within shop's operating history — reject future-dated sales beyond a small buffer

### 9.3 Query Assistant Specific
- [ ] Intent matcher and slot extractor run fully server-side, in-process — no third-party API call ever leaves the server for this feature
- [ ] `shopId` always taken from the authenticated session, never accepted from the question text or any client-supplied field
- [ ] Question text is validated for length (e.g. max 300 chars) before matching, to prevent abuse of the string-matching step with huge payloads
- [ ] Sanitize/escape the raw question text before storing it in logs (defense against log injection), even though there's no model to "inject" into
- [ ] Rate-limit query submissions per shop (e.g. 60/hour) purely as a basic abuse/DoS guard, not a cost guard (there is no per-query cost)

### 9.4 Data Protection
- [ ] TLS 1.2+ enforced everywhere (HSTS header)
- [ ] Database encryption at rest (managed Postgres provider's disk encryption, e.g. RDS/Cloud SQL)
- [ ] Backups encrypted at rest and in transit; backup restore requires re-authentication
- [ ] PII (mobile, email) never included in AI assistant prompts sent to the model — only aggregated financial numbers

### 9.5 Application Hardening
- [ ] `helmet` middleware for security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [ ] CSRF token required on all state-changing requests (double-submit cookie pattern)
- [ ] CORS locked to the app's own frontend origin only — no wildcard
- [ ] Global rate limiting (Redis-backed) per IP and per authenticated user, tuned per endpoint (auth endpoints stricter than reads)
- [ ] Request body size limits to prevent DoS via huge payloads
- [ ] Dependency vulnerability scanning in CI (npm audit / Snyk) on every build
- [ ] No sensitive data (tokens, passwords) ever in query strings or client-side logs

### 9.6 Authorization / RBAC
- [ ] `OWNER` vs `STAFF` roles enforced server-side on every endpoint (staff cannot void entries or export reports unless explicitly permitted, cannot change Settings)
- [ ] Every write checks `shopId` ownership — a user can never read or write another shop's data even with a guessed ID (IDOR prevention via mandatory shopId scoping on every Prisma query)

### 9.7 Audit & Non-Repudiation
- [ ] Every CREATE/VOID on a financial record writes an immutable `AuditLog` row (who, when, from what IP, old vs new state)
- [ ] Void operations require a mandatory reason string — never a silent delete
- [ ] Admin/owner can view a full audit trail per record from the UI

### 9.8 Export Security
- [ ] PDF/Excel generation happens server-side in a sandboxed render (no arbitrary HTML injection into Puppeteer from user-controlled fields — escape all note/category text)
- [ ] Exported files scoped strictly to the requested date range and the requesting shop — verified server-side, not just trusted from query params

### 9.9 Monitoring
- [ ] Structured logging (pino) with request IDs; errors sent to Sentry with PII scrubbing
- [ ] Alert on anomalies: sudden spike in withdrawals, repeated failed logins, unusual AI-query volume

---

## 10. Reports & Export

- Filters: Today / Yesterday / This Week / This Month / This Year / Custom Range — all computed against `saleDate`/`expDate`/`wDate`, not `createdAt` (a shop owner may log yesterday's sale today).
- PDF export via server-side Puppeteer rendering a print-styled HTML template → includes shop name, period, all summaries, embedded chart images (rendered server-side with a headless chart library, not client screenshots), and generation timestamp.
- Excel export via ExcelJS with separate sheets: Sales, Material Expenses, Shop Expenses, Misc Expenses, Withdrawals, Summary — formulas embedded as real Excel formulas where practical so the owner can audit in Excel too.

---

## 11. Notifications & Recurring Expenses

- Daily reminder (push/local notification) if no sale entry logged by a configurable time (e.g. 9 PM)
- Recurring Shop Expenses (rent, electricity, internet) auto-drafted monthly as a **pending confirmation**, never auto-posted silently — owner must confirm amount before it becomes a real ledger entry (protects against stale auto-fill amounts).

---

## 12. Loop Engineering Protocol — Five-Phase Build Order

Build strictly in this order. After each phase, run its checklist before starting the next. Do not build Phase 3 UI against a Phase 2 API that hasn't been verified.

**Phase 1 — Foundation**
- Prisma schema + migrations, Postgres running
- Auth (signup/login/refresh/logout) with bcrypt + JWT, rate limiting on auth routes
- Base Express app with helmet, CORS, error handler, audit log middleware
- ✅ Checklist: can create a shop, log in, get a valid access token, refresh works, wrong password is rate-limited

**Phase 2 — Core Financial Modules**
- Sales, Material/Shop/Misc Expense, Withdrawal CRUD (create + void, no hard delete)
- `financeEngine` module implementing Section 4 formulas with date-range params
- Reconciliation invariant unit test passing
- ✅ Checklist: enter a sale, an expense, a withdrawal → dashboard numbers match hand-calculated expectation exactly

**Phase 3 — Dashboard & Analytics**
- Dashboard API + widgets + charts (Recharts)
- Analytics endpoints and trend charts
- ✅ Checklist: dashboard updates in real time after each entry; charts render correctly for empty-data and heavy-data cases

**Phase 4 — Reports & Export**
- Report filters, PDF export, Excel export
- ✅ Checklist: exported PDF/Excel numbers match the on-screen report exactly for 3 different date ranges

**Phase 5 — Query Assistant, Notifications, Security Hardening & Polish**
- Rule-based query assistant: intent table, `chrono-node` date parsing, answer templates (Section 6)
- Notifications, recurring expense drafts
- Full pass through Section 9 security checklist — every box checked, not assumed
- Dark theme, empty states, loading states, error boundaries
- ✅ Checklist: every item in Section 9 is verifiably true in the running app, not just planned; ask 15 sample questions from Section 12.5 of the SRS and confirm each gets a correct, correctly-worded answer

---

## 13. Definition of Done

The build is not complete until:
1. The reconciliation invariant (`Cash + Online = Business Balance`) holds for every test dataset, including one with voided entries.
2. No financial record can ever be hard-deleted from the UI or API.
3. Every security checklist item in Section 9 is checked off against the actual running code, not just the design.
4. The query assistant only ever answers via the exact `financeEngine` functions from Section 4, scoped to the authenticated shop — verified by confirming an unmatched or malformed question always returns the safe fallback message and example chips, never an error stack trace or another shop's data.
5. A shop owner with zero technical background can look at the dashboard for 5 seconds and correctly state how much cash they can currently spend.
