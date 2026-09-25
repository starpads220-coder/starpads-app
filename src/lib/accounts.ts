export const ACCOUNT_GROUPS = ["Current Assets", "Non-Current Assets", "Current Liabilities", "Non-Current Liabilities", "Equity", "Income", "Other Income", "Cost of Sales", "Expenses"] as const;
export type AccountGroup = typeof ACCOUNT_GROUPS[number];
export interface Account { code: string; name: string; group: AccountGroup }
const group = (group: AccountGroup, rows: [string, string][]): Account[] => rows.map(([code, name]) => ({ code, name, group }));
// Reference account codes retained. The reference repeats 6150; use a distinct ID for each row.
export const ACCOUNTS: Account[] = [
  ...group("Current Assets", [["1000", "Cash in Bank - Operating Bank"], ["1010", "Mobile Money - MTN"], ["1020", "Mobile Money - Airtel"], ["1030", "Petty Cash"], ["1100", "Accounts Receivable"], ["1110", "Allowance for Doubtful Accounts"], ["1240", "Inventory - Raw Materials"], ["1250", "Inventory - Work in Progress"], ["1260", "Inventory - Finished Goods"], ["1270", "Inventory - Packaging Material"], ["1320", "Prepaid Expenses - Insurance and Factory Rent"]]),
  ...group("Non-Current Assets", [["1540", "Factory Land and Buildings"], ["1630", "Machinery and Equipment"], ["1640", "Warehouse Equipment"], ["1650", "Quality Control and Laboratory"], ["1660", "Office Equipment and IT Infrastructure"], ["1830", "Accumulated Depreciation of Machinery"]]),
  ...group("Current Liabilities", [["2110", "Accounts Payable - Suppliers"], ["2120", "Accrued Wages and Payroll Liabilities"], ["2230", "Sales Tax / VAT Payable"], ["2240", "Short-Term Factory Loans"]]),
  ...group("Non-Current Liabilities", [["2340", "Long-Term Equipment Loans / Leases"], ["2350", "Mortgages Payable"]]),
  ...group("Equity", [["3000", "Common Stock / Capital Investment"], ["3050", "Retained Earnings"], ["3100", "Owner Drawings / Dividends"]]),
  ...group("Income", [["4080", "Sale of Pads"], ["4081", "Sale of Material"], ["4082", "Pad Trainings"], ["4083", "Grants and Donations"], ["4084", "Wholesale Revenue - Distributors, Supermarkets and B2B"], ["4085", "Direct-to-Consumer Sales"], ["4086", "Private Label / OEM Manufacturing Revenue"], ["4087", "Sales Returns and Allowances"], ["4088", "Cash Discounts Allowed"], ["4070", "Other Income"]]),
  ...group("Other Income", [["6210", "Gain/Loss on Asset Disposal"], ["6220", "Interest Income"]]),
  ...group("Cost of Sales", [["5070", "Inventory Adjustment"], ["5080", "Direct Materials"], ["5090", "Direct Labour"], ["5100", "Manufacturing Overheads"]]),
  ...group("Expenses", [["6010", "Salaries & Wages"], ["6020", "Security & Guarding"], ["6030", "Fuel & Transport"], ["6050", "Tools & Small Equipment"], ["6060", "Accounting & Audit Fees"], ["6070", "Legal & Professional Fees"], ["6080", "Office & Administration"], ["6090", "Land Lease Expense"], ["6101", "Electricity & Lighting"], ["6102", "Water"], ["6110", "Communications & Public Relations"], ["6111", "Internet & Data"], ["6112", "Marketing & Branding"], ["6120", "Insurance"], ["6130", "Repairs & Maintenance"], ["6140", "Bank Charges"], ["6141", "Mobile Money Charges"], ["6160", "Tax Penalties"], ["6170", "Operating Expenses"], ["6180", "General and Administrative Expenses"], ["6190", "Interest Expense"], ["6195", "Corporate Income Tax Expense"], ["6200", "Depreciation Expense"]]),
];
export const SALES_ENTRY_ACCOUNT_CODES = ["4080", "4081", "4082", "4083"] as const;
export const REMOVED_ACCOUNT_CODES = new Set([
  "4010", "4011", "4020", "4021", "4030", "4040", "4050", "4060",
  "5011", "5012", "5013", "5020", "5030", "5040", "5050", "5060",
  "6040", "6150", "6150-ND",
  "1500", "1510", "1520", "1530", "1600", "1610", "1620", "1700", "1710", "1800", "1810", "1820",
  "1200", "1210", "1300", "1310", "1400", "1900", "1990",
  "2310", "2320", "2330",
]);
export interface AccountingSelection { accountCode: string; accountGroup: AccountGroup; accountName: string; settlementCode: string; accountDetail?: string }
export const emptyAccounting = (): AccountingSelection => ({ accountCode: "", accountGroup: "Income", accountName: "", settlementCode: "", accountDetail: "" });
export const SETTLEMENT_CODES = ["1000", "1010", "1020", "1030"];
export function validateAccounting(value: AccountingSelection, kind: "sale" | "expense") {
  const allowed = kind === "sale" ? ["Income", "Other Income"] : ["Cost of Sales", "Expenses"];
  const known = ACCOUNTS.find(a => a.code === value.accountCode);
  const needsDetail = kind === "expense" && ["5080", "5090"].includes(value.accountCode);
  if (!allowed.includes(value.accountGroup) || !value.accountName.trim() || (!known && !value.accountCode.startsWith("custom:")) || (known && known.group !== value.accountGroup) || !SETTLEMENT_CODES.includes(value.settlementCode) || (needsDetail && !value.accountDetail?.trim())) throw new Error(needsDetail ? "Enter the specific direct material or direct labour details." : "Select an account / subcategory and cash/bank account.");
  return { ...value, accountName: value.accountName.trim(), accountDetail: value.accountDetail?.trim() ?? "" };
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
      const detailCode = kind === "expense" && ["5080", "5090"].includes(a.accountCode) && a.accountDetail?.trim()
        ? `detail:${a.accountCode}:${a.accountDetail.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
        : a.accountCode;
      catalog.set(detailCode, { code: detailCode, name: a.accountDetail?.trim() ? `${a.accountName} — ${a.accountDetail.trim()}` : a.accountName, group: a.accountGroup });
      post(entry.date, kind === "sale" ? a.settlementCode : detailCode, kind === "sale" ? detailCode : a.settlementCode, kind === "sale" ? entry.totalAmount ?? 0 : entry.amountUgx ?? 0);
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
