# Implementation Plan: NSSF & PAYEE Deductions System

---

## 1. TASK

**Primary Objective:** Implement mandatory NSSF (National Social Security Fund) and PAYEE (Pay As You Earn) deduction system into the existing payments workflow.

**NSSF Rules:**
- **NSSF Employee (5%):** Mandatory deduction from the employee's total earnings. Paid by the employee (deducted from gross pay).
- **NSSF Business (10%):** Contribution paid by the business entity. Calculated as 10% of the employee's total earnings. NOT deducted from the employee's salary — it is an additional cost borne by the business.

**PAYEE (Pay As You Earn) Rules — Progressive Tax Brackets:**

| Bracket (UGX) | Tax Rate | Calculation |
|---|---|---|
| 0 – 335,000 | 0% (Tax-free) | 0 |
| 335,001 – 410,000 | 10% | 10% of amount above 335,000 |
| 410,001 – 485,000 | 20% | 20% of amount above 410,000 (cumulative) |
| 485,001 – 10,000,000 | 30% | 30% of amount above 485,000 (cumulative) |
| Above 10,000,000 | 40% | 40% of amount above 10,000,000 (cumulative) |

**Definition of Done:**
- NSSF Employee (5%) is calculated and deducted from each employee's gross pay at payment time
- NSSF Business (10%) is calculated and tracked separately (not deducted from employee)
- PAYEE is computed per employee based on monthly total earnings using the progressive tax brackets
- Payments screen has dedicated NSSF card and PAYEE card with toggle/details
- Payment confirmation modal shows gross earnings, NSSF deduction, PAYEE deduction, and net pay
- Payment receipt PDF includes deduction breakdown
- Employee detail screen shows NSSF and PAYEE history per employee
- Payments report PDF includes NSSF/PAYEE summaries
- New NSSF Report and PAYEE Report available for download
- Individual employee NSSF/PAYEE detail views with cumulative totals
- All existing functionality continues to work (no regressions)
- TypeScript compiles with no new errors

---

## 2. CONTEXT

### Project / App Overview
Starpads is a Next.js web application for managing a sanitary pad manufacturing business. It handles production tracking, payments, storage/inventory, sales, expenses, and employee management. The current payments system processes gross earnings with NO deductions — this plan adds the full NSSF and PAYEE deduction engine.

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
| `src/types/index.ts` | MODIFY — add deduction fields to `Payment`, add NSSF/PAYEE types |
| `src/app/payments/page.tsx` | MODIFY — add NSSF card, PAYEE card, deduction breakdown in payment modal |
| `src/app/payments/worker/[id]/page.tsx` | MODIFY — add NSSF/PAYEE history tabs/detail sections |
| `src/components/payments/PaymentReceiptPDF.tsx` | MODIFY — add deduction lines to receipt |
| `src/components/reports/PaymentsPDF.tsx` | MODIFY — add NSSF/PAYEE summary sections |
| `src/components/reports/WorkerPDF.tsx` | MODIFY — add NSSF/PAYEE deduction history |
| `src/app/api/reports/route.ts` | MODIFY — add NSSF/PAYEE data to report queries, add new report screens |
| `src/components/reports/NssfPDF.tsx` | **CREATE** — NSSF report PDF component |
| `src/components/reports/PayeePDF.tsx` | **CREATE** — PAYEE report PDF component |
| `src/components/payments/NssfCard.tsx` | **CREATE** — NSSF card component for payments page |
| `src/components/payments/PayeeCard.tsx` | **CREATE** — PAYEE card component for payments page |
| `firestore.indexes.json` | MODIFY — add required composite indexes |

### Current Behavior
- `ProductionEntry.earningsUgx` represents gross earnings with zero deductions
- `Payment.totalAmount` is the sum of gross earnings (no deductions tracked)
- Payment receipt shows only gross earnings total
- No NSSF or PAYEE concept exists anywhere in the system
- Reports show gross earnings only

