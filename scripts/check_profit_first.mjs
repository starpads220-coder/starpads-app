import assert from "node:assert/strict";
import { allocateSale, deriveProfitFirst } from "../src/lib/profit-first.ts";
import { isRouteAllowed } from "../src/lib/permissions.ts";

const empty = { sales: [], expenses: [], payments: [], journals: [], payeRemittances: [], nssfRemittances: [], taxEntries: [] };
assert.deepEqual(allocateSale(1_000_000), { profit: 220_000, ownerCompensation: 100_000, tax: 160_000, operatingExpenses: 520_000 });
for (const value of [1, 2, 7, 99, 10_003]) assert.equal(Object.values(allocateSale(value)).reduce((sum, part) => sum + part, 0), value, "rounding remainder must reconcile");

const sources = {
  sales: [{ id: "sale-1", date: "2026-01-05", totalAmount: 1_000_000, invoiceNumber: "INV-1" }],
  expenses: [
    { id: "salary-1", date: "2026-01-06", amountUgx: 1_000, description: "Office salary", accounting: { accountCode: "6010", accountName: "Salaries and Wages" }, payrollExpenseVersion: 2, netPayAmount: 700, payeeTax: 100, nssfEmployeeDeduction: 50, nssfBusinessContribution: 150 },
    { id: "opex-1", date: "2026-01-07", amountUgx: 200, description: "Utilities", accounting: { accountCode: "6100" } },
  ],
  payments: [
    { id: "pay-1", paidDate: "2026-01-08", status: "paid", payrollVersion: 2, netPayAmount: 500, payeeTax: 100, nssfEmployeeDeduction: 50, nssfBusinessContribution: 100 },
    { id: "unconfirmed", paidDate: "2026-01-08", status: "due", netPayAmount: 999 },
    { id: "historical", paidDate: "2026-01-08", status: "paid", netPayAmount: 999, accountingTreatment: "historical_already_settled" },
  ],
  journals: [
    { id: "dividend-1", date: "2026-01-09", debitCode: "3100", creditCode: "1000", amount: 50, description: "Owner dividend" },
    { id: "dividend-reversal", date: "2026-01-09", debitCode: "1000", creditCode: "3100", amount: 25 },
    { id: "income-tax-paid", date: "2026-01-10", debitCode: "2250", creditCode: "1000", amount: 60 },
  ],
  payeRemittances: [{ id: "paye-1", paymentDate: "2026-01-11", amount: 40 }],
  nssfRemittances: [{ id: "nssf-1", paymentDate: "2026-01-12", amount: 30 }],
  taxEntries: [{ id: "tax-1", date: "2026-01-03", amount: 100 }],
};
const before = JSON.stringify(sources);
const result = deriveProfitFirst(sources, "2026-01-01", "2026-01-31");
assert.equal(JSON.stringify(sources), before, "derivation must not mutate accounting source records");
assert.equal(result.totalSales, 1_000_000);
assert.equal(result.totalAllocated, 1_000_000);
assert.equal(result.accounts.profit.deducted, 50);
assert.equal(result.accounts.ownerCompensation.deducted, 1_200, "only net structured payroll is deducted");
assert.equal(result.accounts.tax.deducted, 130, "only paid/remitted tax is deducted");
assert.equal(result.accounts.operatingExpenses.deducted, 200);
assert.equal(result.ledger.filter(entry => entry.sourceId === "sale-1" && entry.account !== "income").length, 4, "one allocation per destination account");
assert.equal(result.ledger.filter(entry => entry.sourceId === "sale-1" && entry.account === "income").length, 2, "Income records sale capture and allocation out");
assert.equal(result.ledger.find(entry => entry.sourceId === "sale-1" && entry.account === "profit")?.sourceAmount, 1_000_000, "Profit ledger retains the full source sale value");
assert.equal(result.ledger.find(entry => entry.sourceId === "sale-1" && entry.account === "profit")?.inflow, 220_000, "Profit ledger shows the exact 22% allocation");
assert.equal(deriveProfitFirst(sources, "2026-01-01", "2026-01-31").ledger.length, result.ledger.length, "retries must be idempotent");

const edited = deriveProfitFirst({ ...sources, sales: [{ ...sources.sales[0], totalAmount: 2_000_000 }], journals: [{ ...sources.journals[0], amount: 75 }] }, "2026-01-01", "2026-01-31");
assert.equal(edited.totalSales, 2_000_000, "sale edits replace prior allocation");
assert.equal(edited.accounts.profit.deducted, 75, "dividend edits replace prior deduction");
assert.equal(deriveProfitFirst({ ...empty, sales: [] }).totalSales, 0, "deleted sales disappear");
assert.equal(deriveProfitFirst({ ...empty, sales: [{ id: "void", date: "2026-01-01", totalAmount: 1_000, status: "voided" }] }).totalSales, 0, "voided sales disappear");
assert.equal(deriveProfitFirst({ ...sources, journals: [] }, "2026-01-01", "2026-01-31").accounts.profit.deducted, 0, "deleted dividends disappear");

const roles = ["PRODUCTION_SUPERVISOR", "WORKER", "STORE_MANAGER", "SALES_STAFF", "FINANCE", "FINANCIAL_MANAGER", "SALES_MANAGER"];
assert.equal(isRouteAllowed("ADMIN", "/profit"), true);
for (const role of roles) assert.equal(isRouteAllowed(role, "/profit"), false, `${role} must not access Profit`);

console.log("Profit First checks passed.");
