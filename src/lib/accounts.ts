export const ACCOUNT_GROUPS = ["Current Assets", "Non-Current Assets", "Current Liabilities", "Non-Current Liabilities", "Equity", "Income", "Other Income", "Cost of Sales", "Expenses"] as const;
export type AccountGroup = typeof ACCOUNT_GROUPS[number];
export interface Account { code: string; name: string; group: AccountGroup }
const group = (group: AccountGroup, rows: [string, string][]): Account[] => rows.map(([code, name]) => ({ code, name, group }));
// Reference account codes retained. The reference repeats 6150; use a distinct ID for each row.
export const ACCOUNTS: Account[] = [
  ...group("Current Assets", [["1000", "Stanbic Bank - Operations"], ["1010", "Mobile Money - MTN"], ["1020", "Mobile Money - Airtel"], ["1030", "Petty Cash"], ["1200", "Inventory - Trade Goods"], ["1210", "Inventory - Agricultural Inputs"], ["1300", "Prepaid Expenses"], ["1310", "VAT Input (Recoverable)"], ["1400", "Biological Assets - Livestock"], ["1900", "Undeposited Funds"], ["1990", "Suspense Account"]]),
  ...group("Non-Current Assets", [["1500", "Leasehold Improvements"], ["1510", "Buildings - Caretaker Cottage"], ["1520", "Buildings - Other Infrastructure"], ["1530", "Drainage & Irrigation Infrastructure"], ["1600", "Equipment & Tools"], ["1610", "Motorcycles & Vehicles"], ["1620", "Sawmill Equipment"], ["1700", "Biological Assets - Forestry"], ["1710", "Biological Assets - Fruit Trees"], ["1800", "Accumulated Depreciation - Buildings"], ["1810", "Accumulated Depreciation - Equipment"], ["1820", "Accumulated Depreciation - Vehicles"]]),
  ...group("Current Liabilities", [["2090", "Clearing Account"], ["2100", "Accrued Expenses"], ["2200", "VAT Payable"], ["2210", "Withholding Tax Payable"], ["2220", "PAYE Payable"]]),
  ...group("Non-Current Liabilities", [["2310", "Bank Loan - Stanbic"], ["2320", "Equipment Financing"], ["2330", "Director Loan Account"]]),
  ...group("Equity", [["3000", "Owner Capital"], ["3100", "Owner Drawings"]]),
  ...group("Income", [["4080", "Sale of Pads"], ["4081", "Sale of Material"], ["4082", "Pad Trainings"], ["4083", "Grants and Donations"], ["4010", "Charcoal Sales - Bulk"], ["4011", "Charcoal Sales - Retail"], ["4020", "Timber Sales - Raw"], ["4021", "Timber Sales - Processed"], ["4030", "Agricultural Produce Sales"], ["4040", "Land Rental Income"], ["4050", "Trade Sales - Cook Stoves"], ["4060", "Other Trading Income"], ["4070", "Other Income"]]),
  ...group("Other Income", [["6210", "Gain/Loss on Asset Disposal"]]),
  ...group("Cost of Sales", [["5011", "Raw Materials - Charcoal"], ["5012", "Labour - Charcoal"], ["5013", "Transport - Charcoal"], ["5020", "Timber Processing Costs"], ["5030", "Agricultural Production Costs"], ["5040", "Livestock Production Costs"], ["5050", "Casual Labour - Project Based"], ["5060", "Trade Inventory Cost"], ["5070", "Inventory Adjustment"]]),
  ...group("Expenses", [["6010", "Salaries & Wages"], ["6020", "Security & Guarding"], ["6030", "Fuel & Transport"], ["6040", "Drainage Maintenance"], ["6050", "Tools & Small Equipment"], ["6060", "Accounting & Audit Fees"], ["6070", "Legal & Professional Fees"], ["6080", "Office & Administration"], ["6090", "Land Lease Expense"], ["6101", "Electricity & Lighting"], ["6102", "Water"], ["6110", "Communications & Public Relations"], ["6111", "Internet & Data"], ["6112", "Marketing & Branding"], ["6120", "Insurance"], ["6130", "Repairs & Maintenance"], ["6140", "Bank Charges"], ["6141", "Mobile Money Charges"], ["6150", "Exchange Gain/Loss"], ["6150-ND", "Non-Deductible Expenses"], ["6160", "Tax Penalties"], ["6200", "Depreciation Expense"]]),
];
export const SALES_ENTRY_ACCOUNT_CODES = ["4080", "4081", "4082", "4083"] as const;
export interface AccountingSelection { accountCode: string; accountGroup: AccountGroup; accountName: string; settlementCode: string }
export const emptyAccounting = (): AccountingSelection => ({ accountCode: "", accountGroup: "Income", accountName: "", settlementCode: "" });
export const SETTLEMENT_CODES = ["1000", "1010", "1020", "1030", "1900"];
export function validateAccounting(value: AccountingSelection, kind: "sale" | "expense") {
  const allowed = kind === "sale" ? ["Income", "Other Income"] : ["Cost of Sales", "Expenses"];
  const known = ACCOUNTS.find(a => a.code === value.accountCode);
  if (!allowed.includes(value.accountGroup) || !value.accountName.trim() || (!known && !value.accountCode.startsWith("custom:")) || (known && known.group !== value.accountGroup) || !SETTLEMENT_CODES.includes(value.settlementCode)) throw new Error("Select an accounting category, subcategory, and cash/bank account.");
  return { ...value, accountName: value.accountName.trim() };
}
export interface LedgerSource { id: string; date: string; accounting?: AccountingSelection; totalAmount?: number; amountUgx?: number }
export interface Journal { id: string; date: string; debitCode: string; creditCode: string; amount: number; description: string }
export function buildAccounts(sales: LedgerSource[], expenses: LedgerSource[], journals: Journal[], start: string, end: string) {
  const catalog = new Map(ACCOUNTS.map(a => [a.code, a]));
  const balances: Record<string, number> = {}, movement: Record<string, number> = {};
  let unclassified = 0;
  const post = (date: string, debit: string, credit: string, amount: number) => {
    if (date > end || !Number.isFinite(amount)) return;
    balances[debit] = (balances[debit] || 0) + amount;
    balances[credit] = (balances[credit] || 0) - amount;
    if (date >= start) {
      movement[debit] = (movement[debit] || 0) + amount;
      movement[credit] = (movement[credit] || 0) - amount;
    }
  };
  for (const [kind, entries] of [["sale", sales], ["expense", expenses]] as const) {
    for (const entry of entries) {
      if (entry.date > end) continue;
      const a = entry.accounting;
      try { if (!a) throw new Error(); validateAccounting(a, kind); }
      catch { unclassified++; continue; }
      if (!a) continue;
      catalog.set(a.accountCode, { code: a.accountCode, name: a.accountName, group: a.accountGroup });
      post(entry.date, kind === "sale" ? a.settlementCode : a.accountCode, kind === "sale" ? a.accountCode : a.settlementCode, kind === "sale" ? entry.totalAmount ?? 0 : entry.amountUgx ?? 0);
    }
  }
  journals.forEach(j => post(j.date, j.debitCode, j.creditCode, j.amount));
  const rows = [...catalog.values()].map(a => {
    const creditNormal = ["Current Liabilities", "Non-Current Liabilities", "Equity", "Income", "Other Income"].includes(a.group);
    return { ...a, balance: (balances[a.code] || 0) * (creditNormal ? -1 : 1), movement: (movement[a.code] || 0) * (creditNormal ? -1 : 1) };
  });
  const sum = (groups: string[], field: "balance" | "movement") => rows.filter(a => groups.includes(a.group)).reduce((s, a) => s + a[field], 0);
  const profit = (field: "balance" | "movement") => sum(["Income", "Other Income"], field) - sum(["Cost of Sales", "Expenses"], field);
  return { rows, unclassified, profit: profit("movement"), accumulatedProfit: profit("balance"), assets: sum(["Current Assets", "Non-Current Assets"], "balance"), liabilities: sum(["Current Liabilities", "Non-Current Liabilities"], "balance"), equity: sum(["Equity"], "balance") + profit("balance") };
}
