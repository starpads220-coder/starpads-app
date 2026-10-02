"use client";
import { useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { AccountsSwitcher } from "@/components/AccountsSwitcher";
import { BalanceSheetTable, type BalanceSheetColumn } from "@/components/BalanceSheetTable";
import { BalanceSheetTab } from "@/components/accounts/BalanceSheetTab";
import { balanceSheetAccountName, excludedAllowanceBalance } from "@/lib/balance-sheet-current-assets";
import { balanceSheetGroupTotal, balanceSheetRows, balanceSheetTotals } from "@/lib/balance-sheet-sections";
import { CashFlowStatementTab } from "@/components/accounts/CashFlowStatementTab";
import { IncomeStatementTab } from "@/components/accounts/IncomeStatementTab";
import { ACCOUNTS, ACCOUNT_GROUPS, SETTLEMENT_CODES, buildAccounts, resolveAccounting, type LedgerSource, type Journal, type ProductionCostEntry, type TaxEntry } from "@/lib/accounts";
import { buildFinancialStatements, type ConfirmedLaborPayment } from "@/lib/financial-statements";
import type { AccountsPdfSection } from "@/components/reports/AccountsStatementPDF";

type AccountView = "income" | "balance" | "cashflow" | "entries";

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
  const [view, setView] = useState<AccountView>("income");
  const [entriesStatement, setEntriesStatement] = useState<"balance" | "income">("balance");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [journal, setJournal] = useState({ date: dateKey(new Date()), debitCode: "", creditCode: "", amount: "", description: "" });
  const [productionCost, setProductionCost] = useState({ date: dateKey(new Date()), description: "", amount: "", settlementCode: "" as "" | "1000" | "1030", reference: "", notes: "" });
  const [editingProductionCostId, setEditingProductionCostId] = useState<string | null>(null);
  const [taxEntry, setTaxEntry] = useState({ date: dateKey(new Date()), description: "", amount: "" });
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const sales = useRealtimeCollection<LedgerSource>("saleTransactions");
  const expenses = useRealtimeCollection<LedgerSource>("expenses");
  const journals = useRealtimeCollection<Journal>("accountJournals");
  const payments = useRealtimeCollection<ConfirmedLaborPayment>("payments");
  const productionCosts = useRealtimeCollection<ProductionCostEntry>("productionCosts");
  const taxEntries = useRealtimeCollection<TaxEntry>("taxEntries");
  const end = period === "custom" ? customEnd : dateKey(new Date());
  const startDate = new Date();
  if (period === "week") startDate.setDate(startDate.getDate() - 6);
  else if (period === "month") startDate.setDate(1);
  else { startDate.setMonth(startDate.getMonth() - 11); startDate.setDate(1); }
  const start = period === "custom" ? customStart : dateKey(startDate);
  const valid = !!start && !!end && start <= end;
  const report = useMemo(() => buildAccounts(sales.data, expenses.data, journals.data, start, end, productionCosts.data, taxEntries.data), [sales.data, expenses.data, journals.data, start, end, productionCosts.data, taxEntries.data]);
  const statements = useMemo(
    () => buildFinancialStatements(sales.data, expenses.data, journals.data, report, start, end, payments.data, productionCosts.data, taxEntries.data),
    [sales.data, expenses.data, journals.data, report, start, end, payments.data, productionCosts.data, taxEntries.data],
  );
  const accountName = (code: string) => balanceSheetAccountName(code, report.rows.find(account => account.code === code)?.name ?? ACCOUNTS.find(account => account.code === code)?.name ?? "Account");
  const journalEntries = useMemo(() => [...journals.data].sort((a, b) => b.date.localeCompare(a.date)), [journals.data]);
  const productionCostEntries = useMemo(() => [...productionCosts.data].sort((a, b) => b.date.localeCompare(a.date)), [productionCosts.data]);
  const sortedTaxEntries = useMemo(() => [...taxEntries.data].sort((a, b) => b.date.localeCompare(a.date)), [taxEntries.data]);
  const cashActivity = useMemo(() => {
    const cashAccountName = (code: string) => balanceSheetAccountName(code, ACCOUNTS.find(account => account.code === code)?.name ?? "Cash account");
    const salesRows = sales.data.flatMap(entry => {
      const accounting = resolveAccounting(entry, "sale");
      return accounting ? [{ id: `sale-${entry.id}`, date: entry.date, source: "Sale", description: entry.customerName || accounting.accountName, account: cashAccountName(accounting.settlementCode), amount: Number(entry.totalAmount) || 0 }] : [];
    });
    const expenseRows = expenses.data.flatMap(entry => {
      const accounting = resolveAccounting(entry, "expense");
      return accounting ? [{ id: `expense-${entry.id}`, date: entry.date, source: "Expense", description: entry.description || accounting.accountName, account: cashAccountName(accounting.settlementCode), amount: -(Number(entry.amountUgx) || 0) }] : [];
    });
    const productionRows = productionCosts.data.map(entry => ({ id: `production-${entry.id}`, date: entry.date, source: "Production cost", description: entry.description, account: cashAccountName(entry.settlementCode), amount: -(Number(entry.amount) || 0) }));
    const journalRows = journals.data.flatMap(entry => {
      const debitCash = SETTLEMENT_CODES.includes(entry.debitCode);
      const creditCash = SETTLEMENT_CODES.includes(entry.creditCode);
      if (debitCash === creditCash) return [];
      const code = debitCash ? entry.debitCode : entry.creditCode;
      return [{ id: `journal-${entry.id}`, date: entry.date, source: "Journal", description: entry.description, account: cashAccountName(code), amount: debitCash ? entry.amount : -entry.amount }];
    });
    return [...salesRows, ...expenseRows, ...productionRows, ...journalRows].filter(entry => entry.date <= end).sort((a, b) => b.date.localeCompare(a.date));
  }, [sales.data, expenses.data, productionCosts.data, journals.data, end]);
  const ranges = useMemo(() => comparisonRanges(period, customStart, customEnd), [period, customStart, customEnd]);
  const balanceSheetColumns = useMemo<BalanceSheetColumn[]>(() => ranges.map(range => ({ ...range, report: buildAccounts(sales.data, expenses.data, journals.data, range.start, range.end, productionCosts.data, taxEntries.data) })), [ranges, sales.data, expenses.data, journals.data, productionCosts.data, taxEntries.data]);
  const error = sales.error || expenses.error || journals.error || payments.error || productionCosts.error || taxEntries.error;
  const loading = sales.loading || expenses.loading || journals.loading || payments.loading || productionCosts.loading || taxEntries.loading;
  const canPost = ["ADMIN", "FINANCE", "FINANCIAL_MANAGER"].includes(userRole?.role ?? "");
  const input = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm";
  const reportTitle = view === "income" ? "Income Statement (Profit & Loss)" : view === "balance" ? "Balance Sheet" : "Cash Flow Statement";
  const pdfSections = useMemo<AccountsPdfSection[]>(() => {
    if (view === "income") return [
      { title: "Revenue", rows: [{ label: "Sales of Pads", amount: statements.salesOfPads }, { label: "Other Income", amount: statements.otherIncome }, { label: "  Sales of Materials", amount: statements.salesOfMaterials }, { label: "  Trainings", amount: statements.trainings }, ...statements.customIncome.map(entry => ({ label: `  ${entry.name}`, amount: entry.amount })), { label: "  Grants and Donations", amount: statements.grantsAndDonations }, { label: "Total revenue", amount: statements.revenue, emphasis: "total" }] },
      { title: "Cost of Production", rows: [{ label: "Purchases of Raw Materials", amount: statements.purchasesOfRawMaterials }, { label: "Carriage Inwards", amount: statements.carriageInwards }, { label: "Direct Labor", amount: statements.directLabor }, { label: "Other Costs", amount: statements.otherProductionCosts }, { label: "Total Cost of Production", amount: statements.costOfProduction, emphasis: "total" }, { label: "Gross profit", amount: statements.grossProfit, emphasis: "total" }] },
      { title: "Operating Expenses", rows: [{ label: "Operating Expenses", amount: statements.operatingExpenses }, ...statements.operatingExpenseLines.map(entry => ({ label: `  ${entry.name}`, amount: entry.amount })), { label: "Income Before Taxes", amount: statements.incomeBeforeTaxes, emphasis: "total" }, { label: "Tax Deductions", amount: statements.taxDeductions }, { label: "Net income", amount: statements.netIncome, emphasis: "grand" }] },
    ];
    if (view === "cashflow") return [
      { title: "Cash Flows from Operating Activities", rows: [{ label: "Net income", amount: statements.netIncome }, { label: "Non-cash expenses added back", amount: statements.nonCashAdjustments }, { label: "Changes in working capital", amount: statements.workingCapitalAdjustments }, { label: "Net cash from operating activities", amount: statements.operatingCashFlow, emphasis: "total" }] },
      { title: "Cash Flows from Investing Activities", rows: [{ label: "Net cash from investing activities", amount: statements.investingCashFlow, emphasis: "total" }] },
      { title: "Cash Flows from Financing Activities", rows: [{ label: "Net cash from financing activities", amount: statements.financingCashFlow, emphasis: "total" }, ...(Math.abs(statements.otherCashFlow) >= 0.01 ? [{ label: "Other cash movements / reconciliation", amount: statements.otherCashFlow }] : []), { label: "Net cash flow", amount: statements.netCashFlow, emphasis: "total" }] },
      { title: "Cash Reconciliation", rows: [{ label: "Beginning cash balance", amount: statements.beginningCashBalance }, { label: "Ending cash balance", amount: statements.endingCashBalance, emphasis: "grand" }] },
    ];
    if (view === "balance") {
      const balanceSections: AccountsPdfSection[] = [...ACCOUNT_GROUPS]
      .filter(group => ["Current Assets", "Non-Current Assets", "Current Liabilities", "Non-Current Liabilities", "Equity"].includes(group))
      .map(group => {
        const rows = balanceSheetRows(report, group);
        return { title: group, rows: [...rows.map(row => ({ label: row.name, amount: row.balance })), { label: `Total ${group}`, amount: balanceSheetGroupTotal(report, group), emphasis: "total" as const }] };
      });
      const totals = balanceSheetTotals(report);
      balanceSections.push({ title: "Accounting Equation", rows: [{ label: "Total assets", amount: totals.assets }, { label: "Total liabilities and equity", amount: totals.liabilities + totals.equity, emphasis: "grand" }] });
      return balanceSections;
    }
    return [];
  }, [view, statements, report]);

  async function downloadPagelessPdf() {
    if (view === "entries" || !valid) return;
    setGeneratingPdf(true);
    try {
      const [{ pdf }, { AccountsStatementPDF }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/reports/AccountsStatementPDF")]);
      const blob = await pdf(<AccountsStatementPDF title={reportTitle} period={`${start} to ${end}`} sections={pdfSections} />).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${view}-statement-${start}-to-${end}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  }
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
    setView("balance");
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
  async function saveProductionCost(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      const amount = Number(productionCost.amount);
      const description = productionCost.description.trim();
      if (!canPost || !/^\d{4}-\d{2}-\d{2}$/.test(productionCost.date) || !description || !Number.isFinite(amount) || amount <= 0 || !["1000", "1030"].includes(productionCost.settlementCode)) throw new Error("Enter a date, cost name, positive amount, and Cash or Bank payment method.");
      if (/\bdirect\s*labou?r\b/i.test(description)) throw new Error("Direct Labor comes only from confirmed Payments and cannot be entered here.");
      const entry = { date: productionCost.date, description, amount, settlementCode: productionCost.settlementCode, reference: productionCost.reference.trim(), notes: productionCost.notes.trim() };
      if (editingProductionCostId) await updateDoc(doc(db, "productionCosts", editingProductionCostId), entry);
      else await addDoc(collection(db, "productionCosts"), { ...entry, createdAt: Timestamp.now(), createdBy: userRole?.uid });
      setProductionCost({ date: dateKey(new Date()), description: "", amount: "", settlementCode: "", reference: "", notes: "" });
      setEditingProductionCostId(null);
      setMessage(editingProductionCostId ? "Production cost updated successfully." : "Production cost recorded successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save production cost."); }
    finally { setSaving(false); }
  }
  function editProductionCost(entry: ProductionCostEntry) {
    setProductionCost({ date: entry.date, description: entry.description, amount: String(entry.amount), settlementCode: entry.settlementCode, reference: entry.reference ?? "", notes: entry.notes ?? "" });
    setEditingProductionCostId(entry.id);
    setEntriesStatement("income"); setView("entries"); setMessage("");
  }
  async function removeProductionCost(entry: ProductionCostEntry) {
    if (!canPost || !window.confirm(`Delete the production cost “${entry.description}”? This cannot be undone.`)) return;
    setMessage("");
    try {
      await deleteDoc(doc(db, "productionCosts", entry.id));
      if (editingProductionCostId === entry.id) { setEditingProductionCostId(null); setProductionCost({ date: dateKey(new Date()), description: "", amount: "", settlementCode: "", reference: "", notes: "" }); }
      setMessage("Production cost deleted successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete production cost."); }
  }
  async function saveTaxEntry(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      const amount = Number(taxEntry.amount);
      if (!canPost || !/^\d{4}-\d{2}-\d{2}$/.test(taxEntry.date) || !Number.isFinite(amount) || amount <= 0) throw new Error("Enter a valid date and a positive tax amount.");
      const entry = { date: taxEntry.date, description: taxEntry.description.trim(), amount };
      if (editingTaxId) await updateDoc(doc(db, "taxEntries", editingTaxId), entry);
      else await addDoc(collection(db, "taxEntries"), { ...entry, createdAt: Timestamp.now(), createdBy: userRole?.uid });
      setTaxEntry({ date: dateKey(new Date()), description: "", amount: "" });
      setEditingTaxId(null);
      setMessage(editingTaxId ? "Tax entry updated successfully." : "Tax entry recorded successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save tax entry."); }
    finally { setSaving(false); }
  }
  function editTaxEntry(entry: TaxEntry) {
    setTaxEntry({ date: entry.date, description: entry.description ?? "", amount: String(entry.amount) });
    setEditingTaxId(entry.id); setEntriesStatement("income"); setView("entries"); setMessage("");
  }
  async function removeTaxEntry(entry: TaxEntry) {
    if (!canPost || !window.confirm(`Delete this tax entry of ${money(entry.amount)}? This cannot be undone.`)) return;
    setMessage("");
    try {
      await deleteDoc(doc(db, "taxEntries", entry.id));
      if (editingTaxId === entry.id) { setEditingTaxId(null); setTaxEntry({ date: dateKey(new Date()), description: "", amount: "" }); }
      setMessage("Tax entry deleted successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete tax entry."); }
  }
  return <RouteGuard><main className="accounts-page space-y-6">
    <div className="accounts-no-print"><AccountsSwitcher /></div>
    <div className="accounts-no-print"><h1 className="text-2xl font-bold">Accounts</h1><p className="text-sm text-gray-500">Live financial statements and chart of accounts · UGX</p></div>
    {view !== "entries" && <header className="accounts-print-header hidden border-b-4 border-double border-gray-900 pb-4">
      <p className="text-sm font-semibold uppercase tracking-widest">Star Durable Pads</p>
      <h1 className="mt-1 text-2xl font-bold">{reportTitle}</h1>
      <p className="mt-1 text-sm">Reporting period: {start} to {end} · Currency: UGX</p>
    </header>}
    <div className="accounts-no-print flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" aria-label="Accounting period">{[["week", "Weekly"], ["month", "Monthly"], ["12months", "12 Months"], ["custom", "Custom"]].map(([id, label]) => <button key={id} type="button" onClick={() => setPeriod(id)} className={`rounded-lg px-4 py-2 ${period === id && view !== "entries" ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{label}</button>)}</div>
      <button type="button" onClick={() => setView("entries")} className={`rounded-lg border px-4 py-2 ${view === "entries" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white"}`}>Entries</button>
    </div>
    <div className="accounts-no-print flex flex-wrap items-center justify-between gap-3">
    <div role="tablist" aria-label="Financial statements" className="grid flex-1 overflow-hidden rounded-xl border bg-white sm:grid-cols-3">
      {([["income", "Income Statement (Profit & Loss)"], ["balance", "Balance Sheet"], ["cashflow", "Cash Flow Statement"]] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`min-h-14 border-b px-4 py-3 text-sm font-semibold transition-colors last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${view === id ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>{label}</button>)}
    </div>
    {view !== "entries" && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.print()} className="rounded-lg border border-blue-700 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">Print</button><button type="button" disabled={generatingPdf || !valid} onClick={downloadPagelessPdf} className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{generatingPdf ? "Generating PDF…" : "Download Pageless PDF"}</button></div>}
    </div>
    {view !== "entries" && period === "custom" && <div className="accounts-no-print flex flex-wrap gap-3"><label>From <input aria-label="Start date" type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={input} /></label><label>To <input aria-label="End date" type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={input} /></label></div>}
    {view !== "entries" && (!valid ? <p role="alert">Choose a valid start and end date.</p> : <>
      {loading && <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Loading account balances… The balance-sheet structure is shown below and will populate as records arrive.</p>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Some account records could not be loaded.</p><p>{error}</p><p className="mt-1">Check that the <code className="rounded bg-red-100 px-1">accountJournals</code>, <code className="rounded bg-red-100 px-1">productionCosts</code>, and <code className="rounded bg-red-100 px-1">taxEntries</code> Firestore rules have been published.</p></div>}
      {view === "income" && <div className="accounts-print-content"><IncomeStatementTab statement={statements} start={start} end={end} /></div>}
      {view === "cashflow" && <div className="accounts-print-content"><CashFlowStatementTab statement={statements} start={start} end={end} /></div>}
      {view === "balance" && <>
      <p className="text-sm text-gray-500">Activity: {start} to {end}. Balance sheet includes all classified entries up to {end}, including prior periods.</p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Balances reflect recorded transactions and journals only. Enter opening balances and adjustments below to include existing assets, liabilities, and capital. {report.unclassified} sales/expense entries through {end} have no valid accounting classification and are excluded.</div>
      <div className="accounts-print-content"><BalanceSheetTab statement={statements} report={report} excludedAllowance={excludedAllowanceBalance(report)}><BalanceSheetTable columns={balanceSheetColumns} /></BalanceSheetTab></div>
      <section className="accounts-no-print overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="font-semibold">Cash and bank activity</h2><p className="mt-1 text-sm text-gray-500">Transaction-level explanation of the cash balances shown above. Positive values increase cash; negative values reduce it.</p></div><div className="max-h-96 overflow-auto"><table className="w-full min-w-[760px] text-sm"><thead className="sticky top-0 bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Source</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Cash account</th><th className="p-3 text-right">Movement</th></tr></thead><tbody>{cashActivity.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">No cash activity has been recorded.</td></tr> : cashActivity.map(entry => <tr key={entry.id} className="border-t"><td className="p-3 whitespace-nowrap">{entry.date}</td><td className="p-3">{entry.source}</td><td className="p-3">{entry.description}</td><td className="p-3">{entry.account}</td><td className={`p-3 text-right font-medium tabular-nums ${entry.amount < 0 ? "text-red-700" : "text-green-700"}`}>{money(entry.amount)}</td></tr>)}</tbody></table></div></section>
      <div className="accounts-no-print contents">{ACCOUNT_GROUPS.filter(group => ["Current Assets", "Non-Current Assets", "Current Liabilities", "Non-Current Liabilities", "Equity"].includes(group)).map(group => {
        const rows = balanceSheetRows(report, group);
        const isActivity = ["Income", "Other Income", "Cost of Sales", "Expenses"].includes(group);
        return <section key={group} className="rounded-xl border bg-white overflow-hidden"><h2 className="font-semibold px-5 py-4 bg-gray-50">{group}</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left"><th className="p-3">Account / subcategory</th><th className="p-3 text-right">Period movement</th><th className="p-3 text-right">Balance at {end}</th></tr></thead><tbody>{rows.map(a => <tr key={a.code} className="border-t"><td className="p-3">{a.name}</td><td className="p-3 text-right tabular-nums">{money(a.movement)}</td><td className="p-3 text-right tabular-nums">{money(a.balance)}</td></tr>)}</tbody><tfoot><tr className="border-t font-semibold"><td className="p-3">Total {group}{isActivity ? " (income statement)" : ""}</td><td className="p-3 text-right">{money(balanceSheetGroupTotal(report, group, "movement"))}</td><td className="p-3 text-right">{money(balanceSheetGroupTotal(report, group))}</td></tr></tfoot></table></div></section>;
      })}</div>
      <section className="accounts-no-print rounded-xl border bg-white p-5 space-y-3"><h2 className="font-semibold">Journal history — selected period</h2>{journals.data.filter(j => j.date >= start && j.date <= end).map(j => <p key={j.id} className="text-sm border-b py-2">{j.date} · {j.description} · Debit {accountName(j.debitCode)} / Credit {accountName(j.creditCode)} · {money(j.amount)}</p>)}</section>
      </>}
    </>)}
    {view === "entries" && error && <p role="alert" className="accounts-no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Account entries could not be fully loaded: {error}. Check the published Firestore rules.</p>}
    {view === "entries" && <div className="accounts-no-print flex items-center gap-3"><label htmlFor="entries-statement" className="text-sm font-medium">Statement</label><select id="entries-statement" className={input} style={{ maxWidth: 280 }} value={entriesStatement} onChange={e => { setEntriesStatement(e.target.value as "balance" | "income"); setMessage(""); }}><option value="balance">Balance Sheet</option><option value="income">Income Statement</option></select></div>}
    {view === "entries" && entriesStatement === "income" && <>
      {canPost && <form onSubmit={saveProductionCost} className="accounts-no-print rounded-xl border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">{editingProductionCostId ? "Edit Cost of Production" : "Add Cost of Production"}</h2>{editingProductionCostId && <button type="button" className="text-sm text-gray-600 hover:underline" onClick={() => { setEditingProductionCostId(null); setProductionCost({ date: dateKey(new Date()), description: "", amount: "", settlementCode: "", reference: "", notes: "" }); setMessage(""); }}>Cancel edit</button>}</div>
        <p className="text-sm text-gray-500">Record Other Costs here. Direct Labor is calculated only from confirmed payments.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Date<input required type="date" className={input} value={productionCost.date} onChange={e => setProductionCost({ ...productionCost, date: e.target.value })} /></label>
          <label>Amount (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={productionCost.amount} onChange={e => setProductionCost({ ...productionCost, amount: e.target.value })} /></label>
          <label className="sm:col-span-2">Cost Name / Description<input required maxLength={200} className={input} value={productionCost.description} onChange={e => setProductionCost({ ...productionCost, description: e.target.value })} /></label>
          <label>Payment Method<select required className={input} value={productionCost.settlementCode} onChange={e => setProductionCost({ ...productionCost, settlementCode: e.target.value as "" | "1000" | "1030" })}><option value="">Select payment method...</option><option value="1030">Cash</option><option value="1000">Bank</option></select></label>
          <label>Reference (optional)<input maxLength={120} className={input} value={productionCost.reference} onChange={e => setProductionCost({ ...productionCost, reference: e.target.value })} /></label>
          <label className="sm:col-span-2">Notes (optional)<input maxLength={500} className={input} value={productionCost.notes} onChange={e => setProductionCost({ ...productionCost, notes: e.target.value })} /></label>
        </div>
        <button disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving..." : editingProductionCostId ? "Update cost" : "Record cost"}</button><p role="status">{message}</p>
      </form>}
      <section className="accounts-no-print overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">Cost of Production Entries</h2><p className="text-sm text-gray-500">Other Costs recorded on this page.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Cost Name / Description</th><th className="p-3 text-left">Payment Method</th><th className="p-3 text-left">Reference</th><th className="p-3 text-right">Amount</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>{productionCostEntries.length === 0 ? <tr><td colSpan={canPost ? 6 : 5} className="p-8 text-center text-gray-500">No production costs have been recorded.</td></tr> : productionCostEntries.map(entry => <tr key={entry.id} className="border-t"><td className="p-3 whitespace-nowrap">{entry.date}</td><td className="p-3">{entry.description}{entry.notes && <span className="block text-xs text-gray-500">{entry.notes}</span>}</td><td className="p-3">{entry.settlementCode === "1030" ? "Cash" : "Bank"}</td><td className="p-3">{entry.reference || "—"}</td><td className="p-3 text-right tabular-nums">{money(entry.amount)}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" onClick={() => editProductionCost(entry)} className="mr-3 text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => removeProductionCost(entry)} className="text-red-700 hover:underline">Delete</button></td>}</tr>)}</tbody></table></div></section>
      {canPost && <form onSubmit={saveTaxEntry} className="accounts-no-print space-y-4 rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between"><h2 className="font-semibold">{editingTaxId ? "Edit Tax Deduction" : "Add Tax Deduction"}</h2>{editingTaxId && <button type="button" className="text-sm text-gray-600 hover:underline" onClick={() => { setEditingTaxId(null); setTaxEntry({ date: dateKey(new Date()), description: "", amount: "" }); setMessage(""); }}>Cancel edit</button>}</div>
        <p className="text-sm text-gray-500">Tax entries reduce Net Income and accrue to Income Tax Payable until settled. Existing tax expenses already appear automatically; do not enter the same tax twice.</p>
        <div className="grid gap-4 sm:grid-cols-2"><label>Date<input required type="date" className={input} value={taxEntry.date} onChange={e => setTaxEntry({ ...taxEntry, date: e.target.value })} /></label><label>Amount (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={taxEntry.amount} onChange={e => setTaxEntry({ ...taxEntry, amount: e.target.value })} /></label><label className="sm:col-span-2">Description (optional)<input maxLength={200} className={input} value={taxEntry.description} onChange={e => setTaxEntry({ ...taxEntry, description: e.target.value })} /></label></div>
        <button disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving..." : editingTaxId ? "Update tax entry" : "Record tax entry"}</button><p role="status">{message}</p>
      </form>}
      <section className="accounts-no-print overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">Tax Entries</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Amount</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>{sortedTaxEntries.length === 0 ? <tr><td colSpan={canPost ? 4 : 3} className="p-8 text-center text-gray-500">No tax entries have been recorded.</td></tr> : sortedTaxEntries.map(entry => <tr key={entry.id} className="border-t"><td className="p-3 whitespace-nowrap">{entry.date}</td><td className="p-3">{entry.description || "—"}</td><td className="p-3 text-right tabular-nums">{money(entry.amount)}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" onClick={() => editTaxEntry(entry)} className="mr-3 text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => removeTaxEntry(entry)} className="text-red-700 hover:underline">Delete</button></td>}</tr>)}</tbody></table></div></section>
    </>}
    {view === "entries" && entriesStatement === "balance" && <section className="accounts-no-print rounded-xl border bg-white overflow-hidden"><div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">Account Entries</h2><p className="text-sm text-gray-500">All entries recorded from the Accounts form.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Debit account</th><th className="p-3 text-left">Credit account</th><th className="p-3 text-right">Amount</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>{journalEntries.length === 0 ? <tr><td className="p-8 text-center text-gray-500" colSpan={canPost ? 6 : 5}>No account entries have been recorded.</td></tr> : journalEntries.map(entry => <tr key={entry.id} className="border-t"><td className="p-3 whitespace-nowrap">{entry.date}</td><td className="p-3">{entry.description}</td><td className="p-3">{accountName(entry.debitCode)}</td><td className="p-3">{accountName(entry.creditCode)}</td><td className="p-3 text-right tabular-nums">{money(entry.amount)}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" onClick={() => editJournal(entry)} className="mr-3 text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => removeJournal(entry)} className="text-red-700 hover:underline">Delete</button></td>}</tr>)}</tbody></table></div></section>}
    {canPost && view === "balance" && <form onSubmit={saveJournal} className="accounts-no-print rounded-xl border bg-white p-5 space-y-4"><div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{editingJournalId ? "Edit account entry" : "Opening balances and adjustments"}</h2>{editingJournalId && <button type="button" onClick={() => { setEditingJournalId(null); setJournal({ date: dateKey(new Date()), debitCode: "", creditCode: "", amount: "", description: "" }); setMessage(""); }} className="text-sm text-gray-600 hover:underline">Cancel edit</button>}</div><p className="text-sm text-gray-500">Record an equal debit and credit. Use this for opening assets, loans, capital, transfers, and non-cash adjustments. Sales and expenses are included automatically through their own entry forms; do not enter them again here.</p><div className="grid sm:grid-cols-2 gap-4"><label>Date<input required type="date" className={input} value={journal.date} onChange={e => setJournal({ ...journal, date: e.target.value })} /></label>{(["debitCode", "creditCode"] as const).map(key => <label key={key}>{key === "debitCode" ? "Debit account" : "Credit account"}<select required className={input} value={journal[key]} onChange={e => setJournal({ ...journal, [key]: e.target.value })}><option value="">Select...</option>{ACCOUNTS.filter(a => !["Income", "Other Income", "Cost of Sales", "Expenses"].includes(a.group)).map(a => <option key={a.code} value={a.code}>{balanceSheetAccountName(a.code, a.name)}</option>)}</select></label>)}<label>Amount (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={journal.amount} onChange={e => setJournal({ ...journal, amount: e.target.value })} /></label><label className="sm:col-span-2">Description<input required className={input} value={journal.description} onChange={e => setJournal({ ...journal, description: e.target.value })} /></label></div><button disabled={saving} className="rounded-lg bg-gray-900 text-white px-4 py-2 disabled:opacity-50">{saving ? "Saving..." : editingJournalId ? "Update entry" : "Record journal"}</button><p role="status">{message}</p></form>}
  </main></RouteGuard>;
}
