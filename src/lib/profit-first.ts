const configuredStartDate = process.env.NEXT_PUBLIC_PROFIT_FIRST_START_DATE || "0001-01-01";
if (!/^\d{4}-\d{2}-\d{2}$/.test(configuredStartDate)) throw new Error("NEXT_PUBLIC_PROFIT_FIRST_START_DATE must use YYYY-MM-DD format.");
export const PROFIT_FIRST_START_DATE = configuredStartDate;

export const PROFIT_FIRST_ALLOCATION = {
  profit: 22,
  ownerCompensation: 10,
  tax: 16,
  operatingExpenses: 52,
} as const;

export type ProfitAccountKey = keyof typeof PROFIT_FIRST_ALLOCATION;

export const PROFIT_ACCOUNT_LABELS: Record<ProfitAccountKey, string> = {
  profit: "Profit",
  ownerCompensation: "Owner's Compensation",
  tax: "Tax",
  operatingExpenses: "Operating Expenses",
};

const allocationTotal = Object.values(PROFIT_FIRST_ALLOCATION).reduce((sum, value) => sum + value, 0);
if (allocationTotal !== 100) throw new Error(`Profit First allocation must equal 100%; received ${allocationTotal}%.`);

export interface ProfitSale { id: string; date: string; totalAmount?: number; invoiceNumber?: string; customerName?: string; status?: string }
export interface ProfitExpense {
  id: string; date: string; amountUgx?: number; description?: string; receiptRef?: string; category?: string; subcategory?: string;
  accounting?: { accountCode?: string; accountName?: string }; payrollExpenseVersion?: number; netPayAmount?: number;
  grossAmount?: number; totalAmount?: number; payeeTax?: number; nssfEmployeeDeduction?: number; nssfBusinessContribution?: number;
}
export interface ProfitPayment {
  id: string; paidDate?: string; status?: string; payrollVersion?: number; accountingTreatment?: string; netPayAmount?: number;
  amountUgx?: number; grossAmount?: number; totalAmount?: number; payeeTax?: number; nssfEmployeeDeduction?: number;
  nssfBusinessContribution?: number; receiptNumber?: string;
}
export interface ProfitJournal { id: string; date: string; debitCode?: string; creditCode?: string; amount?: number; description?: string; simplifiedItemCode?: string; simplifiedAction?: string }
export interface ProfitRemittance { id: string; paymentDate?: string; amount?: number; returnPeriod?: string; uraReference?: string; reference?: string; notes?: string }
export interface ProfitTaxEntry { id: string; date: string; amount?: number; description?: string }

export interface ProfitLedgerEntry {
  key: string;
  account: ProfitAccountKey;
  date: string;
  source: string;
  sourceId: string;
  reference: string;
  description: string;
  inflow: number;
  outflow: number;
  href: string;
}

export interface ProfitAccountSummary { allocated: number; deducted: number; balance: number; usedPercent: number }
export interface AccruedTaxSummary { label: string; accrued: number; paid: number; unpaid: number }
export interface ProfitFirstResult {
  ledger: ProfitLedgerEntry[];
  accounts: Record<ProfitAccountKey, ProfitAccountSummary>;
  totalSales: number;
  totalAllocated: number;
  totalDeducted: number;
  totalRemaining: number;
  accruedTaxes: AccruedTaxSummary[];
}

export interface ProfitFirstSources {
  sales: ProfitSale[];
  expenses: ProfitExpense[];
  payments: ProfitPayment[];
  journals: ProfitJournal[];
  payeRemittances: ProfitRemittance[];
  nssfRemittances: ProfitRemittance[];
  taxEntries: ProfitTaxEntry[];
}

const cashCodes = new Set(["1000", "1010", "1020", "1030"]);
const amount = (value: unknown) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
const inPeriod = (date: string | undefined, start: string, end: string) => Boolean(date && date >= start && date <= end && date >= PROFIT_FIRST_START_DATE);
const add = (ledger: ProfitLedgerEntry[], entry: ProfitLedgerEntry) => {
  if (entry.inflow > 0 || entry.outflow > 0) ledger.push(entry);
};

