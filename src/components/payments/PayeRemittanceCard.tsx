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
import type { Payment, PayeRemittance } from "@/types";

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);
const money = (amount: number) => `UGX ${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export function PayeRemittanceCard() {
  const { user, userRole } = useAuth();
  const payments = useRealtimeCollection<Payment>("payments");
  const remittances = useRealtimeCollection<PayeRemittance>("payeRemittances");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    paymentDate: today(),
    returnPeriod: currentMonth(),
    amount: "",
    paymentSourceCode: "" as "" | "1000" | "1030",
    uraReference: "",
    notes: "",
  });

  const totalWithheld = useMemo(
    () => payments.data
      .filter(payment => payment.status === "paid" && payment.payrollVersion === 2)
      .reduce((sum, payment) => sum + (Number(payment.payeeTax) || 0), 0),
    [payments.data],
  );
  const totalRemitted = useMemo(
    () => remittances.data.reduce((sum, remittance) => sum + (Number(remittance.amount) || 0), 0),
    [remittances.data],
  );
  const outstanding = Math.max(0, totalWithheld - totalRemitted);
  const selectedPeriodWithheld = useMemo(
    () => payments.data
      .filter(payment => payment.status === "paid" && payment.payrollVersion === 2 && payment.paidDate?.startsWith(form.returnPeriod))
      .reduce((sum, payment) => sum + (Number(payment.payeeTax) || 0), 0),
    [payments.data, form.returnPeriod],
  );
  const selectedPeriodRemitted = useMemo(
    () => remittances.data
      .filter(remittance => remittance.returnPeriod === form.returnPeriod)
      .reduce((sum, remittance) => sum + (Number(remittance.amount) || 0), 0),
    [remittances.data, form.returnPeriod],
  );
  const selectedPeriodOutstanding = Math.max(0, selectedPeriodWithheld - selectedPeriodRemitted);
  const canRemit = ["ADMIN", "FINANCIAL_MANAGER"].includes(userRole?.role ?? "");
  const sorted = useMemo(
    () => [...remittances.data].sort((a, b) => b.paymentDate.localeCompare(a.paymentDate)),
    [remittances.data],
  );

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
      const [paymentSnapshot, remittanceSnapshot] = await Promise.all([
        getDocsFromServer(collection(db, "payments")),
        getDocsFromServer(collection(db, "payeRemittances")),
      ]);
      const serverWithheld = paymentSnapshot.docs.reduce((sum, payment) => {
        const data = payment.data();
        return data.status === "paid" && data.payrollVersion === 2 && String(data.paidDate ?? "").startsWith(form.returnPeriod)
          ? sum + (Number(data.payeeTax) || 0)
          : sum;
      }, 0);
      const observedRemitted = remittanceSnapshot.docs.reduce(
        (sum, remittance) => remittance.data().returnPeriod === form.returnPeriod
          ? sum + (Number(remittance.data().amount) || 0)
          : sum,
        0,
      );
      const remittanceRef = doc(collection(db, "payeRemittances"));
      const balanceRef = doc(db, "payeLiabilityBalances", form.returnPeriod);

      await runTransaction(db, async transaction => {
        const balanceSnapshot = await transaction.get(balanceRef);
        const controlledRemitted = Number(balanceSnapshot.data()?.totalRemitted) || 0;
        const alreadyRemitted = Math.max(controlledRemitted, observedRemitted);
        const liveOutstanding = Math.max(0, serverWithheld - alreadyRemitted);
        if (amount > liveOutstanding) {
          throw new Error(`The amount exceeds the outstanding PAYE liability of ${money(liveOutstanding)}.`);
        }
        const now = Timestamp.now();
        transaction.set(remittanceRef, {
          paymentDate: form.paymentDate,
          returnPeriod: form.returnPeriod,
          amount,
          paymentSourceCode: form.paymentSourceCode,
          uraReference: form.uraReference.trim(),
          notes: form.notes.trim(),
          createdBy: user.uid,
          createdAt: now,
        });
        transaction.set(balanceRef, {
          totalRemitted: alreadyRemitted + amount,
          updatedAt: now,
          updatedBy: user.uid,
        });
      });

      setForm({ paymentDate: today(), returnPeriod: currentMonth(), amount: "", paymentSourceCode: "", uraReference: "", notes: "" });
      setOpen(false);
      showToast("PAYE remittance recorded and the PAYE liability was reduced.", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "PAYE remittance could not be recorded.", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <h2 className="font-semibold text-gray-900">PAYE Remittances</h2>
          <p className="mt-1 text-sm text-gray-500">PAYE withheld less amounts paid to URA</p>
        </div>
        {canRemit && (
          <button type="button" onClick={() => setOpen(value => !value)} className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
            {open ? "Close" : "Remit PAYE"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-gray-100 p-5 sm:grid-cols-3">
        <div><p className="text-xs uppercase text-gray-500">PAYE withheld</p><p className="mt-1 font-semibold text-gray-900">{money(totalWithheld)}</p></div>
        <div><p className="text-xs uppercase text-gray-500">Remitted to URA</p><p className="mt-1 font-semibold text-blue-700">{money(totalRemitted)}</p></div>
        <div><p className="text-xs uppercase text-gray-500">Outstanding liability</p><p className="mt-1 font-semibold text-amber-700">{money(outstanding)}</p></div>
      </div>

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
              {saving ? "Recording..." : "Confirm PAYE Remittance"}
            </button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto border-t border-gray-100">
        {sorted.length === 0 ? <p className="p-5 text-sm text-gray-500">No PAYE remittances recorded.</p> : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50"><tr>{["Date", "Return period", "URA reference / PRN", "Paid from", "Amount", "Notes"].map(label => <th key={label} className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">{label}</th>)}</tr></thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(remittance => <tr key={remittance.id}>
                <td className="px-4 py-3">{remittance.paymentDate}</td>
                <td className="px-4 py-3">{remittance.returnPeriod}</td>
                <td className="px-4 py-3">{remittance.uraReference}</td>
                <td className="px-4 py-3">{remittance.paymentSourceCode === "1000" ? "Bank" : "Cash"}</td>
                <td className="px-4 py-3 font-medium">{money(Number(remittance.amount) || 0)}</td>
                <td className="px-4 py-3 text-gray-500">{remittance.notes || "—"}</td>
              </tr>)}
            </tbody>
          </table>
        )}
      </div>
      {(payments.error || remittances.error) && <p className="border-t border-red-100 p-4 text-sm text-red-700">PAYE remittance data could not be loaded: {payments.error || remittances.error}</p>}
    </section>
  );
}
