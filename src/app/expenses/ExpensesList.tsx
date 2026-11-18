"use client";

import { useState, type FormEvent } from "react";
import { deleteDoc, doc, runTransaction } from "firebase/firestore";
import { useQueryClient } from "@tanstack/react-query";
import { db } from "@/lib/firebase";
import type { Expense, ExpenseCategory } from "@/types";

type Props = {
  expenses: Expense[];
  loading: boolean;
  loadError: boolean;
  canEdit: boolean;
  canDelete: boolean;
  categoryLabels: Record<ExpenseCategory, string>;
};

const inputClass = "mt-1 block w-full rounded-md border border-gray-300 px-3 py-2";
const primaryButton = "rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50";

function isPayable(expense: Expense) {
  return expense.accounting?.settlementCode === "2110"
    || expense.paymentStatus === "partial" || expense.paymentStatus === "unpaid";
}

function canChangeCost(expense: Expense) {
  return !isPayable(expense) && expense.accounting?.accountCode !== "6010"
    && !expense.payrollExpenseVersion && expense.grossAmount == null
    && expense.totalBusinessCost == null;
}

export function ExpensesList({ expenses, loading, loadError, canEdit, canDelete, categoryLabels }: Props) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function save(event: FormEvent<HTMLFormElement>, original: Expense) {
    event.preventDefault();
    if (!canEdit || busy) return;
    const fields = new FormData(event.currentTarget);
    const description = String(fields.get("description") ?? "").trim();
    if (!description) {
      setError("Enter a description.");
      return;
    }

    setBusy(true);
    setError("");
    setNotice("");
    try {
      const reference = doc(db, "expenses", original.id);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(reference);
        if (!snapshot.exists()) throw new Error("This expense has already been deleted.");
        const current = snapshot.data() as Expense;
        const hasConflict = current.date !== original.date || current.description !== original.description
          || current.receiptRef !== original.receiptRef || current.supplierName !== original.supplierName
          || current.dueDate !== original.dueDate || current.amountUgx !== original.amountUgx
          || current.unitCost !== original.unitCost || current.itemCount !== original.itemCount
          || current.amountPaid !== original.amountPaid || current.paymentStatus !== original.paymentStatus
          || isPayable(current) !== isPayable(original) || canChangeCost(current) !== canChangeCost(original);
        if (hasConflict) throw new Error("This expense changed while you were editing. Reopen it and try again.");

        const changes: Partial<Expense> = { description };
        if (isPayable(current)) {
          changes.supplierName = String(fields.get("supplierName") ?? "").trim();
          changes.dueDate = String(fields.get("dueDate") ?? "");
          if (changes.dueDate && changes.dueDate < current.date) {
            throw new Error("The payment due date must be on or after the expense date.");
          }
        } else {
          changes.date = String(fields.get("date") ?? "");
          changes.receiptRef = String(fields.get("receiptRef") ?? "").trim();
        }
        if (canChangeCost(current)) {
          const unitCost = Number(fields.get("unitCost"));
          const itemCount = Number(fields.get("itemCount"));
          const amountUgx = unitCost * itemCount;
          const originalUnitCost = current.unitCost ?? current.amountUgx;
          const originalItemCount = current.unitCost == null ? 1 : current.itemCount ?? 1;
          if (unitCost !== originalUnitCost || itemCount !== originalItemCount) {
            if (!Number.isFinite(amountUgx) || amountUgx <= 0 || !Number.isInteger(itemCount) || itemCount < 1) {
              throw new Error("Enter a positive unit cost and a whole number of items.");
            }
            Object.assign(changes, { unitCost, itemCount, amountUgx });
            if (current.amountPaid != null || current.paymentStatus === "paid") changes.amountPaid = amountUgx;
          }
        }
        transaction.update(reference, changes);
      });
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setEditing(null);
      setNotice("Expense updated.");
    } catch (err) {
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setError(err instanceof Error ? err.message : "Could not save the expense.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(expense: Expense) {
    if (!canDelete || busy) return;
    const message = `Permanently delete "${expense.description || "this expense"}"?`;
    const confirmation = isPayable(expense) ? `${message} Any separately recorded supplier payments will remain in the ledger.` : message;
    if (!window.confirm(confirmation)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deleteDoc(doc(db, "expenses", expense.id));
      await queryClient.invalidateQueries({ queryKey: ["expenses"] });
      setEditing(null);
      setNotice("Expense deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the expense.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4" aria-label="All expenses">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">All expenses</h2>
        <p className="mt-1 text-sm text-gray-500">
          {expenses.length.toLocaleString()} expense record{expenses.length === 1 ? "" : "s"}. Authorized staff can edit records; only administrators can delete them.
        </p>
      </div>
      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-md bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
      {editing && canEdit && (
        <form key={editing.id} onSubmit={(event) => save(event, editing)} className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="font-semibold">Edit expense</h2>
          <fieldset disabled={busy} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm">Description<input name="description" required defaultValue={editing.description} className={inputClass} /></label>
            {isPayable(editing) ? (
              <>
                <label className="text-sm">Supplier<input name="supplierName" defaultValue={editing.supplierName} className={inputClass} /></label>
                <label className="text-sm">Payment due date<input name="dueDate" type="date" min={editing.date} defaultValue={editing.dueDate} className={inputClass} /></label>
              </>
            ) : (
              <>
                <label className="text-sm">Date<input name="date" type="date" required defaultValue={editing.date} className={inputClass} /></label>
                <label className="text-sm">Payment voucher no.<input name="receiptRef" defaultValue={editing.receiptRef} className={inputClass} /></label>
              </>
            )}
            {canChangeCost(editing) && (
              <>
                <label className="text-sm">Unit cost (UGX)<input name="unitCost" type="number" min="0" step="any" required defaultValue={editing.unitCost ?? editing.amountUgx} className={inputClass} /></label>
                <label className="text-sm">Number of items<input name="itemCount" type="number" min="1" step="1" required defaultValue={editing.unitCost == null ? 1 : editing.itemCount ?? 1} className={inputClass} /></label>
              </>
            )}
          </fieldset>
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" disabled={busy} onClick={() => { setEditing(null); setError(""); }} className="px-3 py-2 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={busy} className={primaryButton}>{busy ? "Saving..." : "Save changes"}</button>
          </div>
        </form>
      )}
      {loadError && <p role="alert" className="text-sm text-red-700">Could not load expenses.</p>}
      {loading ? (
        <p role="status" className="text-sm text-gray-500">Loading expenses...</p>
      ) : expenses.length === 0 ? (
        !loadError && <p className="text-sm text-gray-500">No expenses recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Description</th>
                <th scope="col" className="px-4 py-3">Category</th>
                <th scope="col" className="px-4 py-3">Voucher no.</th>
                <th scope="col" className="px-4 py-3 text-right">Amount (UGX)</th>
                {canEdit && <th scope="col" className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="whitespace-nowrap px-4 py-3">{expense.date || "—"}</td>
                  <td className="px-4 py-3">{expense.description || "—"}</td>
                  <td className="px-4 py-3">{expense.accounting?.accountName || categoryLabels[expense.category] || expense.category || "—"}</td>
                  <td className="px-4 py-3">{expense.receiptRef || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{expense.amountUgx?.toLocaleString() ?? "—"}</td>
                  {canEdit && <td className="whitespace-nowrap px-4 py-3 text-right">
                    <button type="button" disabled={busy} onClick={() => {
                      setError("");
                      setNotice("");
                      setEditing(expense);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }} className="font-medium text-gray-900 hover:underline disabled:opacity-50" aria-label={`Edit ${expense.description || "expense"}`}>Edit</button>
                    {canDelete && <button type="button" disabled={busy} onClick={() => remove(expense)} className="ml-4 font-medium text-red-700 hover:underline disabled:opacity-50" aria-label={`Delete ${expense.description || "expense"}`}>Delete</button>}
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
