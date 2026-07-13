# Implementation Plan: Rename Packing, Fix NSSF/PAYEE Cards, Fix Move-to-Stock

---

## 1. TASK

**Primary Objective:** Resolve three issues across the Starpads application:

1. **Rename "Packing" to "Packaging"** — Rename the STG-08 stage label everywhere it appears as a user-facing string (production page, storage page, PDF reports, seed data, migration route, types).
2. **Fix NSSF & PAYEE Cards on Worker Payment Detail Page** — The NSSF and PAYEE cards on `/payments/worker/[id]` currently only show data from already-processed payment records. They need to live-calculate NSSF and PAYEE from the employee's production entries for the selected time period, matching the logic used on the main payments screen.
3. **Fix "Move Packaged Goods to Stock" Flow** — The redirect from the production page to the storage page's stock-in form is not working correctly. The `batchRef` from the URL params is a Firestore document ID, but the stock-in form's batch `<select>` only shows ACTIVE batches. If the batch becomes COMPLETE during the process or if there's a timing issue, the pre-filled value won't match any option. Additionally, the `packSize` is not pre-filled, requiring manual adjustment.

**Definition of Done:**
- All user-facing "Packing" labels are changed to "Packaging"
- NSSF and PAYEE cards on the worker payment detail page show live-calculated values based on the selected time period
- "Move to Stock" button correctly redirects to storage with pre-filled form that the user can submit
- TypeScript compiles with no new errors
- App builds successfully (`npm run build`)

---

## 2. CONTEXT

### Project / App Overview
Starpads is a Next.js web application for managing a sanitary pad manufacturing business. It handles production tracking (multi-stage manufacturing), payments, storage/inventory, sales, expenses, and employee management.

### Tech Stack
```
- Next.js 16.2.9 (App Router)
- React 19.2.4
- TypeScript 5.x
- Tailwind CSS 3.4
- Firebase v10 (Firestore, Auth)
- @tanstack/react-query (via use-firestore-query hook)
- Recharts v2.15
- @react-pdf/renderer v4
```

### Files Involved

| File | Action |
|------|--------|
| `src/types/index.ts` | MODIFY — rename `"Packing"` to `"Packaging"` in `STAGE_LABELS` (line 217) |
| `src/components/reports/ProductionReportPDF.tsx` | MODIFY — rename `"Packing"` to `"Packaging"` in local `STAGE_LABELS` (line 109) |
| `scripts/seed.ts` | MODIFY — rename `name: "Packing"` to `name: "Packaging"` (line 35) |
| `src/app/api/migrate-packing-stage/route.ts` | MODIFY — rename all 6 occurrences of `"Packing"` to `"Packaging"` (lines 19, 28, 31, 41, 51, 54) |
| `src/app/production/page.tsx` | MODIFY — rename chart label `"Pack"` to `"Packaging"`, subtitle `"Packing stage"` to `"Packaging stage"`, description text `"packing"` to `"packaging"` (lines 352, 568, 1035) |
| `src/app/storage/page.tsx` | MODIFY — rename `"awaiting packing"` to `"awaiting packaging"`, `"Packed"` to `"Packaged"` (lines 613, 625) |
| `src/app/payments/worker/[id]/page.tsx` | MODIFY — add live NSSF/PAYEE calculation from production entries with time period filter |
| `src/lib/deductions.ts` | READ-ONLY — already has `computeNssfEmployee`, `computeNssfBusiness`, `computePayeeTax` |
| `src/app/production/page.tsx` | MODIFY — fix Move-to-Stock redirect to also pass all ACTIVE batches for the dropdown |
| `src/app/storage/page.tsx` | MODIFY — ensure batch dropdown shows all batches (not just ACTIVE) when pre-filled from Move-to-Stock redirect, fix batchRef pre-fill |

### Current Behavior

| Issue | Current Behavior |
|-------|-----------------|
| **Rename** | Stage STG-08 is labeled "Packing" in 7 files (15 string occurrences) |
| **NSSF/PAYEE** | Worker payment detail page NSSF/PAYEE cards only aggregate from `filteredPayments` (stored payment records). No live calculation from production entries for the selected time period. |
| **Move-to-Stock** | Production page redirects to `/storage?tab=stock-in&date=...&quantity=...&batchRef=...&entryId=...`. Storage page reads URL params and pre-fills form. But: (a) batch dropdown only shows ACTIVE batches so a COMPLETE batch won't match, (b) `packSize` not pre-filled. |

