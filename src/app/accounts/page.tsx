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
import { JOURNAL_STRUCTURE, journalLines, journalPathForCode, type JournalCategory } from "@/lib/balance-sheet-journal-options";
import { CashFlowStatementTab } from "@/components/accounts/CashFlowStatementTab";
import { IncomeStatementTab } from "@/components/accounts/IncomeStatementTab";
import { ACCOUNTS, ACCOUNT_GROUPS, PRODUCTION_COST_ENTRY_LINES, SETTLEMENT_CODES, buildAccounts, hasSavedProductionCostItem, productionCostItem, resolveAccounting, type LedgerSource, type Journal, type ProductionCostEntry, type ProductionCostItem, type TaxEntry, type PayrollProductionEntry, type PayrollPaymentEntry, type PayeRemittanceEntry } from "@/lib/accounts";
import { buildFinancialStatements, type ConfirmedLaborPayment } from "@/lib/financial-statements";
import { accountPeriodError, addCalendarDays, comparisonAccountPeriods, formatAccountDate, resolveAccountPeriod, todayInEat, type AccountPeriodKey } from "@/lib/account-period";
import type { AccountsPdfSection } from "@/components/reports/AccountsStatementPDF";

type AccountView = "income" | "balance" | "cashflow" | "entries";

const money = (amount: number) => `UGX ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export default function AccountsPage() {
  const { userRole } = useAuth();
  const [period, setPeriod] = useState<AccountPeriodKey>("month");
  const [view, setView] = useState<AccountView>("income");
  const [entriesStatement, setEntriesStatement] = useState<"balance" | "income">("balance");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [journal, setJournal] = useState({ date: todayInEat(), category: "" as JournalCategory | "", itemCode: "", amount: "", description: "" });
  const [editingJournalOffsetCode, setEditingJournalOffsetCode] = useState<string | null>(null);
  const [cashActivityOpen, setCashActivityOpen] = useState(false);
  const [productionCost, setProductionCost] = useState({ date: todayInEat(), item: "" as "" | ProductionCostItem, description: "", amount: "", settlementCode: "" as "" | "1000" | "1030", reference: "", notes: "" });
  const [editingProductionCostId, setEditingProductionCostId] = useState<string | null>(null);
  const [taxEntry, setTaxEntry] = useState({ date: todayInEat(), description: "", amount: "" });
  const [editingTaxId, setEditingTaxId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [editingJournalId, setEditingJournalId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const sales = useRealtimeCollection<LedgerSource>("saleTransactions");
  const expenses = useRealtimeCollection<LedgerSource>("expenses");
  const journals = useRealtimeCollection<Journal>("accountJournals");
  const payments = useRealtimeCollection<ConfirmedLaborPayment & PayrollPaymentEntry>("payments");
  const payeRemittances = useRealtimeCollection<PayeRemittanceEntry>("payeRemittances");
  const payrollEntries = useRealtimeCollection<PayrollProductionEntry>("productionEntries");
  const productionCosts = useRealtimeCollection<ProductionCostEntry>("productionCosts");
  const taxEntries = useRealtimeCollection<TaxEntry>("taxEntries");
  const selectedPeriod = useMemo(() => resolveAccountPeriod(period, customStart, customEnd), [period, customStart, customEnd]);
  const { start, end } = selectedPeriod;
  const periodError = accountPeriodError(selectedPeriod);
  const valid = !periodError;
  const report = useMemo(() => buildAccounts(sales.data, expenses.data, journals.data, start, end, productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data), [sales.data, expenses.data, journals.data, start, end, productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data]);
  const openingEnd = valid ? addCalendarDays(start, -1) : "";
  const openingReport = useMemo(() => buildAccounts(sales.data, expenses.data, journals.data, "", openingEnd, productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data), [sales.data, expenses.data, journals.data, openingEnd, productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data]);
  const openingCashBalance = useMemo(() => openingReport.rows.filter(row => SETTLEMENT_CODES.includes(row.code)).reduce((sum, row) => sum + row.balance, 0), [openingReport]);
  const statements = useMemo(
    () => buildFinancialStatements(sales.data, expenses.data, journals.data, report, start, end, payments.data, productionCosts.data, taxEntries.data, payrollEntries.data, openingCashBalance, payeRemittances.data),
    [sales.data, expenses.data, journals.data, report, start, end, payments.data, productionCosts.data, taxEntries.data, payrollEntries.data, openingCashBalance, payeRemittances.data],
  );
  const accountName = (code: string) => balanceSheetAccountName(code, report.rows.find(account => account.code === code)?.name ?? ACCOUNTS.find(account => account.code === code)?.name ?? "Account");
  const journalEntries = useMemo(() => journals.data.filter(entry => !entry.bankingKind).sort((a, b) => b.date.localeCompare(a.date)), [journals.data]);
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
      return accounting && SETTLEMENT_CODES.includes(accounting.settlementCode) ? [{ id: `expense-${entry.id}`, date: entry.date, source: "Expense", description: entry.description || accounting.accountName, account: cashAccountName(accounting.settlementCode), amount: -(Number(entry.amountUgx) || 0) }] : [];
    });
    const productionRows = productionCosts.data.map(entry => ({ id: `production-${entry.id}`, date: entry.date, source: "Production cost", description: entry.description, account: cashAccountName(entry.settlementCode), amount: -(Number(entry.amount) || 0) }));
    const payrollRows = payments.data.filter(payment => payment.payrollVersion === 2 && payment.status === "paid" && payment.paymentSourceCode).map(payment => ({ id: `payroll-${payment.id}`, date: payment.paidDate, source: "Payroll", description: "Net wages paid", account: cashAccountName(payment.paymentSourceCode!), amount: -(Number(payment.netPayAmount) || 0) }));
    const payeRows = payeRemittances.data.map(remittance => ({ id: `paye-${remittance.id}`, date: remittance.paymentDate, source: "PAYE remittance", description: "PAYE paid to URA", account: cashAccountName(remittance.paymentSourceCode), amount: -(Number(remittance.amount) || 0) }));
    const journalRows = journals.data.flatMap(entry => {
      const debitCash = SETTLEMENT_CODES.includes(entry.debitCode);
      const creditCash = SETTLEMENT_CODES.includes(entry.creditCode);
      if (entry.bankingKind === "transfer" && debitCash && creditCash) return [
        { id: `transfer-${entry.id}-out`, date: entry.date, source: entry.bankingStatus === "awaiting_deposit_details" ? "Transfer · Awaiting deposit details" : "Transfer", description: entry.description, account: entry.creditCode === "1000" ? `${cashAccountName(entry.creditCode)} · ${entry.bankName || "Bank (not specified)"}` : cashAccountName(entry.creditCode), amount: -entry.amount },
        { id: `transfer-${entry.id}-in`, date: entry.date, source: entry.bankingStatus === "awaiting_deposit_details" ? "Deposit · Awaiting details" : "Deposit · Linked transfer", description: entry.description, account: entry.debitCode === "1000" ? `${cashAccountName(entry.debitCode)} · ${entry.bankName || "Bank (not specified)"}` : cashAccountName(entry.debitCode), amount: entry.amount },
      ];
      if (debitCash === creditCash) return [];
      const code = debitCash ? entry.debitCode : entry.creditCode;
      const account = cashAccountName(code);
      const taggedAccount = code === "1000" && entry.bankingKind ? `${account} · ${entry.bankName || "Bank (not specified)"}` : account;
      return [{ id: `journal-${entry.id}`, date: entry.date, source: entry.bankingKind === "deposit" ? "Deposit" : "Journal", description: entry.description, account: taggedAccount, amount: debitCash ? entry.amount : -entry.amount }];
    });
    return [...salesRows, ...expenseRows, ...productionRows, ...payrollRows, ...payeRows, ...journalRows].filter(entry => entry.date >= start && entry.date <= end).sort((a, b) => b.date.localeCompare(a.date));
  }, [sales.data, expenses.data, productionCosts.data, payments.data, payeRemittances.data, journals.data, start, end]);
  const ranges = useMemo(() => valid ? comparisonAccountPeriods(selectedPeriod) : [], [valid, selectedPeriod]);
  const balanceSheetColumns = useMemo<BalanceSheetColumn[]>(() => ranges.map(range => ({ ...range, report: buildAccounts(sales.data, expenses.data, journals.data, range.start, range.end, productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data) })), [ranges, sales.data, expenses.data, journals.data, productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data]);
  const error = sales.error || expenses.error || journals.error || payments.error || productionCosts.error || taxEntries.error || payrollEntries.error || payeRemittances.error;
  const loading = sales.loading || expenses.loading || journals.loading || payments.loading || productionCosts.loading || taxEntries.loading || payrollEntries.loading || payeRemittances.loading;
  const canPost = ["ADMIN", "FINANCE", "FINANCIAL_MANAGER"].includes(userRole?.role ?? "");
  const input = "w-full border border-gray-300 rounded-md px-3 py-2 text-sm";
  const journalSections = journal.category ? JOURNAL_STRUCTURE[journal.category] : [];
  const journalItemGroups = journalSections.map(section => ({ ...section, lines: journalLines(report, section.label).filter(line => line.accountCode) }));
  const selectedJournalLine = journalItemGroups.flatMap(section => section.lines).find(line => line.accountCode === journal.itemCode);
  const automaticJournalOffsetCode = journal.category === "Equity" ? "1000" : "3060";
  const journalOffsetCode = editingJournalOffsetCode ?? automaticJournalOffsetCode;
  const journalEffect = selectedJournalLine && journalOffsetCode && selectedJournalLine.accountCode !== journalOffsetCode
    ? `Increases ${selectedJournalLine.name}; offset to ${accountName(journalOffsetCode)}.`
    : "Select a category and item to preview the balanced entry.";
  const resetJournalForm = () => {
    setJournal({ date: todayInEat(), category: "", itemCode: "", amount: "", description: "" });
    setEditingJournalId(null);
    setEditingJournalOffsetCode(null);
  };
  const journalDisplay = (entry: Journal) => {
    if (entry.simplifiedCategory && entry.simplifiedItemCode) return { category: entry.simplifiedCategory, itemCode: entry.simplifiedItemCode, offsetCode: entry.simplifiedOffsetCode ?? (entry.debitCode === entry.simplifiedItemCode ? entry.creditCode : entry.debitCode), mapped: true };
    const debitPath = journalPathForCode(report, entry.debitCode);
    const creditPath = journalPathForCode(report, entry.creditCode);
    if (debitPath?.category === "Assets") return { category: debitPath.category, itemCode: entry.debitCode, offsetCode: entry.creditCode, mapped: true };
    if (creditPath && ["Liabilities", "Equity"].includes(creditPath.category)) return { category: creditPath.category, itemCode: entry.creditCode, offsetCode: entry.debitCode, mapped: true };
    if (debitPath) return { category: debitPath.category, itemCode: entry.debitCode, offsetCode: entry.creditCode, mapped: true };
    if (creditPath) return { category: creditPath.category, itemCode: entry.creditCode, offsetCode: entry.debitCode, mapped: true };
    return { category: "" as const, itemCode: "", offsetCode: "", mapped: false };
  };
  const legacyProductionCostEntries = productionCostEntries.filter(entry => !hasSavedProductionCostItem(entry));
  const invalidProductionCostEntries = productionCostEntries.filter(entry => !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !Number.isFinite(Number(entry.amount)) || Number(entry.amount) <= 0);
  const unmappedJournalEntries = journalEntries.filter(entry =>
    !/^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    || !Number.isFinite(Number(entry.amount))
    || Number(entry.amount) <= 0
    || !ACCOUNTS.some(account => account.code === entry.debitCode)
    || !ACCOUNTS.some(account => account.code === entry.creditCode)
  );
  const reportTitle = view === "income" ? "Income Statement (Profit & Loss)" : view === "balance" ? "Balance Sheet" : "Cash Flow Statement";
  const pdfSections = useMemo<AccountsPdfSection[]>(() => {
    if (view === "income") return [
      { title: "Revenue", rows: [{ label: "Sales of Pads", amount: statements.salesOfPads }, { label: "Other Income", amount: statements.otherIncome }, { label: "  Sales of Materials", amount: statements.salesOfMaterials }, { label: "  Trainings", amount: statements.trainings }, ...statements.customIncome.map(entry => ({ label: `  ${entry.name}`, amount: entry.amount })), { label: "  Grants and Donations", amount: statements.grantsAndDonations }, { label: "Total revenue", amount: statements.revenue, emphasis: "total" }] },
      { title: "Cost of Production", rows: [{ label: "Purchases of Raw Materials", amount: statements.purchasesOfRawMaterials }, { label: "Carriage Inwards", amount: statements.carriageInwards }, { label: "Direct Labor", amount: statements.directLabor }, { label: "Other Costs", amount: statements.otherProductionCosts }, { label: "Total Cost of Production", amount: statements.costOfProduction, emphasis: "total" }, { label: "Gross profit", amount: statements.grossProfit, emphasis: "total" }] },
      { title: "Operating Expenses", rows: [{ label: "Operating Expenses", amount: statements.operatingExpenses }, ...statements.operatingExpenseLines.map(entry => ({ label: `  ${entry.name}`, amount: entry.amount })), { label: "Income Before Taxes", amount: statements.incomeBeforeTaxes, emphasis: "total" }, { label: "Tax Deductions", amount: statements.taxDeductions }, { label: "Net income", amount: statements.netIncome, emphasis: "grand" }] },
    ];
    if (view === "cashflow") return [
      { title: "Opening Cash", rows: [{ label: `Opening Cash at ${formatAccountDate(start)}`, amount: statements.beginningCashBalance, emphasis: "total" }] },
      { title: "A. Cash Flows from Operating Activities — Cash Received", rows: [...statements.cashReceivedLines.map(line => ({ label: line.name, amount: line.amount })), { label: "Total Cash Received", amount: statements.totalCashReceived, emphasis: "total" }] },
      { title: "A. Cash Flows from Operating Activities — Cash Paid", rows: [{ label: "Purchases of Raw Materials", amount: -statements.cashPaidForRawMaterials }, { label: "Carriage Inwards", amount: -statements.cashPaidForCarriageInwards }, { label: "Direct Labor", amount: -statements.cashPaidForDirectLabor }, { label: "Other production costs", amount: -statements.cashPaidForOtherProductionCosts }, { label: "Operating Expenses", amount: -statements.cashPaidForOperatingExpenses }, ...statements.operatingExpenseCashLines.map(line => ({ label: `  ${line.name}`, amount: -line.amount })), { label: "Taxes", amount: -statements.cashPaidForTaxes }, { label: "Total Cash Paid", amount: -statements.totalCashPaid, emphasis: "total" }, { label: "Net Cash from Operating Activities", amount: statements.operatingCashFlow, emphasis: "grand" }] },
      { title: "Non-cash Reconciliation Note", rows: [{ label: "Depreciation included in Net Income with no cash effect", amount: statements.nonCashAdjustments }] },
      { title: "B. Cash Flows from Investing Activities", rows: [...statements.investingCashLines.map(line => ({ label: line.name, amount: line.amount })), { label: "Net Cash from Investing Activities", amount: statements.investingCashFlow, emphasis: "total" }] },
      { title: "C. Cash Flows from Financing Activities", rows: [...statements.financingCashLines.map(line => ({ label: line.name, amount: line.amount })), { label: "Net Cash from Financing Activities", amount: statements.financingCashFlow, emphasis: "total" }] },
      ...(Math.abs(statements.otherCashFlow) >= 0.01 ? [{ title: "Other Cash Movements — Review Classification", rows: statements.otherCashMovementLines.map(line => ({ label: line.name, amount: line.amount })) }] : []),
      { title: "Cash Reconciliation", rows: [{ label: "Net Increase or Decrease in Cash", amount: statements.netCashFlow }, { label: `Closing Cash at ${formatAccountDate(end)}`, amount: statements.endingCashBalance, emphasis: "grand" }, ...(Math.abs(statements.cashActivityDifference) >= 0.01 ? [{ label: "Difference from Cash and Bank Activity — review", amount: statements.cashActivityDifference }] : []), ...(Math.abs(statements.cashBalanceDifference) >= 0.01 ? [{ label: "Difference from Balance Sheet Cash — review", amount: statements.cashBalanceDifference }] : [])] },
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
      balanceSections.push({ title: "Cash and Bank Activity", rows: [
        { label: `Opening cash at ${formatAccountDate(openingEnd)}`, amount: statements.beginningCashBalance },
        ...(cashActivity.length ? cashActivity.map(entry => ({ label: `${entry.date} · ${entry.source} · ${entry.description} · ${entry.account}`, amount: entry.amount })) : [{ label: "No cash activity in the selected period." }]),
        { label: `Closing cash at ${formatAccountDate(end)}`, amount: statements.endingCashBalance, emphasis: "grand" as const },
      ] });
      return balanceSections;
    }
    return [];
  }, [view, statements, report, cashActivity, openingEnd, start, end]);

  async function downloadPagelessPdf() {
    if (view === "entries" || !valid) return;
    setGeneratingPdf(true);
    try {
      const [{ pdf }, { AccountsStatementPDF }] = await Promise.all([import("@react-pdf/renderer"), import("@/components/reports/AccountsStatementPDF")]);
      const pdfPeriod = view === "balance" ? `As at ${formatAccountDate(end)}` : selectedPeriod.label;
      const blob = await pdf(<AccountsStatementPDF title={reportTitle} period={pdfPeriod} sections={pdfSections} />).toBlob();
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
      const itemCode = selectedJournalLine?.accountCode ?? "";
      const offsetCode = journalOffsetCode;
      if (!canPost || !/^\d{4}-\d{2}-\d{2}$/.test(journal.date) || !journal.category || !itemCode || !Number.isFinite(amount) || amount <= 0 || !journal.description.trim()) throw new Error("Enter a valid date, Category, Item, description and an amount greater than zero.");
      if (!ACCOUNTS.some(account => account.code === itemCode) || !ACCOUNTS.some(account => account.code === offsetCode) || itemCode === offsetCode) throw new Error("The selected item cannot be posted with its balancing account. Choose another item.");
      const assetIncrease = journal.category === "Assets";
      const entry = {
        date: journal.date,
        debitCode: assetIncrease ? itemCode : offsetCode,
        creditCode: assetIncrease ? offsetCode : itemCode,
        amount,
        description: journal.description.trim(),
        simplifiedCategory: journal.category,
        simplifiedItemCode: itemCode,
        simplifiedOffsetCode: offsetCode,
      };
      if (editingJournalId) {
        await updateDoc(doc(db, "accountJournals", editingJournalId), entry);
      } else {
        await addDoc(collection(db, "accountJournals"), { ...entry, createdAt: Timestamp.now(), createdBy: userRole?.uid });
      }
      resetJournalForm();
      setMessage(editingJournalId ? "Entry updated successfully." : "Journal recorded successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to save journal."); }
    finally { setSaving(false); }
  }
  function editJournal(entry: Journal) {
    const display = journalDisplay(entry);
    if (!display.mapped || !display.category || !display.itemCode) {
      setMessage("This historical entry cannot be mapped cleanly to one Balance Sheet item and was left unchanged.");
      return;
    }
    setJournal({ date: entry.date, category: display.category, itemCode: display.itemCode, amount: String(entry.amount), description: entry.description });
    setEditingJournalOffsetCode(display.offsetCode);
    setEditingJournalId(entry.id);
    setEntriesStatement("balance");
    setView("entries");
    setMessage("");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
  async function removeJournal(entry: Journal) {
    if (!canPost || !window.confirm(`Delete the entry “${entry.description}”? This cannot be undone.`)) return;
    setMessage("");
    try {
      await deleteDoc(doc(db, "accountJournals", entry.id));
      if (editingJournalId === entry.id) {
        resetJournalForm();
      }
      setMessage("Entry deleted successfully.");
    } catch (e) { setMessage(e instanceof Error ? e.message : "Unable to delete entry."); }
  }
  async function saveProductionCost(e: FormEvent) {
    e.preventDefault(); setSaving(true); setMessage("");
    try {
      const amount = Number(productionCost.amount);
      const description = productionCost.description.trim();
      if (!canPost || !/^\d{4}-\d{2}-\d{2}$/.test(productionCost.date) || !PRODUCTION_COST_ENTRY_LINES.some(line => line.id === productionCost.item) || !description || !Number.isFinite(amount) || amount <= 0 || !["1000", "1030"].includes(productionCost.settlementCode)) throw new Error("Enter a date, Cost of Production item, cost name, positive amount, and Cash or Bank payment method.");
      if (/\bdirect\s*labou?r\b/i.test(description)) throw new Error("Direct Labor comes from production earnings, including accrued unpaid wages, and cannot be entered here.");
      const entry = { date: productionCost.date, item: productionCost.item as ProductionCostItem, description, amount, settlementCode: productionCost.settlementCode, reference: productionCost.reference.trim(), notes: productionCost.notes.trim() };
      if (editingProductionCostId) await updateDoc(doc(db, "productionCosts", editingProductionCostId), entry);
      else await addDoc(collection(db, "productionCosts"), { ...entry, createdAt: Timestamp.now(), createdBy: userRole?.uid });
      setProductionCost({ date: todayInEat(), item: "", description: "", amount: "", settlementCode: "", reference: "", notes: "" });
      setEditingProductionCostId(null);
      setMessage(editingProductionCostId ? "Production cost updated successfully." : "Production cost recorded successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save production cost."); }
    finally { setSaving(false); }
  }
  function editProductionCost(entry: ProductionCostEntry) {
    setProductionCost({ date: entry.date, item: productionCostItem(entry), description: entry.description, amount: String(entry.amount), settlementCode: entry.settlementCode, reference: entry.reference ?? "", notes: entry.notes ?? "" });
    setEditingProductionCostId(entry.id);
    setEntriesStatement("income"); setView("entries"); setMessage("");
  }
  async function removeProductionCost(entry: ProductionCostEntry) {
    if (!canPost || !window.confirm(`Delete the production cost “${entry.description}”? This cannot be undone.`)) return;
    setMessage("");
    try {
      await deleteDoc(doc(db, "productionCosts", entry.id));
      if (editingProductionCostId === entry.id) { setEditingProductionCostId(null); setProductionCost({ date: todayInEat(), item: "", description: "", amount: "", settlementCode: "", reference: "", notes: "" }); }
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
      setTaxEntry({ date: todayInEat(), description: "", amount: "" });
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
      if (editingTaxId === entry.id) { setEditingTaxId(null); setTaxEntry({ date: todayInEat(), description: "", amount: "" }); }
      setMessage("Tax entry deleted successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete tax entry."); }
  }
  return <RouteGuard><main className="accounts-page space-y-6">
    <div className="accounts-no-print"><AccountsSwitcher /></div>
    <div className="accounts-no-print"><h1 className="text-2xl font-bold">Accounts</h1><p className="text-sm text-gray-500">Live financial statements and chart of accounts · UGX</p></div>
    {view !== "entries" && <header className="accounts-print-header hidden border-b-4 border-double border-gray-900 pb-4">
      <p className="text-sm font-semibold uppercase tracking-widest">Star Durable Pads</p>
      <h1 className="mt-1 text-2xl font-bold">{reportTitle}</h1>
      <p className="mt-1 text-sm">{view === "balance" ? `As at ${formatAccountDate(end)}` : `Reporting period: ${selectedPeriod.label}`} · Currency: UGX</p>
    </header>}
    <div className="accounts-no-print flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap gap-2" aria-label="Accounting period">{([["week", "Weekly"], ["month", "Monthly"], ["12months", "12 Months"], ["custom", "Custom"]] as const).map(([id, label]) => <button key={id} type="button" onClick={() => setPeriod(id)} className={`rounded-lg px-4 py-2 ${period === id && view !== "entries" ? "bg-gray-900 text-white" : "bg-gray-100"}`}>{label}</button>)}</div>
      <button type="button" onClick={() => setView("entries")} className={`rounded-lg border px-4 py-2 ${view === "entries" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300 bg-white"}`}>Entries</button>
    </div>
    <div className="accounts-no-print flex flex-wrap items-center justify-between gap-3">
    <div role="tablist" aria-label="Financial statements" className="grid flex-1 overflow-hidden rounded-xl border bg-white sm:grid-cols-3">
      {([["income", "Income Statement (Profit & Loss)"], ["balance", "Balance Sheet"], ["cashflow", "Cash Flow Statement"]] as const).map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)} className={`min-h-14 border-b px-4 py-3 text-sm font-semibold transition-colors last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${view === id ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>{label}</button>)}
    </div>
    {view !== "entries" && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.print()} className="rounded-lg border border-blue-700 bg-white px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">Print</button><button type="button" disabled={generatingPdf || !valid} onClick={downloadPagelessPdf} className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{generatingPdf ? "Generating PDF…" : "Download Pageless PDF"}</button></div>}
    </div>
    {view !== "entries" && period === "custom" && <div className="accounts-no-print flex flex-wrap gap-3"><label>From <input aria-label="Start date" type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className={input} /></label><label>To <input aria-label="End date" type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className={input} /></label></div>}
    {view !== "entries" && valid && <p className="accounts-no-print text-sm font-medium text-gray-700">{view === "balance" ? `As at ${formatAccountDate(end)}` : `Active period: ${selectedPeriod.label}`}</p>}
    {view !== "entries" && (!valid ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{periodError}</p> : <>
      {loading && <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">Loading account balances… The balance-sheet structure is shown below and will populate as records arrive.</p>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Some account records could not be loaded.</p><p>{error}</p><p className="mt-1">Check that the <code className="rounded bg-red-100 px-1">accountJournals</code>, <code className="rounded bg-red-100 px-1">productionCosts</code>, and <code className="rounded bg-red-100 px-1">taxEntries</code> Firestore rules have been published.</p></div>}
      {view === "income" && <div className="space-y-4"><div className="accounts-print-content"><IncomeStatementTab statement={statements} start={start} end={end} /></div>{legacyProductionCostEntries.length > 0 && <div role="status" className="accounts-no-print rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Legacy Cost of Production entries requiring review: {legacyProductionCostEntries.length}</p><p className="mt-1">These records were saved before the item selector existed, so they are included under Other Costs and have not been reclassified.</p><ul className="mt-2 list-disc space-y-1 pl-5">{legacyProductionCostEntries.map(entry => <li key={entry.id}>{entry.date || "No date"} · {entry.description || "No description"} · {money(Number(entry.amount) || 0)}</li>)}</ul></div>}{invalidProductionCostEntries.length > 0 && <div role="alert" className="accounts-no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Cost entries excluded because their date or amount is invalid: {invalidProductionCostEntries.length}</p><ul className="mt-2 list-disc space-y-1 pl-5">{invalidProductionCostEntries.map(entry => <li key={entry.id}>{entry.id} · date: {String(entry.date || "missing")} · amount: {String(entry.amount)}</li>)}</ul></div>}</div>}
      {view === "cashflow" && <div className="accounts-print-content"><CashFlowStatementTab statement={statements} start={start} end={end} /></div>}
      {view === "balance" && <>
      <p className="text-sm text-gray-500">As at {formatAccountDate(end)}. The Balance Sheet includes all classified entries up to this date, including prior periods.</p>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">Balances reflect recorded transactions and journals only. Enter opening balances and adjustments on Entries → Balance Sheet to include existing assets, liabilities, and capital. {report.unclassified} sales/expense entries through {end} have no valid accounting classification and are excluded.</div>
      {unmappedJournalEntries.length > 0 && <div role="alert" className="accounts-no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"><p className="font-semibold">Journal entries not safely mappable to the Balance Sheet: {unmappedJournalEntries.length}</p><p className="mt-1">These saved records were not changed. Correct the missing/unknown account, date or amount before they can affect a displayed line.</p><ul className="mt-2 list-disc space-y-1 pl-5">{unmappedJournalEntries.map(entry => <li key={entry.id}>{entry.date || "No date"} · {entry.description || entry.id} · Debit {entry.debitCode || "missing"} / Credit {entry.creditCode || "missing"} · {money(Number(entry.amount) || 0)}</li>)}</ul></div>}
      <div className="accounts-print-content"><BalanceSheetTab statement={statements} report={report} end={end} excludedAllowance={excludedAllowanceBalance(report)}><BalanceSheetTable columns={balanceSheetColumns} activeEnd={end} /></BalanceSheetTab></div>
      <section className="accounts-cash-print overflow-hidden rounded-xl border bg-white"><button type="button" aria-expanded={cashActivityOpen} aria-controls="cash-bank-activity-detail" onClick={() => setCashActivityOpen(open => !open)} className="flex w-full items-center justify-between border-b px-5 py-4 text-left"><span><span className="block font-semibold">Cash and bank activity</span><span className="mt-1 block text-sm text-gray-500">{selectedPeriod.label}. Positive values increase cash; negative values reduce it.</span></span><span className="accounts-no-print ml-3 text-xl" aria-hidden="true">{cashActivityOpen ? "⌃" : "⌄"}</span></button><div id="cash-bank-activity-detail" className={`${cashActivityOpen ? "" : "hidden"} accounts-cash-detail`}><div className="grid gap-3 border-b bg-gray-50 p-4 text-sm sm:grid-cols-3"><div><span className="block text-gray-500">Opening cash</span><strong>{money(statements.beginningCashBalance)}</strong></div><div><span className="block text-gray-500">Period movement</span><strong>{money(statements.netCashFlow)}</strong></div><div><span className="block text-gray-500">Closing cash</span><strong>{money(statements.endingCashBalance)}</strong></div></div>{Math.abs(statements.cashBalanceDifference) >= 0.01 && <p role="alert" className="border-b border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Cash reconciliation difference: {money(statements.cashBalanceDifference)}. Closing cash does not match the Balance Sheet cash balance at {formatAccountDate(end)}.</p>}<div className="max-h-96 overflow-auto"><table className="w-full min-w-[760px] text-sm"><thead className="sticky top-0 bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Source</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Cash account</th><th className="p-3 text-right">Movement</th></tr></thead><tbody>{cashActivity.length === 0 ? <tr><td colSpan={5} className="p-8 text-center text-gray-500">No cash activity in the selected period.</td></tr> : cashActivity.map(entry => <tr key={entry.id} className="border-t"><td className="p-3 whitespace-nowrap">{entry.date}</td><td className="p-3">{entry.source}</td><td className="p-3">{entry.description}</td><td className="p-3">{entry.account}</td><td className={`p-3 text-right font-medium tabular-nums ${entry.amount < 0 ? "text-red-700" : "text-green-700"}`}>{money(entry.amount)}</td></tr>)}</tbody></table></div></div></section>
      </>}
    </>)}
    {view === "entries" && error && <p role="alert" className="accounts-no-print rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Account entries could not be fully loaded: {error}. Check the published Firestore rules.</p>}
    {view === "entries" && <div className="accounts-no-print flex items-center gap-3"><label htmlFor="entries-statement" className="text-sm font-medium">Statement</label><select id="entries-statement" className={input} style={{ maxWidth: 280 }} value={entriesStatement} onChange={e => { setEntriesStatement(e.target.value as "balance" | "income"); setMessage(""); }}><option value="balance">Balance Sheet</option><option value="income">Income Statement</option></select></div>}
    {view === "entries" && entriesStatement === "income" && <>
      {canPost && <form onSubmit={saveProductionCost} className="accounts-no-print rounded-xl border bg-white p-5 space-y-4">
        <div className="flex items-center justify-between"><h2 className="font-semibold">{editingProductionCostId ? "Edit Cost of Production" : "Add Cost of Production"}</h2>{editingProductionCostId && <button type="button" className="text-sm text-gray-600 hover:underline" onClick={() => { setEditingProductionCostId(null); setProductionCost({ date: todayInEat(), item: "", description: "", amount: "", settlementCode: "", reference: "", notes: "" }); setMessage(""); }}>Cancel edit</button>}</div>
        <p className="text-sm text-gray-500">Select the Income Statement line for this cost. Direct Labor comes only from confirmed Payments and cannot be entered here.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>Date<input required type="date" className={input} value={productionCost.date} onChange={e => setProductionCost({ ...productionCost, date: e.target.value })} /></label>
          <label>Amount (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={productionCost.amount} onChange={e => setProductionCost({ ...productionCost, amount: e.target.value })} /></label>
          <label>Cost of Production Item<select required className={input} value={productionCost.item} onChange={e => setProductionCost({ ...productionCost, item: e.target.value as "" | ProductionCostItem })}><option value="">Select item...</option>{PRODUCTION_COST_ENTRY_LINES.map(line => <option key={line.id} value={line.id}>{line.label}</option>)}</select></label>
          <span className="hidden sm:block" aria-hidden="true" />
          <label className="sm:col-span-2">Cost Name / Description<input required maxLength={200} className={input} value={productionCost.description} onChange={e => setProductionCost({ ...productionCost, description: e.target.value })} /></label>
          <label>Payment Method<select required className={input} value={productionCost.settlementCode} onChange={e => setProductionCost({ ...productionCost, settlementCode: e.target.value as "" | "1000" | "1030" })}><option value="">Select payment method...</option><option value="1030">Cash</option><option value="1000">Bank</option></select></label>
          <label>Reference (optional)<input maxLength={120} className={input} value={productionCost.reference} onChange={e => setProductionCost({ ...productionCost, reference: e.target.value })} /></label>
          <label className="sm:col-span-2">Notes (optional)<input maxLength={500} className={input} value={productionCost.notes} onChange={e => setProductionCost({ ...productionCost, notes: e.target.value })} /></label>
        </div>
        <button disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving..." : editingProductionCostId ? "Update cost" : "Record cost"}</button><p role="status">{message}</p>
      </form>}
      <section className="accounts-no-print overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">Cost of Production Entries</h2><p className="text-sm text-gray-500">Entries are grouped into their selected Income Statement line. Older entries without a saved item remain under Other Costs.</p>{legacyProductionCostEntries.length > 0 && <p className="mt-2 font-medium text-amber-700">Review required: {legacyProductionCostEntries.length} older {legacyProductionCostEntries.length === 1 ? "entry has" : "entries have"} no saved item and are included under Other Costs.</p>}</div><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Cost of Production Item</th><th className="p-3 text-left">Cost Name / Description</th><th className="p-3 text-left">Payment Method</th><th className="p-3 text-left">Reference</th><th className="p-3 text-right">Amount</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>{productionCostEntries.length === 0 ? <tr><td colSpan={canPost ? 7 : 6} className="p-8 text-center text-gray-500">No production costs have been recorded.</td></tr> : productionCostEntries.map(entry => { const item = PRODUCTION_COST_ENTRY_LINES.find(line => line.id === productionCostItem(entry)); const legacy = !hasSavedProductionCostItem(entry); return <tr key={entry.id} className="border-t"><td className="p-3 whitespace-nowrap">{entry.date}</td><td className="p-3">{item?.label ?? "Other Costs"}{legacy && <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">Legacy · review</span>}</td><td className="p-3">{entry.description}{entry.notes && <span className="block text-xs text-gray-500">{entry.notes}</span>}</td><td className="p-3">{entry.settlementCode === "1030" ? "Cash" : "Bank"}</td><td className="p-3">{entry.reference || "—"}</td><td className="p-3 text-right tabular-nums">{money(Number(entry.amount) || 0)}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" onClick={() => editProductionCost(entry)} className="mr-3 text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => removeProductionCost(entry)} className="text-red-700 hover:underline">Delete</button></td>}</tr>; })}</tbody></table></div></section>
      {canPost && <form onSubmit={saveTaxEntry} className="accounts-no-print space-y-4 rounded-xl border bg-white p-5">
        <div className="flex items-center justify-between"><h2 className="font-semibold">{editingTaxId ? "Edit Tax Deduction" : "Add Tax Deduction"}</h2>{editingTaxId && <button type="button" className="text-sm text-gray-600 hover:underline" onClick={() => { setEditingTaxId(null); setTaxEntry({ date: todayInEat(), description: "", amount: "" }); setMessage(""); }}>Cancel edit</button>}</div>
        <p className="text-sm text-gray-500">Tax entries reduce Net Income and accrue to Income Tax Payable until settled. Existing tax expenses already appear automatically; do not enter the same tax twice.</p>
        <div className="grid gap-4 sm:grid-cols-2"><label>Date<input required type="date" className={input} value={taxEntry.date} onChange={e => setTaxEntry({ ...taxEntry, date: e.target.value })} /></label><label>Amount (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={taxEntry.amount} onChange={e => setTaxEntry({ ...taxEntry, amount: e.target.value })} /></label><label className="sm:col-span-2">Description (optional)<input maxLength={200} className={input} value={taxEntry.description} onChange={e => setTaxEntry({ ...taxEntry, description: e.target.value })} /></label></div>
        <button disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving..." : editingTaxId ? "Update tax entry" : "Record tax entry"}</button><p role="status">{message}</p>
      </form>}
      <section className="accounts-no-print overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">Tax Entries</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Amount</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>{sortedTaxEntries.length === 0 ? <tr><td colSpan={canPost ? 4 : 3} className="p-8 text-center text-gray-500">No tax entries have been recorded.</td></tr> : sortedTaxEntries.map(entry => <tr key={entry.id} className="border-t"><td className="p-3 whitespace-nowrap">{entry.date}</td><td className="p-3">{entry.description || "—"}</td><td className="p-3 text-right tabular-nums">{money(entry.amount)}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" onClick={() => editTaxEntry(entry)} className="mr-3 text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => removeTaxEntry(entry)} className="text-red-700 hover:underline">Delete</button></td>}</tr>)}</tbody></table></div></section>
    </>}
    {view === "entries" && entriesStatement === "balance" && <section className="accounts-no-print overflow-hidden rounded-xl border bg-white">
      <div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">Account Entries</h2><p className="text-sm text-gray-500">Simplified entries show their selected Balance Sheet item and the automatic balancing account. Historical debit/credit postings remain unchanged.</p></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Category</th><th className="p-3 text-left">Item</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Offset account</th><th className="p-3 text-right">Amount</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>
        {journalEntries.length === 0 ? <tr><td className="p-8 text-center text-gray-500" colSpan={canPost ? 7 : 6}>No account entries have been recorded.</td></tr> : journalEntries.map(entry => { const display = journalDisplay(entry); return <tr key={entry.id} className="border-t"><td className="p-3 whitespace-nowrap">{entry.date}</td><td className="p-3">{display.mapped ? display.category : "Historical — unmapped"}</td><td className="p-3">{display.mapped ? accountName(display.itemCode) : `${accountName(entry.debitCode)} / ${accountName(entry.creditCode)}`}</td><td className="p-3">{entry.description}</td><td className="p-3">{display.mapped ? accountName(display.offsetCode) : "See stored debit / credit"}</td><td className="p-3 text-right tabular-nums">{money(entry.amount)}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" onClick={() => editJournal(entry)} className="mr-3 text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => removeJournal(entry)} className="text-red-700 hover:underline">Delete</button></td>}</tr>; })}
      </tbody></table></div>
    </section>}
    {canPost && view === "entries" && entriesStatement === "balance" && <form onSubmit={saveJournal} className="accounts-no-print space-y-4 rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">{editingJournalId ? "Edit account entry" : "Record Journal"}</h2>{editingJournalId && <button type="button" onClick={() => { resetJournalForm(); setMessage(""); }} className="text-sm text-gray-600 hover:underline">Cancel edit</button>}</div>
      <p className="text-sm text-gray-500">Choose the Balance Sheet item to increase. The system records the balancing side automatically so the Balance Sheet remains balanced.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label>Date<input required type="date" className={input} value={journal.date} onChange={e => setJournal({ ...journal, date: e.target.value })} /></label>
        <label>Amount (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={journal.amount} onChange={e => setJournal({ ...journal, amount: e.target.value })} /></label>
        <label>Category<select required className={input} value={journal.category} onChange={e => { const category = e.target.value as JournalCategory | ""; setJournal(previous => ({ ...previous, category, itemCode: "" })); setEditingJournalOffsetCode(null); }}><option value="">Select category...</option>{(Object.keys(JOURNAL_STRUCTURE) as JournalCategory[]).map(category => <option key={category} value={category}>{category}</option>)}</select></label>
        <label>Item<select required disabled={!journal.category} className={`${input} disabled:bg-gray-100 disabled:text-gray-500`} value={journal.itemCode} onChange={e => setJournal(previous => ({ ...previous, itemCode: e.target.value }))}><option value="">{journal.category ? "Select item..." : "Select a category first"}</option>{journalItemGroups.map(section => <optgroup key={section.label} label={section.label}>{section.lines.map(line => <option key={line.code} value={line.accountCode ?? ""}>{line.name}</option>)}</optgroup>)}</select></label>
        <label className="sm:col-span-2">Description<input required className={input} value={journal.description} onChange={e => setJournal({ ...journal, description: e.target.value })} /></label>
      </div>
      <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">{journalEffect}</p>
      <button disabled={saving} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving..." : editingJournalId ? "Update entry" : "Record journal"}</button><p role="status">{message}</p>
    </form>}
  </main></RouteGuard>;
}
