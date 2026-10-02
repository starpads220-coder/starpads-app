import type { ReactNode } from "react";
import type { FinancialStatements } from "@/lib/financial-statements";
import { formatUgx } from "@/components/accounts/StatementTable";

export function BalanceSheetTab({ statement, excludedAllowance, children }: { statement: FinancialStatements; excludedAllowance: number; children: ReactNode }) {
  const displayedAssets = statement.assets - excludedAllowance;
  const displayedDifference = statement.balanceDifference - excludedAllowance;
  const balanced = Math.abs(displayedDifference) < 0.01;
  return <div className="space-y-4">
    <div className="accounts-no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[{ label: "Bank and Cash", value: statement.endingCashBalance }, { label: "Total assets", value: displayedAssets }, { label: "Total liabilities", value: statement.liabilities }, { label: "Retained earnings", value: statement.retainedEarnings }, { label: "Total equity", value: statement.equity }].map(item => <div key={item.label} className="rounded-xl border bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p><p className="mt-2 text-lg font-bold tabular-nums">{formatUgx(item.value)}</p></div>)}
    </div>
    <p className="accounts-no-print text-sm text-gray-500">The selected period’s net income of {formatUgx(statement.netIncome)} flows into retained earnings; ending cash matches the Cash Flow Statement.</p>
    {Math.abs(excludedAllowance) >= 0.01 && <p className="accounts-no-print rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">A historical allowance balance of {formatUgx(excludedAllowance)} is excluded from Current Assets and the balance check. Its saved entries have not been changed.</p>}
    <p className={`accounts-no-print rounded-lg border p-3 text-sm ${balanced ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{balanced ? "Balanced: Assets equal Liabilities plus Equity." : `Balance difference: ${formatUgx(displayedDifference)}.`}</p>
    {children}
  </div>;
}