### Expected Behavior (after changes)

| Issue | Expected Behavior |
|-------|-----------------|
| **Rename** | All user-facing labels show "Packaging" instead of "Packing". Chart label shows "Packaging" (or "Packag." if truncated). |
| **NSSF/PAYEE** | Worker payment detail page NSSF/PAYEE cards calculate NSSF (5% employee, 10% business) and PAYEE (progressive tax) from the employee's `dueAmount + paidAmount` for the selected time period, matching the main payments screen logic. |
| **Move-to-Stock** | "Move to Stock" button redirects to storage page with all form fields pre-filled (date, quantity, batch, packSize). Batch dropdown includes all batches (not just ACTIVE) when accessed via Move-to-Stock redirect so the pre-filled batchRef always matches. |

---

## 3. ISSUES

### [ISSUE-1] Rename "Packing" to "Packaging"

- **Symptom:** The STG-08 stage is labeled "Packing" throughout the application
- **Root cause:** Hardcoded string "Packing" in 7 files
- **Impact:** Naming inconsistency — the business wants it called "Packaging"
- **Affected scope:** All screens that reference STG-08 by name

**Files and exact lines to change:**

| # | File | Line | Current | New |
|---|------|------|---------|-----|
| 1 | `src/types/index.ts` | 217 | `"STG-08": "Packing"` | `"STG-08": "Packaging"` |
| 2 | `src/components/reports/ProductionReportPDF.tsx` | 109 | `"STG-08": "Packing"` | `"STG-08": "Packaging"` |
| 3 | `scripts/seed.ts` | 35 | `name: "Packing"` | `name: "Packaging"` |
| 4 | `src/app/api/migrate-packing-stage/route.ts` | 19 | `name: "Packing"` | `name: "Packaging"` |
| 5 | `src/app/api/migrate-packing-stage/route.ts` | 28 | `"Packing stage (STG-08) updated successfully"` | `"Packaging stage (STG-08) updated successfully"` |
| 6 | `src/app/api/migrate-packing-stage/route.ts` | 31 | `name: "Packing"` | `name: "Packaging"` |
| 7 | `src/app/api/migrate-packing-stage/route.ts` | 41 | `name: "Packing"` | `name: "Packaging"` |
| 8 | `src/app/api/migrate-packing-stage/route.ts` | 51 | `"Packing stage (STG-08) created successfully"` | `"Packaging stage (STG-08) created successfully"` |
| 9 | `src/app/api/migrate-packing-stage/route.ts` | 54 | `name: "Packing"` | `"Packaging"` |
| 10 | `src/app/production/page.tsx` | 352 | `"STG-08": "Pack"` | `"STG-08": "Packaging"` |
| 11 | `src/app/production/page.tsx` | 568 | `subtitle="Packing stage (STG-08)"` | `subtitle="Packaging stage (STG-08)"` |
| 12 | `src/app/production/page.tsx` | 1035 | `"Today's packing (STG-08) entries..."` | `"Today's packaging (STG-08) entries..."` |
| 13 | `src/app/storage/page.tsx` | 613 | `subtitle="STG-07 awaiting packing"` | `subtitle="STG-07 awaiting packaging"` |
| 14 | `src/app/storage/page.tsx` | 625 | `title="Packed" subtitle="STG-08 complete"` | `title="Packaged" subtitle="STG-08 complete"` |

**Note:** `src/app/admin/targets/page.tsx` uses `STAGE_LABELS` from `types/index.ts` (line 117, 147) so it auto-updates when the source is changed. No separate edit needed.

---

### [ISSUE-2] NSSF & PAYEE Cards on Worker Payment Detail Page

