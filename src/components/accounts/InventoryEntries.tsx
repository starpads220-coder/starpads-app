"use client";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { addDoc, collection, deleteDoc, doc, Timestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { INVENTORY_MATERIALS, INVENTORY_TRANSACTION_TYPES, inventoryHistoryIssue, inventoryPositions, inventoryTypeLabel, validateInventoryTransaction, type InventoryMaterial, type InventoryTransaction, type InventoryTransactionType } from "@/lib/inventory-accounting";
import type { LedgerSource } from "@/lib/accounts";

const input = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm";
const money = (amount: number) => `UGX ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const fresh = () => ({ date: new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date()), type: "raw_material_purchase" as InventoryTransactionType, description: "", reference: "", notes: "", material: "PUL" as InventoryMaterial, rolls: "", metres: "", unitCost: "", quantity: "", totalValue: "", finishedGood: "", batchRef: "", settlementCode: "1000" as "1000" | "1030" | "2110" | "3060", linkedSaleId: "" });

export function InventoryEntries({ entries, sales, canPost, userId }: { entries: InventoryTransaction[]; sales: LedgerSource[]; canPost: boolean; userId?: string }) {
  const [form, setForm] = useState(fresh);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const position = useMemo(() => inventoryPositions(entries), [entries]);
  const amount = (["raw_material_purchase", "raw_material_opening", "raw_material_loss", "raw_to_wip"].includes(form.type) ? Number(form.metres) * Number(form.unitCost) : ["wip_to_finished", "finished_goods_opening", "finished_goods_sale", "finished_goods_loss"].includes(form.type) ? Number(form.quantity) * Number(form.unitCost) : Number(form.totalValue)) || 0;
  const selectedRaw = position.rawByMaterial[form.material];
  const selectedFinished = position.finishedByProduct[form.finishedGood.trim()] ?? { quantity: 0, value: 0 };
  const linkedSaleIds = new Set(entries.filter(entry => entry.type === "finished_goods_sale" && entry.id !== editingId).map(entry => entry.linkedSaleId).filter(Boolean));
  const availableSales = sales.filter(sale => !linkedSaleIds.has(sale.id)).sort((a, b) => b.date.localeCompare(a.date));
  const setType = (type: InventoryTransactionType) => {
    const next = { ...fresh(), date: form.date, type };
    if (type === "raw_to_wip" && selectedRaw.metres > 0) next.unitCost = String(selectedRaw.value / selectedRaw.metres);
    setForm(next); setMessage("");
  };
  const reset = () => { setForm(fresh()); setEditingId(null); setMessage(""); };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setMessage("");
    try {
      const candidate = validateInventoryTransaction({
        date: form.date, type: form.type, description: form.description, reference: form.reference, notes: form.notes,
        material: form.material, rolls: Number(form.rolls) || 0, metres: Number(form.metres) || 0, unitCost: Number(form.unitCost) || 0,
        quantity: Number(form.quantity) || 0, finishedGood: form.finishedGood, batchRef: form.batchRef, amount,
        settlementCode: ["raw_material_purchase", "inventory_supplier_payment"].includes(form.type) ? form.settlementCode : form.type.includes("opening") ? "3060" : undefined,
        linkedSaleId: form.linkedSaleId,
      }, entries, editingId ?? "");
      const simulated = [...entries.filter(entry => entry.id !== editingId), { ...candidate, id: editingId ?? "new" } as InventoryTransaction];
      const issue = inventoryHistoryIssue(simulated);
      if (issue) throw new Error(issue);
      const saved = Object.fromEntries(Object.entries(candidate).filter(([, value]) => value !== undefined));
      if (editingId) await updateDoc(doc(db, "inventoryTransactions", editingId), { ...saved, updatedAt: Timestamp.now() });
      else await addDoc(collection(db, "inventoryTransactions"), { ...saved, createdAt: Timestamp.now(), createdBy: userId ?? "" });
      const edited = Boolean(editingId); reset(); setMessage(edited ? "Inventory entry updated." : "Inventory entry recorded.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save inventory entry."); }
    finally { savingRef.current = false; setSaving(false); }
  }

  function edit(entry: InventoryTransaction) {
    setEditingId(entry.id);
    setForm({ date: entry.date, type: entry.type, description: entry.description, reference: entry.reference ?? "", notes: entry.notes ?? "", material: entry.material ?? "PUL", rolls: String(entry.rolls || ""), metres: String(entry.metres || ""), unitCost: String(entry.unitCost || (entry.quantity ? entry.amount / entry.quantity : "")), quantity: String(entry.quantity || ""), totalValue: String(entry.amount || ""), finishedGood: entry.finishedGood ?? "", batchRef: entry.batchRef ?? "", settlementCode: entry.settlementCode === "1030" || entry.settlementCode === "2110" ? entry.settlementCode : "1000", linkedSaleId: entry.linkedSaleId ?? "" });
    setMessage("");
  }

  async function remove(entry: InventoryTransaction) {
    const issue = inventoryHistoryIssue(entries.filter(item => item.id !== entry.id));
    if (issue) { setMessage(`Deletion blocked. ${issue}`); return; }
    if (!window.confirm(`Delete “${entry.description}”? This reverses both accounting sides and cannot be undone.`)) return;
    try { await deleteDoc(doc(db, "inventoryTransactions", entry.id)); if (editingId === entry.id) reset(); setMessage("Inventory entry deleted and its posting reversed."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete inventory entry."); }
  }

  const needsMaterial = ["raw_material_purchase", "raw_material_opening", "raw_material_loss", "raw_to_wip"].includes(form.type);
  const needsBatch = ["raw_to_wip", "wip_opening", "wip_to_finished", "wip_wastage"].includes(form.type);
  const needsFinished = ["wip_to_finished", "finished_goods_opening", "finished_goods_sale", "finished_goods_loss"].includes(form.type);
  return <section className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      {[{ label: "Raw Materials", value: position.rawValue }, { label: "Work in Progress", value: position.wipValue }, { label: "Finished Goods", value: position.finishedValue }].map(card => <div key={card.label} className="rounded-xl border bg-white p-4"><span className="text-sm text-gray-500">{card.label}</span><strong className="mt-1 block text-lg">{money(card.value)}</strong></div>)}
    </div>
    {canPost && <form onSubmit={save} className="space-y-4 rounded-xl border bg-white p-5">
      <div className="flex items-center justify-between"><div><h2 className="text-lg font-semibold">{editingId ? "Edit Inventory Entry" : "Add Inventory Entry"}</h2><p className="text-sm text-gray-500">Values are posted automatically to both sides of the accounts. Internal transfers do not affect cash or profit.</p></div>{editingId && <button type="button" className="text-sm text-gray-600 hover:underline" onClick={reset}>Cancel edit</button>}</div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">Date<input required type="date" className={input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        <label className="text-sm md:col-span-2">Transaction Type<select className={input} value={form.type} onChange={e => setType(e.target.value as InventoryTransactionType)}>{INVENTORY_TRANSACTION_TYPES.map(type => <option key={type} value={type}>{inventoryTypeLabel(type)}</option>)}</select></label>
        {needsMaterial && <label className="text-sm">Material<select className={input} value={form.material} onChange={e => { const material = e.target.value as InventoryMaterial; const available = position.rawByMaterial[material]; setForm({ ...form, material, ...(form.type === "raw_to_wip" && available.metres > 0 ? { unitCost: String(available.value / available.metres) } : {}) }); }}>{INVENTORY_MATERIALS.map(material => <option key={material}>{material}</option>)}</select>{form.type === "raw_to_wip" && <span className="mt-1 block text-xs text-gray-500">Available: {selectedRaw.metres.toLocaleString()} m · {money(selectedRaw.value)}</span>}</label>}
        {needsMaterial && <label className="text-sm">Number of Rolls<input type="number" min="0" step="1" className={input} value={form.rolls} onChange={e => setForm({ ...form, rolls: e.target.value })} /></label>}
        {needsMaterial && <label className="text-sm">Total Metres<input required type="number" min="0.0001" step="0.0001" className={input} value={form.metres} onChange={e => setForm({ ...form, metres: e.target.value })} /></label>}
        {needsBatch && <label className="text-sm">Production Batch / Reference<input required maxLength={80} className={input} value={form.batchRef} onChange={e => setForm({ ...form, batchRef: e.target.value })} /></label>}
        {needsFinished && <label className="text-sm">Pad / Finished-Good Type<input required maxLength={80} className={input} value={form.finishedGood} onChange={e => { const finishedGood = e.target.value; const available = position.finishedByProduct[finishedGood.trim()]; setForm({ ...form, finishedGood, ...(["finished_goods_sale", "finished_goods_loss"].includes(form.type) && available?.quantity > 0 ? { unitCost: String(available.value / available.quantity) } : {}) }); }} />{["finished_goods_sale", "finished_goods_loss"].includes(form.type) && <span className="mt-1 block text-xs text-gray-500">Available: {selectedFinished.quantity.toLocaleString()} units · {money(selectedFinished.value)}</span>}</label>}
        {needsFinished && <label className="text-sm">Number of Pads / Units<input required type="number" min="0.0001" step="0.0001" className={input} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>}
        {(needsMaterial || needsFinished) && <label className="text-sm">{needsMaterial ? "Cost per Metre (UGX)" : "Cost per Pad / Unit (UGX)"}<input required type="number" min="0.01" step="0.01" className={input} value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} /></label>}
        {["wip_opening", "wip_wastage", "inventory_supplier_payment"].includes(form.type) && <label className="text-sm">Total Value (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} /></label>}
        {form.type === "raw_material_purchase" && <label className="text-sm">Paid From / Purchased On Credit<select className={input} value={form.settlementCode} onChange={e => setForm({ ...form, settlementCode: e.target.value as typeof form.settlementCode })}><option value="1000">Bank</option><option value="1030">Cash</option><option value="2110">Accounts Payable (credit)</option></select></label>}
        {form.type === "inventory_supplier_payment" && <label className="text-sm">Payment Source<select className={input} value={form.settlementCode} onChange={e => setForm({ ...form, settlementCode: e.target.value as typeof form.settlementCode })}><option value="1000">Bank</option><option value="1030">Cash</option></select></label>}
        <label className="text-sm md:col-span-2">Description<input required maxLength={160} className={input} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What was purchased, transferred, completed, sold, or lost?" /></label>
        <label className="text-sm">Reference<input maxLength={80} className={input} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Invoice, receipt, or batch reference" /></label>
        {form.type === "finished_goods_sale" && <label className="text-sm">Linked Sale (optional)<select className={input} value={form.linkedSaleId} onChange={e => { const linkedSaleId = e.target.value; const sale = sales.find(item => item.id === linkedSaleId); setForm({ ...form, linkedSaleId, ...(sale && !form.description ? { description: `Cost of goods sold — ${sale.customerName || sale.invoiceNumber || sale.id}` } : {}) }); }}><option value="">Not linked / select later</option>{availableSales.map(sale => <option key={sale.id} value={sale.id}>{sale.date} · {sale.invoiceNumber || sale.customerName || sale.id} · {money(Number(sale.totalAmount) || 0)}</option>)}</select></label>}
        <label className="text-sm md:col-span-2">Notes<input maxLength={240} className={input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
      </div>
      <div className="rounded-lg bg-gray-50 p-3 text-sm"><span className="text-gray-500">Calculated inventory value</span><strong className="ml-2">{money(amount)}</strong></div>
      {message && <p role="status" className={message.toLowerCase().includes("blocked") || message.toLowerCase().includes("insufficient") || message.toLowerCase().includes("unable") ? "text-sm text-red-700" : "text-sm text-green-700"}>{message}</p>}
      <button disabled={saving} className="rounded-lg bg-blue-700 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : editingId ? "Update Inventory Entry" : "Record Inventory Entry"}</button>
    </form>}
    {!canPost && <p className="rounded-lg border bg-white p-4 text-sm text-gray-600">Inventory entries are read-only for your role.</p>}
    <div className="overflow-hidden rounded-xl border bg-white"><div className="border-b px-5 py-4"><h2 className="text-lg font-semibold">Inventory Value Ledger</h2><p className="text-sm text-gray-500">Quantity details support control; the calculated UGX value is what posts to the accounts.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-sm"><thead className="bg-gray-50"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Transaction</th><th className="p-3 text-left">Item / Batch</th><th className="p-3 text-right">Quantity</th><th className="p-3 text-right">Value</th><th className="p-3 text-left">Description</th>{canPost && <th className="p-3 text-right">Actions</th>}</tr></thead><tbody>{entries.length === 0 ? <tr><td colSpan={canPost ? 7 : 6} className="p-8 text-center text-gray-500">No structured inventory entries yet. Existing manual account balances remain unchanged.</td></tr> : [...entries].sort((a, b) => b.date.localeCompare(a.date)).map(entry => <tr key={entry.id} className="border-t"><td className="p-3">{entry.date}</td><td className="p-3">{inventoryTypeLabel(entry.type)}</td><td className="p-3">{entry.material || entry.finishedGood || "—"}{entry.batchRef && <span className="block text-xs text-gray-500">Batch: {entry.batchRef}</span>}</td><td className="p-3 text-right">{entry.metres ? `${entry.metres.toLocaleString()} m` : entry.quantity ? entry.quantity.toLocaleString() : "—"}</td><td className="p-3 text-right tabular-nums">{money(entry.amount)}</td><td className="p-3">{entry.description}{entry.reference && <span className="block text-xs text-gray-500">Ref: {entry.reference}</span>}</td>{canPost && <td className="p-3 text-right whitespace-nowrap"><button type="button" onClick={() => edit(entry)} className="mr-3 text-blue-700 hover:underline">Edit</button><button type="button" onClick={() => remove(entry)} className="text-red-700 hover:underline">Delete</button></td>}</tr>)}</tbody></table></div></div>
  </section>;
}