export function allocateSale(totalValue: number): Record<ProfitAccountKey, number> {
  const total = Math.round(amount(totalValue));
  const profit = Math.round(total * PROFIT_FIRST_ALLOCATION.profit / 100);
  const ownerCompensation = Math.round(total * PROFIT_FIRST_ALLOCATION.ownerCompensation / 100);
  const tax = Math.round(total * PROFIT_FIRST_ALLOCATION.tax / 100);
  return { profit, ownerCompensation, tax, operatingExpenses: total - profit - ownerCompensation - tax };
}

const isSalaryExpense = (entry: ProfitExpense) => entry.accounting?.accountCode === "6010"
  || entry.accounting?.accountName?.trim().toLowerCase() === "salaries and wages";
const payrollNet = (entry: ProfitExpense | ProfitPayment) => amount(entry.netPayAmount)
  || Math.max(0, amount(entry.grossAmount ?? entry.totalAmount ?? entry.amountUgx)
    - amount(entry.payeeTax) - amount(entry.nssfEmployeeDeduction));
const payrollAffectsAccounts = (entry: ProfitPayment) => entry.accountingTreatment !== "historical_already_settled";
const saleIsActive = (entry: ProfitSale) => !["void", "voided", "cancelled", "canceled", "reversed"].includes((entry.status || "").toLowerCase());

