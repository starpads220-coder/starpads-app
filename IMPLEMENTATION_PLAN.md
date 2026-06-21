# Implementation Plan: Cross-Screen Feature Enhancements

---

## 1. TASK

**Primary Objective:** Implement 5 cross-screen feature enhancements across the Production, Storage, Sales, Expenses, and Employees screens in the Starpads web application.

**Secondary Objectives:**
- Reuse existing UI patterns (time window filter from Payments screen, role-based visibility) to maintain code consistency
- Add new Firestore collection for sales targets
- Ensure all role-based access control is enforced without breaking existing navigation flows

**Definition of Done:**
- All 5 screens have their requested changes implemented and working
- No existing functionality is broken (analytics cards, forms, tables, PDF reports)
- Role-based tab visibility (Storage: Stock Out hidden for production supervisors) works correctly
- Time filters on Production, Sales, and Expenses screens filter data accurately
- Deactivated employees are excluded from production entry dropdown but remain visible on employees screen
- TypeScript compiles with no new errors
- App builds successfully (`npm run build`)

---

## 2. CONTEXT

### Project / App Overview
Starpads is a Next.js web application for managing a sanitary pad manufacturing business. It handles production tracking (multi-stage manufacturing), payments, storage/inventory, sales, expenses, and employee management. Users include Admins and Production Supervisors (plus other roles).

### Tech Stack
```
- Next.js 16.2.9 (App Router)
- React 19.2.4
- TypeScript 5.x
- Tailwind CSS 3.4
- Firebase v10 (Firestore, Auth)
- @tanstack/react-query (via use-firestore-query hook)
- Recharts v2.15 (charting library)
- @react-pdf/renderer v4 (PDF report generation)
- date-fns v4
```

### Files Involved

| File | Action |
|------|--------|
| `src/app/production/page.tsx` | MODIFY — add time window filter |
| `src/app/storage/page.tsx` | MODIFY — hide Stock Out tab for non-admin |
| `src/app/sales/page.tsx` | MODIFY — add sales targets card + time filter |
| `src/app/expenses/page.tsx` | MODIFY — add time filter for analytics |
| `src/app/admin/employees/page.tsx` | MODIFY — verify/refine deactivation flow + supervisor access |
| `src/types/index.ts` | MODIFY — add `SalesTarget` interface |
| `src/lib/permissions.ts` | READ-ONLY reference (no change needed) |
| `src/lib/auth-context.tsx` | READ-ONLY reference (no change needed) |
| `src/components/ui/ChartCard.tsx` | READ-ONLY reference (existing pattern) |
| `src/components/reports/PeriodSelector.tsx` | READ-ONLY reference (existing pattern for PeriodSelection type) |

### Current Behavior (per screen)

| Screen | Current Behavior |
|--------|-----------------|
| **Production** | Shows "Production" heading with no time filter. Analytics cards show only today's data (hardcoded). |
| **Storage** | 5 tabs always visible: dashboard, stock-in, stock-out, wip, analytics. No role-based tab hiding. |
| **Sales** | Dashboard has charts, calendar, and entry form. No time filter on analytics. No sales targets card. |
| **Expenses** | Analytics cards show today/week/month totals with no user-selectable time filter. |
| **Employees** | Soft deactivation exists (isActive toggle). Supervisors can access and add employees. Department filtered for supervisors. |

### Expected Behavior (after changes)

| Screen | Expected Behavior |
|--------|-----------------|
| **Production** | Time window filter (Today/Week/Month) in header row, right-aligned. Analytics cards filter by selected period. |
| **Storage** | "Stock Out" tab hidden for PRODUCTION_SUPERVISOR. Active tab cannot switch to stock-out for supervisor. |
| **Sales** | New Sales Targets card below charts (monthly/quarterly/6months/annual entry form). Time period filter above charts (Last Week, Last Month, Last 12 Months, Custom). |
| **Expenses** | Time period filter added at top. All existing analytics cards maintained but data filters by selected period. |
| **Employees** | Deactivated employees: records preserved, excluded from production dropdown, reactivation button works. Supervisor full access verified. |

### Environment
- Next.js 16.2.9 dev server (`npm run dev`)
- Firebase emulator or production Firestore
- Browser: Chrome/Firefox latest

---

## 3. ISSUES

### [FEATURE] Production screen lacks analytics time filter
- **Symptom:** Users cannot view production analytics for "This Week" or "This Month" — only today's data is shown
- **Root cause:** Production screen queries only `date === today`, no time window selector
- **Impact:** UX degradation — users must manually interpret limited data
- **Affected scope:** All production screen users