### Expected Behavior (after changes)
- Each `Payment` document stores breakdown: `grossAmount`, `nssfEmployeeDeduction`, `nssfBusinessContribution`, `payeeTax`, `netPayAmount`
- Payment processing calculates all deductions and stores them atomically
- Payments screen shows NSSF and PAYEE cards with toggle to expand details
- Employee payment detail shows NSSF and PAYEE deduction history
- All reports include deduction columns and summaries
- New dedicated NSSF and PAYEE reports available via ReportCard

---

## 3. TECHNICAL DESIGN

### 3.1 Data Model Changes

#### `Payment` Type — New Fields
```typescript
interface Payment {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;       // Renamed from totalAmount — sum of earnings before deductions
  nssfEmployeeDeduction: number;  // 5% of grossAmount (deducted from employee)
  nssfBusinessContribution: number; // 10% of grossAmount (paid by business)
  payeeTax: number;          // Computed PAYEE based on monthly bracket
  netPayAmount: number;      // grossAmount - nssfEmployeeDeduction - payeeTax
  status: PaymentStatus;
  paidDate: string | null;
  receiptNumber: string | null;
  notes: string;
  createdAt: string;
  createdBy: string;
}
```

#### PAYEE Calculation Utility
```typescript
function computePayeeTax(monthlyGrossEarnings: number): number {
  if (monthlyGrossEarnings <= 335000) return 0;
  if (monthlyGrossEarnings <= 410000) return (monthlyGrossEarnings - 335000) * 0.10;
  if (monthlyGrossEarnings <= 485000) {
    return (75000 * 0.10) + (monthlyGrossEarnings - 410000) * 0.20;
  }
  if (monthlyGrossEarnings <= 10000000) {
    return (75000 * 0.10) + (75000 * 0.20) + (monthlyGrossEarnings - 485000) * 0.30;
  }
  // Above 10,000,000
  return (75000 * 0.10) + (75000 * 0.20) + (9515000 * 0.30) + (monthlyGrossEarnings - 10000000) * 0.40;
}
```

#### NSSF Calculation Utilities
```typescript
function computeNssfEmployee(grossAmount: number): number {
  return grossAmount * 0.05; // 5% deducted from employee
}

function computeNssfBusiness(grossAmount: number): number {
  return grossAmount * 0.10; // 10% paid by business
}
```

### 3.2 Payment Flow (Updated)

```
User clicks "Pay Due" for employee
  → Confirmation modal shows:
     - Gross Due Amount: UGX X
     - NSSF Employee Deduction (5%): UGX Y
     - PAYEE Tax: UGX Z
     - Net Pay to Employee: UGX (X - Y - Z)
     - NSSF Business Contribution (10%): UGX W (paid by business)
  → User confirms
  → Batch write:
     1. Create Payment document with all deduction fields
     2. Update all due ProductionEntry docs (paymentStatus = "paid", paymentId)
     3. Generate PDF receipt showing gross + deductions + net pay
```

### 3.3 NSSF Card — Payments Screen

The NSSF card on the payments page features:
- **Header:** "NSSF" with toggle switch (expand/collapse)
- **Two sub-tabs when expanded:**
  - **Employee (5%):** Per-employee table showing name, gross earnings, NSSF deduction (5%), cumulative total
  - **Business (10%):** Per-employee table showing name, gross earnings, business contribution (10%), cumulative total
- **Summary footer:** Total NSSF employee deductions + total NSSF business contributions for the period

### 3.4 PAYEE Card — Payments Screen

The PAYEE card features:
- **Header:** "PAYEE (Pay As You Earn)" with toggle switch (expand/collapse)
- **When expanded:** Per-employee table showing:
  - Employee name
  - Monthly gross earnings
  - Tax bracket applied
  - PAYEE tax amount
  - Tax-free indication for employees below 335,000 UGX
- **Summary footer:** Total PAYEE collected for the period

### 3.5 Employee Detail Page — New Sections

Under the employee payment detail page (`/payments/worker/[id]`):
- **NSSF History tab/section:**
  - Table of all payments with: period, gross earnings, NSSF employee deduction, cumulative NSSF deductions
  - Total NSSF deducted across all time for this employee
