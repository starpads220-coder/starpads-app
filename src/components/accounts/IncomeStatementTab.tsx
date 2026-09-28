import type { FinancialStatements } from "@/lib/financial-statements";
import { StatementTable } from "@/components/accounts/StatementTable";

export function IncomeStatementTab({ statement, start, end }: { statement: FinancialStatements; start: string; end: string }) {
  return <StatementTable title="Income Statement (Profit & Loss)" subtitle={`${start} to ${end} · Revenue and expenses update automatically from their entry forms.`} rows={[
    { label: "Revenue", kind: "section" },
    { label: "Sales revenue", amount: statement.revenue },
    { label: "Total revenue", amount: statement.revenue, kind: "total" },
    { label: "Cost of Goods Sold", kind: "section" },
    { label: "Cost of goods sold", amount: statement.costOfGoodsSold },
    { label: "Gross profit", amount: statement.grossProfit, kind: "total" },
    { label: "Operating Expenses", kind: "section" },
    { label: "Operating expenses", amount: statement.operatingExpenses },
    { label: "Net income", amount: statement.netIncome, kind: "grand" },
  ]} />;
}
