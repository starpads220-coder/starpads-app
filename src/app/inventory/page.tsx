"use client";

import { useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, doc, Timestamp, updateDoc, writeBatch } from "firebase/firestore";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
import { MATERIAL_CATALOG, materialDefinition, unitLabel } from "@/lib/material-catalog";
import { inventoryHistoryIssue, inventoryPositions, inventoryTypeLabel, validateInventoryTransaction, type InventoryTransaction, type InventoryTransactionType } from "@/lib/inventory-accounting";
import type { Batch } from "@/types";

type Tab = "overview" | "materials" | "batches" | "completed" | "finished" | "adjustments" | "history";
type Action = "receive" | "issue" | "return" | "batch_cost" | "completed" | "waste" | "supplier_payment" | "close_batch";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
const money = (value: number) => `UGX ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const blank = () => ({
  action: "receive" as Action, date: today(), material: "PUL", purchaseUnits: "", stockQuantity: "", unitCost: "",
  supplierName: "", reference: "", warehouseLocation: "Main Store", deliveryCost: "", otherLandedCost: "", settlementCode: "1000",
  batchRef: "", finishedGood: "Reusable Pad", completedQuantity: "", totalValue: "", rejectedQuantity: "", reason: "", notes: "",
  conversionCostCategory: "factory_overhead" as "direct_labor" | "factory_overhead" | "outside_processing",
});

const ACTIONS: { id: Action; label: string; help: string }[] = [
  { id: "receive", label: "Receive Materials", help: "Add purchased materials and their landed cost to stock." },
  { id: "issue", label: "Issue Materials to Batch", help: "Move materials from storage into an active production batch." },
  { id: "return", label: "Return Materials from Batch", help: "Return unused batch materials to storage." },
  { id: "batch_cost", label: "Add Batch Cost", help: "Add approved direct labor, factory overhead, or outside processing to WIP." },
  { id: "completed", label: "Record Completed Pads", help: "Move completed pads from an active batch's WIP into finished goods." },
  { id: "waste", label: "Record Waste / Adjustment", help: "Record damaged, rejected, missing, or written-down inventory." },
  { id: "supplier_payment", label: "Pay Inventory Supplier", help: "Settle a supplier balance without changing inventory." },
  { id: "close_batch", label: "Close Production Batch", help: "Close a fully reconciled batch after its WIP value reaches zero." },
];

export default function ManufacturingInventoryPage() {
  const { userRole } = useAuth();
  const inventory = useRealtimeCollection<InventoryTransaction>("inventoryTransactions");
  const batchesQuery = useRealtimeCollection<Batch>("batches");
  const [tab, setTab] = useState<Tab>("overview");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const canPost = ["ADMIN", "FINANCE", "FINANCIAL_MANAGER", "STORE_MANAGER", "PRODUCTION_SUPERVISOR"].includes(userRole?.role ?? "");
  const position = useMemo(() => inventoryPositions(inventory.data), [inventory.data]);
  const material = materialDefinition(form.material);
  const activeBatches = batchesQuery.data.filter(batch => batch.status !== "COMPLETE");
  const selectedRaw = position.rawByMaterial[form.material] ?? { metres: 0, value: 0 };
  const selectedBatchValue = position.wipByBatch[form.batchRef]?.value ?? 0;
  const stockQuantity = Number(form.stockQuantity) || 0;
  const purchaseCost = stockQuantity * (Number(form.unitCost) || 0);
  const landedCost = purchaseCost + (Number(form.deliveryCost) || 0) + (Number(form.otherLandedCost) || 0);
  const averageUnitCost = selectedRaw.metres > 0 ? selectedRaw.value / selectedRaw.metres : 0;
  const finishedRows = Object.entries(position.finishedByProduct).filter(([, row]) => row.quantity !== 0 || row.value !== 0);
  const payable = inventory.data.reduce((sum, entry) => sum + (entry.type === "raw_material_purchase" && entry.settlementCode === "2110" ? entry.amount : entry.type === "inventory_supplier_payment" ? -entry.amount : 0), 0);

  const reset = (action: Action = "receive") => { setForm({ ...blank(), action }); setMessage(""); };
  const openAction = (action: Action) => { reset(action); setShowForm(true); };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canPost || saving) return;
    setSaving(true); setMessage("");
    try {
      if (form.action === "close_batch") {
        const batch = batchesQuery.data.find(item => item.id === form.batchRef);
        if (!batch) throw new Error("Select the batch to close.");
        if (Math.abs(selectedBatchValue) > 0.01) throw new Error(`This batch still has ${money(selectedBatchValue)} in WIP. Record completed pads, returns, or waste before closing it.`);
        await updateDoc(doc(db, "batches", batch.id), { status: "COMPLETE", completionDate: form.date, closedAt: Timestamp.now(), closedBy: userRole?.uid ?? "" });
        setMessage(`Batch ${batch.batchNumber} closed after reconciliation.`); setShowForm(false); return;
      }

      let type: InventoryTransactionType;
      let amount = 0;
      let quantity = 0;
      let entryStockQuantity = stockQuantity;
      let unitCost = Number(form.unitCost) || 0;
      if (form.action === "receive") { type = "raw_material_purchase"; amount = landedCost; unitCost = stockQuantity > 0 ? purchaseCost / stockQuantity : 0; }
      else if (form.action === "issue") { type = "raw_to_wip"; unitCost = averageUnitCost; amount = stockQuantity * unitCost; }
      else if (form.action === "return") { type = "raw_from_wip"; unitCost = averageUnitCost || (selectedBatchValue / Math.max(stockQuantity, 1)); amount = stockQuantity * unitCost; }
      else if (form.action === "batch_cost") { type = "wip_conversion_cost"; amount = Number(form.totalValue) || 0; entryStockQuantity = 0; }
      else if (form.action === "completed") {
        type = "wip_to_finished"; quantity = Number(form.completedQuantity) || 0;
        const rejected = Number(form.rejectedQuantity) || 0;
        const outputCost = Number(form.totalValue) || selectedBatchValue;
        amount = outputCost * (quantity / Math.max(1, quantity + rejected));
        unitCost = quantity > 0 ? amount / quantity : 0; entryStockQuantity = 0;
      }
      else if (form.action === "waste") {
        type = form.batchRef ? "wip_wastage" : "raw_material_loss";
        amount = form.batchRef ? Number(form.totalValue) || 0 : stockQuantity * averageUnitCost;
        unitCost = form.batchRef ? 0 : averageUnitCost;
      } else { type = "inventory_supplier_payment"; amount = Number(form.totalValue) || 0; entryStockQuantity = 0; }

      const description = form.action === "receive" ? `Received ${material.name} from ${form.supplierName || "supplier"}`
        : form.action === "issue" ? `Issued ${material.name} to production batch`
          : form.action === "return" ? `Returned unused ${material.name} from batch ${form.batchRef}`
            : form.action === "batch_cost" ? `Added ${form.conversionCostCategory.replaceAll("_", " ")} to batch ${form.batchRef}`
            : form.action === "completed" ? `Completed pads from batch ${form.batchRef}`
              : form.action === "waste" ? form.reason || "Inventory waste or adjustment"
                : `Payment to ${form.supplierName || "inventory supplier"}`;
      const candidate = validateInventoryTransaction({
        date: form.date, type, description, reference: form.reference, notes: form.notes, material: form.material,
        rolls: Number(form.purchaseUnits) || 0, purchaseUnits: Number(form.purchaseUnits) || 0, metres: entryStockQuantity, stockQuantity: entryStockQuantity,
        stockUnit: material.stockUnit, purchaseUnit: material.purchaseUnit, unitCost, quantity, finishedGood: form.finishedGood, batchRef: form.batchRef,
        amount, settlementCode: ["receive", "supplier_payment", "batch_cost"].includes(form.action) ? form.settlementCode as "1000" | "1030" | "2110" : undefined,
        supplierName: form.supplierName, warehouseLocation: form.warehouseLocation, deliveryCost: Number(form.deliveryCost) || 0,
        otherLandedCost: Number(form.otherLandedCost) || 0, materialAccountCode: material.accountCode, conversionCostCategory: form.conversionCostCategory,
      }, inventory.data);
      const rejected = form.action === "completed" ? Number(form.rejectedQuantity) || 0 : 0;
      const rejectedAmount = rejected > 0 ? (Number(form.totalValue) || selectedBatchValue) - candidate.amount : 0;
      const rejectedEntry = rejectedAmount > 0 ? validateInventoryTransaction({
        date: form.date, type: "wip_wastage", description: `Rejected pads from batch ${form.batchRef}`, reference: form.reference,
        notes: `${rejected.toLocaleString()} rejected pad(s). ${form.notes}`.trim(), batchRef: form.batchRef, amount: rejectedAmount,
        rolls: 0, metres: 0, quantity: 0, unitCost: 0,
      }, [...inventory.data, { ...candidate, id: "new-completed" }]) : null;
      const simulated = [...inventory.data, { ...candidate, id: "new" }, ...(rejectedEntry ? [{ ...rejectedEntry, id: "new-rejected" }] : [])];
      const issue = inventoryHistoryIssue(simulated);
      if (issue) throw new Error(issue);
      if (rejectedEntry) {
        const atomicWrite = writeBatch(db);
        atomicWrite.set(doc(collection(db, "inventoryTransactions")), { ...candidate, workflowVersion: 2, createdAt: Timestamp.now(), createdBy: userRole?.uid ?? "" });
        atomicWrite.set(doc(collection(db, "inventoryTransactions")), { ...rejectedEntry, workflowVersion: 2, createdAt: Timestamp.now(), createdBy: userRole?.uid ?? "" });
        await atomicWrite.commit();
      } else await addDoc(collection(db, "inventoryTransactions"), { ...candidate, workflowVersion: 2, createdAt: Timestamp.now(), createdBy: userRole?.uid ?? "" });
      setMessage(`${ACTIONS.find(item => item.id === form.action)?.label} recorded successfully.`);
      setShowForm(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record inventory activity."); }
    finally { setSaving(false); }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" }, { id: "materials", label: "Materials" }, { id: "batches", label: "Production Batches" },
    { id: "completed", label: "Completed Pads" }, { id: "finished", label: "Finished Goods" }, { id: "adjustments", label: "Adjustments & Waste" }, { id: "history", label: "History" },
  ];

  return <RouteGuard><main className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-gray-900">Manufacturing Inventory</h1><p className="mt-1 text-sm text-gray-500">Receive materials, track batch costs, record completed pads, and control finished goods from one page.</p></div>
      {canPost && <button onClick={() => setShowForm(value => !value)} className="rounded-lg bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">{showForm ? "Close Form" : "Record Inventory Activity"}</button>}
    </div>

    <div className="flex gap-1 overflow-x-auto rounded-xl border bg-white p-1">{tabs.map(item => <button key={item.id} onClick={() => setTab(item.id)} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${tab === item.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>{item.label}</button>)}</div>
    {message && <p role="status" className={`rounded-lg border p-3 text-sm ${/unable|insufficient|still has|select/i.test(message) ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"}`}>{message}</p>}

    {showForm && <form onSubmit={save} className="space-y-5 rounded-2xl border bg-white p-5 shadow-sm">
      <div><h2 className="text-lg font-semibold">Record Inventory Activity</h2><p className="text-sm text-gray-500">Select what happened. The system calculates quantities, values, and accounting entries automatically.</p></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{ACTIONS.map(action => <button type="button" key={action.id} onClick={() => reset(action.id)} className={`rounded-xl border p-3 text-left ${form.action === action.id ? "border-blue-600 bg-blue-50" : "hover:bg-gray-50"}`}><strong className="block text-sm">{action.label}</strong><span className="mt-1 block text-xs text-gray-500">{action.help}</span></button>)}</div>
      <div className="grid gap-4 md:grid-cols-3">
        <label className="text-sm">Date<input required type="date" className={input} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
        {["receive", "issue", "return"].includes(form.action) && <label className="text-sm">Material<select className={input} value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}>{MATERIAL_CATALOG.map(item => <option key={item.code} value={item.code}>{item.category} — {item.name}</option>)}</select></label>}
        {["issue", "return", "batch_cost", "completed", "waste", "close_batch"].includes(form.action) && <label className="text-sm">Active Batch<select required className={input} value={form.batchRef} onChange={e => setForm({ ...form, batchRef: e.target.value })}><option value="">Select batch...</option>{activeBatches.map(batch => <option key={batch.id} value={batch.id}>{batch.batchNumber}</option>)}</select>{form.batchRef && <span className="mt-1 block text-xs text-gray-500">Financial WIP: {money(selectedBatchValue)}</span>}</label>}
        {form.action === "receive" && <><label className="text-sm">Supplier<input required className={input} value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })} /></label><label className="text-sm">Number of {unitLabel(material.purchaseUnit)}<input type="number" min="0" step="0.0001" className={input} value={form.purchaseUnits} onChange={e => setForm({ ...form, purchaseUnits: e.target.value })} /></label></>}
        {["receive", "issue", "return"].includes(form.action) && <><label className="text-sm">Total {unitLabel(material.stockUnit)}<input required type="number" min="0.0001" step="0.0001" className={input} value={form.stockQuantity} onChange={e => setForm({ ...form, stockQuantity: e.target.value })} />{form.action !== "receive" && <span className="mt-1 block text-xs text-gray-500">Available: {selectedRaw.metres.toLocaleString()} {unitLabel(material.stockUnit, selectedRaw.metres)} · average {money(averageUnitCost)} per {material.stockUnit}</span>}</label>{form.action === "receive" && <label className="text-sm">Purchase cost per {material.stockUnit}<input required type="number" min="0.01" step="0.01" className={input} value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} /></label>}</>}
        {form.action === "receive" && <><label className="text-sm">Delivery cost<input type="number" min="0" step="0.01" className={input} value={form.deliveryCost} onChange={e => setForm({ ...form, deliveryCost: e.target.value })} /></label><label className="text-sm">Other landed cost<input type="number" min="0" step="0.01" className={input} value={form.otherLandedCost} onChange={e => setForm({ ...form, otherLandedCost: e.target.value })} /></label><label className="text-sm">Paid From / Credit<select className={input} value={form.settlementCode} onChange={e => setForm({ ...form, settlementCode: e.target.value })}><option value="1000">Bank</option><option value="1030">Cash</option><option value="2110">Accounts Payable</option></select></label><label className="text-sm">Warehouse<input className={input} value={form.warehouseLocation} onChange={e => setForm({ ...form, warehouseLocation: e.target.value })} /></label></>}
        {form.action === "batch_cost" && <><label className="text-sm">Cost category<select className={input} value={form.conversionCostCategory} onChange={e => setForm({ ...form, conversionCostCategory: e.target.value as typeof form.conversionCostCategory })}><option value="direct_labor">Approved Direct Labor</option><option value="factory_overhead">Factory Overhead</option><option value="outside_processing">Outside Processing</option></select></label><label className="text-sm">Amount<input required type="number" min="0.01" step="0.01" className={input} value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} /></label><label className="text-sm">Paid From / Credit<select className={input} value={form.settlementCode} onChange={e => setForm({ ...form, settlementCode: e.target.value })}><option value="1000">Bank</option><option value="1030">Cash</option><option value="2110">Accounts Payable</option></select></label></>}
        {form.action === "completed" && <><label className="text-sm">Finished Pad / Product Type<input required className={input} value={form.finishedGood} onChange={e => setForm({ ...form, finishedGood: e.target.value })} /></label><label className="text-sm">Completed pads / units<input required type="number" min="1" step="1" className={input} value={form.completedQuantity} onChange={e => setForm({ ...form, completedQuantity: e.target.value })} /></label><label className="text-sm">WIP value represented by this output<input required type="number" min="0.01" step="0.01" className={input} value={form.totalValue || (selectedBatchValue > 0 ? String(selectedBatchValue) : "")} onChange={e => setForm({ ...form, totalValue: e.target.value })} /><span className="mt-1 block text-xs text-gray-500">The system allocates this value between good pads and rejected pads. Any remaining cost stays in WIP.</span></label><label className="text-sm">Rejected pads<input type="number" min="0" step="1" className={input} value={form.rejectedQuantity} onChange={e => setForm({ ...form, rejectedQuantity: e.target.value })} /></label></>}
        {form.action === "waste" && <><label className="text-sm">Material (leave batch selected for WIP waste)<select className={input} value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}>{MATERIAL_CATALOG.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label>{!form.batchRef && <label className="text-sm">Quantity lost<input required type="number" min="0.0001" step="0.0001" className={input} value={form.stockQuantity} onChange={e => setForm({ ...form, stockQuantity: e.target.value })} /></label>}<label className="text-sm">Loss value {form.batchRef ? "" : "(calculated)"}<input required={Boolean(form.batchRef)} readOnly={!form.batchRef} type="number" min="0.01" step="0.01" className={input} value={form.batchRef ? form.totalValue : String(stockQuantity * averageUnitCost || "")} onChange={e => setForm({ ...form, totalValue: e.target.value })} /></label><label className="text-sm md:col-span-2">Reason<input required className={input} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label></>}
        {form.action === "supplier_payment" && <><label className="text-sm">Supplier<input required className={input} value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })} /></label><label className="text-sm">Amount<input required type="number" min="0.01" step="0.01" className={input} value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} /><span className="mt-1 block text-xs text-gray-500">Available inventory payable: {money(payable)}</span></label><label className="text-sm">Payment source<select className={input} value={form.settlementCode} onChange={e => setForm({ ...form, settlementCode: e.target.value })}><option value="1000">Bank</option><option value="1030">Cash</option></select></label></>}
        {form.action !== "close_batch" && <><label className="text-sm">Reference<input className={input} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></label><label className="text-sm md:col-span-2">Notes<input className={input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label></>}
      </div>
      {form.action === "receive" && <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-3"><div><span className="block text-gray-500">Purchase cost</span><strong>{money(purchaseCost)}</strong></div><div><span className="block text-gray-500">Total landed value</span><strong>{money(landedCost)}</strong></div><div><span className="block text-gray-500">Landed cost per {material.stockUnit}</span><strong>{money(stockQuantity > 0 ? landedCost / stockQuantity : 0)}</strong></div></div>}
      <button disabled={saving} className="rounded-lg bg-gray-900 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : ACTIONS.find(item => item.id === form.action)?.label}</button>
    </form>}

    {tab === "overview" && <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
      ["Raw & Packaging Materials", position.rawValue], ["Work in Progress", position.wipValue], ["Finished Goods", position.finishedValue], ["Supplier Payable", payable],
    ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-5"><span className="text-sm text-gray-500">{label}</span><strong className="mt-2 block text-xl">{money(Number(value))}</strong></div>)}</div><div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Active Production Batches</h2><div className="mt-3 space-y-2">{activeBatches.length ? activeBatches.map(batch => <div key={batch.id} className="flex justify-between rounded-lg bg-gray-50 p-3 text-sm"><span>{batch.batchNumber}</span><strong>{money(position.wipByBatch[batch.id]?.value ?? 0)} WIP</strong></div>) : <p className="text-sm text-gray-500">No active batches.</p>}</div></section><section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Quick Actions</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{ACTIONS.slice(0, 6).map(action => <button key={action.id} onClick={() => openAction(action.id)} className="rounded-lg border p-3 text-left text-sm hover:border-blue-400 hover:bg-blue-50">{action.label}</button>)}</div></section></div></div>}
    {tab === "materials" && <DataTable headers={["Material", "Category", "Purchase / Stock Unit", "Available", "Average Cost", "Value", "Status"]} rows={MATERIAL_CATALOG.map(item => { const row = position.rawByMaterial[item.code] ?? { metres: 0, value: 0 }; return [item.name, item.category, `${item.purchaseUnit} / ${item.stockUnit}`, `${row.metres.toLocaleString()} ${unitLabel(item.stockUnit, row.metres)}`, money(row.metres ? row.value / row.metres : 0), money(row.value), row.metres <= item.reorderLevel ? "Low stock" : "In stock"]; })} />}
    {tab === "batches" && <DataTable headers={["Batch", "Status", "Started", "Physical Progress", "Financial WIP", "Action"]} rows={batchesQuery.data.map(batch => [batch.batchNumber, batch.status, batch.startDate, `${(batch.packsProduced ?? 0).toLocaleString()} / ${(batch.maxPacks ?? 0).toLocaleString()} packs`, money(position.wipByBatch[batch.id]?.value ?? 0), batch.status === "COMPLETE" ? "Reconciled" : "Open"])} />}
    {tab === "completed" && <HistoryTable entries={inventory.data.filter(entry => entry.type === "wip_to_finished")} />}
    {tab === "finished" && <DataTable headers={["Pad / Product", "Available Units", "Average Unit Cost", "Inventory Value"]} rows={finishedRows.map(([name, row]) => [name, row.quantity.toLocaleString(), money(row.quantity ? row.value / row.quantity : 0), money(row.value)])} />}
    {tab === "adjustments" && <HistoryTable entries={inventory.data.filter(entry => ["raw_material_loss", "wip_wastage", "finished_goods_loss"].includes(entry.type))} />}
    {tab === "history" && <HistoryTable entries={inventory.data} />}
  </main></RouteGuard>;
}

function DataTable({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  return <div className="overflow-hidden rounded-2xl border bg-white"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead className="bg-gray-50"><tr>{headers.map(header => <th key={header} className="p-3 text-left font-medium text-gray-600">{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-t">{row.map((cell, cellIndex) => <td key={cellIndex} className="p-3">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="p-10 text-center text-gray-500">No records yet.</td></tr>}</tbody></table></div></div>;
}

function HistoryTable({ entries }: { entries: InventoryTransaction[] }) {
  return <DataTable headers={["Date", "Activity", "Material / Product", "Batch", "Quantity", "Value", "Reference"]} rows={[...entries].sort((a, b) => b.date.localeCompare(a.date)).map(entry => [entry.date, inventoryTypeLabel(entry.type), entry.material || entry.finishedGood || "—", entry.batchRef || "—", `${Number(entry.stockQuantity ?? entry.metres ?? entry.quantity ?? 0).toLocaleString()} ${entry.stockUnit ?? (entry.quantity ? "units" : "")}`, money(entry.amount), entry.reference || "—"])} />;
}