- **PAYEE History tab/section:**
  - Table of all payments with: period, gross earnings, PAYEE tax, tax bracket, cumulative PAYEE
  - Total PAYEE paid across all time for this employee

### 3.6 Reports

#### PaymentsPDF — Updated
- Add to summary: Total NSSF Employee Deductions, Total NSSF Business Contributions, Total PAYEE
- Add columns to worker breakdown: NSSF Employee, NSSF Business, PAYEE, Net Pay
- Add columns to entries detail: NSSF Employee, PAYEE, Net Pay

#### WorkerPDF — Updated
- Add to summary section: NSSF Employee Deduction, PAYEE Tax, Net Pay
- Add NSSF/PAYEE deduction columns to payment history table

#### NSSF Report PDF (NEW)
- Summary: Total NSSF Employee Deductions, Total NSSF Business Contributions, Total Combined NSSF
- Per-employee breakdown: name, gross earnings, employee deduction, business contribution, combined total
- Per-employee cumulative totals

#### PAYEE Report PDF (NEW)
- Summary: Total PAYEE collected, number of employees taxed, number of tax-free employees
- Per-employee breakdown: name, monthly gross earnings, tax bracket, tax rate, PAYEE amount
- Tax-free employees listed separately with "Tax Free — 0%" indication

---

## 4. IMPLEMENTATION ORDER

### Phase 1: Types & Utilities (Foundation)

| Step | File | Change |
|------|------|--------|
| 1.1 | `src/types/index.ts` | Add deduction fields to `Payment` interface; add helper types |
| 1.2 | New utility | Create `src/lib/deductions.ts` with `computePayeeTax`, `computeNssfEmployee`, `computeNssfBusiness`, `getPayeeBracket` functions |

### Phase 2: Payment Processing Logic

| Step | File | Change |
|------|------|--------|
| 2.1 | `src/app/payments/page.tsx` | Update `handlePayConfirm` to calculate deductions before batch write |
| 2.2 | `src/app/payments/page.tsx` | Update payment modal to show deduction breakdown (gross, NSSF employee, PAYEE, net pay, NSSF business) |
| 2.3 | `src/app/payments/page.tsx` | Update `Payment` document creation to include deduction fields |
| 2.4 | `src/app/payments/page.tsx` | Update receipt generation to pass deduction data |

### Phase 3: NSSF Card & PAYEE Card on Payments Screen

| Step | File | Change |
|------|------|--------|
| 3.1 | `src/components/payments/NssfCard.tsx` | **CREATE** — NSSF card with toggle + employee/business sub-tabs |
| 3.2 | `src/components/payments/PayeeCard.tsx` | **CREATE** — PAYEE card with toggle + per-employee tax breakdown |
| 3.3 | `src/app/payments/page.tsx` | Import and render NssfCard and PayeeCard in the grid |

### Phase 4: Payment Receipt PDF

| Step | File | Change |
|------|------|--------|
| 4.1 | `src/components/payments/PaymentReceiptPDF.tsx` | Add deduction section showing gross, NSSF employee, PAYEE, net pay, NSSF business |

### Phase 5: Employee Detail — NSSF & PAYEE History

| Step | File | Change |
|------|------|--------|
| 5.1 | `src/app/payments/worker/[id]/page.tsx` | Add NSSF history section (table of deductions per payment, cumulative total) |
| 5.2 | `src/app/payments/worker/[id]/page.tsx` | Add PAYEE history section (table of taxes per payment, tax bracket, cumulative total) |

### Phase 6: Report Updates

| Step | File | Change |
|------|------|--------|
| 6.1 | `src/components/reports/PaymentsPDF.tsx` | Add NSSF and PAYEE columns to worker breakdown and entries tables |
| 6.2 | `src/components/reports/WorkerPDF.tsx` | Add NSSF/PAYEE deduction info to payment history |
| 6.3 | `src/components/reports/NssfPDF.tsx` | **CREATE** — dedicated NSSF report PDF |
| 6.4 | `src/components/reports/PayeePDF.tsx` | **CREATE** — dedicated PAYEE report PDF |
| 6.5 | `src/app/api/reports/route.ts` | Add "nssf" and "payee" screen handlers; update "payments" and "worker" handlers to include deduction data |

