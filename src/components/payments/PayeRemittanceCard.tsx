"use client";

import { useMemo, useState, type FormEvent } from "react";
import {
  collection,
  doc,
  getDocsFromServer,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
import { showToast } from "@/components/ui/Toast";
import type { Expense, Payment, PayeRemittance } from "@/types";

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (amount: number) => `UGX ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const emptyForm = () => ({ paymentDate: today(), returnPeriod: currentMonth(), amount: "", paymentSourceCode: "" as "" | "1000" | "1030", uraReference: "", notes: "" });

export function PayeRemittanceCard() {
  const { user, userRole } = useAuth();
  const payments = useRealtimeCollection<Payment>("payments");
  const expenses = useRealtimeCollection<Expense>("expenses");
  const remittances = useRealtimeCollection<PayeRemittance>("payeRemittances");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const totalWithheld = useMemo(
    () => payments.data
      .filter(payment => payment.status === "paid" && payment.payrollVersion === 2)
      .reduce((sum, payment) => sum + (Number(payment.payeeTax) || 0), 0) + expenses.data.filter(expense => expense.payrollExpenseVersion === 2).reduce((sum, expense) => sum + (Number(expense.payeeTax) || 0), 0),
    [payments.data, expenses.data],
  );
  const totalRemitted = useMemo(
    () => remittances.data.reduce((sum, remittance) => sum + (Number(remittance.amount) || 0), 0),
    [remittances.data],
  );
  const outstanding = Math.max(0, totalWithheld - totalRemitted);
  const selectedPeriodWithheld = useMemo(
    () => payments.data
      .filter(payment => payment.status === "paid" && payment.payrollVersion === 2 && payment.paidDate?.startsWith(form.returnPeriod))
      .reduce((sum, payment) => sum + (Number(payment.payeeTax) || 0), 0) + expenses.data.filter(expense => expense.payrollExpenseVersion === 2 && expense.date?.startsWith(form.returnPeriod)).reduce((sum, expense) => sum + (Number(expense.payeeTax) || 0), 0),
    [payments.data, expenses.data, form.returnPeriod],
  );
  const selectedPeriodRemitted = useMemo(
    () => remittances.data
      .filter(remittance => remittance.returnPeriod === form.returnPeriod && remittance.id !== editingId)
      .reduce((sum, remittance) => sum + (Number(remittance.amount) || 0), 0),
    [remittances.data, form.returnPeriod, editingId],
  );
  const selectedPeriodOutstanding = Math.max(0, selectedPeriodWithheld - selectedPeriodRemitted);
  const canRemit = ["ADMIN", "FINANCIAL_MANAGER"].includes(userRole?.role ?? "");
  const sorted = useMemo(
    () => [...remittances.data].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)),
    [remittances.data],
  );
  const reset = () => { setForm(emptyForm()); setEditingId(null); setOpen(false); };
  const beginEdit = (entry: PayeRemittance) => { setEditingId(entry.id); setForm({ paymentDate: entry.paymentDate, returnPeriod: entry.returnPeriod, amount: String(entry.amount), paymentSourceCode: entry.paymentSourceCode, uraReference: entry.uraReference, notes: entry.notes ?? "" }); setOpen(true); };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const amount = Number(form.amount);
    try {
      if (!canRemit || !user || !db) throw new Error("You do not have permission to remit PAYE.");
      if (!form.paymentDate || form.paymentDate > today()) throw new Error("Choose a valid payment date that is not in the future.");
      if (!/^\d{4}-\d{2}$/.test(form.returnPeriod)) throw new Error("Choose the PAYE return period.");
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter a PAYE amount greater than zero.");
      if (!form.paymentSourceCode) throw new Error("Select Cash or Bank.");
      if (!form.uraReference.trim()) throw new Error("Enter the URA payment reference or PRN.");
      setSaving(true);

      // Refresh the source totals from Firestore before the transaction. The
      // control document serialises concurrent remittances; the immutable
      // remittance documents remain the accounting audit trail.
      const [paymentSnapshot, expenseSnapshot, remittanceSnapshot] = await Promise.all([
        getDocsFromServer(collection(db, "payments")),
        getDocsFromServer(collection(db, "expenses")),
        getDocsFromServer(collection(db, "payeRemittances")),
      ]);
      const serverWithheld = paymentSnapshot.docs.reduce((sum, payment) => {
        const data = payment.data();
        return data.status === "paid" && data.payrollVersion === 2 && String(data.paidDate ?? "").startsWith(form.returnPeriod)
          ? sum + (Number(data.payeeTax) || 0)
          : sum;
      }, 0);
      const serverSalaryWithheld = expenseSnapshot.docs.reduce((sum, expense) => { const data = expense.data(); return data.payrollExpenseVersion === 2 && String(data.date ?? "").startsWith(form.returnPeriod) ? sum + (Number(data.payeeTax) || 0) : sum; }, 0);
      const totalServerWithheld = serverWithheld + serverSalaryWithheld;
      const observedRemitted = remittanceSnapshot.docs.reduce(
        (sum, remittance) => remittance.id !== editingId && remittance.data().returnPeriod === form.returnPeriod
          ? sum + (Number(remittance.data().amount) || 0)
          : sum,
        0,
      );
      const remittanceRef = editingId ? doc(db, "payeRemittances", editingId) : doc(collection(db, "payeRemittances"));
      const balanceRef = doc(db, "payeLiabilityBalances", form.returnPeriod);

      await runTransaction(db, async transaction => {
        const existing = editingId ? await transaction.get(remittanceRef) : null;
        if (editingId && !existing?.exists()) throw new Error("This PAYE remittance no longer exists.");
        const oldPeriod = String(existing?.data()?.returnPeriod ?? "");
        const oldAmount = Number(existing?.data()?.amount) || 0;
        const oldBalanceRef = oldPeriod && oldPeriod !== form.returnPeriod ? doc(db, "payeLiabilityBalances", oldPeriod) : null;
        const balanceSnapshot = await transaction.get(balanceRef);
        const oldBalanceSnapshot = oldBalanceRef ? await transaction.get(oldBalanceRef) : null;
        const controlledRemitted = Number(balanceSnapshot.data()?.totalRemitted) || 0;
        const alreadyRemitted = Math.max(0, controlledRemitted - (oldPeriod === form.returnPeriod ? oldAmount : 0), observedRemitted);
        const liveOutstanding = Math.max(0, totalServerWithheld - alreadyRemitted);
        if (amount > liveOutstanding) {
          throw new Error(`Insufficient balance. The current PAYE Payable balance is ${money(liveOutstanding)}.`);
        }
        const now = Timestamp.now();
        const payload = {
          paymentDate: form.paymentDate,
          returnPeriod: form.returnPeriod,
          amount,
          paymentSourceCode: form.paymentSourceCode,
          uraReference: form.uraReference.trim(),
          notes: form.notes.trim(),
        };
        if (editingId) transaction.update(remittanceRef, { ...payload, updatedBy: user.uid, updatedAt: now });
        else transaction.set(remittanceRef, { ...payload, createdBy: user.uid, createdByRole: userRole?.role ?? "", createdAt: now });
        transaction.set(balanceRef, {
          totalRemitted: alreadyRemitted + amount,
          updatedAt: now,
          updatedBy: user.uid,
        });
        if (oldBalanceRef && oldBalanceSnapshot) transaction.set(oldBalanceRef, { totalRemitted: Math.max(0, (Number(oldBalanceSnapshot.data()?.totalRemitted) || oldAmount) - oldAmount), updatedAt: now, updatedBy: user.uid });
      });

      reset();
      showToast(editingId ? "PAYE remittance updated." : "PAYE remittance recorded and the PAYE liability was reduced.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "PAYE remittance could not be recorded.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function remove(entry: PayeRemittance) {
    if (!canRemit || !user || !db || !window.confirm("Delete this PAYE remittance and reverse its accounting effect?")) return;
    try {
      await runTransaction(db, async transaction => {
        const remittanceRef = doc(db, "payeRemittances", entry.id);
        const balanceRef = doc(db, "payeLiabilityBalances", entry.returnPeriod);
        const [remittanceSnapshot, balanceSnapshot] = await Promise.all([transaction.get(remittanceRef), transaction.get(balanceRef)]);
        if (!remittanceSnapshot.exists()) throw new Error("This PAYE remittance no longer exists.");
        const amount = Number(remittanceSnapshot.data().amount) || 0;
        transaction.delete(remittanceRef);
        transaction.set(balanceRef, { totalRemitted: Math.max(0, (Number(balanceSnapshot.data()?.totalRemitted) || amount) - amount), updatedAt: Timestamp.now(), updatedBy: user.uid });
      });
      if (editingId === entry.id) reset();
      showToast("PAYE remittance deleted and its posting was reversed.", "success");
    } catch (error) { showToast(error instanceof Error ? error.message : "PAYE remittance could not be deleted.", "error"); }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold text-gray-900">PAYE Remittances</h2>
          <p className="mt-1 text-sm text-gray-500">PAYE withheld less amounts paid to URA</p>
        </div>
        {canRemit && (
          <button type="button" onClick={() => open ? reset() : setOpen(true)} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            {open ? "Close" : "Remit PAYE"}
          </button>
        )}
      </div>

      <div className="border-t border-gray-100 p-5"><p className="text-xs uppercase text-gray-500">PAYE Payable</p><p className="mt-1 font-semibold text-amber-700">{money(outstanding)}</p></div>

      {open && canRemit && (
        <form onSubmit={submit} className="grid grid-cols-1 gap-4 border-t border-gray-200 bg-gray-50 p-5 md:grid-cols-2">
          <label className="text-sm font-medium text-gray-700">Payment date
            <input required type="date" max={today()} value={form.paymentDate} onChange={event => setForm(value => ({ ...value, paymentDate: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">PAYE return period
            <input required type="month" value={form.returnPeriod} onChange={event => setForm(value => ({ ...value, returnPeriod: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Amount
            <input required type="number" min="1" step="1" max={selectedPeriodOutstanding || undefined} value={form.amount} onChange={event => setForm(value => ({ ...value, amount: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" placeholder="UGX" />
            <span className="mt-1 block text-xs text-gray-500">Outstanding for {form.returnPeriod}: {money(selectedPeriodOutstanding)}</span>
          </label>
          <label className="text-sm font-medium text-gray-700">Paid from
            <select required value={form.paymentSourceCode} onChange={event => setForm(value => ({ ...value, paymentSourceCode: event.target.value as "" | "1000" | "1030" }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2">
              <option value="">Select Cash or Bank...</option>
              <option value="1030">Cash</option>
              <option value="1000">Bank</option>
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">URA payment reference / PRN
            <input required type="text" value={form.uraReference} onChange={event => setForm(value => ({ ...value, uraReference: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm font-medium text-gray-700">Notes
            <input type="text" value={form.notes} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2" />
          </label>
          <div className="md:col-span-2 flex justify-end">
            <button disabled={saving || selectedPeriodOutstanding <= 0} className="rounded-md bg-blue-700 px-5 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Update PAYE Remittance" : "Confirm PAYE Remittance"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto border-t border-gray-100">
        {sorted.length === 0 ? <p className="p-5 text-sm text-gray-500">No PAYE remittances recorded.</p> : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50"><tr>{["Date", "Return period", "URA reference / PRN", "Paid from", "Amount", "Notes", "Actions"].map(label => <th key={label} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(remittance => <tr key={remittance.id}>
                <td className="px-4 py-3">{remittance.paymentDate}</td>
                <td className="px-4 py-3">{remittance.returnPeriod}</td>
                <td className="px-4 py-3">{remittance.uraReference}</td>
                <td className="px-4 py-3">{remittance.paymentSourceCode === "1000" ? "Bank" : "Cash"}</td>
                <td className="px-4 py-3 font-medium">{money(Number(remittance.amount) || 0)}</td>
                <td className="px-4 py-3 text-gray-500">{remittance.notes || "—"}</td>
                <td className="px-4 py-3">{canRemit && <div className="flex gap-3"><button type="button" onClick={() => beginEdit(remittance)} className="text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => void remove(remittance)} className="text-red-700 hover:underline">Delete</button></div>}</td>
              </tr>)}
            </tbody>
          </table>
        )}
      </div>
      {(payments.error || expenses.error || remittances.error) && <p className="border-t border-red-100 p-4 text-sm text-red-700">PAYE remittance data could not be loaded: {payments.error || expenses.error || remittances.error}</p>}
    </section>
  );
}
