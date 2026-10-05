import type { FinancialStatements } from "@/lib/financial-statements";
import { formatUgx, StatementTable } from "@/components/accounts/StatementTable";
import { formatAccountDate } from "@/lib/account-period";

export function CashFlowStatementTab({ statement, start, end }: { statement: FinancialStatements; start: string; end: string }) {
  return <div className="space-y-3"><StatementTable title="Cash Flow Statement" subtitle={`${formatAccountDate(start)} to ${formatAccountDate(end)} · Cash movements are measured within the selected period.`} rows={[
    { label: "Cash flows from operating activities", kind: "section" },
    { label: "Net income", amount: statement.netIncome },
    { label: "Non-cash expenses added back", amount: statement.nonCashAdjustments },
    { label: "Changes in working capital", amount: statement.workingCapitalAdjustments },
    { label: "Net cash from operating activities", amount: statement.operatingCashFlow, kind: "total" },
    { label: "Cash flows from investing activities", kind: "section" },
    { label: "Net cash from investing activities", amount: statement.investingCashFlow, kind: "total" },
    { label: "Cash flows from financing activities", kind: "section" },
    { label: "Net cash from financing activities", amount: statement.financingCashFlow, kind: "total" },
    ...(Math.abs(statement.otherCashFlow) >= 0.01 ? [{ label: "Other cash movements / reconciliation", amount: statement.otherCashFlow }] : []),
    { label: "Net cash flow", amount: statement.netCashFlow, kind: "total" },
    { label: "Cash reconciliation", kind: "section" },
    { label: "Beginning cash balance", amount: statement.beginningCashBalance },
    { label: "Ending cash balance", amount: statement.endingCashBalance, kind: "grand" },
  ]} />{Math.abs(statement.cashBalanceDifference) >= 0.01 && <p role="alert" className="accounts-no-print rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Reconciliation warning: closing cash differs from Balance Sheet cash by {formatUgx(statement.cashBalanceDifference)}.</p>}</div>;
}