### [FEATURE] Storage screen "Stock Out" tab visible to non-admin users
- **Symptom:** Production supervisors see the "Stock Out" tab which is an admin-only function
- **Root cause:** No role-based conditional rendering on tab buttons
- **Impact:** Security — unauthorized users see UI for operations they should not perform
- **Affected scope:** PRODUCTION_SUPERVISOR users viewing storage screen

### [FEATURE] Sales screen has no target-setting or time filter
- **Symptom:** Users cannot set sales targets or filter analytics by custom time periods
- **Root cause:** Missing target entry UI and time period filter component
- **Impact:** Missing business requirement — management needs target tracking and custom period analysis
- **Affected scope:** All sales screen users

### [FEATURE] Expenses screen has no configurable time filter
- **Symptom:** Analytics cards hardcoded to today/week/month with no user control over the analysis period
- **Root cause:** No period selector wired to the analytics data pipeline
- **Impact:** UX degradation — users cannot view expenses for arbitrary periods
- **Affected scope:** All expenses screen users

### [FEATURE] Employee deactivation flow needs refinement
- **Symptom:** Employees screen already has isActive toggle and deactivation/re-activation but the complete flow needs verification: deactivated employees should not appear in production entry dropdown, and reactivation must work cleanly
- **Root cause:** Mostly already implemented; needs verification and potential edge-case hardening
- **Impact:** Medium — existing logic is partially in place but needs verification
- **Affected scope:** Admin and supervisor users on employees and production screens

---

## 4. REQUEST

### Deliverable(s)

1. **Modified:** `src/app/production/page.tsx` — Add time window filter
2. **Modified:** `src/app/storage/page.tsx` — Conditionally hide Stock Out tab
3. **Modified:** `src/app/sales/page.tsx` — Add sales targets card + time filter
4. **Modified:** `src/app/expenses/page.tsx` — Add time filter
5. **Modified:** `src/app/admin/employees/page.tsx` — Verify/refine deactivation flow
6. **Modified:** `src/types/index.ts` — Add `SalesTarget` interface

### Functional Requirements

**Production Screen:**
- [ ] Add Today/Week/Month filter buttons in the header row, right-aligned next to the "Production" heading
- [ ] Clone the `getDateBounds`, `timeWindow` state, and `handleWindowChange` pattern from the Payments screen
- [ ] Query production entries dynamically based on selected time window (currently hardcoded to today)
- [ ] All existing analytics cards must re-filter by the selected window

**Storage Screen:**
- [ ] Import `useAuth` to access `userRole`
- [ ] When building tab buttons, exclude "stock-out" for `PRODUCTION_SUPERVISOR` role
- [ ] If activeTab is "stock-out" and user is supervisor, reset to "dashboard"

**Sales Screen:**
- [ ] Add a new "Sales Targets" card/section below the dashboard charts
- [ ] Target types: monthly, quarterly, 6months, annual
- [ ] Form fields: target type, target amount (UGX), period reference (month/year), optional description
- [ ] Store targets in new `salesTargets` Firestore collection
- [ ] Add time period filter (Last Week, Last Month, Last 12 Months, Custom) controlling the analytics data
- [ ] Filter applies to the `SalesCharts` component data

**Expenses Screen:**
- [ ] Add time period filter (Last Week, Last Month, Last 12 Months, Custom) at top of analytics section
- [ ] Maintain all existing analytics cards (Today, This Week, This Month, charts, category summary)
- [ ] Data for all cards re-filters based on selected period
- [ ] Default to "This Month"

**Employees Screen:**
- [ ] Verify `handleToggleActive` correctly sets `isActive: false` (soft delete)
- [ ] Verify deactivated employees show "Inactive" badge and "Activate" button
- [ ] Verify production screen query (`where("isActive", "==", true)`) excludes deactivated employees
- [ ] Verify supervisor can access `/admin/employees` and see only their department's employees
- [ ] Verify supervisor can add employees (already works — ensure Add Employee button is visible for supervisors)

### What NOT to change
- Do not modify the `RouteGuard`, `useAuth`, `auth-context`, or `permissions.ts` files
- Do not modify the PDF report generation logic
- Do not modify chart components in `src/components/charts/`
- Do not modify the `PeriodSelector` component in `src/components/reports/`
- Do not modify the Payments screen or its queries

---

## 5. CONSTRAINTS & RULES

### Coding Standards
- Follow existing naming conventions: camelCase for variables, PascalCase for components/types
- Use TypeScript strict mode — no `any` types
- No inline styles — use Tailwind utility classes
- All async operations must handle loading, success, and error states
- No `console.log` in production code

### Architecture Rules
- Business logic stays in hooks/services, not UI components
- Side effects managed in `useEffect` with proper cleanup
- No new global state — use existing `useAuth` context for role data
- New types go in `src/types/index.ts`
- Filter components should follow the existing button-group pattern from Payments screen

