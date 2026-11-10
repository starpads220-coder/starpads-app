import { ACCOUNTS, type AccountingSelection } from "@/lib/accounts";

export type ImpactLine = { code: string; name: string; debit: number; credit: number };
export type AccountingImpact = {
  lines: ImpactLine[];
  incomeStatement: string;
  balanceSheet: string;
  cashFlow: string;
};

export const accountingImpactIsBalanced = (impact: AccountingImpact | null) => Boolean(impact) && Math.abs(
  impact!.lines.reduce((sum, item) => sum + item.debit - item.credit, 0),
) < 0.005;

const accountName = (code: string, fallback = "Selected account") =>
  ACCOUNTS.find(account => account.code === code)?.name ?? fallback;
const positive = (value: number) => Number.isFinite(value) ? Math.max(0, value) : 0;
const line = (code: string, debit: number, credit: number, fallback?: string): ImpactLine => ({ code, name: accountName(code, fallback), debit, credit });

export function saleAccountingImpact(accounting: AccountingSelection, totalValue: number, initialPaymentValue = 0, initialSettlementCode = "1000"): AccountingImpact | null {
  const total = positive(totalValue);
  if (!accounting.accountCode || !accounting.settlementCode || total <= 0) return null;
  const revenueName = accounting.accountName || accountName(accounting.accountCode, "Sales Revenue");
  if (accounting.settlementCode === "1100") {
    const received = Math.min(total, positive(initialPaymentValue));
    const outstanding = total - received;
    const lines = [
      ...(received > 0 ? [line(initialSettlementCode, received, 0)] : []),
      ...(outstanding > 0 ? [line("1100", outstanding, 0)] : []),
      { code: accounting.accountCode, name: revenueName, debit: 0, credit: total },
    ];
    return {
      lines,
      incomeStatement: `Revenue increases by UGX ${total.toLocaleString()}; profit increases by the same amount before related costs and taxes.`,
      balanceSheet: `${received > 0 ? `${accountName(initialSettlementCode)} increases by UGX ${received.toLocaleString()}. ` : ""}Accounts Receivable increases by UGX ${outstanding.toLocaleString()}. Equity ultimately increases through profit.`,
      cashFlow: received > 0 ? `Operating cash inflow is UGX ${received.toLocaleString()}; the outstanding UGX ${outstanding.toLocaleString()} has no cash-flow effect until collected.` : "No cash-flow effect until the customer pays.",
    };
  }
  return {
    lines: [line(accounting.settlementCode, total, 0), { code: accounting.accountCode, name: revenueName, debit: 0, credit: total }],
    incomeStatement: `Revenue increases by UGX ${total.toLocaleString()}; profit increases by the same amount before related costs and taxes.`,
    balanceSheet: `${accountName(accounting.settlementCode)} increases by UGX ${total.toLocaleString()}. Equity ultimately increases through profit.`,
    cashFlow: `Operating cash inflow increases by UGX ${total.toLocaleString()}.`,
  };
}

