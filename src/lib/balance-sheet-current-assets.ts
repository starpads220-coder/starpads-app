import { REMOVED_ACCOUNT_CODES, type buildAccounts } from "@/lib/accounts";

type AccountsReport = ReturnType<typeof buildAccounts>;
type AccountRow = AccountsReport["rows"][number];

const CASH_CODES = new Set(["1010", "1020", "1030"]);
const PREPAID_NAMES = new Set([
  "prepaid expenses - insurance",
  "prepaid expenses - factory rent",
  "prepaid expenses - insurance and factory rent",
]);

const isPrepaid = (row: AccountRow) => row.code === "1320" || PREPAID_NAMES.has(row.name.trim().toLowerCase());
const sum = (rows: AccountRow[], field: "balance" | "movement") => rows.reduce((total, row) => total + row[field], 0);

export function excludedAllowanceBalance(report: AccountsReport) {
  return sum(report.rows.filter(row => row.group === "Current Assets" && row.code === "1110"), "balance");
}

export function balanceSheetAssets(report: AccountsReport) {
  return report.assets - excludedAllowanceBalance(report);
}

export function currentAssetLines(report: AccountsReport) {
  const rows = report.rows.filter(row => row.group === "Current Assets" && (!REMOVED_ACCOUNT_CODES.has(row.code) || isPrepaid(row)) && row.code !== "1110");
  const bank = rows.filter(row => row.code === "1000");
  const cash = rows.filter(row => CASH_CODES.has(row.code));
  const prepaid = rows.filter(isPrepaid);
  const rest = rows.filter(row => row.code !== "1000" && !CASH_CODES.has(row.code) && !isPrepaid(row));
  return [
    { code: "balance-bank", name: "Bank", balance: sum(bank, "balance"), movement: sum(bank, "movement") },
    { code: "balance-cash", name: "Cash", balance: sum(cash, "balance"), movement: sum(cash, "movement") },
    ...rest.map(row => ({ code: row.code, name: row.name, balance: row.balance, movement: row.movement })),
    { code: "balance-prepaid", name: "Prepaid Expenses", balance: sum(prepaid, "balance"), movement: sum(prepaid, "movement") },
  ];
}

export function balanceSheetAccountName(code: string, name: string) {
  if (code === "1000") return "Bank";
  if (code === "1010") return "Cash (Mobile Money [MTN])";
  if (code === "1020") return "Cash (Mobile Money [Airtel])";
  if (code === "1030") return "Cash (physical)";
  if (code === "1320" || PREPAID_NAMES.has(name.trim().toLowerCase())) return "Prepaid Expenses";
  return name;
}
