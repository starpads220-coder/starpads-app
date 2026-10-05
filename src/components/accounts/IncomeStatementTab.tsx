"use client";
import { useState } from "react";
import type { FinancialStatements } from "@/lib/financial-statements";
import { formatUgx } from "@/components/accounts/StatementTable";
import { formatAccountDate } from "@/lib/account-period";

export function IncomeStatementTab({ statement, start, end }: { statement: FinancialStatements; start: string; end: string }) {
  const [otherIncomeOpen, setOtherIncomeOpen] = useState(false);
  const [operatingExpensesOpen, setOperatingExpensesOpen] = useState(false);
  const line = (label: string, amount: number, key = label, className = "") => <tr key={key} className={`border-t border-gray-100 ${className}`}><td className="px-5 py-3 pl-8 text-gray-700">{label}</td><td className="px-5 py-3 text-right tabular-nums">{formatUgx(amount)}</td></tr>;
  const section = (label: string) => <tr key={label} className="bg-gray-50"><th colSpan={2} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">{label}</th></tr>;
  const total = (label: string, amount: number, grand = false) => <tr key={label} className={grand ? "border-y-4 border-double border-gray-900 font-bold" : "border-t-2 border-gray-500 font-semibold"}><td className="px-5 py-3 text-gray-900">{label}</td><td className="px-5 py-3 text-right tabular-nums">{formatUgx(amount)}</td></tr>;
  return <section className="overflow-hidden rounded-xl border bg-white">
    <div className="accounts-no-print border-b px-5 py-4"><h2 className="text-xl font-bold text-gray-900">Income Statement (Profit &amp; Loss)</h2><p className="mt-1 text-sm text-gray-500">{formatAccountDate(start)} to {formatAccountDate(end)} · Revenue and expenses update automatically from their entry forms.</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><tbody>
      {section("Revenue")}
      {line("Sales of Pads", statement.salesOfPads)}
      <tr className="border-t border-gray-100"><td className="px-5 py-3 pl-8"><button type="button" aria-expanded={otherIncomeOpen} onClick={() => setOtherIncomeOpen(open => !open)} className="accounts-no-print font-medium text-blue-700 hover:underline">Other Income <span aria-hidden="true">{otherIncomeOpen ? "▴" : "▾"}</span></button><span className="hidden print:inline">Other Income</span></td><td className="px-5 py-3 text-right tabular-nums">{formatUgx(statement.otherIncome)}</td></tr>
      {line("Sales of Materials", statement.salesOfMaterials, "materials", otherIncomeOpen ? "" : "hidden print:table-row")}
      {line("Trainings", statement.trainings, "trainings", otherIncomeOpen ? "" : "hidden print:table-row")}
      {statement.customIncome.map(entry => line(entry.name, entry.amount, `custom-${entry.name}`, otherIncomeOpen ? "" : "hidden print:table-row"))}
      {line("Grants and Donations", statement.grantsAndDonations, "grants", otherIncomeOpen ? "" : "hidden print:table-row")}
      {total("Total revenue", statement.revenue)}
      {section("Cost of Production")}
      {line("Purchases of Raw Materials", statement.purchasesOfRawMaterials)}
      {line("Carriage Inwards", statement.carriageInwards)}
      {line("Direct Labor", statement.directLabor)}
      {line("Other Costs", statement.otherProductionCosts)}
      {total("Total Cost of Production", statement.costOfProduction)}
      {total("Gross profit", statement.grossProfit)}
      {section("Operating Expenses")}
      <tr className="border-t border-gray-100"><td className="px-5 py-3 pl-8"><button type="button" aria-expanded={operatingExpensesOpen} onClick={() => setOperatingExpensesOpen(open => !open)} className="accounts-no-print font-medium text-blue-700 hover:underline">Operating Expenses <span aria-hidden="true">{operatingExpensesOpen ? "▴" : "▾"}</span></button><span className="hidden print:inline">Operating Expenses</span></td><td className="px-5 py-3 text-right tabular-nums">{formatUgx(statement.operatingExpenses)}</td></tr>
      {statement.operatingExpenseLines.map(entry => line(entry.name, entry.amount, `operating-${entry.name}`, operatingExpensesOpen ? "" : "hidden print:table-row"))}
      {total("Income Before Taxes", statement.incomeBeforeTaxes)}
      {line("Tax Deductions", statement.taxDeductions)}
      {total("Net income", statement.netIncome, true)}
    </tbody></table></div>
  </section>;
}