export function deriveProfitFirst(sources: ProfitFirstSources, start = PROFIT_FIRST_START_DATE, end = "9999-12-31"): ProfitFirstResult {
  const ledger: ProfitLedgerEntry[] = [];
  const filteredSales = sources.sales.filter(entry => saleIsActive(entry) && inPeriod(entry.date, start, end) && amount(entry.totalAmount) > 0);

  for (const sale of filteredSales) {
    const allocations = allocateSale(amount(sale.totalAmount));
    for (const account of Object.keys(allocations) as ProfitAccountKey[]) add(ledger, {
      key: `sale:${sale.id}:${account}`, account, date: sale.date, source: "Sales Entries", sourceId: sale.id,
      reference: sale.invoiceNumber || sale.id, description: sale.customerName ? `Sale to ${sale.customerName}` : "Sales revenue allocation",
      inflow: allocations[account], outflow: 0, href: "/sales",
    });
  }

  for (const expense of sources.expenses.filter(entry => inPeriod(entry.date, start, end))) {
    const salary = isSalaryExpense(expense);
    const deduction = salary ? (expense.payrollExpenseVersion === 2 ? payrollNet(expense) : amount(expense.amountUgx)) : amount(expense.amountUgx);
    add(ledger, {
      key: `expense:${expense.id}`, account: salary ? "ownerCompensation" : "operatingExpenses", date: expense.date,
      source: salary ? "Expenses · Salaries and Wages" : "Expenses", sourceId: expense.id, reference: expense.receiptRef || expense.id,
      description: expense.description || expense.accounting?.accountName || expense.subcategory || expense.category || "Expense",
      inflow: 0, outflow: deduction, href: "/expenses",
    });
  }

  for (const payment of sources.payments.filter(entry => entry.status === "paid" && payrollAffectsAccounts(entry) && inPeriod(entry.paidDate, start, end))) add(ledger, {
    key: `payment:${payment.id}`, account: "ownerCompensation", date: payment.paidDate!, source: "Payments · Production payroll",
    sourceId: payment.id, reference: payment.receiptNumber || payment.id, description: "Confirmed production payment (net pay)",
    inflow: 0, outflow: payrollNet(payment), href: "/payments",
  });

  for (const journal of sources.journals.filter(entry => inPeriod(entry.date, start, end))) {
    if (journal.debitCode === "3100" && cashCodes.has(journal.creditCode || "")) add(ledger, {
      key: `journal:${journal.id}:dividend`, account: "profit", date: journal.date, source: "Record Journal · Dividends",
      sourceId: journal.id, reference: journal.id, description: journal.description || "Dividend paid", inflow: 0,
      outflow: amount(journal.amount), href: "/accounts",
    });
    if (journal.debitCode === "2250" && cashCodes.has(journal.creditCode || "")) add(ledger, {
      key: `journal:${journal.id}:income-tax`, account: "tax", date: journal.date, source: "Record Journal · Income tax payment",
      sourceId: journal.id, reference: journal.id, description: journal.description || "Income tax paid", inflow: 0,
      outflow: amount(journal.amount), href: "/accounts",
    });
  }

  for (const remittance of sources.payeRemittances.filter(entry => inPeriod(entry.paymentDate, start, end))) add(ledger, {
    key: `paye:${remittance.id}`, account: "tax", date: remittance.paymentDate!, source: "Payments · PAYE remittance",
    sourceId: remittance.id, reference: remittance.uraReference || remittance.returnPeriod || remittance.id,
    description: remittance.notes || "PAYE paid to URA", inflow: 0, outflow: amount(remittance.amount), href: "/payments",
  });
  for (const remittance of sources.nssfRemittances.filter(entry => inPeriod(entry.paymentDate, start, end))) add(ledger, {
    key: `nssf:${remittance.id}`, account: "tax", date: remittance.paymentDate!, source: "Payments · NSSF remittance",
    sourceId: remittance.id, reference: remittance.reference || remittance.returnPeriod || remittance.id,
    description: remittance.notes || "NSSF paid", inflow: 0, outflow: amount(remittance.amount), href: "/payments",
  });

  ledger.sort((a, b) => a.date.localeCompare(b.date) || Number(b.inflow > 0) - Number(a.inflow > 0) || a.key.localeCompare(b.key));
  const accountKeys = Object.keys(PROFIT_FIRST_ALLOCATION) as ProfitAccountKey[];
  const accounts = Object.fromEntries(accountKeys.map(key => {
    const entries = ledger.filter(entry => entry.account === key);
    const allocated = entries.reduce((sum, entry) => sum + entry.inflow, 0);
    const deducted = entries.reduce((sum, entry) => sum + entry.outflow, 0);
    return [key, { allocated, deducted, balance: allocated - deducted, usedPercent: allocated > 0 ? deducted / allocated * 100 : deducted > 0 ? Infinity : 0 }];
  })) as Record<ProfitAccountKey, ProfitAccountSummary>;

  const periodPayments = sources.payments.filter(entry => entry.status === "paid" && payrollAffectsAccounts(entry) && inPeriod(entry.paidDate, start, end));
  const periodSalaryExpenses = sources.expenses.filter(entry => isSalaryExpense(entry) && entry.payrollExpenseVersion === 2 && inPeriod(entry.date, start, end));
  const payeAccrued = [...periodPayments, ...periodSalaryExpenses].reduce((sum, entry) => sum + amount(entry.payeeTax), 0);
  const nssfAccrued = [...periodPayments, ...periodSalaryExpenses].reduce((sum, entry) => sum + amount(entry.nssfEmployeeDeduction) + amount(entry.nssfBusinessContribution), 0);
  const incomeTaxAccrued = sources.taxEntries.filter(entry => inPeriod(entry.date, start, end)).reduce((sum, entry) => sum + amount(entry.amount), 0);
  const payePaid = sources.payeRemittances.filter(entry => inPeriod(entry.paymentDate, start, end)).reduce((sum, entry) => sum + amount(entry.amount), 0);
  const nssfPaid = sources.nssfRemittances.filter(entry => inPeriod(entry.paymentDate, start, end)).reduce((sum, entry) => sum + amount(entry.amount), 0);
  const incomeTaxPaid = sources.journals.filter(entry => inPeriod(entry.date, start, end) && entry.debitCode === "2250" && cashCodes.has(entry.creditCode || "")).reduce((sum, entry) => sum + amount(entry.amount), 0);
  const accruedTaxes = [
    { label: "PAYE", accrued: payeAccrued, paid: payePaid, unpaid: Math.max(0, payeAccrued - payePaid) },
    { label: "NSSF", accrued: nssfAccrued, paid: nssfPaid, unpaid: Math.max(0, nssfAccrued - nssfPaid) },
    { label: "Income Tax Payable", accrued: incomeTaxAccrued, paid: incomeTaxPaid, unpaid: Math.max(0, incomeTaxAccrued - incomeTaxPaid) },
  ];
  const totalSales = filteredSales.reduce((sum, sale) => sum + Math.round(amount(sale.totalAmount)), 0);
  const totalAllocated = Object.values(accounts).reduce((sum, account) => sum + account.allocated, 0);
  const totalDeducted = Object.values(accounts).reduce((sum, account) => sum + account.deducted, 0);
  return { ledger, accounts, totalSales, totalAllocated, totalDeducted, totalRemaining: totalAllocated - totalDeducted, accruedTaxes };
}