### Phase 7: Firestore Indexes & Final Wiring

| Step | File | Change |
|------|------|--------|
| 7.1 | `firestore.indexes.json` | Add composite indexes as needed |
| 7.2 | All files | Final type-check and build verification |

---

## 5. DETAILED CODE CHANGES

### 5.1 `src/types/index.ts` — Modified Payment Interface

```
Current:
  totalAmount: number;

New:
  grossAmount: number;               // Previously totalAmount (gross before deductions)
  nssfEmployeeDeduction: number;     // 5% of gross (deducted from employee)
  nssfBusinessContribution: number;  // 10% of gross (paid by business)
  payeeTax: number;                  // PAYEE computed from monthly bracket
  netPayAmount: number;              // grossAmount - nssfEmployeeDeduction - payeeTax
```

Backward compatibility: The `totalAmount` field will be deprecated in favor of `grossAmount`. For existing payments, `totalAmount` will continue to be treated as `grossAmount`. All NEW payments will write both `grossAmount` (new) and maintain `totalAmount` (for backward compat).

### 5.2 `src/lib/deductions.ts` — New Utility File

Contains:
- `computePayeeTax(monthlyGross: number): number` — progressive tax calculation
- `getPayeeBracket(monthlyGross: number): { label: string; rate: number }` — returns bracket info
- `computeNssfEmployee(gross: number): number` — 5% calculation
- `computeNssfBusiness(gross: number): number` — 10% calculation
- `computeAllDeductions(gross: number): DeductionBreakdown` — returns all at once

### 5.3 Payment Processing — `handlePayConfirm` in `payments/page.tsx`

```typescript
// NEW: Calculate deductions per employee
const nssfEmployee = computeNssfEmployee(payEmployee.dueAmount);
const nssfBusiness = computeNssfBusiness(payEmployee.dueAmount);
const payeeTax = computePayeeTax(payEmployee.dueAmount);
const netPay = payEmployee.dueAmount - nssfEmployee - payeeTax;

// Updated batch write — Payment document now includes deduction fields
batch.set(paymentRef, {
  employeeId: payEmployee.employeeId,
  periodStart: start,
  periodEnd: end,
  grossAmount: payEmployee.dueAmount,
  totalAmount: payEmployee.dueAmount, // Backward compat
  nssfEmployeeDeduction: nssfEmployee,
  nssfBusinessContribution: nssfBusiness,
  payeeTax: payeeTax,
  netPayAmount: netPay,
  status: "paid",
  paidDate: todayStr,
  receiptNumber,
  notes: "",
  createdAt: Timestamp.now(),
  createdBy: userRole?.uid ?? "",
});
```

### 5.4 PAYEE Cumulative Tax Computation

Critical design note: PAYEE is a monthly progressive tax. The system must compute PAYEE based on the employee's **total earnings for the entire calendar month**, not just the current payment batch. 

Implementation strategy:
- When processing payment for employee, query ALL production entries for that employee in the current calendar month (both due and already paid)
- Sum all earnings for the month
- Compute PAYEE on the monthly total
- If payments have already been made for this month, subtract PAYEE already paid from the computed PAYEE to get the marginal PAYEE due on this payment

This ensures that partial payments across a month correctly accumulate PAYEE without over-taxing.

---

## 6. EXEMPLARS

