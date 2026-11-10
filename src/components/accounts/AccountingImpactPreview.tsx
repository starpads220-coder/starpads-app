import { accountingImpactIsBalanced, type AccountingImpact } from "@/lib/accounting-impact";

const money = (value: number) => `UGX ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export function AccountingImpactPreview({ impact }: { impact: AccountingImpact | null }) {
  if (!impact) return <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">Select the account, payment option and enter an amount to preview the accounts affected.</div>;
  const debit = impact.lines.reduce((sum, item) => sum + item.debit, 0);
  const credit = impact.lines.reduce((sum, item) => sum + item.credit, 0);
  const balanced = accountingImpactIsBalanced(impact);
  return <section className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-sm text-gray-800" aria-label="Accounts affected">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-blue-950">Accounts Affected</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${balanced ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{balanced ? "Balanced entry" : "Entry not balanced"}</span></div>
    <div className="mt-3 space-y-2">{impact.lines.map((item, index) => <div key={`${item.code}-${index}`} className="rounded-lg border border-blue-100 bg-white px-3 py-2"><span className="font-medium">Account {index + 1}: {item.name} ({item.code})</span><span className="ml-2 font-semibold">— {item.debit > 0 ? `Debit ${money(item.debit)}` : `Credit ${money(item.credit)}`}</span></div>)}</div>
    <div className="mt-3 grid gap-2 lg:grid-cols-3"><p><strong>Income Statement:</strong> {impact.incomeStatement}</p><p><strong>Balance Sheet:</strong> {impact.balanceSheet}</p><p><strong>Cash Flow:</strong> {impact.cashFlow}</p></div>
    <p className="mt-3 text-xs text-gray-600">Total debits: {money(debit)} · Total credits: {money(credit)}</p>
  </section>;
}
