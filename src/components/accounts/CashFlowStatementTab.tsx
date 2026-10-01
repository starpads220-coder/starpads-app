import type { FinancialStatements } from "@/lib/financial-statements";
import { StatementTable } from "@/components/accounts/StatementTable";

export function CashFlowStatementTab({ statement, start, end }: { statement: FinancialStatements; start: string; end: string }) {
  return <StatementTable title="Cash Flow Statement" subtitle={`${start} to ${end} · Ending cash is bound to the cash accounts on the Balance Sheet.`} rows={[
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
  ]} />;
}
