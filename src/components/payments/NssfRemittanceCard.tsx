"use client";

import { useMemo, useState, type FormEvent } from "react";
import { collection, doc, getDocsFromServer, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
import { showToast } from "@/components/ui/Toast";
import type { Expense, NssfRemittance, Payment } from "@/types";

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (amount: number) => `UGX ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const emptyForm = () => ({ paymentDate: today(), returnPeriod: currentMonth(), amount: "", paymentSourceCode: "" as "" | "1000" | "1030", reference: "", notes: "" });

export function NssfRemittanceCard() {
  const { user, userRole } = useAuth();
  const payments = useRealtimeCollection<Payment>("payments");
  const expenses = useRealtimeCollection<Expense>("expenses");
  const remittances = useRealtimeCollection<NssfRemittance>("nssfRemittances");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const canRemit = ["ADMIN", "FINANCIAL_MANAGER"].includes(userRole?.role ?? "");

  const totalWithheld = useMemo(() => payments.data.filter(payment => payment.status === "paid" && payment.payrollVersion === 2).reduce((sum, payment) => sum + (Number(payment.nssfEmployeeDeduction) || 0) + (Number(payment.nssfBusinessContribution) || 0), 0) + expenses.data.filter(expense => expense.payrollExpenseVersion === 2).reduce((sum, expense) => sum + (Number(expense.nssfEmployeeDeduction) || 0) + (Number(expense.nssfBusinessContribution) || 0), 0), [payments.data, expenses.data]);
  const totalRemitted = useMemo(() => remittances.data.reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0), [remittances.data]);
  const outstanding = Math.max(0, totalWithheld - totalRemitted);
  const periodWithheld = useMemo(() => payments.data.filter(payment => payment.status === "paid" && payment.payrollVersion === 2 && payment.paidDate?.startsWith(form.returnPeriod)).reduce((sum, payment) => sum + (Number(payment.nssfEmployeeDeduction) || 0) + (Number(payment.nssfBusinessContribution) || 0), 0) + expenses.data.filter(expense => expense.payrollExpenseVersion === 2 && expense.date?.startsWith(form.returnPeriod)).reduce((sum, expense) => sum + (Number(expense.nssfEmployeeDeduction) || 0) + (Number(expense.nssfBusinessContribution) || 0), 0), [payments.data, expenses.data, form.returnPeriod]);
  const periodRemittedOther = useMemo(() => remittances.data.filter(entry => entry.returnPeriod === form.returnPeriod && entry.id !== editingId).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0), [remittances.data, form.returnPeriod, editingId]);
  const periodOutstanding = Math.max(0, periodWithheld - periodRemittedOther);
  const sorted = useMemo(() => [...remittances.data].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)), [remittances.data]);

  const reset = () => { setForm(emptyForm()); setEditingId(null); setOpen(false); };
  const beginEdit = (entry: NssfRemittance) => {
    setEditingId(entry.id);
    setForm({ paymentDate: entry.paymentDate, returnPeriod: entry.returnPeriod, amount: String(entry.amount), paymentSourceCode: entry.paymentSourceCode, reference: entry.reference ?? "", notes: entry.notes ?? "" });
    setOpen(true);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    try {
      if (!canRemit || !user || !db) throw new Error("You do not have permission to remit NSSF.");
      if (!form.paymentDate || form.paymentDate > today()) throw new Error("Choose a valid payment date that is not in the future.");
      if (!/^\d{4}-\d{2}$/.test(form.returnPeriod)) throw new Error("Choose the NSSF period covered.");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an NSSF amount greater than zero.");
      if (!form.paymentSourceCode) throw new Error("Select Cash or Bank.");
      setSaving(true);

      const [paymentSnapshot, expenseSnapshot, remittanceSnapshot] = await Promise.all([getDocsFromServer(collection(db, "payments")), getDocsFromServer(collection(db, "expenses")), getDocsFromServer(collection(db, "nssfRemittances"))]);
      const serverWithheld = paymentSnapshot.docs.reduce((sum, item) => {
        const data = item.data();
        return data.status === "paid" && data.payrollVersion === 2 && String(data.paidDate ?? "").startsWith(form.returnPeriod) ? sum + (Number(data.nssfEmployeeDeduction) || 0) + (Number(data.nssfBusinessContribution) || 0) : sum;
      }, 0);
      const serverSalaryWithheld = expenseSnapshot.docs.reduce((sum, item) => { const data = item.data(); return data.payrollExpenseVersion === 2 && String(data.date ?? "").startsWith(form.returnPeriod) ? sum + (Number(data.nssfEmployeeDeduction) || 0) + (Number(data.nssfBusinessContribution) || 0) : sum; }, 0);
      const totalServerWithheld = serverWithheld + serverSalaryWithheld;
      const observedOther = remittanceSnapshot.docs.reduce((sum, item) => item.id !== editingId && item.data().returnPeriod === form.returnPeriod ? sum + (Number(item.data().amount) || 0) : sum, 0);
      if (amount > Math.max(0, totalServerWithheld - observedOther)) throw new Error(`Insufficient balance. The current NSSF Payable balance is ${money(Math.max(0, totalServerWithheld - observedOther))}.`);

      const remittanceRef = editingId ? doc(db, "nssfRemittances", editingId) : doc(collection(db, "nssfRemittances"));
      await runTransaction(db, async transaction => {
        const existing = editingId ? await transaction.get(remittanceRef) : null;
        if (editingId && !existing?.exists()) throw new Error("This NSSF remittance no longer exists.");
        const oldPeriod = String(existing?.data()?.returnPeriod ?? "");
        const oldAmount = Number(existing?.data()?.amount) || 0;
        const targetBalanceRef = doc(db, "nssfLiabilityBalances", form.returnPeriod);
        const oldBalanceRef = oldPeriod && oldPeriod !== form.returnPeriod ? doc(db, "nssfLiabilityBalances", oldPeriod) : null;
        const targetBalance = await transaction.get(targetBalanceRef);
        const oldBalance = oldBalanceRef ? await transaction.get(oldBalanceRef) : null;
        const controlledTarget = Number(targetBalance.data()?.totalRemitted) || 0;
        const targetBase = Math.max(0, controlledTarget - (oldPeriod === form.returnPeriod ? oldAmount : 0), observedOther);
        if (amount > Math.max(0, totalServerWithheld - targetBase)) throw new Error(`Insufficient balance. The current NSSF Payable balance is ${money(Math.max(0, totalServerWithheld - targetBase))}.`);
        const now = Timestamp.now();
        const payload = { paymentDate: form.paymentDate, returnPeriod: form.returnPeriod, amount, paymentSourceCode: form.paymentSourceCode, reference: form.reference.trim(), notes: form.notes.trim() };
        if (editingId) transaction.update(remittanceRef, { ...payload, updatedBy: user.uid, updatedAt: now });
        else transaction.set(remittanceRef, { ...payload, createdBy: user.uid, createdByRole: userRole?.role ?? "", createdAt: now });
        transaction.set(targetBalanceRef, { totalRemitted: targetBase + amount, updatedAt: now, updatedBy: user.uid });
        if (oldBalanceRef && oldBalance) transaction.set(oldBalanceRef, { totalRemitted: Math.max(0, (Number(oldBalance.data()?.totalRemitted) || oldAmount) - oldAmount), updatedAt: now, updatedBy: user.uid });
      });
      reset();
      showToast(editingId ? "NSSF remittance updated." : "NSSF remittance recorded and the NSSF liability was reduced.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "NSSF remittance could not be saved.", "error");
    } finally { setSaving(false); }
  }

  async function remove(entry: NssfRemittance) {
    if (!canRemit || !user || !db || !window.confirm("Delete this NSSF remittance and reverse its accounting effect?")) return;
    try {
      await runTransaction(db, async transaction => {
        const remittanceRef = doc(db, "nssfRemittances", entry.id);
        const balanceRef = doc(db, "nssfLiabilityBalances", entry.returnPeriod);
        const [remittanceSnapshot, balanceSnapshot] = await Promise.all([transaction.get(remittanceRef), transaction.get(balanceRef)]);
        if (!remittanceSnapshot.exists()) throw new Error("This NSSF remittance no longer exists.");
        const amount = Number(remittanceSnapshot.data().amount) || 0;
        transaction.delete(remittanceRef);
        transaction.set(balanceRef, { totalRemitted: Math.max(0, (Number(balanceSnapshot.data()?.totalRemitted) || amount) - amount), updatedAt: Timestamp.now(), updatedBy: user.uid });
      });
      if (editingId === entry.id) reset();
      showToast("NSSF remittance deleted and its posting was reversed.", "success");
    } catch (error) { showToast(error instanceof Error ? error.message : "NSSF remittance could not be deleted.", "error"); }
  }

  return <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-semibold text-gray-900">NSSF Remittances</h2><p className="mt-1 text-sm text-gray-500">Employee 5% plus employer 10%, less amounts remitted</p></div>{canRemit && <button type="button" onClick={() => open ? reset() : setOpen(true)} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">{open ? "Close" : "Remit NSSF"}</button>}</div>
    <div className="border-t border-gray-100 p-5"><p className="text-xs uppercase text-gray-500">NSSF Payable</p><p className="mt-1 font-semibold text-amber-700">{money(outstanding)}</p></div>
    {open && canRemit && <form onSubmit={submit} className="grid grid-cols-1 gap-4 border-t border-gray-200 bg-gray-50 p-5 md:grid-cols-2">
      <label className="text-sm font-medium text-gray-700">Date<input required type="date" max={today()} value={form.paymentDate} onChange={event => setForm(value => ({ ...value, paymentDate: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-gray-700">Period covered<input required type="month" value={form.returnPeriod} onChange={event => setForm(value => ({ ...value, returnPeriod: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-gray-700">Amount<input required type="number" min="1" step="1" max={periodOutstanding || undefined} value={form.amount} onChange={event => setForm(value => ({ ...value, amount: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" placeholder="UGX" /><span className="mt-1 block text-xs text-gray-500">Available for {form.returnPeriod}: {money(periodOutstanding)}</span></label>
      <label className="text-sm font-medium text-gray-700">Paid from<select required value={form.paymentSourceCode} onChange={event => setForm(value => ({ ...value, paymentSourceCode: event.target.value as "" | "1000" | "1030" }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2"><option value="">Select Cash or Bank...</option><option value="1030">Cash</option><option value="1000">Bank</option></select></label>
      <label className="text-sm font-medium text-gray-700">Reference (optional)<input type="text" value={form.reference} onChange={event => setForm(value => ({ ...value, reference: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
      <label className="text-sm font-medium text-gray-700">Notes / Description (optional)<input type="text" value={form.notes} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" /></label>
      <div className="flex justify-end md:col-span-2"><button disabled={saving || periodOutstanding <= 0} className="rounded-md bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">{saving ? "Saving..." : editingId ? "Update NSSF Remittance" : "Confirm NSSF Remittance"}</button></div>
    </form>}
    <div className="overflow-x-auto border-t border-gray-100">{sorted.length === 0 ? <p className="p-5 text-sm text-gray-500">No NSSF remittances recorded.</p> : <table className="min-w-full divide-y divide-gray-200 text-sm"><thead className="bg-gray-50"><tr>{["Date", "Period", "Reference", "Paid from", "Amount", "Notes", "Actions"].map(label => <th key={label} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{label}</th>)}</tr></thead><tbody className="divide-y divide-gray-100">{sorted.map(entry => <tr key={entry.id}><td className="px-4 py-3">{entry.paymentDate}</td><td className="px-4 py-3">{entry.returnPeriod}</td><td className="px-4 py-3">{entry.reference || "—"}</td><td className="px-4 py-3">{entry.paymentSourceCode === "1000" ? "Bank" : "Cash"}</td><td className="px-4 py-3 font-medium">{money(Number(entry.amount) || 0)}</td><td className="px-4 py-3 text-gray-500">{entry.notes || "—"}</td><td className="px-4 py-3">{canRemit && <div className="flex gap-3"><button type="button" onClick={() => beginEdit(entry)} className="text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => void remove(entry)} className="text-red-700 hover:underline">Delete</button></div>}</td></tr>)}</tbody></table>}</div>
    {(payments.error || expenses.error || remittances.error) && <p className="border-t border-red-100 p-4 text-sm text-red-700">NSSF remittance data could not be loaded: {payments.error || expenses.error || remittances.error}</p>}
  </section>;
}
