import type { FinancialStatements } from "@/lib/financial-statements";
import { StatementTable } from "@/components/accounts/StatementTable";

export function CashFlowStatementTab({ statement, start, end }: { statement: FinancialStatements; start: string; end: string }) {
  return <StatementTable title="Cash Flow Statement" subtitle={`${start} to ${end} · Ending cash is bound to the cash accounts on the Balance Sheet.`} rows={[
    { label: "Operating cash flows", kind: "section" },
    { label: "Cash received from sales", amount: statement.cashInflows },
    { label: "Cash paid for expenses", amount: -statement.cashOutflows },
    { label: "Account journal cash adjustments", amount: statement.cashAdjustments },
    { label: "Net cash flow", amount: statement.netCashFlow, kind: "total" },
    { label: "Cash reconciliation", kind: "section" },
    { label: "Beginning cash balance", amount: statement.beginningCashBalance },
    { label: "Ending cash balance", amount: statement.endingCashBalance, kind: "grand" },
  ]} />;
}
