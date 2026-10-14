"use client";

import { useMemo, useState } from "react";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
import type { Journal, LedgerSource } from "@/lib/accounts";

type Kind = "receivable" | "payable";
const today = () => new Date().toISOString().slice(0, 10);

export function CreditSettlements({ kind, entries }: { kind: Kind; entries: LedgerSource[] }) {
  const { user } = useAuth();
  const journals = useRealtimeCollection<Journal>("accountJournals");
  const [selectedId, setSelectedId] = useState("");
  const [amount, setAmount] = useState(0);
  const [date, setDate] = useState(today());
  const [cashCode, setCashCode] = useState("1000");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const liabilityCode = kind === "receivable" ? "1100" : "2110";
  const settlementKind = kind === "receivable" ? "accounts_receivable" : "accounts_payable";
  const openEntries = useMemo(() => entries.filter(entry => entry.accounting?.settlementCode === liabilityCode).map(entry => {
    const original = Number(kind === "receivable" ? entry.totalAmount : entry.amountUgx) || 0;
    const initial = Number(kind === "receivable" ? entry.amountReceived : entry.amountPaid) || 0;
    const settled = initial + journals.data.filter(journal => journal.settlementKind === settlementKind && journal.linkedTransactionId === entry.id).reduce((sum, journal) => sum + (Number(journal.amount) || 0), 0);
    return { entry, original, settled, outstanding: Math.max(0, original - settled) };
  }).filter(item => item.outstanding > 0.005), [entries, journals.data, kind, liabilityCode, settlementKind]);
  const selected = openEntries.find(item => item.entry.id === selectedId);

  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage("");
    if (!selected) return setMessage("Select an outstanding transaction.");
    if (!user) return setMessage("You must be signed in.");
    if (!Number.isFinite(amount) || amount <= 0 || amount > selected.outstanding) return setMessage(`Enter an amount up to UGX ${selected.outstanding.toLocaleString()}.`);
    if (date < selected.entry.date) return setMessage("Settlement date cannot be before the original transaction date.");
    setSaving(true);
    try {
      await addDoc(collection(db, "accountJournals"), {
        date, amount, debitCode: kind === "receivable" ? cashCode : liabilityCode,
        creditCode: kind === "receivable" ? liabilityCode : cashCode,
        description: `${kind === "receivable" ? "Customer receipt" : "Supplier payment"} for ${selected.entry.invoiceNumber || selected.entry.receiptRef || selected.entry.id}`,
        settlementKind, linkedTransactionId: selected.entry.id, referenceNumber: reference.trim(), createdBy: user.uid, createdAt: Timestamp.now(),
      });
      setMessage(`${kind === "receivable" ? "Receipt" : "Payment"} recorded successfully.`);
      setSelectedId(""); setAmount(0); setReference("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Settlement could not be saved."); }
    finally { setSaving(false); }
  };

  return <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
    <h2 className="text-lg font-semibold">{kind === "receivable" ? "Receive Customer Payment" : "Pay Outstanding Supplier Expense"}</h2>
    <p className="mt-1 text-sm text-gray-500">Select the original transaction. This settles its balance without recording income or expense again.</p>
    <form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Outstanding transaction<select required className="mt-1 w-full rounded-md border px-3 py-2" value={selectedId} onChange={event => { setSelectedId(event.target.value); setAmount(0); }}><option value="">Select...</option>{openEntries.map(({ entry, outstanding }) => <option key={entry.id} value={entry.id}>{entry.date} · {kind === "receivable" ? entry.customerName : entry.supplierName || entry.description} · UGX {outstanding.toLocaleString()} due</option>)}</select></label>
      <label className="text-sm">Settlement date<input required type="date" className="mt-1 w-full rounded-md border px-3 py-2" value={date} onChange={event => setDate(event.target.value)} /></label>
      <label className="text-sm">Amount (UGX)<input required type="number" min="1" max={selected?.outstanding} className="mt-1 w-full rounded-md border px-3 py-2" value={amount || ""} onChange={event => setAmount(Number(event.target.value) || 0)} /></label>
      <label className="text-sm">{kind === "receivable" ? "Received into" : "Paid from"}<select className="mt-1 w-full rounded-md border px-3 py-2" value={cashCode} onChange={event => setCashCode(event.target.value)}><option value="1000">Bank</option><option value="1030">Cash</option>{kind === "receivable" && <><option value="1010">Mobile Money [MTN]</option><option value="1020">Mobile Money [Airtel]</option></>}</select></label>
      <label className="text-sm">Reference number<input required className="mt-1 w-full rounded-md border px-3 py-2" value={reference} onChange={event => setReference(event.target.value)} /></label>
      <div className="flex items-end"><button disabled={saving || !selected} className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? "Saving..." : kind === "receivable" ? "Receive Payment" : "Pay Supplier"}</button></div>
    </form>
    {message && <p className={`mt-3 text-sm ${message.includes("successfully") ? "text-emerald-700" : "text-red-700"}`}>{message}</p>}
    {journals.error && <p className="mt-3 text-sm text-red-700">Settlement history could not be loaded: {journals.error}</p>}
  </section>;
}
