import { Fragment } from "react";
import type { buildAccounts } from "@/lib/accounts";

type AccountsReport = ReturnType<typeof buildAccounts>;

export interface BalanceSheetColumn {
  label: string;
  start: string;
  end: string;
  report: AccountsReport;
}

const amount = (value: number) => value === 0
  ? "—"
  : value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function BalanceSheetTable({ columns }: { columns: BalanceSheetColumn[] }) {
  const accountRows = [...new Map(columns.flatMap(column => column.report.rows).map(row => [row.code, row])).values()];
  const rowsFor = (group: string) => accountRows.filter(row => row.group === group);
  const balance = (column: BalanceSheetColumn, code: string) => column.report.rows.find(row => row.code === code)?.balance ?? 0;
  const groupTotal = (column: BalanceSheetColumn, group: string) => column.report.rows.filter(row => row.group === group).reduce((sum, row) => sum + row.balance, 0);

  const accountLine = (code: string, name: string, indent = true) => (
    <tr key={code} className="border-b border-gray-100">
      <td className={`px-4 py-2 ${indent ? "pl-8" : ""}`}><span className="mr-2 text-xs text-gray-400">{code.startsWith("custom:") ? "Custom" : code}</span>{name}</td>
      {columns.map(column => <td key={column.label} className="px-4 py-2 text-right tabular-nums text-blue-700">{amount(balance(column, code))}</td>)}
    </tr>
  );
  const totalLine = (label: string, values: number[], strong = false) => (
    <tr className={`border-y border-gray-400 ${strong ? "font-bold bg-gray-50" : "font-semibold"}`}>
      <td className="px-4 py-2">{label}</td>
      {columns.map((column, index) => <td key={column.label} className="px-4 py-2 text-right tabular-nums">{amount(values[index])}</td>)}
    </tr>
  );
  const section = (title: string, groups: Array<{ group: string; label: string }>, totalLabel: string) => <>
    <tr className="bg-gray-100 font-bold"><td className="px-4 py-3" colSpan={columns.length + 1}>{title}</td></tr>
    {groups.map(({ group, label }) => <Fragment key={group}>
      <tr className="font-semibold text-gray-700"><td className="px-4 pt-3 pb-1" colSpan={columns.length + 1}>{label}</td></tr>
      {rowsFor(group).map(row => accountLine(row.code, row.name))}
      {totalLine(`Total ${label.toLowerCase()}`, columns.map(column => groupTotal(column, group)))}
    </Fragment>)}
    {totalLine(totalLabel, columns.map(column => groups.reduce((sum, item) => sum + groupTotal(column, item.group), 0)), true)}
  </>;

  return (
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b px-5 py-4">
        <h2 className="text-lg font-semibold">Balance Sheet</h2>
        <p className="text-sm text-gray-500">Self-computed from classified sales, expenses, and account journals · UGX</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-4 py-3 text-left">Account</th>
              {columns.map(column => <th key={column.label} className="px-4 py-3 text-right"><span className="block">{column.label}</span><span className="block text-xs font-normal text-gray-500">As of {column.end}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {section("Assets", [{ group: "Current Assets", label: "Current assets" }, { group: "Non-Current Assets", label: "Non-current assets" }], "Total assets")}
            {section("Liabilities", [{ group: "Current Liabilities", label: "Current liabilities" }, { group: "Non-Current Liabilities", label: "Non-current liabilities" }], "Total liabilities")}
            <tr className="bg-gray-100 font-bold"><td className="px-4 py-3" colSpan={columns.length + 1}>Equity</td></tr>
            {rowsFor("Equity").map(row => accountLine(row.code, row.name))}
            <tr className="border-b border-gray-100"><td className="px-4 py-2 pl-8">Retained earnings</td>{columns.map(column => <td key={column.label} className="px-4 py-2 text-right tabular-nums text-blue-700">{amount(column.report.accumulatedProfit)}</td>)}</tr>
            {totalLine("Total equity", columns.map(column => column.report.equity), true)}
            {totalLine("Total liabilities and equity", columns.map(column => column.report.liabilities + column.report.equity), true)}
            <tr className="border-t-2 border-gray-900 font-bold"><td className="px-4 py-3">Balance check (assets − liabilities − equity)</td>{columns.map(column => { const difference = column.report.assets - column.report.liabilities - column.report.equity; return <td key={column.label} className={`px-4 py-3 text-right tabular-nums ${Math.abs(difference) < 0.01 ? "text-green-700" : "text-red-700"}`}>{amount(difference)}</td>; })}</tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
