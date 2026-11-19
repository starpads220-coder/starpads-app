"use client";

import { useMemo, useState, type FormEvent } from "react";
import { addDoc, collection, doc, Timestamp, writeBatch } from "firebase/firestore";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
import { MATERIAL_CATALOG, materialDefinition, unitLabel } from "@/lib/material-catalog";
import { inventoryHistoryIssue, inventoryPositions, inventoryTypeLabel, validateInventoryTransaction, type InventoryTransaction, type InventoryTransactionType } from "@/lib/inventory-accounting";
import type { Batch, ProductionEntry } from "@/types";

type Tab = "overview" | "materials" | "production" | "completed" | "finished" | "adjustments" | "history";
type Action = "receive" | "issue" | "return" | "production_cost" | "completed" | "waste" | "supplier_payment";
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date());
const money = (value: number) => `UGX ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const input = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";

const blank = () => ({
  action: "receive" as Action, date: today(), material: "PUL", purchaseUnits: "", stockQuantity: "", unitCost: "",
  supplierName: "", reference: "", warehouseLocation: "Main Store", deliveryCost: "", otherLandedCost: "", settlementCode: "1000",
  batchRef: "", productionEntryId: "", packVariant: "STANDARD" as "STANDARD" | "MAX", finishedGood: "Standard Reusable Pad Pack", completedQuantity: "", totalValue: "", rejectedQuantity: "", reason: "", notes: "", wasteArea: "materials" as "materials" | "production",
  conversionCostCategory: "factory_overhead" as "direct_labor" | "factory_overhead" | "outside_processing",
});

const ACTIONS: { id: Action; label: string; help: string }[] = [
  { id: "receive", label: "Receive Materials", help: "Add purchased materials and their landed cost to stock." },
  { id: "issue", label: "Issue Materials to Production", help: "Move materials from the store into production." },
  { id: "return", label: "Return Materials from Production", help: "Return unused production materials to the store." },
  { id: "production_cost", label: "Add Production Cost", help: "Add approved labor, factory overhead, or outside processing to production WIP." },
  { id: "completed", label: "Finished Goods Value", help: "Value an existing STG-10 entry and move it into finished stock once." },
  { id: "waste", label: "Record Waste / Adjustment", help: "Record damaged, rejected, missing, or written-down inventory." },
  { id: "supplier_payment", label: "Pay Inventory Supplier", help: "Settle a supplier balance without changing inventory." },
];

export default function ManufacturingInventoryPage() {
  const { userRole } = useAuth();
  const inventory = useRealtimeCollection<InventoryTransaction>("inventoryTransactions");
  const batchesQuery = useRealtimeCollection<Batch>("batches");
  const productionEntries = useRealtimeCollection<ProductionEntry>("productionEntries");
  const [tab, setTab] = useState<Tab>("overview");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blank);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const canPost = ["ADMIN", "FINANCE", "FINANCIAL_MANAGER", "STORE_MANAGER", "PRODUCTION_SUPERVISOR"].includes(userRole?.role ?? "");
  const position = useMemo(() => inventoryPositions(inventory.data), [inventory.data]);
  const material = materialDefinition(form.material);
  const activeBatch = batchesQuery.data.find(batch => batch.status === "ACTIVE");
  const selectedRaw = position.rawByMaterial[form.material] ?? { metres: 0, value: 0 };
  const productionWipValue = position.wipValue;
  const stockQuantity = Number(form.stockQuantity) || 0;
  const purchaseCost = stockQuantity * (Number(form.unitCost) || 0);
  const landedCost = purchaseCost + (Number(form.deliveryCost) || 0) + (Number(form.otherLandedCost) || 0);
  const averageUnitCost = selectedRaw.metres > 0 ? selectedRaw.value / selectedRaw.metres : 0;
  const finishedRows = Object.entries(position.finishedByProduct).filter(([, row]) => row.quantity !== 0 || row.value !== 0);
  const payable = inventory.data.reduce((sum, entry) => sum + (entry.type === "raw_material_purchase" && entry.settlementCode === "2110" ? entry.amount : entry.type === "inventory_supplier_payment" ? -entry.amount : 0), 0);
  const pendingFinishedEntries = productionEntries.data
    .filter(entry => entry.stageId === "STG-10" && !entry.movedToStockAt)
    .sort((a, b) => b.date.localeCompare(a.date));
  const selectedFinishedEntry = pendingFinishedEntries.find(entry => entry.id === form.productionEntryId);

  const reset = (action: Action = "receive") => {
    const entry = action === "completed" ? pendingFinishedEntries[0] : undefined;
    setForm({ ...blank(), action, productionEntryId: entry?.id ?? "", batchRef: entry?.batchRef ?? "", completedQuantity: entry ? String(entry.actualPieces) : "", unitCost: action === "completed" ? "12000" : "" });
    setMessage("");
  };
  const openAction = (action: Action) => { reset(action); setShowForm(true); };

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!canPost || saving) return;
    setSaving(true); setMessage("");
    try {
      let type: InventoryTransactionType;
      let amount = 0;
      let quantity = 0;
      let entryStockQuantity = stockQuantity;
      let unitCost = Number(form.unitCost) || 0;
      if (form.action === "receive") { type = "raw_material_purchase"; amount = landedCost; unitCost = stockQuantity > 0 ? purchaseCost / stockQuantity : 0; }
      else if (form.action === "issue") { type = "raw_to_wip"; unitCost = averageUnitCost; amount = stockQuantity * unitCost; }
      else if (form.action === "return") { type = "raw_from_wip"; unitCost = averageUnitCost || (productionWipValue / Math.max(stockQuantity, 1)); amount = stockQuantity * unitCost; }
      else if (form.action === "production_cost") { type = "wip_conversion_cost"; amount = Number(form.totalValue) || 0; entryStockQuantity = 0; }
      else if (form.action === "completed") {
        if (!selectedFinishedEntry) throw new Error("Select an STG-10 finished-pack entry that has not yet been moved to stock.");
        type = "wip_to_finished";
        const finishedPacks = selectedFinishedEntry.actualPieces;
        quantity = finishedPacks * 3;
        amount = finishedPacks * (Number(form.unitCost) || 0);
        unitCost = quantity > 0 ? amount / quantity : 0; entryStockQuantity = 0;
      }
      else if (form.action === "waste") {
        type = form.wasteArea === "production" ? "wip_wastage" : "raw_material_loss";
        amount = form.wasteArea === "production" ? Number(form.totalValue) || 0 : stockQuantity * averageUnitCost;
        unitCost = form.wasteArea === "production" ? 0 : averageUnitCost;
      } else { type = "inventory_supplier_payment"; amount = Number(form.totalValue) || 0; entryStockQuantity = 0; }

      const description = form.action === "receive" ? `Received ${material.name} from ${form.supplierName || "supplier"}`
        : form.action === "issue" ? `Issued ${material.name} to production`
          : form.action === "return" ? `Returned unused ${material.name} from production`
            : form.action === "production_cost" ? `Added ${form.conversionCostCategory.replaceAll("_", " ")} to production`
            : form.action === "completed" ? `${form.packVariant === "MAX" ? "Maxi" : "Standard"} finished packs valued from STG-10 entry ${form.productionEntryId}`
              : form.action === "waste" ? form.reason || "Inventory waste or adjustment"
                : `Payment to ${form.supplierName || "inventory supplier"}`;
      const productionReference = ["issue", "return", "production_cost"].includes(form.action)
        || (form.action === "waste" && form.wasteArea === "production");
      const candidate = validateInventoryTransaction({
        date: form.date, type, description, reference: form.reference, notes: form.notes, material: form.material,
        rolls: Number(form.purchaseUnits) || 0, purchaseUnits: Number(form.purchaseUnits) || 0, metres: entryStockQuantity, stockQuantity: entryStockQuantity,
        stockUnit: material.stockUnit, purchaseUnit: material.purchaseUnit, unitCost, quantity, finishedPacks: form.action === "completed" ? selectedFinishedEntry?.actualPieces : undefined, finishedGood: form.action === "completed" ? `${form.packVariant === "MAX" ? "Maxi" : "Standard"} Reusable Pad` : form.finishedGood, batchRef: form.action === "completed" ? selectedFinishedEntry?.batchRef ?? form.batchRef : productionReference ? "PRODUCTION" : "",
        amount, settlementCode: ["receive", "supplier_payment", "production_cost"].includes(form.action) ? form.settlementCode as "1000" | "1030" | "2110" : undefined,
        supplierName: form.supplierName, warehouseLocation: form.warehouseLocation, deliveryCost: Number(form.deliveryCost) || 0,
        otherLandedCost: Number(form.otherLandedCost) || 0, materialAccountCode: material.accountCode, conversionCostCategory: form.conversionCostCategory,
      }, inventory.data);
      const simulated = [...inventory.data, { ...candidate, id: "new" }];
      const issue = inventoryHistoryIssue(simulated);
      if (issue) throw new Error(issue);
      if (form.action === "completed" && selectedFinishedEntry) {
        const atomicWrite = writeBatch(db);
        const inventoryRef = doc(collection(db, "inventoryTransactions"));
        const stockInRef = doc(collection(db, "stockIns"));
        atomicWrite.set(inventoryRef, { ...candidate, productionEntryId: selectedFinishedEntry.id, packVariant: form.packVariant, workflowVersion: 3, createdAt: Timestamp.now(), createdBy: userRole?.uid ?? "" });
        atomicWrite.set(stockInRef, { date: selectedFinishedEntry.date, batchRef: selectedFinishedEntry.batchRef, packSize: "ONE_PACK", packVariant: form.packVariant, quantity: selectedFinishedEntry.actualPieces, receivedBy: selectedFinishedEntry.employeeId, notes: `Automatically moved from STG-10 and valued as ${form.packVariant === "MAX" ? "Maxi" : "Standard"}.`, productionEntryId: selectedFinishedEntry.id, inventoryTransactionId: inventoryRef.id, createdAt: Timestamp.now() });
        atomicWrite.update(doc(db, "productionEntries", selectedFinishedEntry.id), { movedToStockAt: Timestamp.now(), inventoryValuedAt: Timestamp.now(), inventoryTransactionId: inventoryRef.id, stockInId: stockInRef.id, packVariant: form.packVariant, unitInventoryValue: unitCost });
        await atomicWrite.commit();
      } else await addDoc(collection(db, "inventoryTransactions"), { ...candidate, workflowVersion: 2, createdAt: Timestamp.now(), createdBy: userRole?.uid ?? "" });
      setMessage(`${ACTIONS.find(item => item.id === form.action)?.label} recorded successfully.`);
      setShowForm(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to record inventory activity."); }
    finally { setSaving(false); }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" }, { id: "materials", label: "Materials" }, { id: "production", label: "Production Flow" },
    { id: "completed", label: "Finished Goods Value" }, { id: "finished", label: "Finished Goods" }, { id: "adjustments", label: "Adjustments & Waste" }, { id: "history", label: "History" },
  ];

  return <RouteGuard><main className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-gray-900">Manufacturing Inventory</h1><p className="mt-1 text-sm text-gray-500">Track materials from the store, through production, into finished goods from one simple workflow.</p></div>
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
        {form.action === "completed" && <label className="text-sm md:col-span-2">STG-10 finished-pack entry<select required className={input} value={form.productionEntryId} onChange={e => { const entry = pendingFinishedEntries.find(item => item.id === e.target.value); setForm({ ...form, productionEntryId: e.target.value, batchRef: entry?.batchRef ?? "", completedQuantity: entry ? String(entry.actualPieces) : "" }); }}><option value="">Select finished packs...</option>{pendingFinishedEntries.map(entry => <option key={entry.id} value={entry.id}>{entry.date} — {entry.actualPieces.toLocaleString()} packs — {batchesQuery.data.find(batch => batch.id === entry.batchRef)?.batchNumber ?? entry.batchRef}</option>)}</select><span className="mt-1 block text-xs text-gray-500">Only STG-10 entries not yet moved to stock appear here. Current production WIP: {money(productionWipValue)}</span></label>}
        {form.action === "receive" && <><label className="text-sm">Supplier<input required className={input} value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })} /></label><label className="text-sm">Number of {unitLabel(material.purchaseUnit)}<input type="number" min="0" step="0.0001" className={input} value={form.purchaseUnits} onChange={e => setForm({ ...form, purchaseUnits: e.target.value })} /></label></>}
        {["receive", "issue", "return"].includes(form.action) && <><label className="text-sm">Total {unitLabel(material.stockUnit)}<input required type="number" min="0.0001" step="0.0001" className={input} value={form.stockQuantity} onChange={e => setForm({ ...form, stockQuantity: e.target.value })} />{form.action !== "receive" && <span className="mt-1 block text-xs text-gray-500">Available: {selectedRaw.metres.toLocaleString()} {unitLabel(material.stockUnit, selectedRaw.metres)} · average {money(averageUnitCost)} per {material.stockUnit}</span>}</label>{form.action === "receive" && <label className="text-sm">Purchase cost per {material.stockUnit}<input required type="number" min="0.01" step="0.01" className={input} value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} /></label>}</>}
        {form.action === "receive" && <><label className="text-sm">Delivery cost<input type="number" min="0" step="0.01" className={input} value={form.deliveryCost} onChange={e => setForm({ ...form, deliveryCost: e.target.value })} /></label><label className="text-sm">Other landed cost<input type="number" min="0" step="0.01" className={input} value={form.otherLandedCost} onChange={e => setForm({ ...form, otherLandedCost: e.target.value })} /></label><label className="text-sm">Paid From / Credit<select className={input} value={form.settlementCode} onChange={e => setForm({ ...form, settlementCode: e.target.value })}><option value="1000">Bank</option><option value="1030">Cash</option><option value="2110">Accounts Payable</option></select></label><label className="text-sm">Warehouse<input className={input} value={form.warehouseLocation} onChange={e => setForm({ ...form, warehouseLocation: e.target.value })} /></label></>}
        {form.action === "production_cost" && <><label className="text-sm">Cost category<select className={input} value={form.conversionCostCategory} onChange={e => setForm({ ...form, conversionCostCategory: e.target.value as typeof form.conversionCostCategory })}><option value="direct_labor">Approved Direct Labor</option><option value="factory_overhead">Factory Overhead</option><option value="outside_processing">Outside Processing</option></select></label><label className="text-sm">Amount<input required type="number" min="0.01" step="0.01" className={input} value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} /></label><label className="text-sm">Paid From / Credit<select className={input} value={form.settlementCode} onChange={e => setForm({ ...form, settlementCode: e.target.value })}><option value="1000">Bank</option><option value="1030">Cash</option><option value="2110">Accounts Payable</option></select></label></>}
        {form.action === "completed" && <><label className="text-sm">Product type<select required className={input} value={form.packVariant} onChange={e => { const packVariant = e.target.value as typeof form.packVariant; setForm({ ...form, packVariant, unitCost: packVariant === "MAX" ? "13000" : "12000" }); }}><option value="STANDARD">Standard — 3 pads</option><option value="MAX">Maxi — 3 pads</option></select></label><label className="text-sm">Finished packs<input readOnly className={`${input} bg-gray-50`} value={form.completedQuantity} /><span className="mt-1 block text-xs text-gray-500">Automatically taken from STG-10. Total pads: {((Number(form.completedQuantity) || 0) * 3).toLocaleString()}.</span></label><label className="text-sm">Inventory value per pack (UGX)<input required type="number" min="0.01" step="0.01" className={input} value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })} /><span className="mt-1 block text-xs text-gray-500">Suggested Standard: UGX 12,000; Maxi: UGX 13,000. The total cannot exceed available production WIP.</span></label><label className="text-sm">Total finished-goods value<input readOnly className={`${input} bg-gray-50 font-semibold`} value={(Number(form.completedQuantity) || 0) * (Number(form.unitCost) || 0)} /></label></>}
        {form.action === "waste" && <><label className="text-sm">Where did the loss occur?<select className={input} value={form.wasteArea} onChange={e => setForm({ ...form, wasteArea: e.target.value as typeof form.wasteArea })}><option value="materials">Materials in store</option><option value="production">Work in production</option></select></label>{form.wasteArea === "materials" && <><label className="text-sm">Material<select className={input} value={form.material} onChange={e => setForm({ ...form, material: e.target.value })}>{MATERIAL_CATALOG.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}</select></label><label className="text-sm">Quantity lost<input required type="number" min="0.0001" step="0.0001" className={input} value={form.stockQuantity} onChange={e => setForm({ ...form, stockQuantity: e.target.value })} /></label></>}<label className="text-sm">Loss value {form.wasteArea === "materials" ? "(calculated)" : ""}<input required={form.wasteArea === "production"} readOnly={form.wasteArea === "materials"} type="number" min="0.01" step="0.01" className={input} value={form.wasteArea === "production" ? form.totalValue : String(stockQuantity * averageUnitCost || "")} onChange={e => setForm({ ...form, totalValue: e.target.value })} /></label><label className="text-sm md:col-span-2">Reason<input required className={input} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} /></label></>}
        {form.action === "supplier_payment" && <><label className="text-sm">Supplier<input required className={input} value={form.supplierName} onChange={e => setForm({ ...form, supplierName: e.target.value })} /></label><label className="text-sm">Amount<input required type="number" min="0.01" step="0.01" className={input} value={form.totalValue} onChange={e => setForm({ ...form, totalValue: e.target.value })} /><span className="mt-1 block text-xs text-gray-500">Available inventory payable: {money(payable)}</span></label><label className="text-sm">Payment source<select className={input} value={form.settlementCode} onChange={e => setForm({ ...form, settlementCode: e.target.value })}><option value="1000">Bank</option><option value="1030">Cash</option></select></label></>}
        <><label className="text-sm">Reference<input className={input} value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Invoice, requisition, or internal reference" /></label><label className="text-sm md:col-span-2">Notes<input className={input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label></>
      </div>
      {form.action === "receive" && <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-3"><div><span className="block text-gray-500">Purchase cost</span><strong>{money(purchaseCost)}</strong></div><div><span className="block text-gray-500">Total landed value</span><strong>{money(landedCost)}</strong></div><div><span className="block text-gray-500">Landed cost per {material.stockUnit}</span><strong>{money(stockQuantity > 0 ? landedCost / stockQuantity : 0)}</strong></div></div>}
      <StatementImpact action={form.action} wasteArea={form.wasteArea} settlementCode={form.settlementCode} />
      <button disabled={saving} className="rounded-lg bg-gray-900 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : ACTIONS.find(item => item.id === form.action)?.label}</button>
    </form>}

    {tab === "overview" && <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{[
      ["Raw & Packaging Materials", position.rawValue], ["Work in Progress", position.wipValue], ["Finished Goods", position.finishedValue], ["Supplier Payable", payable],
    ].map(([label, value]) => <div key={String(label)} className="rounded-2xl border bg-white p-5"><span className="text-sm text-gray-500">{label}</span><strong className="mt-2 block text-xl">{money(Number(value))}</strong></div>)}</div><div className="grid gap-4 lg:grid-cols-2"><section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Current Finished-Pack Batch</h2>{activeBatch ? <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm"><div className="flex justify-between"><span>{activeBatch.batchNumber}</span><strong>{activeBatch.packsProduced.toLocaleString()} / {activeBatch.maxPacks.toLocaleString()} packs</strong></div><p className="mt-2 text-xs text-gray-500">Batch progress comes only from STG-10. Inventory activities do not change it.</p></div> : <p className="mt-3 text-sm text-gray-500">No active finished-pack batch.</p>}</section><section className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Quick Actions</h2><div className="mt-3 grid gap-2 sm:grid-cols-2">{ACTIONS.slice(0, 6).map(action => <button key={action.id} onClick={() => openAction(action.id)} className="rounded-lg border p-3 text-left text-sm hover:border-blue-400 hover:bg-blue-50">{action.label}</button>)}</div></section></div></div>}
    {tab === "materials" && <DataTable headers={["Material", "Category", "Purchase / Stock Unit", "Available", "Average Cost", "Value", "Status"]} rows={MATERIAL_CATALOG.map(item => { const row = position.rawByMaterial[item.code] ?? { metres: 0, value: 0 }; return [item.name, item.category, `${item.purchaseUnit} / ${item.stockUnit}`, `${row.metres.toLocaleString()} ${unitLabel(item.stockUnit, row.metres)}`, money(row.metres ? row.value / row.metres : 0), money(row.value), row.metres <= item.reorderLevel ? "Low stock" : "In stock"]; })} />}
    {tab === "production" && <div className="space-y-4"><div className="rounded-2xl border bg-white p-5"><span className="text-sm text-gray-500">Current production WIP</span><strong className="mt-2 block text-xl">{money(position.wipValue)}</strong><p className="mt-1 text-sm text-gray-500">Materials issued, returned materials, production costs, finished-product transfers, and production losses all update this single production balance.</p></div><HistoryTable entries={inventory.data.filter(entry => ["raw_to_wip", "raw_from_wip", "wip_conversion_cost", "wip_to_finished", "wip_wastage"].includes(entry.type))} /></div>}
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
  return <DataTable headers={["Date", "Activity", "Material / Product", "Finished Batch", "Quantity", "Value", "Reference"]} rows={[...entries].sort((a, b) => b.date.localeCompare(a.date)).map(entry => [entry.date, inventoryTypeLabel(entry.type), entry.material || entry.finishedGood || "—", entry.type === "wip_to_finished" ? entry.batchRef || "—" : "—", entry.finishedPacks ? `${entry.finishedPacks.toLocaleString()} packs (${Number(entry.quantity || 0).toLocaleString()} pads)` : `${Number(entry.stockQuantity || entry.metres || entry.quantity || 0).toLocaleString()} ${entry.stockUnit ?? (entry.quantity ? "units" : "")}`, money(entry.amount), entry.reference || "—"])} />;
}

function StatementImpact({ action, wasteArea, settlementCode }: { action: Action; wasteArea: "materials" | "production"; settlementCode: string }) {
  const impact = action === "receive"
    ? { balance: "Raw or Packaging Materials increases; Bank/Cash decreases or Accounts Payable increases.", income: "No immediate effect on profit.", cash: settlementCode === "2110" ? "No cash movement until the supplier is paid." : "Operating cash outflow." }
    : action === "issue"
      ? { balance: "Raw or Packaging Materials decreases; Work in Progress increases by the same value.", income: "No effect on profit.", cash: "No cash movement." }
      : action === "return"
        ? { balance: "Work in Progress decreases; Raw or Packaging Materials increases by the same value.", income: "No effect on profit.", cash: "No cash movement." }
        : action === "production_cost"
          ? { balance: "Work in Progress increases; Bank/Cash decreases or Accounts Payable increases.", income: "No immediate effect; the cost remains in inventory until the goods are sold.", cash: settlementCode === "2110" ? "No cash movement until payment." : "Operating cash outflow." }
          : action === "completed"
            ? { balance: "Work in Progress decreases; Finished Goods increases by the same value. Stock-In is created automatically.", income: "No revenue or profit is recognised at production. Profit is recognised when the goods are sold.", cash: "No cash movement." }
            : action === "waste"
              ? { balance: `${wasteArea === "production" ? "Work in Progress" : "Raw or Packaging Materials"} decreases.`, income: "Inventory adjustment expense increases; profit decreases.", cash: "No cash movement." }
              : { balance: "Accounts Payable and Bank/Cash both decrease.", income: "No effect on profit.", cash: "Operating cash outflow." };
  return <section className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-blue-700">Accounting effect</p><div className="mt-3 grid gap-3 text-sm md:grid-cols-3"><div><span className="block font-semibold text-gray-900">Balance Sheet</span><span className="text-gray-600">{impact.balance}</span></div><div><span className="block font-semibold text-gray-900">Income Statement</span><span className="text-gray-600">{impact.income}</span></div><div><span className="block font-semibold text-gray-900">Cash Flow</span><span className="text-gray-600">{impact.cash}</span></div></div></section>;
}
