import { REMOVED_ACCOUNT_CODES, type buildAccounts } from "@/lib/accounts";
import { currentAssetLines, excludedAllowanceBalance } from "@/lib/balance-sheet-current-assets";

type Report = ReturnType<typeof buildAccounts>;
type Field = "balance" | "movement";

const HIDDEN_FIXED_ASSET = "1650";
const HIDDEN_MORTGAGE = "2350";

export function hiddenBalance(report: Report, code: string, field: Field = "balance") {
  return report.rows.find(row => row.code === code)?.[field] ?? 0;
}

export function retainedEarnings(report: Report, field: Field = "balance") {
  return hiddenBalance(report, "3050", field) + (field === "balance" ? report.accumulatedProfit : report.profit);
}

export function balanceSheetRows(report: Report, group: string) {
  if (group === "Current Assets") return currentAssetLines(report);
  return report.rows.filter(row => row.group === group && !REMOVED_ACCOUNT_CODES.has(row.code)
    && row.code !== HIDDEN_FIXED_ASSET && row.code !== HIDDEN_MORTGAGE)
    .map(row => row.code === "3050" ? { ...row, balance: retainedEarnings(report), movement: retainedEarnings(report, "movement") } : row);
}

export function balanceSheetGroupTotal(report: Report, group: string, field: Field = "balance") {
  const total = report.rows.filter(row => row.group === group).reduce((sum, row) => sum + row[field], 0);
  if (group === "Current Assets") return total - (field === "balance" ? excludedAllowanceBalance(report) : hiddenBalance(report, "1110", field));
  if (group === "Non-Current Assets") return total - hiddenBalance(report, HIDDEN_FIXED_ASSET, field);
  if (group === "Non-Current Liabilities") return total - hiddenBalance(report, HIDDEN_MORTGAGE, field);
  if (group === "Equity") return total + (field === "balance" ? report.accumulatedProfit : report.profit);
  return total;
}

export function balanceSheetTotals(report: Report) {
  const assets = balanceSheetGroupTotal(report, "Current Assets") + balanceSheetGroupTotal(report, "Non-Current Assets");
  const liabilities = balanceSheetGroupTotal(report, "Current Liabilities") + balanceSheetGroupTotal(report, "Non-Current Liabilities");
  const equity = balanceSheetGroupTotal(report, "Equity");
  return { assets, liabilities, equity, difference: assets - liabilities - equity };
}

export function hiddenBalanceWarnings(report: Report) {
  return [
    { code: HIDDEN_FIXED_ASSET, name: "Quality Control and Laboratory", balance: hiddenBalance(report, HIDDEN_FIXED_ASSET) },
    { code: HIDDEN_MORTGAGE, name: "Mortgages Payable", balance: hiddenBalance(report, HIDDEN_MORTGAGE) },
  ].filter(item => Math.abs(item.balance) >= 0.01);
}