- **Symptom:** The NSSF and PAYEE cards on `/payments/worker/[id]` show "No NSSF payments recorded" / "No PAYEE recorded (Tax Free)" even when the employee has production entries for the period
- **Root cause:** The cards aggregate from `filteredPayments` (already-processed payment records stored in Firestore), not from the employee's production entries. If no payment has been processed yet, the cards show zeros.
- **Impact:** Users cannot see projected NSSF/PAYEE for an employee before processing payments
- **Affected scope:** Worker payment detail page (`/payments/worker/[id]`)

**Current logic (broken):**
```typescript
// Lines 240-253 of src/app/payments/worker/[id]/page.tsx
const nssfSummary = useMemo(() => {
  const totalEmpDed = filteredPayments.reduce((s, p) => s + (p.nssfEmployeeDeduction || 0), 0);
  const totalBusCont = filteredPayments.reduce((s, p) => s + (p.nssfBusinessContribution || 0), 0);
  // ... only uses payment records
}, [filteredPayments]);

const payeeSummary = useMemo(() => {
  const totalPayee = filteredPayments.reduce((s, p) => s + (p.payeeTax || 0), 0);
  // ... only uses payment records
}, [filteredPayments]);
```

**Required fix:** Calculate NSSF and PAYEE from the employee's production entries for the selected time period, using the same logic as the main payments page:

```typescript
// NSSF: compute from gross = dueAmount + paidAmount (total period earnings)
const gross = dueAmount + paidAmount;
const nssfEmployee = computeNssfEmployee(gross);
const nssfBusiness = computeNssfBusiness(gross);

// PAYEE: compute from gross using progressive tax brackets
const payeeTax = computePayeeTax(gross);
```

**Files to modify:**
- `src/app/payments/worker/[id]/page.tsx`
  - Import `computeNssfEmployee`, `computeNssfBusiness`, `computePayeeTax` from `@/lib/deductions`
  - Replace `nssfSummary` memo to calculate from `dueAmount + paidAmount` (already computed at lines 148-156)
  - Replace `payeeSummary` memo to calculate from `dueAmount + paidAmount`
  - Update the NSSF card JSX (lines 535-557) to show computed values
  - Update the PAYEE card JSX (lines 559-583) to show computed values
  - Update the NSSF tab table (lines 909-976) to show the computed breakdown
  - Update the PAYEE tab table (lines 979-1051) to show the computed breakdown

**What the cards should show:**
- **NSSF Card:** Employee deduction (5% of gross) and Business contribution (10% of gross) calculated from `dueAmount + paidAmount` for the period
- **PAYEE Card:** Total PAYEE tax calculated from `dueAmount + paidAmount` using progressive brackets, plus count of taxable vs tax-free

---

### [ISSUE-3] Move Packaged Goods to Stock Button Not Working

