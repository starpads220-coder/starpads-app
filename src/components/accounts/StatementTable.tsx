export const formatUgx = (amount: number) => `UGX ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function StatementTable({ title, subtitle, rows }: { title: string; subtitle: string; rows: Array<{ label: string; amount?: number; kind?: "section" | "total" | "grand" }> }) {
  return <section className="overflow-hidden rounded-xl border bg-white">
    <div className="accounts-no-print border-b px-5 py-4"><h2 className="text-xl font-bold text-gray-900">{title}</h2><p className="mt-1 text-sm text-gray-500">{subtitle}</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><tbody>{rows.map((row, index) => row.kind === "section"
      ? <tr key={`${row.label}-${index}`} className="bg-gray-50"><th colSpan={2} className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide text-gray-600">{row.label}</th></tr>
      : <tr key={`${row.label}-${index}`} className={`${row.kind === "grand" ? "border-y-4 border-double border-gray-900 font-bold" : row.kind === "total" ? "border-t-2 border-gray-500 font-semibold" : "border-t border-gray-100"}`}><td className={`px-5 py-3 ${row.kind ? "text-gray-900" : "pl-8 text-gray-700"}`}>{row.label}</td><td className="px-5 py-3 text-right tabular-nums">{formatUgx(row.amount ?? 0)}</td></tr>
    )}</tbody></table></div>
  </section>;
}
