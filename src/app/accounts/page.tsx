"use client";
import { useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { AccountsSwitcher } from "@/components/AccountsSwitcher";
import { BalanceSheetTable, type BalanceSheetColumn } from "@/components/BalanceSheetTable";
import { ACCOUNTS, ACCOUNT_GROUPS, REMOVED_ACCOUNT_CODES, buildAccounts, type LedgerSource, type Journal } from "@/lib/accounts";

const money = (amount: number) => `UGX ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shortDate = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
function comparisonRanges(period: string, customStart: string, customEnd: string) {
  const now = new Date();
  if (period === "custom") return customStart && customEnd ? [{ label: `${customStart} – ${customEnd}`, start: customStart, end: customEnd }] : [];
  if (period === "week") {
    const monday = new Date(now); monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return [2, 1, 0].map(offset => { const from = new Date(monday); from.setDate(from.getDate() - offset * 7); const to = new Date(from); to.setDate(to.getDate() + 6); if (to > now) to.setTime(now.getTime()); return { label: `${shortDate(from)} – ${shortDate(to)}`, start: dateKey(from), end: dateKey(to) }; });
  }
  if (period === "month") return [2, 1, 0].map(offset => { const from = new Date(now.getFullYear(), now.getMonth() - offset, 1); const to = offset === 0 ? now : new Date(now.getFullYear(), now.getMonth() - offset + 1, 0); return { label: from.toLocaleDateString(undefined, { month: "long", year: "numeric" }), start: dateKey(from), end: dateKey(to) }; });
  return [2, 1, 0].map(offset => { const year = now.getFullYear() - offset; return { label: String(year), start: `${year}-01-01`, end: offset === 0 ? dateKey(now) : `${year}-12-31` }; });
}
export default function AccountsPage() {
  const { userRole } = useAuth();
  const [period, setPeriod] = useState("month");
  const [view, setView] = useState<"balance" | "entries">("balance");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [journal, setJournal] = useState({ date: dateKey(new Date()), debitCode: "", creditCode: "", amount: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const sales = useRealtimeCollection<LedgerSource>("saleTransactions");
  const expenses = useRealtimeCollection<LedgerSource>("expenses");
  const journals = useRealtimeCollection<Journal>("accountJournals");
  const end = period === "custom" ? customEnd : dateKey(new Date());
  const startDate = new Date();
  if (period === "week") startDate.setDate(startDate.getDate() - 6);
  else if (period === "month") startDate.setDate(1);
  else { startDate.setMonth(startDate.getMonth() - 11); startDate.setDate(1); }
  const start = period === "custom" ? customStart : dateKey(startDate);
  const valid = !!start && !!end && start <= end;
  const report = useMemo(() => buildAccounts(sales.data, expenses.data, journals.data, start, end), [sales.data, expenses.data, journals.data, start, end]);
  const accountName = (code: string) => report.rows.find(account => account.code === code)?.name ?? ACCOUNTS.find(account => account.code === code)?.name ?? "Account";
  const journalEntries = useMemo(() => [...journals.data].sort((a, b) => b.date.localeCompare(a.date)), [journals.data]);
  const ranges = useMemo(() => comparisonRanges(period, customStart, customEnd), [period, customStart, customEnd]);
  const balanceSheetColumns = useMemo<BalanceSheetColumn[]>(() => ranges.map(range => ({ ...range, report: buildAccounts(sales.data, expenses.data, journals.data, range.start, range.end) })), [ranges, sales.data, expenses.data, journals.data]);
  const error = sales.error || expenses.error || journals.error;
  const loading = sales.loading || expenses.loading || journals.loading;
  const canPost = ["ADMIN", "FINANCE", "FINANCIAL_MANAGER"].includes(userRole?.role ?? "");
  const input = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm";
  async function saveJournal(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      const amount = Number(journal.amount);
      if (!canPost || !Number.isFinite(amount) || amount <= 0 || journal.debitCode === journal.creditCode || !ACCOUNTS.some(a => a.code === journal.debitCode) || !ACCOUNTS.some(a => a.code === journal.creditCode) || !journal.description.trim()) throw new Error("Enter a positive amount, description, and two different accounts.");
      if (editingJournalId) {
        await updateDoc(doc(db, "accountJournals", editingJournalId), { ...journal, amount });
      } else {
        await addDoc(collection(db, "accountJournals"), { ...journal, amount, createdAt: Timestamp.now(), createdBy: userRole?.uid });
      }
      setJournal({ date: dateKey(new Date()), debitCode: "", creditCode: "", amount: "", description: "" });
      setEditingJournalId(null);
      setMessage(editingJournalId ? "Entry updated successfully." : "Journal recorded successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to save journal."); }
    finally { setSaving(false); }
  }
  function editJournal(entry: Journal) {
    setJournal({ date: entry.date, debitCode: entry.debitCode, creditCode: entry.creditCode, amount: String(entry.amount), description: entry.description });
    setEditingJournalId(entry.id);
    setMessage("");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
  async function removeJournal(entry: Journal) {
    if (!canPost || !window.confirm(`Delete the entry “${entry.description}”? This cannot be undone.`)) return;
    setMessage("");
    try {
      await deleteDoc(doc(db, "accountJournals", entry.id));
      if (editingJournalId === entry.id) {
        setEditingJournalId(null);
        setJournal({ date: dateKey(new Date()), debitCode: "", creditCode: "", amount: "", description: "" });
      }
      setMessage("Entry deleted successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to delete entry."); }
  }
  return <RouteGuard><main className="space-y-6">
    <AccountsSwitcher />
    <div><h1 className="text-2xl font-bold">Accounts</h1><p className="text-sm text-gray-500">Balance sheet, income and expenses, and chart of accounts · UGX</p></div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" aria-label="Accounting period">{[["week", "Weekly"], ["month", "Monthly"], ["12months", "12 Months"], ["custom", "Custom"]].map(([id, label]) => <button key={id} onClick={() => { setPeriod(id); setView("balance"); }} className={`rounded-lg px-4 py-2 ${view === "balance" && period === id ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{label}</button>)}</div>
      <div className="flex gap-2" aria-label="Accounts view"><button onClick={() => setView("balance")} className={`rounded-lg px-4 py-2 ${view === "balance" ? "bg-gray-900 text-white" : "bg-gray-100"}`}>Balance Sheet</button><button onClick={() => setView("entries")} className={`rounded-lg px-4 py-2 ${view === "entries" ? "bg-gray-900 text-white" : "bg-gray-100"}`}>Entries</button></div>
    </div>
    {view === "balance" && period === "custom" && <div className="flex flex-wrap gap-3"><label>From <input aria-label="Start date" type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={input} /></label><label>To <input aria-label="End date" type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={input} /></label></div>}
    {view === "balance" && (!valid ? <p role="alert">Choose a valid start and end date.</p> : <>
      {loading && <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Loading account balances… The balance-sheet structure is shown below and will populate as records arrive.</p>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Some account records could not be loaded.</p><p>{error}</p><p className="mt-1">The balance sheet remains visible below. Publish the <code className="rounded bg-red-100 px-1">accountJournals</code> Firestore rule to load all balances.</p></div>}
      <p className="text-sm text-gray-500">Activity: {start} to {end}. Balance sheet includes all classified entries up to {end}, including prior periods.</p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Balances reflect recorded transactions and journals only. Enter opening balances and adjustments below to include existing assets, liabilities, and capital. {report.unclassified} sales/expense entries through {end} have no valid accounting classification and are excluded.</div>
      <BalanceSheetTable columns={balanceSheetColumns} />
      <section className="rounded-xl border bg-white p-5"><h2 className="font-semibold">Income and Expenses — selected period</h2><p className="text-xl font-bold mt-2">Net result: {money(report.profit)}</p></section>
      {ACCOUNT_GROUPS.map(group => {
        const groupRows = report.rows.filter(a => a.group === group);
        const rows = groupRows.filter(a => !REMOVED_ACCOUNT_CODES.has(a.code));
        const isActivity = ["Income", "Other Income", "Cost of Sales", "Expenses"].includes(group);
        return <section key={group} className="rounded-xl border bg-white overflow-hidden"><h2 className="font-semibold px-5 py-4 bg-gray-50">{group}</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="p-3">Account / subcategory</th><th className="p-3 text-right">Period movement</th><th className="p-3 text-right">Balance at {end}</th></tr></thead><tbody>{rows.map(a => <tr key={a.code} className="border-t"><td className="p-3">{a.name}</td><td className="p-3 text-right tabular-nums">{money(a.movement)}</td><td className="p-3 text-right tabular-nums">{money(a.balance)}</td></tr>)}</tbody><tfoot><tr className="border-t font-semibold"><td className="p-3">Total {group}{isActivity ? " (income statement)" : ""}</td><td className="p-3 text-right">{money(groupRows.reduce((s,a) => s+a.movement,0))}</td><td className="p-3 text-right">{money(groupRows.reduce((s,a) => s+a.balance,0))}</td></tr></tfoot></table></div></section>;
      })}
      <section className="rounded-xl border bg-white p-5 space-y-3"><h2 className="font-semibold">Journal history — selected period</h2>{journals.data.filter(j => j.date >= start && j.date <= end).map(j => <p key={j.id} className="text-sm border-b py-2">{j.date} · {j.description} · Debit {accountName(j.debitCode)} / Credit {accountName(j.creditCode)} · {money(j.amount)}</p>)}</section>
    </>)}
    {view === "entries" && <section className="rounded-xl border bg-white overflow-hidden"><div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">Account Entries</h2><p className="text-sm text-gray-500">All entries recorded from the Accounts form.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Debit account</th><th className="p-3 text-left">Credit account</th><th className="p-3 text-right">Amount</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>{journalEntries.length === 0 ? <tr><td className="p-8 text-center text-gray-500" colSpan={canPost ? 6 : 5}>No account entries have been recorded.</td></tr> : journalEntries.map(entry => <tr key={entry.id} className="border-t"><td className="p-3 whitespace-nowrap">{entry.date}</td><td className="p-3">{entry.description}</td><td className="p-3">{accountName(entry.debitCode)}</td><td className="p-3">{accountName(entry.creditCode)}</td><td className="p-3 text-right tabular-nums">{money(entry.amount)}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" onClick={() => editJournal(entry)} className="mr-3 text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => removeJournal(entry)} className="text-red-700 hover:underline">Delete</button></td>}</tr>)}</tbody></table></div></section>}
    {canPost && <form onSubmit={saveJournal} className="rounded-xl border bg-white p-5 space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{editingJournalId ? "Edit account entry" : "Opening balances and adjustments"}</h2>{editingJournalId && <button type="button" onClick={() => { setEditingJournalId(null); setJournal({ date: dateKey(new Date()), debitCode: "", creditCode: "", amount: "", description: "" }); setMessage(""); }} className="text-sm text-gray-600 hover:underline">Cancel edit</button>}</div><p className="text-sm text-gray-500">Record an equal debit and credit. Use this for opening assets, loans, capital, transfers, and non-cash adjustments. Sales and expenses already classified above are included automatically; do not enter them again here.</p><div className="grid sm:grid-cols-2 gap-4"><label>Date<input required type="date" className={input} value={journal.date} onChange={e => setJournal({ ...journal, date: e.target.value })} /></label>{(["debitCode", "creditCode"] as const).map(key => <label key={key}>{key === "debitCode" ? "Debit account" : "Credit account"}<select required className={input} value={journal[key]} onChange={e => setJournal({ ...journal, [key]: e.target.value })}><option value="">Select...</option>{ACCOUNTS.map(a => <option key={a.code} value={a.code}>{a.name}</option>)}</select></label>)}<label>Amount (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={journal.amount} onChange={e => setJournal({ ...journal, amount: e.target.value })} /></label><label className="sm:col-span-2">Description<input required className={input} value={journal.description} onChange={e => setJournal({ ...journal, description: e.target.value })} /></label></div><button disabled={saving} className="rounded-lg bg-gray-900 text-white px-4 py-2 disabled:opacity-50">{saving ? "Saving..." : editingJournalId ? "Update entry" : "Record journal"}</button><p role="status">{message}</p></form>}
  </main></RouteGuard>;
}
