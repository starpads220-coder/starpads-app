import type { ReactNode } from "react";
import type { FinancialStatements } from "@/lib/financial-statements";
import { formatUgx } from "@/components/accounts/StatementTable";
import type { buildAccounts } from "@/lib/accounts";
import { balanceSheetTotals, hiddenBalanceWarnings, retainedEarnings } from "@/lib/balance-sheet-sections";
import { formatAccountDate } from "@/lib/account-period";

export function BalanceSheetTab({ statement, report, end, excludedAllowance, children }: { statement: FinancialStatements; report: ReturnType<typeof buildAccounts>; end: string; excludedAllowance: number; children: ReactNode }) {
  const totals = balanceSheetTotals(report);
  const displayedAssets = totals.assets;
  const displayedDifference = totals.difference;
  const balanced = Math.abs(displayedDifference) < 0.01;
  return <div className="space-y-4">
    <div className="accounts-no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[{ label: "Bank and Cash", value: statement.balanceSheetCashBalance }, { label: "Total assets", value: displayedAssets }, { label: "Total liabilities", value: totals.liabilities }, { label: "Retained earnings", value: retainedEarnings(report) }, { label: "Total equity", value: totals.equity }].map(item => <div key={item.label} className="rounded-xl border bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p><p className="mt-2 text-lg font-bold tabular-nums">{formatUgx(item.value)}</p></div>)}
    </div>
    <p className="accounts-no-print text-sm text-gray-500">As at {formatAccountDate(end)}. Retained earnings include accumulated results through this date; the selected period’s net income is included once.</p>
    {Math.abs(statement.cashBalanceDifference) >= 0.01 && <p className="accounts-no-print rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Cash reconciliation difference: {formatUgx(statement.cashBalanceDifference)}. Cash Flow closing cash does not match the Balance Sheet cash balance.</p>}
    {Math.abs(excludedAllowance) >= 0.01 && <p className="accounts-no-print rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">A historical allowance balance of {formatUgx(excludedAllowance)} is excluded from Current Assets and the balance check. Its saved entries have not been changed.</p>}
    {hiddenBalanceWarnings(report).map(item => <p key={item.code} className="accounts-no-print rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Historical {item.name} ({item.code}) balance: {formatUgx(item.balance)}. This line is excluded from the Balance Sheet as requested; its entries remain saved. Please choose where to reclassify this balance.</p>)}
    <p className={`accounts-no-print rounded-lg border p-3 text-sm ${balanced ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{balanced ? "Balanced: Assets equal Liabilities plus Equity." : `Balance difference: ${formatUgx(displayedDifference)}.`}</p>
    {children}
  </div>;
}