### NSSF Card Component Pattern
```typescript
// src/components/payments/NssfCard.tsx (conceptual)
export function NssfCard({ employeePayments, timeWindow }: NssfCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [subTab, setSubTab] = useState<"employee" | "business">("employee");

  // Compute NSSF values for each employee
  const nssfData = useMemo(() => {
    return employeePayments.map(ep => ({
      employeeName: ep.employeeName,
      grossAmount: ep.dueAmount + ep.paidAmount,
      employeeDeduction: computeNssfEmployee(ep.dueAmount + ep.paidAmount),
      businessContribution: computeNssfBusiness(ep.dueAmount + ep.paidAmount),
    }));
  }, [employeePayments]);

  return (
    <ChartCard title="NSSF" subtitle="National Social Security Fund" action={<ToggleSwitch />}>
      {/* Sub-tabs for Employee/Business */}
      {/* Table with per-employee data */}
    </ChartCard>
  );
}
```

### PAYEE Card Component Pattern
```typescript
// src/components/payments/PayeeCard.tsx (conceptual)
export function PayeeCard({ employeePayments }: PayeeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const payeeData = useMemo(() => {
    return employeePayments.map(ep => {
      const monthlyGross = ep.dueAmount + ep.paidAmount;
      const tax = computePayeeTax(monthlyGross);
      const bracket = getPayeeBracket(monthlyGross);
      return { employeeName: ep.employeeName, monthlyGross, tax, bracket };
    });
  }, [employeePayments]);

  return (
    <ChartCard title="PAYEE" subtitle="Pay As You Earn" action={<ToggleSwitch />}>
      {/* Table with per-employee PAYEE breakdown */}
    </ChartCard>
  );
}
```

### Receipt PDF Deduction Section
```
Current receipt shows: "Total Paid: UGX X"
New receipt shows:
  Gross Earnings:    UGX X
  NSSF Deduction:   UGX Y (5%)
  PAYEE Tax:         UGX Z
  ─────────────────────────
  Net Pay:           UGX W
  ─────────────────────────
  NSSF Business:     UGX V (10% — paid by employer)
```

---

## 7. EDGE CASES & ERROR HANDLING

### Employee has zero gross earnings
- NSSF Employee = 0, NSSF Business = 0, PAYEE = 0, Net = 0
- Should display "—" or "0" consistently

### Employee in tax-free bracket (≤ 335,000 UGX monthly)
- PAYEE = 0
- Display "Tax Free" badge instead of UGX 0
- Report shows "Tax Free — 0%" explicitly

### Partial payments within a month
- PAYEE must be computed on cumulative monthly earnings
- Track PAYEE already paid for the month and only deduct the marginal amount
- Required: Query existing payments for employee in current month

### Employee with no NSSF/PAYEE history
- Show "No NSSF records found for this employee" empty state
- Show "No PAYEE records found for this employee" empty state

### Time window changes
- NSSF and PAYEE cards must reactively update when time window changes
- Both cards compute from `employeePayments` which is already filtered by time window

### Report generation with no data
- NSSF/PAYEE reports with empty data should show "No data" or zero values
- Must not crash PDF generation

### Existing (historical) Payment documents
- Old payments won't have deduction fields
- All UI code must handle missing fields gracefully (default to 0)
- Reports must handle `grossAmount` vs `totalAmount` fallback

### Currency rounding
- All calculations use `Math.round()` for integer UGX values
- NSSF 5% of 1000 = 50 (exact)
- NSSF 10% of 1000 = 100 (exact)
- PAYEE tax computed in steps, each step rounded

---

## 8. TESTING REQUIREMENTS

