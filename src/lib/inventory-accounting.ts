import type { Journal } from "@/lib/accounts";

import { MATERIAL_CATALOG, materialDefinition, unitLabel } from "@/lib/material-catalog";

export const INVENTORY_MATERIALS = MATERIAL_CATALOG.map(item => item.code);
export type InventoryMaterial = string;

export const INVENTORY_TRANSACTION_TYPES = [
  "raw_material_purchase",
  "raw_material_opening",
  "raw_material_loss",
  "raw_to_wip",
  "raw_from_wip",
  "wip_conversion_cost",
  "wip_opening",
  "wip_to_finished",
  "wip_wastage",
  "finished_goods_opening",
  "finished_goods_sale",
  "finished_goods_loss",
  "inventory_supplier_payment",
] as const;
export type InventoryTransactionType = (typeof INVENTORY_TRANSACTION_TYPES)[number];

export interface InventoryTransaction {
  id: string;
  date: string;
  type: InventoryTransactionType;
  description: string;
  reference?: string;
  notes?: string;
  material?: InventoryMaterial;
  rolls?: number;
  metres?: number;
  purchaseUnits?: number;
  stockQuantity?: number;
  stockUnit?: string;
  purchaseUnit?: string;
  supplierName?: string;
  warehouseLocation?: string;
  deliveryCost?: number;
  otherLandedCost?: number;
  materialAccountCode?: "1240" | "1270";
  conversionCostCategory?: "direct_labor" | "factory_overhead" | "outside_processing";
  unitCost?: number;
  quantity?: number;
  finishedPacks?: number;
  finishedGood?: string;
  batchRef?: string;
  amount: number;
  settlementCode?: "1000" | "1030" | "2110" | "3060";
  linkedSaleId?: string;
  productionEntryId?: string;
  packVariant?: "STANDARD" | "MAX";
  createdBy?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InventoryPosition {
  rawValue: number;
  wipValue: number;
  finishedValue: number;
  rawByMaterial: Record<InventoryMaterial, { metres: number; value: number }>;
  wipByBatch: Record<string, { value: number; metres: number }>;
  finishedByProduct: Record<string, { quantity: number; value: number }>;
}

const PRODUCTION_WIP_KEY = "PRODUCTION";

const emptyMaterials = (): InventoryPosition["rawByMaterial"] => Object.fromEntries(INVENTORY_MATERIALS.map(material => [material, { metres: 0, value: 0 }]));

export function inventoryPosting(entry: InventoryTransaction): Pick<Journal, "date" | "debitCode" | "creditCode" | "amount" | "description"> | null {
  const amount = Number(entry.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const base = { date: entry.date, amount, description: entry.description };
  switch (entry.type) {
    case "raw_material_purchase": return { ...base, debitCode: entry.materialAccountCode ?? "1240", creditCode: entry.settlementCode === "2110" ? "2110" : entry.settlementCode === "1030" ? "1030" : "1000" };
    case "raw_material_opening": return { ...base, debitCode: entry.materialAccountCode ?? "1240", creditCode: "3060" };
    case "raw_material_loss": return { ...base, debitCode: "5070", creditCode: entry.materialAccountCode ?? "1240" };
    case "raw_to_wip": return { ...base, debitCode: "1250", creditCode: entry.materialAccountCode ?? "1240" };
    case "raw_from_wip": return { ...base, debitCode: entry.materialAccountCode ?? "1240", creditCode: "1250" };
    case "wip_conversion_cost": return { ...base, debitCode: "1250", creditCode: entry.settlementCode === "2110" ? "2110" : entry.settlementCode === "1030" ? "1030" : "1000" };
    case "wip_opening": return { ...base, debitCode: "1250", creditCode: "3060" };
    case "wip_to_finished": return { ...base, debitCode: "1260", creditCode: "1250" };
    case "wip_wastage": return { ...base, debitCode: "5070", creditCode: "1250" };
    case "finished_goods_opening": return { ...base, debitCode: "1260", creditCode: "3060" };
    case "finished_goods_sale": return { ...base, debitCode: "5080", creditCode: "1260" };
    case "finished_goods_loss": return { ...base, debitCode: "5070", creditCode: "1260" };
    case "inventory_supplier_payment": return { ...base, debitCode: "2110", creditCode: entry.settlementCode === "1030" ? "1030" : "1000" };
  }
}

export function inventoryPositions(entries: InventoryTransaction[], throughDate = "9999-12-31", excludedId = ""): InventoryPosition {
  const position: InventoryPosition = { rawValue: 0, wipValue: 0, finishedValue: 0, rawByMaterial: emptyMaterials(), wipByBatch: {}, finishedByProduct: {} };
  [...entries].filter(entry => entry.id !== excludedId && entry.date <= throughDate).sort((a, b) => a.date.localeCompare(b.date)).forEach(entry => {
    const amount = Number(entry.amount) || 0;
    const metres = Number(entry.stockQuantity ?? entry.metres) || 0;
    const quantity = Number(entry.quantity) || 0;
    const material = entry.material;
    // WIP is one production pool. A finished-product batch is only a traceability
    // reference on completion and must not split raw materials or costs by batch.
    const batch = PRODUCTION_WIP_KEY;
    const product = entry.finishedGood?.trim() || "Unspecified finished good";
    if (entry.type === "raw_material_purchase" || entry.type === "raw_material_opening") {
      position.rawValue += amount;
      if (material) { position.rawByMaterial[material] ??= { metres: 0, value: 0 }; position.rawByMaterial[material].metres += metres; position.rawByMaterial[material].value += amount; }
    } else if (entry.type === "raw_material_loss") {
      position.rawValue -= amount;
      if (material) { position.rawByMaterial[material] ??= { metres: 0, value: 0 }; position.rawByMaterial[material].metres -= metres; position.rawByMaterial[material].value -= amount; }
    } else if (entry.type === "raw_to_wip") {
      position.rawValue -= amount; position.wipValue += amount;
      if (material) { position.rawByMaterial[material] ??= { metres: 0, value: 0 }; position.rawByMaterial[material].metres -= metres; position.rawByMaterial[material].value -= amount; }
      position.wipByBatch[batch] ??= { value: 0, metres: 0 };
      position.wipByBatch[batch].value += amount; position.wipByBatch[batch].metres += metres;
    } else if (entry.type === "raw_from_wip") {
      position.rawValue += amount; position.wipValue -= amount;
      if (material) { position.rawByMaterial[material] ??= { metres: 0, value: 0 }; position.rawByMaterial[material].metres += metres; position.rawByMaterial[material].value += amount; }
      position.wipByBatch[batch] ??= { value: 0, metres: 0 };
      position.wipByBatch[batch].value -= amount; position.wipByBatch[batch].metres -= metres;
    } else if (entry.type === "wip_conversion_cost") {
      position.wipValue += amount;
      position.wipByBatch[batch] ??= { value: 0, metres: 0 };
      position.wipByBatch[batch].value += amount;
    } else if (entry.type === "wip_opening") {
      position.wipValue += amount;
      position.wipByBatch[batch] ??= { value: 0, metres: 0 };
      position.wipByBatch[batch].value += amount;
    } else if (entry.type === "wip_to_finished") {
      position.wipValue -= amount; position.finishedValue += amount;
      position.wipByBatch[batch] ??= { value: 0, metres: 0 };
      position.wipByBatch[batch].value -= amount;
      position.finishedByProduct[product] ??= { quantity: 0, value: 0 };
      position.finishedByProduct[product].quantity += quantity; position.finishedByProduct[product].value += amount;
    } else if (entry.type === "wip_wastage") {
      position.wipValue -= amount;
      position.wipByBatch[batch] ??= { value: 0, metres: 0 };
      position.wipByBatch[batch].value -= amount;
    } else if (entry.type === "finished_goods_opening") {
      position.finishedValue += amount;
      position.finishedByProduct[product] ??= { quantity: 0, value: 0 };
      position.finishedByProduct[product].quantity += quantity; position.finishedByProduct[product].value += amount;
    } else if (entry.type === "finished_goods_sale" || entry.type === "finished_goods_loss") {
      position.finishedValue -= amount;
      position.finishedByProduct[product] ??= { quantity: 0, value: 0 };
      position.finishedByProduct[product].quantity -= quantity; position.finishedByProduct[product].value -= amount;
    }
  });
  return position;
}

export function inventoryTypeLabel(type: InventoryTransactionType) {
  return ({
    raw_material_purchase: "Purchase raw materials",
    raw_material_opening: "Opening raw-material balance",
    raw_material_loss: "Record raw-material loss/write-down",
    raw_to_wip: "Issue materials to production",
    raw_from_wip: "Return materials from production",
    wip_conversion_cost: "Add production cost",
    wip_opening: "Opening production WIP balance",
    wip_to_finished: "Record finished products",
    wip_wastage: "Record production waste/loss",
    finished_goods_opening: "Opening finished-goods balance",
    finished_goods_sale: "Recognise cost of finished goods sold",
    finished_goods_loss: "Record finished-goods loss/write-down",
    inventory_supplier_payment: "Pay inventory supplier",
  } satisfies Record<InventoryTransactionType, string>)[type];
}

export function inventoryHistoryIssue(entries: InventoryTransaction[]) {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  let inventoryPayable = 0;
  for (let index = 0; index < sorted.length; index++) {
    if (sorted[index].type === "raw_material_purchase" && sorted[index].settlementCode === "2110") inventoryPayable += Number(sorted[index].amount) || 0;
    if (sorted[index].type === "inventory_supplier_payment") inventoryPayable -= Number(sorted[index].amount) || 0;
    if (inventoryPayable < -0.01) return `Inventory Accounts Payable would become negative after ${sorted[index].date}.`;
    const position = inventoryPositions(sorted.slice(0, index + 1), sorted[index].date);
    if (position.rawValue < -0.01) return `Raw Materials would become negative after ${sorted[index].date}.`;
    if (position.wipValue < -0.01) return `Work in Progress would become negative after ${sorted[index].date}.`;
    if (position.finishedValue < -0.01) return `Finished Goods would become negative after ${sorted[index].date}.`;
    for (const [material, balance] of Object.entries(position.rawByMaterial)) if (balance.metres < -0.0001 || balance.value < -0.01) return `${material} inventory would become negative after ${sorted[index].date}.`;
  for (const balance of Object.values(position.wipByBatch)) if (balance.value < -0.01) return `Production WIP would become negative after ${sorted[index].date}.`;
    for (const [product, balance] of Object.entries(position.finishedByProduct)) if (balance.quantity < -0.0001 || balance.value < -0.01) return `${product} finished-goods inventory would become negative after ${sorted[index].date}.`;
  }
  return "";
}

export function validateInventoryTransaction(entry: Omit<InventoryTransaction, "id">, existing: InventoryTransaction[], excludedId = "") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || !entry.description.trim()) throw new Error("Enter a valid date and description.");
  if (!INVENTORY_TRANSACTION_TYPES.includes(entry.type)) throw new Error("Select a valid inventory transaction type.");
  const amount = Number(entry.amount), metres = Number(entry.stockQuantity ?? entry.metres) || 0, quantity = Number(entry.quantity) || 0, rolls = Number(entry.purchaseUnits ?? entry.rolls) || 0;
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("The inventory value must be greater than zero.");
  const materialEntry = ["raw_material_purchase", "raw_material_opening", "raw_material_loss", "raw_to_wip", "raw_from_wip"].includes(entry.type);
  if (materialEntry && (!entry.material || metres <= 0 || rolls < 0)) throw new Error("Select the material and enter a stock quantity greater than zero. Purchase units cannot be negative.");
  if (["raw_material_purchase", "raw_material_opening", "raw_material_loss", "raw_to_wip", "raw_from_wip"].includes(entry.type) && (!Number.isFinite(Number(entry.unitCost)) || Number(entry.unitCost) <= 0)) throw new Error("Enter a unit cost greater than zero.");
  if (entry.type === "raw_material_purchase" && !["1000", "1030", "2110"].includes(entry.settlementCode ?? "")) throw new Error("Select Bank, Cash, or Accounts Payable for the purchase.");
  if (entry.type === "inventory_supplier_payment" && !["1000", "1030"].includes(entry.settlementCode ?? "")) throw new Error("Select Bank or Cash for the supplier payment.");
  if (entry.type === "wip_to_finished" && !entry.batchRef?.trim()) throw new Error("Select the finished-product batch.");
  if (entry.type === "wip_conversion_cost" && !["1000", "1030", "2110"].includes(entry.settlementCode ?? "")) throw new Error("Select Bank, Cash, or Accounts Payable for the production cost.");
  if (["wip_to_finished", "finished_goods_opening", "finished_goods_sale", "finished_goods_loss"].includes(entry.type) && (!entry.finishedGood?.trim() || quantity <= 0)) throw new Error("Enter the finished-good/pad type and a quantity greater than zero.");
  const expected = metres > 0 && Number(entry.unitCost) > 0
    ? metres * Number(entry.unitCost) + (entry.type === "raw_material_purchase" ? (Number(entry.deliveryCost) || 0) + (Number(entry.otherLandedCost) || 0) : 0)
    : amount;
  if (["raw_material_purchase", "raw_material_opening", "raw_material_loss", "raw_to_wip", "raw_from_wip"].includes(entry.type) && Math.abs(expected - amount) > 0.01) throw new Error("The total value must equal stock quantity multiplied by unit cost plus applicable landed costs.");
  const position = inventoryPositions(existing, entry.date, excludedId);
  if (["raw_material_loss", "raw_to_wip"].includes(entry.type) && entry.material) {
    const available = position.rawByMaterial[entry.material];
    const definition = materialDefinition(entry.material);
    if (metres > available.metres + 0.0001 || amount > available.value + 0.01) throw new Error(`Insufficient ${definition.name} inventory. Available: ${available.metres.toLocaleString()} ${unitLabel(definition.stockUnit, available.metres)} valued at UGX ${available.value.toLocaleString()}.`);
  }
  if (["wip_to_finished", "wip_wastage"].includes(entry.type)) {
    const available = position.wipValue;
    if (amount > available + 0.01) throw new Error(`Insufficient production WIP value. Available: UGX ${available.toLocaleString()}.`);
  }
  if (entry.type === "raw_from_wip") {
    const available = position.wipValue;
    if (amount > available + 0.01) throw new Error(`The returned material value exceeds production WIP. Available: UGX ${available.toLocaleString()}.`);
  }
  if (["finished_goods_sale", "finished_goods_loss"].includes(entry.type)) {
    const available = position.finishedByProduct[entry.finishedGood?.trim() || ""] ?? { quantity: 0, value: 0 };
    if (quantity > available.quantity + 0.0001 || amount > available.value + 0.01) throw new Error(`Insufficient finished goods. Available: ${available.quantity.toLocaleString()} units valued at UGX ${available.value.toLocaleString()}.`);
  }
  if (entry.type === "inventory_supplier_payment") {
    const payable = existing.filter(item => item.id !== excludedId && item.date <= entry.date).reduce((sum, item) => sum + (item.type === "raw_material_purchase" && item.settlementCode === "2110" ? Number(item.amount) || 0 : item.type === "inventory_supplier_payment" ? -(Number(item.amount) || 0) : 0), 0);
    if (amount > payable + 0.01) throw new Error(`Supplier payment exceeds inventory Accounts Payable. Available payable: UGX ${payable.toLocaleString()}.`);
  }
  if (entry.type === "finished_goods_sale" && entry.linkedSaleId && existing.some(item => item.id !== excludedId && item.type === "finished_goods_sale" && item.linkedSaleId === entry.linkedSaleId)) throw new Error("This sale is already linked to a finished-goods cost entry.");
  return { ...entry, amount, metres, stockQuantity: metres, quantity, rolls, purchaseUnits: rolls, unitCost: Number(entry.unitCost) || (quantity > 0 ? amount / quantity : 0), description: entry.description.trim(), reference: entry.reference?.trim() ?? "", notes: entry.notes?.trim() ?? "", batchRef: entry.batchRef?.trim() ?? "", finishedGood: entry.finishedGood?.trim() ?? "", linkedSaleId: entry.linkedSaleId?.trim() ?? "" };
}