type PayrollAmounts = { net: number; paye: number; employeeNssf: number; employerNssf: number };
export function expenseAccountingImpact(accounting: AccountingSelection, totalValue: number, initialPaymentValue = 0, initialSettlementCode = "1000", payroll?: PayrollAmounts): AccountingImpact | null {
  const total = positive(totalValue);
  if (!accounting.accountCode || total <= 0 || (!accounting.settlementCode && accounting.accountCode !== "6200")) return null;
  const expenseName = accounting.accountName || accountName(accounting.accountCode, "Expense");
  if (payroll) {
    const net = positive(payroll.net), paye = positive(payroll.paye), employeeNssf = positive(payroll.employeeNssf), employerNssf = positive(payroll.employerNssf);
    const nssf = employeeNssf + employerNssf;
    return {
      lines: [
        ...(net > 0 ? [{ code: accounting.accountCode, name: expenseName, debit: net, credit: 0 }, line(accounting.settlementCode, 0, net)] : []),
        ...(paye > 0 ? [{ code: accounting.accountCode, name: expenseName, debit: paye, credit: 0 }, line("2125", 0, paye)] : []),
        ...(nssf > 0 ? [{ code: accounting.accountCode, name: expenseName, debit: nssf, credit: 0 }, line("2126", 0, nssf)] : []),
      ],
      incomeStatement: `Salaries & Wages expense increases by UGX ${total.toLocaleString()}, including employer NSSF; profit decreases by the same amount.`,
      balanceSheet: `${accountName(accounting.settlementCode)} decreases by UGX ${net.toLocaleString()}; PAYE Payable increases by UGX ${paye.toLocaleString()} and NSSF Payable increases by UGX ${nssf.toLocaleString()}. Equity ultimately decreases through the expense.`,
      cashFlow: `Operating cash outflow is UGX ${net.toLocaleString()} now. PAYE and NSSF affect cash flow later when remitted.`,
    };
  }
  if (accounting.accountCode === "6200") return {
    lines: [{ code: accounting.accountCode, name: expenseName, debit: total, credit: 0 }, line("1830", 0, total)],
    incomeStatement: `Depreciation expense increases by UGX ${total.toLocaleString()}; profit decreases by the same amount.`,
    balanceSheet: `Accumulated Depreciation increases by UGX ${total.toLocaleString()}, reducing the carrying value of non-current assets. Equity ultimately decreases through the expense.`,
    cashFlow: "No cash movement; depreciation is a non-cash expense.",
  };
  if (accounting.settlementCode === "2110") {
    const paid = Math.min(total, positive(initialPaymentValue));
    const outstanding = total - paid;
    return {
      lines: [
        { code: accounting.accountCode, name: expenseName, debit: total, credit: 0 },
        ...(paid > 0 ? [line(initialSettlementCode, 0, paid)] : []),
        ...(outstanding > 0 ? [line("2110", 0, outstanding)] : []),
      ],
      incomeStatement: `Expense increases by UGX ${total.toLocaleString()}; profit decreases by the same amount.`,
      balanceSheet: `${paid > 0 ? `${accountName(initialSettlementCode)} decreases by UGX ${paid.toLocaleString()}. ` : ""}Accounts Payable increases by UGX ${outstanding.toLocaleString()}. Equity ultimately decreases through the expense.`,
      cashFlow: paid > 0 ? `Operating cash outflow is UGX ${paid.toLocaleString()}; the outstanding UGX ${outstanding.toLocaleString()} affects cash flow only when paid.` : "No cash-flow effect until the supplier is paid.",
    };
  }
  return {
    lines: [{ code: accounting.accountCode, name: expenseName, debit: total, credit: 0 }, line(accounting.settlementCode, 0, total)],
    incomeStatement: `Expense increases by UGX ${total.toLocaleString()}; profit decreases by the same amount.`,
    balanceSheet: `${accountName(accounting.settlementCode)} decreases by UGX ${total.toLocaleString()}. Equity ultimately decreases through the expense.`,
    cashFlow: `Operating cash outflow increases by UGX ${total.toLocaleString()}.`,
  };
}

export function balanceSheetJournalImpact(itemCode: string, offsetCode: string, category: "Assets" | "Liabilities" | "Equity" | "", action: "add" | "deduct", amountValue: number): AccountingImpact | null {
  const amount = positive(amountValue);
  if (!itemCode || !offsetCode || itemCode === offsetCode || !category || amount <= 0) return null;
  const normalIncreaseIsDebit = category === "Assets";
  const itemIsDebit = action === "add" ? normalIncreaseIsDebit : !normalIncreaseIsDebit;
  const debitCode = itemIsDebit ? itemCode : offsetCode;
  const creditCode = itemIsDebit ? offsetCode : itemCode;
  const cashCode = ["1000", "1010", "1020", "1030"].find(code => code === debitCode || code === creditCode);
  const cashFlow = !cashCode ? "No cash movement." : debitCode === cashCode ? `Cash or bank inflow of UGX ${amount.toLocaleString()}.` : `Cash or bank outflow of UGX ${amount.toLocaleString()}.`;
  return {
    lines: [line(debitCode, amount, 0), line(creditCode, 0, amount)],
    incomeStatement: "No direct effect because both sides are Balance Sheet accounts.",
    balanceSheet: `${accountName(debitCode)} is debited and ${accountName(creditCode)} is credited by the same amount, keeping the entry balanced.`,
    cashFlow,
  };
}
