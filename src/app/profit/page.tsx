"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { useAuth } from "@/lib/auth-context";
import { useCollectionQuery } from "@/hooks/use-firestore-query";
import { todayInEat } from "@/lib/account-period";
import {
  deriveProfitFirst,
  PROFIT_ACCOUNT_LABELS,
  PROFIT_FIRST_ALLOCATION,
  PROFIT_FIRST_START_DATE,
  PROFIT_LEDGER_LABELS,
  type ProfitAccountKey,
  type ProfitLedgerAccountKey,
  type ProfitExpense,
  type ProfitJournal,
  type ProfitPayment,
  type ProfitRemittance,
  type ProfitSale,
  type ProfitTaxEntry,
} from "@/lib/profit-first";

type Period = "all" | "month" | "quarter" | "custom";
const accountKeys = Object.keys(PROFIT_FIRST_ALLOCATION) as ProfitAccountKey[];
const money = (value: number) => `UGX ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const input = "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm";

function periodBounds(period: Period, customStart: string, customEnd: string) {
  const today = todayInEat();
  if (period === "all") return { start: PROFIT_FIRST_START_DATE, end: today, label: "All time" };
  if (period === "custom") return { start: customStart || today, end: customEnd || today, label: "Custom range" };
  const [year, month] = today.split("-").map(Number);
  if (period === "month") return { start: `${year}-${String(month).padStart(2, "0")}-01`, end: today, label: "This month" };
  const quarterStart = Math.floor((month - 1) / 3) * 3 + 1;
  return { start: `${year}-${String(quarterStart).padStart(2, "0")}-01`, end: today, label: "This quarter" };
}

export default function ProfitPage() {
  const { userRole, roleLoaded } = useAuth();
  const admin = userRole?.role === "ADMIN";
  const enabled = roleLoaded && admin;
  const [period, setPeriod] = useState<Period>("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [activeAccount, setActiveAccount] = useState<ProfitLedgerAccountKey>("income");
  const sales = useCollectionQuery<ProfitSale>("saleTransactions", [], { enabled });
  const expenses = useCollectionQuery<ProfitExpense>("expenses", [], { enabled });
  const payments = useCollectionQuery<ProfitPayment>("payments", [], { enabled });
  const journals = useCollectionQuery<ProfitJournal>("accountJournals", [], { enabled });
  const payeRemittances = useCollectionQuery<ProfitRemittance>("payeRemittances", [], { enabled });
  const nssfRemittances = useCollectionQuery<ProfitRemittance>("nssfRemittances", [], { enabled });
  const taxEntries = useCollectionQuery<ProfitTaxEntry>("taxEntries", [], { enabled });
  const bounds = useMemo(() => periodBounds(period, customStart, customEnd), [period, customStart, customEnd]);
  const result = useMemo(() => deriveProfitFirst({
    sales: sales.data ?? [], expenses: expenses.data ?? [], payments: payments.data ?? [], journals: journals.data ?? [],
    payeRemittances: payeRemittances.data ?? [], nssfRemittances: nssfRemittances.data ?? [], taxEntries: taxEntries.data ?? [],
  }, bounds.start, bounds.end), [sales.data, expenses.data, payments.data, journals.data, payeRemittances.data, nssfRemittances.data, taxEntries.data, bounds]);
  const loading = [sales, expenses, payments, journals, payeRemittances, nssfRemittances, taxEntries].some(query => query.isLoading);
  const errors = [sales, expenses, payments, journals, payeRemittances, nssfRemittances, taxEntries].flatMap(query => query.error ? [query.error instanceof Error ? query.error.message : String(query.error)] : []);
  const activeEntries = result.ledger.filter(entry => entry.account === activeAccount);
  const rows = activeEntries.reduce<Array<(typeof activeEntries)[number] & { runningBalance: number }>>((items, entry) => {
    const previousBalance = items.at(-1)?.runningBalance ?? 0;
    return [...items, { ...entry, runningBalance: previousBalance + entry.inflow - entry.outflow }];
  }, []);
  const allocationPasses = result.totalAllocated === result.totalSales;
  const percentagesPass = Object.values(PROFIT_FIRST_ALLOCATION).reduce((sum, value) => sum + value, 0) === 100;
  const ledgerPasses = accountKeys.every(key => Math.abs(result.accounts[key].allocated - result.accounts[key].deducted - result.accounts[key].balance) < 0.005);

  return <RouteGuard><main className="mx-auto max-w-7xl space-y-6 px-4 pb-24 sm:px-6 lg:px-8">
    {!enabled ? <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-600">Checking administrator access…</div> : <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">Admin only · Read-only overlay</p><h1 className="mt-1 text-3xl font-bold text-gray-950">Profit First</h1><p className="mt-1 max-w-3xl text-sm text-gray-600">A planning view of how recorded revenue is allocated and consumed. It does not post journals or change any financial statement.</p></div>
        <p className="rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700">{bounds.label}: {bounds.start === PROFIT_FIRST_START_DATE ? "first record" : bounds.start} to {bounds.end}</p>
      </header>

      <section className="flex flex-wrap items-center gap-2" aria-label="Profit period">
        {(["all", "month", "quarter", "custom"] as Period[]).map(value => <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${period === value ? "bg-gray-950 text-white" : "border bg-white text-gray-700"}`}>{value === "all" ? "All time" : value === "month" ? "This month" : value === "quarter" ? "This quarter" : "Custom"}</button>)}
        {period === "custom" && <><label className="text-sm">From <input type="date" className={input} value={customStart} onChange={event => setCustomStart(event.target.value)} /></label><label className="text-sm">To <input type="date" className={input} value={customEnd} onChange={event => setCustomEnd(event.target.value)} /></label></>}
      </section>

      {loading && <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Building the Profit First ledger from current source records…</p>}
      {errors.length > 0 && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Profit data could not be fully loaded: {errors.join(" · ")}</p>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[{ label: "Total sales", value: result.totalSales }, { label: "Total allocated", value: result.totalAllocated }, { label: "Total deducted", value: result.totalDeducted }, { label: "Total remaining", value: result.totalRemaining }].map(item => <article key={item.label} className="rounded-xl border bg-white p-4"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p><p className={`mt-2 text-xl font-bold tabular-nums ${item.value < 0 ? "text-red-700" : "text-gray-950"}`}>{money(item.value)}</p></article>)}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <button type="button" onClick={() => setActiveAccount("income")} className={`rounded-xl border p-5 text-left transition ${activeAccount === "income" ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100" : "bg-white hover:border-gray-400"}`}>
          <div><h2 className="font-bold text-gray-950">Income</h2><p className="text-xs text-gray-500">100% of recorded sales</p></div>
          <dl className="mt-4 space-y-3 text-sm"><div><dt className="text-gray-500">Sales captured</dt><dd className="font-bold text-blue-800">{money(result.totalSales)}</dd></div><div><dt className="text-gray-500">Allocated out</dt><dd className="font-semibold">{money(result.totalAllocated)}</dd></div><div><dt className="text-gray-500">Unallocated</dt><dd className={`font-bold ${result.totalSales - result.totalAllocated === 0 ? "text-emerald-700" : "text-red-700"}`}>{money(result.totalSales - result.totalAllocated)}</dd></div></dl>
        </button>
        {accountKeys.map(key => { const summary = result.accounts[key]; const overspent = summary.balance < 0; return <button type="button" onClick={() => setActiveAccount(key)} key={key} className={`rounded-xl border p-5 text-left transition ${activeAccount === key ? "border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100" : "bg-white hover:border-gray-400"}`}>
          <div className="flex items-start justify-between gap-2"><div><h2 className="font-bold text-gray-950">{PROFIT_ACCOUNT_LABELS[key]}</h2><p className="text-xs text-gray-500">{PROFIT_FIRST_ALLOCATION[key]}% of every sale</p></div>{overspent && <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">Overspent</span>}</div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-gray-500">Allocated</dt><dd className="font-semibold">{money(summary.allocated)}</dd></div><div><dt className="text-gray-500">Deducted</dt><dd className="font-semibold">{money(summary.deducted)}</dd></div><div><dt className="text-gray-500">Balance</dt><dd className={`font-bold ${overspent ? "text-red-700" : "text-emerald-700"}`}>{money(summary.balance)}</dd></div><div><dt className="text-gray-500">Used</dt><dd className="font-semibold">{Number.isFinite(summary.usedPercent) ? `${summary.usedPercent.toFixed(1)}%` : "Overspent"}</dd></div></dl>
        </button>; })}
      </section>

      <section className="rounded-xl border bg-white p-5"><h2 className="font-bold">Reconciliation checks</h2><div className="mt-4 grid gap-2 text-sm md:grid-cols-3">{[{ label: "Allocation percentages equal 100%", pass: percentagesPass }, { label: "Four allocations equal captured sales", pass: allocationPasses }, { label: "Every account balance equals allocation minus deductions", pass: ledgerPasses }].map(check => <p key={check.label} className={`rounded-lg px-3 py-2 font-medium ${check.pass ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{check.pass ? "PASS" : "FAIL"} · {check.label}</p>)}</div>
      </section>

      <section className="rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-bold">Accrued taxes not yet paid</h2><p className="text-sm text-gray-500">Informational only. These amounts do not reduce the Tax account until a remittance or Income Tax Payable payment is recorded.</p></div><div className="grid gap-3 p-5 sm:grid-cols-3">{result.accruedTaxes.map(tax => <div key={tax.label} className="rounded-lg bg-gray-50 p-4"><p className="font-semibold">{tax.label}</p><p className={`mt-2 text-lg font-bold ${tax.unpaid > 0 ? "text-amber-700" : "text-gray-700"}`}>{money(tax.unpaid)}</p><p className="text-xs text-gray-500">Accrued {money(tax.accrued)} · Paid {money(tax.paid)}</p></div>)}</div></section>

      <section className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-bold">{PROFIT_LEDGER_LABELS[activeAccount]} ledger</h2><p className="text-sm text-gray-500">Sales rows show the full source sale alongside the exact amount captured or allocated to this account.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-sm"><thead className="bg-gray-50"><tr>{["Date", "Source", "Reference", "Description", "Source amount", "Inflow", "Outflow", "Running balance", "Source record"].map(label => <th key={label} className={`p-3 ${["Source amount", "Inflow", "Outflow", "Running balance"].includes(label) ? "text-right" : "text-left"}`}>{label}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={9} className="p-10 text-center text-gray-500">No {PROFIT_LEDGER_LABELS[activeAccount].toLowerCase()} activity in this period.</td></tr> : rows.map(row => <tr key={row.key} className="border-t"><td className="p-3 whitespace-nowrap">{row.date}</td><td className="p-3">{row.source}</td><td className="p-3 font-mono text-xs">{row.reference}</td><td className="p-3">{row.description}</td><td className="p-3 text-right font-medium">{money(row.sourceAmount)}</td><td className="p-3 text-right text-emerald-700">{row.inflow ? money(row.inflow) : "—"}</td><td className="p-3 text-right text-red-700">{row.outflow ? money(row.outflow) : "—"}</td><td className={`p-3 text-right font-semibold ${row.runningBalance < 0 ? "text-red-700" : ""}`}>{money(row.runningBalance)}</td><td className="p-3"><Link href={row.href} className="font-semibold text-blue-700 hover:underline">Open {row.sourceId}</Link></td></tr>)}</tbody></table></div></section>
    </>}
  </main></RouteGuard>;
}