### Manual QA Checklist
- [ ] **Payment Processing:** Pay due amount for employee; verify Payment doc has correct `grossAmount`, `nssfEmployeeDeduction`, `nssfBusinessContribution`, `payeeTax`, `netPayAmount`
- [ ] **Payment Modal:** Confirmation modal shows correct deduction breakdown before confirming
- [ ] **Net Pay Check:** `netPayAmount = grossAmount - nssfEmployeeDeduction - payeeTax`
- [ ] **NSSF Card:** Toggle expands/collapses; Employee tab shows 5% column; Business tab shows 10% column
- [ ] **PAYEE Card:** Toggle expands/collapses; shows correct tax bracket per employee
- [ ] **Tax-Free Employees:** Employees below 335,000 UGX show "Tax Free" in PAYEE card
- [ ] **Receipt PDF:** Downloaded receipt includes deduction section with gross, NSSF, PAYEE, net pay, business NSSF
- [ ] **Employee Detail — NSSF History:** Shows all past NSSF deductions; cumulative total correct
- [ ] **Employee Detail — PAYEE History:** Shows all past PAYEE taxes; cumulative total correct
- [ ] **Payments Report PDF:** Worker breakdown includes NSSF/PAYEE columns; summary includes totals
- [ ] **Worker Report PDF:** Includes NSSF/PAYEE info in employee summary and payment history
- [ ] **NSSF Report PDF (new):** Shows all employees with NSSF deductions + business contributions
- [ ] **PAYEE Report PDF (new):** Shows all employees with PAYEE tax breakdown + tax-free indication
- [ ] **Cumulative PAYEE:** Partial payments within same month correctly accumulate PAYEE
- [ ] **Backward Compat:** Existing payments without deduction fields show "—" or 0 (no crash)
- [ ] **Time Window:** NSSF/PAYEE cards update when switching between Today/Week/Month/12 Months
- [ ] **Report Generation:** All existing reports (production, storage, sales, expenses, analytics) still generate correctly

---

## 9. RISK ASSESSMENT

| Risk | Impact | Mitigation |
|------|--------|------------|
| Cumulative PAYEE across partial monthly payments is complex | Medium | Implement monthly aggregation query; test thoroughly with partial payment scenarios |
| Backward compatibility with existing Payment records | Medium | All code reads use optional chaining / fallback to 0; `totalAmount` retained as alias for `grossAmount` |
| Firestore query limits for monthly aggregation | Low | Employees typically have < 100 entries/month; within limits |
| PDF receipt layout overflow with new deduction fields | Low | Receipt has sufficient space; use compact table layout |
| Performance: NSSF/PAYEE computed on every render | Low | Use `useMemo` — computations are O(n) with small n (employees < 50) |
| Type mismatch during transition | Low | Backward-compat field `totalAmount` kept during migration |

---

## 10. PERSONA

You are a Senior Next.js + TypeScript + Firebase Engineer with 5+ years of production experience building full-stack web applications. You specialize in Firestore data modeling, financial/payroll systems, progressive tax computation, and real-time data synchronization. You write code that is:
- **Production-ready:** handles loading, empty, error, and edge case states
- **Financially accurate:** all monetary calculations are precise, rounded correctly, and auditable
- **Defensively typed:** TypeScript strict, no implicit any
- **Maintainable:** follows existing codebase patterns precisely
- **Performant:** memoizes derived data, avoids unnecessary re-renders

You do not write placeholder comments. You implement the thing.

---

## 11. OUTPUT FORMAT

**Primary Deliverable Format:** `Step-by-step implementation` — one phase at a time, with exact code changes and rationale.

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

## 13. IMPLEMENTATION ORDER (REVISED)

The implementation will proceed in the following order:

1. **Types & Utilities** — `src/types/index.ts` + new `src/lib/deductions.ts`
2. **Payment Processing** — Update `handlePayConfirm` in `src/app/payments/page.tsx`
3. **Payment Modal** — Add deduction breakdown to confirmation modal
4. **NSSF Card** — Create `NssfCard.tsx` + render in payments page
5. **PAYEE Card** — Create `PayeeCard.tsx` + render in payments page
6. **Payment Receipt PDF** — Update `PaymentReceiptPDF.tsx` with deduction section
7. **Employee Detail** — Add NSSF/PAYEE history to `worker/[id]/page.tsx`
8. **Payments Report PDF** — Update `PaymentsPDF.tsx` with deduction columns
9. **Worker Report PDF** — Update `WorkerPDF.tsx` with deduction columns
10. **NSSF Report PDF** — Create `NssfPDF.tsx`
11. **PAYEE Report PDF** — Create `PayeePDF.tsx`
12. **API Route** — Update `api/reports/route.ts` for new report screens + enhanced data
13. **Firestore Indexes** — Add any required composite indexes
14. **Final Verification** — TypeScript compilation + build
