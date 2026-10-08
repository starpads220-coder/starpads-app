"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { collection, doc, runTransaction, Timestamp } from "firebase/firestore";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
import { db } from "@/lib/firebase";
import { ACCOUNTS, SETTLEMENT_CODES, buildAccounts, type Journal, type LedgerSource, type ProductionCostEntry, type TaxEntry, type PayrollProductionEntry, type PayrollPaymentEntry, type PayeRemittanceEntry } from "@/lib/accounts";
import { CUSTOM_BANK_VALUE, DEFAULT_BANK_NAMES, DEPOSIT_OFFSET_ACCOUNT_CODE, bankAccounts, bankingAccountName, cashAccounts, cleanBankName, isBankCode, isCashCode, isCashToBank, normaliseBankNameKey, transferDirection, validateTransfer } from "@/lib/banking";
import { todayInEat } from "@/lib/account-period";

type AccountType = "Bank" | "Cash";
type BankingTab = "deposits" | "transfers";
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };
const money = (value: number) => `UGX ${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const input = "mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
const emptyDeposit = () => ({ date: today(), receivedFrom: "", accountCode: bankAccounts[0]?.code ?? "", bankName: "", customBankName: "", description: "", paymentMethod: "Cash" as "Cash" | "Cheque", referenceNumber: "", amount: "", offsetCode: "" });
const emptyTransfer = () => ({ date: today(), fromType: "Cash" as AccountType, fromCode: "", fromBankName: "", fromCustomBankName: "", toType: "Bank" as AccountType, toCode: bankAccounts[0]?.code ?? "", toBankName: "", toCustomBankName: "", amount: "", description: "" });
const configuredDepositOffset = ACCOUNTS.find(account => account.code === DEPOSIT_OFFSET_ACCOUNT_CODE);

export default function BankingPage() {
  const { user, userRole } = useAuth();
  const [tab, setTab] = useState<BankingTab>("deposits");
  const [deposit, setDeposit] = useState(emptyDeposit);
  const [transfer, setTransfer] = useState(emptyTransfer);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);
  const [editingTransferId, setEditingTransferId] = useState<string | null>(null);
  const [pendingLinked, setPendingLinked] = useState<Journal | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const savingRef = useRef(false);
  const [message, setMessage] = useState("");
  const sales = useRealtimeCollection<LedgerSource>("saleTransactions", [], true);
  const expenses = useRealtimeCollection<LedgerSource>("expenses", [], true);
  const journals = useRealtimeCollection<Journal>("accountJournals", [], true);
  const productionCosts = useRealtimeCollection<ProductionCostEntry>("productionCosts", [], true);
  const taxEntries = useRealtimeCollection<TaxEntry>("taxEntries", [], true);
  const payrollEntries = useRealtimeCollection<PayrollProductionEntry>("productionEntries", [], true);
  const payments = useRealtimeCollection<PayrollPaymentEntry>("payments", [], true);
  const payeRemittances = useRealtimeCollection<PayeRemittanceEntry>("payeRemittances", [], true);
  const canPost = ["ADMIN", "FINANCE", "FINANCIAL_MANAGER"].includes(userRole?.role ?? "");
  const error = sales.error || expenses.error || journals.error || productionCosts.error || taxEntries.error || payrollEntries.error || payments.error || payeRemittances.error;
  const loading = sales.loading || expenses.loading || journals.loading || productionCosts.loading || taxEntries.loading || payrollEntries.loading || payments.loading || payeRemittances.loading;
  const serverConfirmed = [sales, expenses, journals, productionCosts, taxEntries, payrollEntries, payments, payeRemittances].every(source => !source.fromCache && !source.hasPendingWrites);
  const deposits = useMemo(() => journals.data.filter(entry => entry.bankingKind === "deposit" || isCashToBank(entry)).sort((a, b) => b.date.localeCompare(a.date)), [journals.data]);
  const transfers = useMemo(() => journals.data.filter(entry => entry.bankingKind === "transfer").sort((a, b) => b.date.localeCompare(a.date)), [journals.data]);
  const bankNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const name of DEFAULT_BANK_NAMES) names.set(normaliseBankNameKey(name), name);
    for (const entry of journals.data) {
      const name = cleanBankName(entry.bankName ?? "");
      if (name) names.set(normaliseBankNameKey(name), names.get(normaliseBankNameKey(name)) ?? name);
    }
    return [...names.values()];
  }, [journals.data]);
  const resolveSelectedBankName = (selection: string, customName: string) => {
    const candidate = cleanBankName(selection === CUSTOM_BANK_VALUE ? customName : selection);
    if (!candidate) return "";
    return bankNames.find(name => normaliseBankNameKey(name) === normaliseBankNameKey(candidate)) ?? candidate;
  };
  const entriesNeedingReview = useMemo(() => journals.data.filter(entry => {
    if (entry.bankingKind === "deposit") return !entry.bankName || !isBankCode(entry.debitCode) || SETTLEMENT_CODES.includes(entry.creditCode) || !(Number(entry.amount) > 0);
    if (entry.bankingKind === "transfer") return !entry.bankName || !(Number(entry.amount) > 0) || isBankCode(entry.debitCode) === isBankCode(entry.creditCode) || (isCashToBank(entry) && entry.bankingLinkId !== entry.id);
    return false;
  }), [journals.data]);
  const depositsUsingAnotherOffset = useMemo(() => journals.data.filter(entry => entry.bankingKind === "deposit" && entry.creditCode !== DEPOSIT_OFFSET_ACCOUNT_CODE), [journals.data]);
  const selectedDeposit = journals.data.find(entry => entry.id === selectedDepositId) ?? (pendingLinked?.id === selectedDepositId ? pendingLinked : null);
  const linkedDeposit = selectedDeposit?.bankingKind === "transfer" && isCashToBank(selectedDeposit);
  const displayedDepositOffset = selectedDeposit?.bankingKind === "deposit"
    ? ACCOUNTS.find(account => account.code === selectedDeposit.creditCode)
    : configuredDepositOffset;
  const editingTransfer = journals.data.find(entry => entry.id === editingTransferId);
  const balanceReport = useMemo(() => buildAccounts(sales.data, expenses.data, journals.data, "", transfer.date, productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data), [sales.data, expenses.data, journals.data, transfer.date, productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data]);
  const currentBalanceReport = useMemo(() => buildAccounts(sales.data, expenses.data, journals.data, "", todayInEat(), productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data), [sales.data, expenses.data, journals.data, productionCosts.data, taxEntries.data, payrollEntries.data, payments.data, payeRemittances.data]);
  const accountBalance = (code: string) => balanceReport.rows.find(row => row.code === code)?.balance ?? 0;
  const currentAccountBalance = (code: string) => currentBalanceReport.rows.find(row => row.code === code)?.balance ?? 0;
  const bankBalancesAtTransferDate = useMemo(() => {
    const tagged = new Map<string, number>();
    for (const entry of journals.data) {
      if (entry.date > transfer.date || !entry.bankName) continue;
      const movement = isBankCode(entry.debitCode) ? Number(entry.amount) || 0 : isBankCode(entry.creditCode) ? -(Number(entry.amount) || 0) : 0;
      if (!movement) continue;
      const key = normaliseBankNameKey(entry.bankName);
      tagged.set(key, (tagged.get(key) ?? 0) + movement);
    }
    const taggedTotal = [...tagged.values()].reduce((sum, amount) => sum + amount, 0);
    const bankTotal = balanceReport.rows.find(row => row.code === "1000")?.balance ?? 0;
    tagged.set("__unassigned__", bankTotal - taggedTotal);
    return tagged;
  }, [journals.data, transfer.date, balanceReport]);
  const selectedFromBankName = resolveSelectedBankName(transfer.fromBankName, transfer.fromCustomBankName);
  const selectedToBankName = resolveSelectedBankName(transfer.toBankName, transfer.toCustomBankName);
  const fromBalance = transfer.fromType === "Bank" ? (bankBalancesAtTransferDate.get(normaliseBankNameKey(selectedFromBankName)) ?? 0) : accountBalance(transfer.fromCode);
  const toBalance = transfer.toType === "Bank" ? (bankBalancesAtTransferDate.get(normaliseBankNameKey(selectedToBankName)) ?? 0) : accountBalance(transfer.toCode);
  const editingBankName = cleanBankName(editingTransfer?.bankName ?? "");
  const editingReturnsToSelectedBank = Boolean(editingTransfer && editingTransfer.date <= transfer.date && isBankCode(editingTransfer.creditCode) && normaliseBankNameKey(editingBankName) === normaliseBankNameKey(selectedFromBankName));
  const availableFrom = fromBalance + (editingTransfer && editingTransfer.date <= transfer.date && editingTransfer.creditCode === transfer.fromCode && (transfer.fromType !== "Bank" || editingReturnsToSelectedBank) ? editingTransfer.amount : 0);
  const combinedCashBalance = cashAccounts.reduce((sum, account) => sum + accountBalance(account.code), 0);
  const currentBankBalance = bankAccounts.reduce((sum, account) => sum + currentAccountBalance(account.code), 0);
  const currentCashBalance = cashAccounts.reduce((sum, account) => sum + currentAccountBalance(account.code), 0);
  const currentTaggedBankBalances = useMemo(() => {
    const totals = new Map<string, { name: string; amount: number }>();
    for (const entry of journals.data) {
      if (entry.date > todayInEat() || !entry.bankName) continue;
      const movement = isBankCode(entry.debitCode) ? Number(entry.amount) || 0 : isBankCode(entry.creditCode) ? -(Number(entry.amount) || 0) : 0;
      if (!movement) continue;
      const name = cleanBankName(entry.bankName);
      const key = normaliseBankNameKey(name);
      const prior = totals.get(key);
      totals.set(key, { name: prior?.name ?? name, amount: (prior?.amount ?? 0) + movement });
    }
    const assigned = [...totals.values()].reduce((sum, item) => sum + item.amount, 0);
    return [...totals.values(), { name: "Bank (not specified)", amount: currentBankBalance - assigned }];
  }, [journals.data, currentBankBalance]);

  function chooseDeposit(entry: Journal) {
    setSelectedDepositId(entry.id);
    setPendingLinked(null);
    setDeposit({ date: entry.date, receivedFrom: entry.receivedFrom ?? "", accountCode: entry.debitCode, bankName: entry.bankName ?? "", customBankName: "", description: entry.description, paymentMethod: entry.paymentMethod ?? "Cash", referenceNumber: entry.referenceNumber ?? "", amount: String(entry.amount), offsetCode: entry.bankingKind === "deposit" ? entry.creditCode : "" });
    setTab("deposits"); setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function chooseTransfer(entry: Journal) {
    const direction = transferDirection(entry);
    setEditingTransferId(entry.id);
    const fromIsBank = isBankCode(direction.fromCode);
    const toIsBank = isBankCode(direction.toCode);
    setTransfer({ date: entry.date, fromType: fromIsBank ? "Bank" : "Cash", fromCode: direction.fromCode, fromBankName: fromIsBank ? entry.bankName ?? "" : "", fromCustomBankName: "", toType: toIsBank ? "Bank" : "Cash", toCode: direction.toCode, toBankName: toIsBank ? entry.bankName ?? "" : "", toCustomBankName: "", amount: String(entry.amount), description: entry.description });
    setTab("transfers"); setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function saveTransfer(event: FormEvent) {
    event.preventDefault(); setMessage(""); setFieldErrors({});
    if (savingRef.current) return;
    savingRef.current = true;
    const amount = Number(transfer.amount);
    try {
      if (!canPost || !db || !user) throw new Error("You cannot record a banking entry with this account.");
      if (!serverConfirmed) throw new Error("Firestore is offline or still synchronizing. Reconnect before posting a transfer so the balance can be verified.");
      const errors: Record<string, string> = {};
      if (!transfer.date) errors.transferDate = "Choose a transfer date.";
      if (!Number.isFinite(amount) || amount <= 0) errors.transferAmount = "Enter an amount greater than zero.";
      if (transfer.fromType === "Bank" ? !isBankCode(transfer.fromCode) : !isCashCode(transfer.fromCode)) errors.transferFrom = "Choose the specific source account.";
      if (transfer.toType === "Bank" ? !isBankCode(transfer.toCode) : !isCashCode(transfer.toCode)) errors.transferTo = "Choose the specific destination account.";
      const transferBankName = transfer.fromType === "Bank" ? selectedFromBankName : selectedToBankName;
      if (!transferBankName) errors.transferBank = "Choose a bank, or enter the custom bank name.";
      if (transfer.fromCode && transfer.fromCode === transfer.toCode) errors.transferTo = "The destination must differ from the source account.";
      if (Number.isFinite(amount) && amount > availableFrom + 0.005) errors.transferAmount = "The transfer amount exceeds the available balance of the source account.";
      if (Object.keys(errors).length) { setFieldErrors(errors); throw new Error(Object.values(errors)[0]); }
      validateTransfer(transfer.fromCode, transfer.toCode, amount, availableFrom);
      setSaving(true);
      if (editingTransferId) {
        if (!editingTransfer || editingTransfer.bankingKind !== "transfer" || editingTransfer.creditCode !== transfer.fromCode || editingTransfer.debitCode !== transfer.toCode) throw new Error("The linked account direction cannot be changed while editing. Create a new transfer instead.");
        const ref = doc(db, "accountJournals", editingTransferId);
        await runTransaction(db, async transaction => {
          const current = await transaction.get(ref);
          if (!current.exists() || current.data().bankingKind !== "transfer") throw new Error("This transfer no longer exists. Reload the page and try again.");
          transaction.update(ref, { date: transfer.date, amount, description: transfer.description.trim(), bankName: transferBankName });
        });
        setMessage("Transfer updated. Its linked deposit uses the same date and amount.");
      } else {
        const ref = doc(collection(db, "accountJournals"));
        const cashToBank = isCashCode(transfer.fromCode) && isBankCode(transfer.toCode);
        const entry: Journal = { id: ref.id, date: transfer.date, debitCode: transfer.toCode, creditCode: transfer.fromCode, amount, description: transfer.description.trim(), bankName: transferBankName, bankingKind: "transfer", ...(cashToBank ? { bankingLinkId: ref.id, bankingStatus: "awaiting_deposit_details" as const } : { bankingStatus: "completed" as const }) };
        await runTransaction(db, async transaction => {
          transaction.set(ref, { ...entry, createdAt: Timestamp.now(), createdBy: user.uid });
        });
        if (cashToBank) {
          setPendingLinked(entry);
          setSelectedDepositId(ref.id);
          setDeposit({ date: entry.date, receivedFrom: "", accountCode: entry.debitCode, bankName: transferBankName, customBankName: "", description: entry.description, paymentMethod: "Cash", referenceNumber: "", amount: String(entry.amount), offsetCode: "" });
          setTab("deposits");
          setMessage("Transfer posted once. Complete the linked deposit details below; saving them will not post again.");
        } else setMessage("Transfer recorded successfully.");
      }
      setEditingTransferId(null); setTransfer({ ...transfer, amount: "", description: "" });
    } catch (cause) { setMessage(cause instanceof Error ? `Transfer was not saved: ${cause.message}` : "Transfer was not saved. Check your connection and permissions, then try again."); }
    finally { savingRef.current = false; setSaving(false); }
  }
  async function saveDeposit(event: FormEvent) {
    event.preventDefault(); setMessage(""); setFieldErrors({});
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      if (!canPost || !db || !user) throw new Error("You cannot record a banking entry with this account.");
      const amount = Number(deposit.amount);
      const errors: Record<string, string> = {};
      if (!(linkedDeposit ? selectedDeposit?.date : deposit.date)) errors.depositDate = "Choose a deposit date.";
      if (!linkedDeposit && (!Number.isFinite(amount) || amount <= 0)) errors.depositAmount = "Enter an amount greater than zero.";
      if (!deposit.receivedFrom.trim()) errors.receivedFrom = "Enter who the funds were received from.";
      if (!(linkedDeposit ? selectedDeposit?.debitCode : deposit.accountCode) || !isBankCode(linkedDeposit ? selectedDeposit?.debitCode ?? "" : deposit.accountCode)) errors.depositAccount = "Choose a mapped Bank account.";
      const depositBankName = linkedDeposit ? cleanBankName(selectedDeposit?.bankName ?? "") : resolveSelectedBankName(deposit.bankName, deposit.customBankName);
      if (!depositBankName) errors.depositBankName = "Choose a bank, or enter the custom bank name.";
      if (!deposit.paymentMethod) errors.depositMethod = "Choose a payment method.";
      if (!linkedDeposit && !selectedDepositId && (!configuredDepositOffset || configuredDepositOffset.group !== "Equity")) errors.depositOffset = "The configured Deposit Offset Account is missing or inactive. Contact an administrator before saving.";
      if (Object.keys(errors).length) { setFieldErrors(errors); throw new Error(Object.values(errors)[0]); }
      setSaving(true);
      if (linkedDeposit && selectedDeposit) {
        if (selectedDeposit.bankingLinkId !== selectedDeposit.id) throw new Error("This transfer has no valid deposit link. No duplicate deposit was created.");
        if (deposit.paymentMethod !== "Cash") throw new Error("A Cash-to-Bank transfer must use Cash as its payment method.");
        const ref = doc(db, "accountJournals", selectedDeposit.id);
        await runTransaction(db, async transaction => {
          const current = await transaction.get(ref);
          if (!current.exists() || current.data().bankingKind !== "transfer" || current.data().bankingLinkId !== selectedDeposit.id) throw new Error("The linked transfer has changed or was removed. Reload before continuing.");
          transaction.update(ref, { receivedFrom: deposit.receivedFrom.trim(), description: deposit.description.trim(), referenceNumber: deposit.referenceNumber.trim(), paymentMethod: "Cash", bankName: depositBankName, bankingStatus: "completed" });
        });
        setMessage("Linked deposit details completed. The transfer remains the only posting.");
      } else {
        if (selectedDepositId) {
          const prior = journals.data.find(entry => entry.id === selectedDepositId);
          if (!prior || prior.bankingKind !== "deposit") throw new Error("This deposit is no longer available for editing.");
          const ref = doc(db, "accountJournals", prior.id);
          await runTransaction(db, async transaction => {
            const current = await transaction.get(ref);
            if (!current.exists() || current.data().bankingKind !== "deposit") throw new Error("This deposit no longer exists. Reload the page and try again.");
            const storedOffsetCode = String(current.data().creditCode ?? "");
            if (!ACCOUNTS.some(account => account.code === storedOffsetCode)) throw new Error("This deposit's stored offset account no longer exists. It was not changed.");
            transaction.update(ref, { date: deposit.date, debitCode: deposit.accountCode, amount, description: deposit.description.trim(), receivedFrom: deposit.receivedFrom.trim(), paymentMethod: deposit.paymentMethod, referenceNumber: deposit.referenceNumber.trim(), bankName: depositBankName });
          });
          setMessage("Deposit updated successfully.");
        } else {
          const ref = doc(collection(db, "accountJournals"));
          await runTransaction(db, async transaction => {
            transaction.set(ref, { date: deposit.date, debitCode: deposit.accountCode, creditCode: configuredDepositOffset!.code, offsetAccountCode: configuredDepositOffset!.code, offsetAccountName: configuredDepositOffset!.name, amount, description: deposit.description.trim(), bankingKind: "deposit", bankingStatus: "completed", receivedFrom: deposit.receivedFrom.trim(), paymentMethod: deposit.paymentMethod, referenceNumber: deposit.referenceNumber.trim(), bankName: depositBankName, createdAt: Timestamp.now(), createdBy: user.uid });
          });
          setMessage("Deposit recorded once in Bank and its offset account.");
        }
      }
      setSelectedDepositId(null); setPendingLinked(null); setDeposit(emptyDeposit());
    } catch (cause) { setMessage(cause instanceof Error ? `Deposit was not saved: ${cause.message}` : "Deposit was not saved. Check your connection and permissions, then try again."); }
    finally { savingRef.current = false; setSaving(false); }
  }
  async function removeEntry(entry: Journal) {
    if (!canPost || !db || !window.confirm(`Delete this ${entry.bankingKind === "transfer" ? "transfer and its linked deposit details" : "deposit"}? The single posting will be reversed.`)) return;
    try {
      const ref = doc(db, "accountJournals", entry.id);
      await runTransaction(db, async transaction => {
        const current = await transaction.get(ref);
        if (!current.exists()) throw new Error("This banking entry no longer exists.");
        transaction.delete(ref);
      });
      if (selectedDepositId === entry.id) { setSelectedDepositId(null); setPendingLinked(null); setDeposit(emptyDeposit()); }
      if (editingTransferId === entry.id) { setEditingTransferId(null); setTransfer(emptyTransfer()); }
      setMessage("Entry removed; its single posting was reversed.");
    } catch (cause) { setMessage(cause instanceof Error ? `Entry was not deleted: ${cause.message}` : "Entry was not deleted. Check your connection and permissions."); }
  }

  return <RouteGuard><div className="space-y-6">
    <header><h1 className="text-2xl font-bold">Banking</h1><p className="text-sm text-gray-500">Deposits and transfers linked to the existing Bank and Cash accounts.</p></header>
    <section className="overflow-hidden rounded-xl border bg-white" aria-labelledby="banking-balances-title"><div className="border-b px-5 py-4"><h2 id="banking-balances-title" className="font-semibold">Current Balances</h2><p className="mt-1 text-sm text-gray-500">Live balances as at today from all recorded sales, expenses, payroll, deposits, transfers and account entries.</p></div><div className="grid sm:grid-cols-2"><div className="border-b p-5 sm:border-b-0 sm:border-r"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Bank</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? "—" : error ? "Unavailable" : money(currentBankBalance)}</p>{!loading && !error && <div className="mt-3 space-y-1 border-t pt-3 text-sm">{currentTaggedBankBalances.map(item => <p key={item.name} className="flex justify-between gap-3"><span className="text-gray-600">{item.name}</span><span className="tabular-nums">{money(item.amount)}</span></p>)}</div>}</div><div className="p-5"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Cash</p><p className="mt-2 text-2xl font-bold tabular-nums">{loading ? "—" : error ? "Unavailable" : money(currentCashBalance)}</p><p className="mt-1 text-xs text-gray-500">Physical Cash + Mobile Money [MTN] + Mobile Money [Airtel]</p></div></div></section>
    <div role="tablist" aria-label="Banking sections" className="grid overflow-hidden rounded-xl border bg-white sm:grid-cols-2">{(["deposits", "transfers"] as const).map(value => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setMessage(""); }} className={`min-h-12 px-4 py-3 text-sm font-semibold ${tab === value ? "bg-gray-900 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}>{value === "deposits" ? "Deposits" : "Transfers"}</button>)}</div>
    {loading && <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">Loading account balances and banking entries…</p>}
    {!loading && !error && !serverConfirmed && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some ledger records are still synchronizing. Deposits are committed through a server transaction; balance-sensitive transfers remain paused until the source balance is fully confirmed.</p>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Banking records could not be loaded: {error}. Posting is unavailable until the account data loads.</p>}
    {entriesNeedingReview.length > 0 && <div role="alert" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"><p className="font-semibold">Existing banking entries requiring review</p><p className="mt-1">These records were not modified automatically: {entriesNeedingReview.map(entry => entry.id).join(", ")}.</p></div>}
    {depositsUsingAnotherOffset.length > 0 && <div role="status" className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><p className="font-semibold">Existing deposits retain their original offset</p><p className="mt-1">These deposits differ from Capital Investments and were not changed: {depositsUsingAnotherOffset.map(entry => `${entry.id} (${bankingAccountName(entry.creditCode)})`).join(", ")}.</p></div>}
    {bankAccounts.length === 0 && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">No mapped Bank account exists in the Chart of Accounts. Banking entries are disabled.</p>}
    {message && <p role="status" className="rounded-lg border bg-white p-3 text-sm">{message}</p>}
    {tab === "transfers" && <>
      {canPost && <form onSubmit={saveTransfer} className="space-y-4 rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{editingTransferId ? "Edit Transfer" : "Record Transfer"}</h2>{editingTransferId && <button type="button" className="text-sm text-blue-700" onClick={() => { setEditingTransferId(null); setTransfer(emptyTransfer()); }}>Cancel edit</button>}</div>
        <div className="grid gap-4 sm:grid-cols-2"><label>Date<input required type="date" className={input} value={transfer.date} onChange={event => setTransfer({ ...transfer, date: event.target.value })} />{fieldErrors.transferDate && <span className="mt-1 block text-xs text-red-700">{fieldErrors.transferDate}</span>}</label><label>Amount (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={transfer.amount} onChange={event => setTransfer({ ...transfer, amount: event.target.value })} />{fieldErrors.transferAmount && <span className="mt-1 block text-xs text-red-700">{fieldErrors.transferAmount}</span>}</label>
          <label>Transferring From<select required disabled={!!editingTransferId} className={input} value={transfer.fromType} onChange={event => { const fromType = event.target.value as AccountType; setTransfer(previous => ({ ...previous, fromType, fromCode: fromType === "Bank" ? bankAccounts[0]?.code ?? "" : "", fromBankName: "", fromCustomBankName: "", toType: fromType === "Bank" ? "Cash" : "Bank", toCode: fromType === "Bank" ? "" : bankAccounts[0]?.code ?? "", toBankName: "", toCustomBankName: "" })); }}><option>Bank</option><option>Cash</option></select></label>
          <label>Transferring To<select required disabled={!!editingTransferId} className={input} value={transfer.toType} onChange={event => { const toType = event.target.value as AccountType; setTransfer(previous => ({ ...previous, toType, toCode: toType === "Bank" ? bankAccounts[0]?.code ?? "" : "", toBankName: "", toCustomBankName: "" })); }}><option>Bank</option><option>Cash</option></select></label>
          {transfer.fromType === "Bank" ? <label>From bank<select required className={input} value={transfer.fromBankName} onChange={event => setTransfer({ ...transfer, fromBankName: event.target.value, fromCustomBankName: event.target.value === CUSTOM_BANK_VALUE ? transfer.fromCustomBankName : "" })}><option value="">Select bank...</option>{bankNames.map(name => <option key={normaliseBankNameKey(name)} value={name}>{name}</option>)}<option value={CUSTOM_BANK_VALUE}>Other (custom bank)</option></select>{transfer.fromBankName === CUSTOM_BANK_VALUE && <><span className="mt-2 block text-sm">Bank Name</span><input required className={input} value={transfer.fromCustomBankName} onChange={event => setTransfer({ ...transfer, fromCustomBankName: event.target.value })} /></>}{fieldErrors.transferBank && <span className="mt-1 block text-xs text-red-700">{fieldErrors.transferBank}</span>}</label> : <label>From account<select required disabled={!!editingTransferId} className={input} value={transfer.fromCode} onChange={event => setTransfer({ ...transfer, fromCode: event.target.value })}><option value="">Select Cash account...</option>{cashAccounts.map(account => <option key={account.code} value={account.code}>{bankingAccountName(account.code)}</option>)}</select>{fieldErrors.transferFrom && <span className="mt-1 block text-xs text-red-700">{fieldErrors.transferFrom}</span>}</label>}
          {transfer.toType === "Bank" ? <label>To bank<select required className={input} value={transfer.toBankName} onChange={event => setTransfer({ ...transfer, toBankName: event.target.value, toCustomBankName: event.target.value === CUSTOM_BANK_VALUE ? transfer.toCustomBankName : "" })}><option value="">Select bank...</option>{bankNames.map(name => <option key={normaliseBankNameKey(name)} value={name}>{name}</option>)}<option value={CUSTOM_BANK_VALUE}>Other (custom bank)</option></select>{transfer.toBankName === CUSTOM_BANK_VALUE && <><span className="mt-2 block text-sm">Bank Name</span><input required className={input} value={transfer.toCustomBankName} onChange={event => setTransfer({ ...transfer, toCustomBankName: event.target.value })} /></>}{fieldErrors.transferBank && <span className="mt-1 block text-xs text-red-700">{fieldErrors.transferBank}</span>}</label> : <label>To account<select required disabled={!!editingTransferId} className={input} value={transfer.toCode} onChange={event => setTransfer({ ...transfer, toCode: event.target.value })}><option value="">Select Cash account...</option>{cashAccounts.map(account => <option key={account.code} value={account.code}>{bankingAccountName(account.code)}</option>)}</select>{fieldErrors.transferTo && <span className="mt-1 block text-xs text-red-700">{fieldErrors.transferTo}</span>}</label>}
          <label className="sm:col-span-2">Description or Reference (optional)<input className={input} value={transfer.description} onChange={event => setTransfer({ ...transfer, description: event.target.value })} /></label></div>
        <div className="grid gap-3 rounded-lg bg-gray-50 p-3 text-sm sm:grid-cols-2"><p>From balance: <strong>{money(availableFrom)}</strong></p><p>To balance: <strong>{money(toBalance)}</strong></p><p className="sm:col-span-2 text-gray-500">Combined Cash balance (Cash + MTN + Airtel): {money(combinedCashBalance)}</p></div>
        <button disabled={saving || loading || !!error || !serverConfirmed || !bankAccounts.length} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving…" : editingTransferId ? "Update Transfer" : "Record Transfer"}</button>
      </form>}
      <section className="overflow-hidden rounded-xl border bg-white"><h2 className="border-b px-5 py-4 font-semibold">Transfers</h2><div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">From</th><th className="p-3 text-left">To</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Amount</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>{transfers.length === 0 ? <tr><td colSpan={canPost ? 7 : 6} className="p-8 text-center text-gray-500">No transfers recorded.</td></tr> : transfers.map(entry => { const bankLabel = entry.bankName || "Bank (not specified)"; return <tr key={entry.id} className="border-t"><td className="p-3">{entry.date}</td><td className="p-3">{isBankCode(entry.creditCode) ? bankLabel : bankingAccountName(entry.creditCode)}</td><td className="p-3">{isBankCode(entry.debitCode) ? bankLabel : bankingAccountName(entry.debitCode)}</td><td className="p-3">{entry.description || "—"}</td><td className="p-3">{entry.bankingStatus === "awaiting_deposit_details" ? "Awaiting deposit details" : "Completed"}</td><td className="p-3 text-right">{money(entry.amount)}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" className="mr-3 text-blue-700" onClick={() => chooseTransfer(entry)}>Edit</button>{isCashToBank(entry) && <button type="button" className="mr-3 text-blue-700" onClick={() => chooseDeposit(entry)}>{entry.bankingStatus === "awaiting_deposit_details" ? "Finish deposit" : "Deposit details"}</button>}<button type="button" className="text-red-700" onClick={() => removeEntry(entry)}>Delete</button></td>}</tr>; })}</tbody></table></div></section>
    </>}
    {tab === "deposits" && <>
      {canPost && <form onSubmit={saveDeposit} className="space-y-4 rounded-xl border bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-semibold">{linkedDeposit ? "Complete Linked Deposit" : selectedDepositId ? "Edit Deposit" : "Record Deposit"}</h2>{selectedDepositId && <button type="button" className="text-sm text-blue-700" onClick={() => { setSelectedDepositId(null); setPendingLinked(null); setDeposit(emptyDeposit()); }}>Cancel edit</button>}</div>
        {linkedDeposit && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800">Linked to transfer {selectedDeposit?.bankingLinkId}. Date, amount, Bank account and Cash payment method are locked. Completing details does not post again.</p>}
        {!linkedDeposit && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">A standalone deposit needs a non-cash offset account to keep the Balance Sheet balanced. If this payment was already entered on the Sales form or is already held in Cash, do not record it here again. Use Transfers for money already in Cash.</p>}
        <div className="grid gap-4 sm:grid-cols-2"><label>Date<input required disabled={linkedDeposit} type="date" className={input} value={linkedDeposit ? selectedDeposit!.date : deposit.date} onChange={event => setDeposit({ ...deposit, date: event.target.value })} />{fieldErrors.depositDate && <span className="mt-1 block text-xs text-red-700">{fieldErrors.depositDate}</span>}</label><label>Amount (UGX)<input required disabled={linkedDeposit} type="number" min="0.01" step="0.01" className={input} value={linkedDeposit ? String(selectedDeposit!.amount) : deposit.amount} onChange={event => setDeposit({ ...deposit, amount: event.target.value })} />{fieldErrors.depositAmount && <span className="mt-1 block text-xs text-red-700">{fieldErrors.depositAmount}</span>}</label>
          <label>Received From<input required type="text" className={input} value={deposit.receivedFrom} onChange={event => setDeposit({ ...deposit, receivedFrom: event.target.value })} />{fieldErrors.receivedFrom && <span className="mt-1 block text-xs text-red-700">{fieldErrors.receivedFrom}</span>}</label><label>Account (Bank)<select required disabled={linkedDeposit} className={input} value={linkedDeposit ? selectedDeposit!.bankName ?? "" : deposit.bankName} onChange={event => setDeposit({ ...deposit, accountCode: bankAccounts[0]?.code ?? "", bankName: event.target.value, customBankName: event.target.value === CUSTOM_BANK_VALUE ? deposit.customBankName : "" })}><option value="">Select bank...</option>{bankNames.map(name => <option key={normaliseBankNameKey(name)} value={name}>{name}</option>)}<option value={CUSTOM_BANK_VALUE}>Other (custom bank)</option></select>{!linkedDeposit && deposit.bankName === CUSTOM_BANK_VALUE && <><span className="mt-2 block text-sm">Bank Name</span><input required className={input} value={deposit.customBankName} onChange={event => setDeposit({ ...deposit, customBankName: event.target.value })} /></>}{fieldErrors.depositBankName && <span className="mt-1 block text-xs text-red-700">{fieldErrors.depositBankName}</span>}{fieldErrors.depositAccount && <span className="mt-1 block text-xs text-red-700">{fieldErrors.depositAccount}</span>}</label>
          <label>Payment Method<select required disabled={linkedDeposit} className={input} value={linkedDeposit ? "Cash" : deposit.paymentMethod} onChange={event => setDeposit({ ...deposit, paymentMethod: event.target.value as "Cash" | "Cheque" })}><option>Cash</option><option>Cheque</option></select>{fieldErrors.depositMethod && <span className="mt-1 block text-xs text-red-700">{fieldErrors.depositMethod}</span>}</label><label>Reference Number (optional)<input className={input} value={deposit.referenceNumber} onChange={event => setDeposit({ ...deposit, referenceNumber: event.target.value })} /></label>
          <label className="sm:col-span-2">Description<input className={input} value={deposit.description} onChange={event => setDeposit({ ...deposit, description: event.target.value })} /></label>
          {!linkedDeposit && <div className="sm:col-span-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm"><span className="text-gray-500">Deposit Offset Account</span><p className="mt-1 font-semibold text-gray-900">{displayedDepositOffset ? `${displayedDepositOffset.name} (${displayedDepositOffset.code})` : "Not configured"}</p><p className="mt-1 text-xs text-gray-500">Applied automatically. Existing deposits keep the offset account stored on their record.</p>{fieldErrors.depositOffset && <span className="mt-1 block text-xs text-red-700">{fieldErrors.depositOffset}</span>}</div>}
        </div>
        <button disabled={saving || loading || !!error || !bankAccounts.length || (!linkedDeposit && !selectedDepositId && !configuredDepositOffset)} className="rounded-lg bg-gray-900 px-4 py-2 text-white disabled:opacity-50">{saving ? "Saving…" : linkedDeposit ? "Complete Deposit Details" : selectedDepositId ? "Update Deposit" : "Record Deposit"}</button>
      </form>}
      <section className="overflow-hidden rounded-xl border bg-white"><h2 className="border-b px-5 py-4 font-semibold">Deposits</h2><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Received From</th><th className="p-3 text-left">Bank account</th><th className="p-3 text-left">Offset account</th><th className="p-3 text-left">Description</th><th className="p-3 text-left">Method / Reference</th><th className="p-3 text-left">Status</th><th className="p-3 text-right">Amount</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>{deposits.length === 0 ? <tr><td colSpan={canPost ? 9 : 8} className="p-8 text-center text-gray-500">No deposits recorded.</td></tr> : deposits.map(entry => <tr key={entry.id} className="border-t"><td className="p-3">{entry.date}</td><td className="p-3">{entry.receivedFrom || "—"}</td><td className="p-3">{entry.bankName || "Bank (not specified)"}</td><td className="p-3">{entry.bankingKind === "transfer" ? "Cash (linked transfer)" : entry.offsetAccountName || bankingAccountName(entry.offsetAccountCode || entry.creditCode)}</td><td className="p-3">{entry.description || "—"}</td><td className="p-3">{entry.paymentMethod || "Cash"} · {entry.referenceNumber || "—"}</td><td className="p-3">{entry.bankingStatus === "awaiting_deposit_details" ? "Awaiting deposit details" : "Completed"}</td><td className="p-3 text-right">{money(entry.amount)}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" className="mr-3 text-blue-700" onClick={() => chooseDeposit(entry)}>{entry.bankingStatus === "awaiting_deposit_details" ? "Finish" : "Edit"}</button><button type="button" className="text-red-700" onClick={() => removeEntry(entry)}>Delete</button></td>}</tr>)}</tbody></table></div></section>
    </>}
  </div></RouteGuard>;
}