### Compatibility
- Must support Next.js 16.2.9 + React 19.2.4
- Must not break existing navigation flows
- All existing Firestore queries must remain unchanged unless explicitly modified

### Security
- Role-based UI hiding (Stock Out tab) is enforcement via conditional render
- Validate all user inputs before Firestore writes
- Do not expose API keys or secrets

### Performance
- Use `useMemo` for filtered/computed data derived from time window
- Avoid unnecessary re-renders — memoize callbacks with `useCallback` where appropriate

---

## 6. TECHNICAL DEEP-DIVE

### Data Flow for Production Time Filter

```
User clicks "This Week" button
  → setTimeWindow("week")
  → getDateBounds("week") returns { start: "2026-06-14", end: "2026-06-20" }
  → filteredEntries derived via useMemo: entries.filter(e => e.date >= start && e.date <= end)
  → All analytics cards react to filteredEntries changes
```

### State Shape (production page additions)
```typescript
type TimeWindow = "today" | "week" | "month";
const [timeWindow, setTimeWindow] = useState<TimeWindow>("today");
// getDateBounds function (exact copy from payments page)
```

### Storage Tab Visibility Logic
```typescript
const { userRole } = useAuth();
const isAdmin = userRole?.role === "ADMIN";
const isSupervisor = userRole?.role === "PRODUCTION_SUPERVISOR";

// Tab definitions filtered by role:
const tabs = useMemo(() => {
  const allTabs = ["dashboard", "stock-in", "stock-out", "wip", "analytics"] as const;
  if (isSupervisor) return allTabs.filter(t => t !== "stock-out");
  return allTabs;
}, [isSupervisor]);

// Reset active tab if current tab is now hidden:
useEffect(() => {
  if (isSupervisor && activeTab === "stock-out") setActiveTab("dashboard");
}, [isSupervisor, activeTab]);
```

### Sales Targets Data Model (new)
```typescript
interface SalesTarget {
  id: string;
  targetType: "MONTHLY" | "QUARTERLY" | "SIX_MONTHS" | "ANNUAL";
  targetAmount: number;
  periodReference: string; // "2026-06" for monthly, "2026-Q2" for quarterly, "2026" for annual
  description: string;
  createdAt: Timestamp;
  createdBy: string;
}
```

### Time Period Filter for Sales & Expenses
```typescript
type AnalyticsPeriod = "week" | "month" | "12months" | "custom";

interface PeriodFilterValue {
  period: AnalyticsPeriod;
  startDate: string;
  endDate: string;
}
```

### Employee Deactivation Flow (verify existing)
```
Employees page: isActive toggle → updateDoc sets isActive: false
  → Production page query: where("isActive", "==", true) → employee excluded
  → Employees page: shows "Inactive" badge, "Activate" button available
  → Clicking "Activate" → updateDoc sets isActive: true → employee reappears in production dropdown
```

### Known Patterns to Reuse
- Payments screen `getDateBounds`, `TimeWindow` type, filter button group (Payments page lines 34-47, 378-390)
- Employees screen `isSupervisor`, `supervisorDepartment`, `availableDepartments` patterns
- `useCollectionQuery` pattern for Firestore reads
- `addDoc` pattern for Firestore writes

---

## 7. EXEMPLAR

### Reference Pattern: Time Window Filter (from Payments page)
```typescript
// src/app/payments/page.tsx lines 34-47, 378-390
type TimeWindow = "today" | "week" | "month";

function getDateBounds(window: TimeWindow) {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  if (window === "today") return { start: todayStr, end: todayStr };
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekStartStr = weekStart.toISOString().split("T")[0];
  if (window === "week") return { start: weekStartStr, end: todayStr };
  const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return { start: monthStartStr, end: todayStr };
}

// In JSX:
<div className="flex gap-1 bg-gray-100 rounded-lg p-1">
  {(["today", "week", "month"] as const).map((tw) => (
    <button key={tw} onClick={() => handleWindowChange(tw)}
      className={`px-3 py-1.5 text-sm font-medium rounded-md ${
        timeWindow === tw ? "bg-white shadow-sm text-gray-900" : "text-gray-500"
      }`}>
      {tw === "today" ? "Today" : tw === "week" ? "This Week" : "This Month"}
    </button>
  ))}
</div>
```

### Reference Pattern: Role-Based Tab Conditional (to be created in Storage)
```typescript
// Pattern to follow — conditionally filter tab array based on role
const tabs = useMemo(() => {
  return (["dashboard", "stock-in", "stock-out", "wip", "analytics"] as const)
    .filter(t => !(isSupervisor && t === "stock-out"));
}, [isSupervisor]);
```

