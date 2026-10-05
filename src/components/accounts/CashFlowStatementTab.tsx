"use client";

import { useState } from "react";
import type { FinancialStatements } from "@/lib/financial-statements";
import { formatUgx } from "@/components/accounts/StatementTable";
import { formatAccountDate } from "@/lib/account-period";

export function CashFlowStatementTab({ statement, start, end }: { statement: FinancialStatements; start: string; end: string }) {
  const [receivedOpen, setReceivedOpen] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);
  const [operatingExpensesOpen, setOperatingExpensesOpen] = useState(false);
  const [investingOpen, setInvestingOpen] = useState(false);
  const [financingOpen, setFinancingOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const row = (label: string, amount: number, key = label, className = "") => <tr key={key} className={`border-t border-gray-100 ${className}`}><td className="px-5 py-3 pl-8 text-gray-700">{label}</td><td className="px-5 py-3 text-right tabular-nums">{formatUgx(amount)}</td></tr>;
  const total = (label: string, amount: number, grand = false) => <tr key={label} className={grand ? "border-y-4 border-double border-gray-900 font-bold" : "border-t-2 border-gray-500 font-semibold"}><td className="px-5 py-3">{label}</td><td className="px-5 py-3 text-right tabular-nums">{formatUgx(amount)}</td></tr>;
  const section = (label: string) => <tr key={label} className="bg-gray-50"><th colSpan={2} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">{label}</th></tr>;
  const expandable = (label: string, amount: number, open: boolean, toggle: () => void) => <tr className="border-t border-gray-100"><td className="px-5 py-3 pl-8"><button type="button" aria-expanded={open} onClick={toggle} className="accounts-no-print font-medium text-blue-700 hover:underline">{label} <span aria-hidden="true">{open ? "▴" : "▾"}</span></button><span className="hidden print:inline">{label}</span></td><td className="px-5 py-3 text-right font-medium tabular-nums">{formatUgx(amount)}</td></tr>;

  return <div className="space-y-3">
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="accounts-no-print border-b px-5 py-4"><h2 className="text-xl font-bold text-gray-900">Cash Flow Statement</h2><p className="mt-1 text-sm text-gray-500">{formatAccountDate(start)} to {formatAccountDate(end)} · Cash basis: only recorded Bank, Cash and Mobile Money movements are included.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-sm"><tbody>
        {row(`Opening Cash at ${formatAccountDate(start)}`, statement.beginningCashBalance, "opening", "font-semibold")}
        {section("A. Cash Flows from Operating Activities")}
        {expandable("Cash received", statement.totalCashReceived, receivedOpen, () => setReceivedOpen(open => !open))}
        {statement.cashReceivedLines.length === 0 ? row("No cash received", 0, "no-received", receivedOpen ? "" : "hidden print:table-row") : statement.cashReceivedLines.map(line => row(line.name, line.amount, `received-${line.name}`, receivedOpen ? "" : "hidden print:table-row"))}
        {total("Total Cash Received", statement.totalCashReceived)}
        {expandable("Cash paid", -statement.totalCashPaid, paidOpen, () => setPaidOpen(open => !open))}
        {row("Cash paid for Purchases of Raw Materials", -statement.cashPaidForRawMaterials, "paid-materials", paidOpen ? "" : "hidden print:table-row")}
        {row("Cash paid for Carriage Inwards", -statement.cashPaidForCarriageInwards, "paid-carriage", paidOpen ? "" : "hidden print:table-row")}
        {row("Cash paid for Direct Labor", -statement.cashPaidForDirectLabor, "paid-labor", paidOpen ? "" : "hidden print:table-row")}
        {row("Cash paid for other production costs", -statement.cashPaidForOtherProductionCosts, "paid-production", paidOpen ? "" : "hidden print:table-row")}
        <tr className={`border-t border-gray-100 ${paidOpen ? "" : "hidden print:table-row"}`}><td className="px-5 py-3 pl-8"><button type="button" aria-expanded={operatingExpensesOpen} onClick={() => setOperatingExpensesOpen(open => !open)} className="accounts-no-print text-blue-700 hover:underline">Cash paid for Operating Expenses <span aria-hidden="true">{operatingExpensesOpen ? "▴" : "▾"}</span></button><span className="hidden print:inline">Cash paid for Operating Expenses</span></td><td className="px-5 py-3 text-right tabular-nums">{formatUgx(-statement.cashPaidForOperatingExpenses)}</td></tr>
        {statement.operatingExpenseCashLines.map(line => row(`  ${line.name}`, -line.amount, `paid-operating-${line.name}`, paidOpen && operatingExpensesOpen ? "" : "hidden print:table-row"))}
        {row("Cash paid for Taxes", -statement.cashPaidForTaxes, "paid-taxes", paidOpen ? "" : "hidden print:table-row")}
        {total("Total Cash Paid", -statement.totalCashPaid)}
        {total("Net Cash from Operating Activities", statement.operatingCashFlow)}
        {section("B. Cash Flows from Investing Activities")}
        {expandable("Investing cash movements", statement.investingCashFlow, investingOpen, () => setInvestingOpen(open => !open))}
        {statement.investingCashLines.length === 0 ? row("No investing cash movements", 0, "no-investing", investingOpen ? "" : "hidden print:table-row") : statement.investingCashLines.map(line => row(line.name, line.amount, `investing-${line.name}`, investingOpen ? "" : "hidden print:table-row"))}
        {total("Net Cash from Investing Activities", statement.investingCashFlow)}
        {section("C. Cash Flows from Financing Activities")}
        {expandable("Financing cash movements", statement.financingCashFlow, financingOpen, () => setFinancingOpen(open => !open))}
        {statement.financingCashLines.length === 0 ? row("No financing cash movements", 0, "no-financing", financingOpen ? "" : "hidden print:table-row") : statement.financingCashLines.map(line => row(line.name, line.amount, `financing-${line.name}`, financingOpen ? "" : "hidden print:table-row"))}
        {total("Net Cash from Financing Activities", statement.financingCashFlow)}
        {Math.abs(statement.otherCashFlow) >= 0.01 && <>{section("Other Cash Movements — review classification")}{expandable("Other Cash Movements", statement.otherCashFlow, otherOpen, () => setOtherOpen(open => !open))}{statement.otherCashMovementLines.map(line => row(line.name, line.amount, `other-${line.name}`, otherOpen ? "" : "hidden print:table-row"))}</>}
        {total("Net Increase or Decrease in Cash", statement.netCashFlow)}
        {total(`Closing Cash at ${formatAccountDate(end)}`, statement.endingCashBalance, true)}
      </tbody></table></div>
    </section>
    <p className="accounts-no-print rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">PAYE withheld is a liability, not a cash payment. It appears under Cash paid for Taxes only when a PAYE remittance is recorded. Current Sales and Expense entries have settlement accounts but no credit-status field, so they are treated as fully received or paid unless an existing record explicitly contains an unpaid status or partial paid/received amount.</p>
    {Math.abs(statement.transfersNetEffect) >= 0.01 && <p role="alert" className="accounts-no-print rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900">Transfer check failed: internal Bank/Cash transfers affected cash flow by {formatUgx(statement.transfersNetEffect)}.</p>}
    {Math.abs(statement.cashActivityDifference) >= 0.01 && <p role="alert" className="accounts-no-print rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Cash movement reconciliation difference: {formatUgx(statement.cashActivityDifference)}. The classified statement does not match Cash and Bank Activity.</p>}
    {Math.abs(statement.cashBalanceDifference) >= 0.01 && <p role="alert" className="accounts-no-print rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Closing cash reconciliation difference: {formatUgx(statement.cashBalanceDifference)}. Closing Cash does not match Bank plus Cash on the Balance Sheet at {formatAccountDate(end)}.</p>}
  </div>;
}
