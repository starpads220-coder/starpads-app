import type { ReactNode } from "react";
import type { FinancialStatements } from "@/lib/financial-statements";
import { formatUgx } from "@/components/accounts/StatementTable";

export function BalanceSheetTab({ statement, children }: { statement: FinancialStatements; children: ReactNode }) {
  const balanced = Math.abs(statement.balanceDifference) < 0.01;
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[{ label: "Cash asset", value: statement.endingCashBalance }, { label: "Total assets", value: statement.assets }, { label: "Total liabilities", value: statement.liabilities }, { label: "Retained earnings", value: statement.retainedEarnings }, { label: "Total equity", value: statement.equity }].map(item => <div key={item.label} className="rounded-xl border bg-white p-4"><p className="text-xs font-medium uppercase tracking-wide text-gray-500">{item.label}</p><p className="mt-2 text-lg font-bold tabular-nums">{formatUgx(item.value)}</p></div>)}
    </div>
    <p className="text-sm text-gray-500">The selected period’s net income of {formatUgx(statement.netIncome)} flows into retained earnings; ending cash matches the Cash Flow Statement.</p>
    <p className={`rounded-lg border p-3 text-sm ${balanced ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>{balanced ? "Balanced: Assets equal Liabilities plus Equity." : `Balance difference: ${formatUgx(statement.balanceDifference)}.`}</p>
    {children}
  </div>;
}