- **Symptom:** Clicking "Move to Stock" on the production page redirects to the storage page, but the batch dropdown shows "Select batch..." despite the URL containing the batchRef
- **Root cause:** Two issues:
  1. The stock-in form's batch dropdown (line 707 of `storage/page.tsx`) filters to show only `ACTIVE` batches: `batches.filter((b) => b.status === "ACTIVE")`. If the batch has been completed (e.g., by the recalculation logic we just added), the pre-filled batchRef won't match any option.
  2. The `packSize` is not pre-filled from the redirect (the URL params don't include packSize).
- **Impact:** Users cannot move packaged goods to stock — the button appears to do nothing useful
- **Affected scope:** Production page "Move to Stock" flow

**Current redirect code (production/page.tsx):**
```typescript
const params = new URLSearchParams({
  tab: "stock-in",
  date: entry.date,
  quantity: String(entry.actualPieces),
  batchRef: entry.batchRef,
  entryId: entry.id,
});
window.location.href = `/storage?${params.toString()}`;
```

**Fix 1 — Show all batches when accessed via Move-to-Stock redirect:**
In `storage/page.tsx`, when `moveEntryId` is set (meaning we came from the Move-to-Stock redirect), the batch dropdown should show ALL batches (not just ACTIVE) so the pre-filled batchRef always matches an option.

**Fix 2 — Add packSize to the URL params:**
In `production/page.tsx`, pass `packSize: "HALF_DOZEN"` as a default in the URL params so the storage page can pre-fill it.

**Files to modify:**
- `src/app/production/page.tsx` — Add `packSize` to the redirect URL params
- `src/app/storage/page.tsx` — Change batch dropdown to show all batches when `moveEntryId` is set; read `packSize` from URL params

---

## 4. REQUEST

### Deliverable(s)

1. **Modified:** `src/types/index.ts` — Rename "Packing" to "Packaging" in `STAGE_LABELS`
2. **Modified:** `src/components/reports/ProductionReportPDF.tsx` — Rename in local `STAGE_LABELS`
3. **Modified:** `scripts/seed.ts` — Rename in seed data
4. **Modified:** `src/app/api/migrate-packing-stage/route.ts` — Rename all 6 occurrences
5. **Modified:** `src/app/production/page.tsx` — Rename 3 labels + fix Move-to-Stock redirect params
6. **Modified:** `src/app/storage/page.tsx` — Rename 2 labels + fix batch dropdown + fix packSize pre-fill
7. **Modified:** `src/app/payments/worker/[id]/page.tsx` — Fix NSSF/PAYEE cards to live-calculate

### Functional Requirements

**Rename (ISSUE-1):**
- [ ] Change `"Packing"` to `"Packaging"` in `STAGE_LABELS` in `src/types/index.ts`
- [ ] Change `"Packing"` to `"Packaging"` in local `STAGE_LABELS` in `ProductionReportPDF.tsx`
- [ ] Change `name: "Packing"` to `name: "Packaging"` in `scripts/seed.ts`
- [ ] Change all 6 `"Packing"` strings to `"Packaging"` in `migrate-packing-stage/route.ts`
- [ ] Change chart label `"Pack"` to `"Packaging"` in `production/page.tsx`
- [ ] Change subtitle `"Packing stage"` to `"Packaging stage"` in `production/page.tsx`
- [ ] Change description `"packing"` to `"packaging"` in `production/page.tsx`
- [ ] Change `"awaiting packing"` to `"awaiting packaging"` in `storage/page.tsx`
- [ ] Change `"Packed"` to `"Packaged"` in `storage/page.tsx`
- [ ] Note: `admin/targets/page.tsx` auto-updates via `STAGE_LABELS` import

**NSSF/PAYEE Fix (ISSUE-2):**
- [ ] Import `computeNssfEmployee`, `computeNssfBusiness`, `computePayeeTax` from `@/lib/deductions`
- [ ] Replace `nssfSummary` memo to compute from `dueAmount + paidAmount` instead of `filteredPayments`
- [ ] Replace `payeeSummary` memo to compute from `dueAmount + paidAmount` instead of `filteredPayments`
- [ ] Update NSSF card JSX to show computed employee deduction and business contribution
- [ ] Update PAYEE card JSX to show computed total PAYEE, taxable count, tax-free count
- [ ] Update NSSF tab table to show the computed breakdown per period
- [ ] Update PAYEE tab table to show the computed breakdown per period

**Move-to-Stock Fix (ISSUE-3):**
- [ ] Add `packSize` parameter to the Move-to-Stock redirect URL in `production/page.tsx`
- [ ] Read `packSize` from URL params in `storage/page.tsx` useEffect
- [ ] Change batch dropdown in `storage/page.tsx` to show ALL batches when `moveEntryId` is set (not just ACTIVE)
- [ ] Verify the full flow: production page entry -> Move to Stock button -> storage page with pre-filled form -> submit stock-in -> entry marked as moved

### What NOT to change
- Do not modify the `RouteGuard`, `useAuth`, `auth-context`, or `permissions.ts` files
- Do not modify the chart components in `src/components/charts/`
- Do not modify the `PeriodSelector` component
- Do not modify the core deduction calculation functions in `src/lib/deductions.ts`
- Do not modify the `NssfCard.tsx` or `PayeeCard.tsx` components (used on main payments page)
- Do not modify the main payments page (`src/app/payments/page.tsx`)
- Do not modify the production worker performance page (`src/app/production/worker/[id]/page.tsx`)
- Do not modify Firestore security rules

---

## 5. CONSTRAINTS & RULES

### Coding Standards
- Follow existing naming conventions: camelCase for variables, PascalCase for components/types
- Use TypeScript strict mode — no `any` types
- No inline styles — use Tailwind utility classes
- All async operations must handle loading, success, and error states

### Existing Patterns to Reuse
- **NSSF/PAYEE calculation:** Use `computeNssfEmployee(gross)`, `computeNssfBusiness(gross)`, `computePayeeTax(gross)` from `src/lib/deductions.ts` (same as main payments page)
- **Gross amount for single employee:** `dueAmount + paidAmount` (total period earnings) — same as `NssfCard.tsx` line 35
- **Time period filtering:** The `filteredPayments` and `filteredEntries` memos already filter by `start`/`end` date bounds — use the same `dueAmount + paidAmount` values already computed at lines 148-156
- **URL parameter passing:** Use `URLSearchParams` + `window.location.href` pattern (existing Move-to-Stock code)

### Performance Considerations
- NSSF/PAYEE calculations are pure math (no Firestore queries) — negligible performance impact
- The batch dropdown showing all batches instead of filtered ACTIVE has minimal impact (typically < 20 batches)
- No new Firestore queries are introduced

---

## 6. TESTING & VERIFICATION

### Manual Testing Steps

**Rename (ISSUE-1):**
1. Navigate to Production page — verify stage dropdown shows "Packaging" for STG-08
2. Navigate to Production page — verify chart bar label shows "Packaging"
3. Navigate to Production page — verify "Finished Pads" card subtitle shows "Packaging stage (STG-08)"
4. Navigate to Storage page — verify "Pinned & Folded" card subtitle shows "STG-07 awaiting packaging"
5. Navigate to Storage page — verify "Packaged" card title shows "Packaged"
6. Navigate to Admin Targets — verify STG-08 is labeled "Packaging"
7. Generate a production PDF report — verify STG-08 is labeled "Packaging"

**NSSF/PAYEE Fix (ISSUE-2):**
1. Navigate to `/payments/worker/[id]` for an employee with production entries
2. Select a time period (e.g., "This Month")
3. Verify NSSF card shows: Employee (5%) and Business (10%) amounts calculated from `dueAmount + paidAmount`
4. Verify PAYEE card shows: Total PAYEE amount calculated using progressive tax brackets
5. Click "Show Details" on NSSF card — verify breakdown table shows correct values
6. Click on "NSSF" tab — verify detailed table shows correct breakdown
7. Click on "PAYEE" tab — verify detailed table shows correct breakdown
8. Change time period — verify cards update accordingly

**Move-to-Stock Fix (ISSUE-3):**
1. Navigate to Production page
2. Log a STG-08 (Packaging) entry with a batch selected
3. Verify the entry appears in "Move Packaged Goods to Stock" section
4. Click "Move to Stock" button
5. Verify storage page loads with: correct date, correct quantity, correct batch selected in dropdown, packSize pre-filled
6. Select "Received By" employee
7. Click "Record Stock-In"
8. Verify the stock-in is recorded and the production entry is marked as moved
9. Navigate back to Production page — verify the entry no longer appears in "Move to Stock" section

### Automated Verification
- Run `npm run build` — must compile with zero TypeScript errors
- Run `npm run lint` if available — no new lint errors

---

## 7. EXECUTION ORDER

### Phase 1: Rename "Packing" to "Packaging" (ISSUE-1)
1. Edit `src/types/index.ts` — single line change
2. Edit `src/components/reports/ProductionReportPDF.tsx` — single line change
3. Edit `scripts/seed.ts` — single line change
4. Edit `src/app/api/migrate-packing-stage/route.ts` — 6 string replacements
5. Edit `src/app/production/page.tsx` — 3 label changes
6. Edit `src/app/storage/page.tsx` — 2 label changes

### Phase 2: Fix NSSF/PAYEE Cards (ISSUE-2)
1. Edit `src/app/payments/worker/[id]/page.tsx` — add imports, replace memos, update JSX

### Phase 3: Fix Move-to-Stock Flow (ISSUE-3)
1. Edit `src/app/production/page.tsx` — add packSize to redirect params
2. Edit `src/app/storage/page.tsx` — read packSize, fix batch dropdown filtering

### Phase 4: Verify
1. Run `npm run build` to verify TypeScript compilation
2. Manual testing of all three fixes