---

## 8. EDGE CASES & ERROR HANDLING

### Production Time Filter
- No entries for selected period → analytics cards show zero values (existing empty states handle this)
- Date boundary: Week filter starts on Sunday → ensure correct ISO date handling
- Month filter: `monthStartStr` uses first day of current month at 00:00:00 UTC

### Storage Tab Hiding
- Supervisor already has "stock-out" as activeTab when tab is hidden → useEffect resets to "dashboard"
- URL state? Not persisted in URL, so no issue
- Supervisor role changes while on page → useEffect handles reset

### Sales Targets
- Duplicate target submission → disable submit button while saving
- Invalid target amount (negative/zero) → enforce `min={0}` on input
- Period reference validation → validate format before write
- Empty targets list → show "No targets configured" empty state

### Expenses Time Filter
- No expenses in selected period → charts show empty states (existing pattern: "No data", "No expenses recorded")
- Custom period with start > end → swap dates or show validation error
- Very large custom range (spanning years) → Firestore query handles via date comparison

### Employee Deactivation
- Deactivated employee has existing production entries → entries remain, employee name resolves from Firestore doc
- Reactivating → employee reappears in production dropdown immediately (real-time listener)
- Production form pre-filled with deactivated employee ID → edge case not possible since dropdown only shows active employees
- Supervisor deactivating employee from another department → prevented by visibleEmployees filter

---

## 9. TESTING REQUIREMENTS

### Manual QA Checklist
- [ ] **Production:** Time filter buttons render correctly; switching between Today/Week/Month updates all analytics cards
- [ ] **Production:** Entries table reflects selected time window
- [ ] **Storage:** Logged in as PRODUCTION_SUPERVISOR → "Stock Out" tab not visible
- [ ] **Storage:** Logged in as ADMIN → all 5 tabs visible including "Stock Out"
- [ ] **Storage:** If supervisor somehow had stock-out tab selected (e.g., by state persistence bug), it resets to dashboard
- [ ] **Sales:** New Sales Targets card renders below charts
- [ ] **Sales:** Target entry form submits to Firestore successfully
- [ ] **Sales:** Time period filter (Week/Month/12 Months/Custom) updates chart data
- [ ] **Expenses:** Time period filter renders at top, defaults to "This Month"
- [ ] **Expenses:** All existing analytics cards re-filter by selected period
- [ ] **Employees:** Deactivate an employee → shows "Inactive" badge, "Activate" button appears
- [ ] **Employees:** Deactivated employee does NOT appear in production entry worker dropdown
- [ ] **Employees:** Reactivate employee → reappears in production dropdown
- [ ] **Employees:** Logged in as supervisor → only PRODUCTION department employees visible
- [ ] **Employees:** Logged in as supervisor → can add new employees (Add Employee button visible)

---

## 10. PERSONA

You are a Senior Next.js + TypeScript + Firebase Engineer with 5+ years of production experience building full-stack web applications. You specialize in Firestore data modeling, role-based access control, real-time data synchronization, and scalable component architectures. You write code that is:
- **Production-ready:** handles loading, empty, error, and edge case states
- **Defensively typed:** TypeScript strict, no implicit any
- **Maintainable:** follows existing codebase patterns precisely
- **Performant:** memoizes derived data, avoids unnecessary re-renders
- **Tested:** writes code that is easy to manually verify

You do not write placeholder comments. You implement the thing.

---

## 11. OUTPUT FORMAT

**Primary Deliverable Format:** `Step-by-step implementation` — one screen at a time, with exact code changes and rationale.

**Supplementary Output:**
After implementation, provide:
1. **CHANGE LOG** — Bullet-point summary of every change made and why
2. **RISK FLAGS** — Any assumptions or edge cases that could break
3. **FOLLOW-UP TASKS** — What should be done next (out of scope)

**Code Quality Standards:**
- No dead code, no commented-out blocks
- Follow the existing file's import order and grouping conventions
- Max function length: ~40 lines; extract helpers if longer

---

## 12. TONE

Professional, concise, and engineering-focused. No filler phrases. No over-explanation of basics. Surface risks proactively. Treat this as a code review + implementation.

---

## 13. IMPLEMENTATION ORDER

The screens will be implemented in the following order:

1. **Types** — Add `SalesTarget` interface
2. **Production Screen** — Add time window filter (simplest, direct pattern clone)
3. **Storage Screen** — Role-based tab hiding (targeted change)
4. **Employees Screen** — Verify/refine deactivation flow (verify existing logic)
5. **Expenses Screen** — Add time period filter
6. **Sales Screen** — Add targets card + time filter (most complex, saved for last)
