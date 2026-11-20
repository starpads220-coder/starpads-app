export type StockUnit = "metre" | "kilogram" | "piece" | "litre" | "pack" | "box" | "bundle";
export type PurchaseUnit = "roll" | "bag" | "bale" | "box" | "pack" | "cone" | "bundle" | "piece" | "metre" | "kilogram" | "litre";

export interface MaterialDefinition {
  code: string;
  name: string;
  category: "Fabric" | "Absorbent" | "Fastening" | "Sewing" | "Packaging" | "Other";
  stockUnit: StockUnit;
  purchaseUnit: PurchaseUnit;
  accountCode: "1240" | "1270";
  reorderLevel: number;
}

export const MATERIAL_CATALOG: MaterialDefinition[] = [
  { code: "PUL", name: "PUL", category: "Fabric", stockUnit: "metre", purchaseUnit: "metre", accountCode: "1240", reorderLevel: 100 },
  { code: "FLEECE", name: "Fleece (Microfiber)", category: "Fabric", stockUnit: "metre", purchaseUnit: "metre", accountCode: "1240", reorderLevel: 100 },
  { code: "FLANNEL", name: "Flannel", category: "Fabric", stockUnit: "metre", purchaseUnit: "metre", accountCode: "1240", reorderLevel: 100 },
  { code: "SNAPS", name: "Snap Buttons", category: "Fastening", stockUnit: "pack", purchaseUnit: "pack", accountCode: "1240", reorderLevel: 20 },
  { code: "THREAD", name: "Threads", category: "Sewing", stockUnit: "box", purchaseUnit: "box", accountCode: "1240", reorderLevel: 5 },
  { code: "PACKAGING_PAPER", name: "Packaging Paper", category: "Packaging", stockUnit: "bundle", purchaseUnit: "bundle", accountCode: "1270", reorderLevel: 10 },
  { code: "POLYBAG", name: "Packaging Polythene", category: "Packaging", stockUnit: "bundle", purchaseUnit: "bundle", accountCode: "1270", reorderLevel: 10 },
];

export const materialDefinition = (code?: string) => MATERIAL_CATALOG.find(item => item.code === code) ?? MATERIAL_CATALOG[0];
export const unitLabel = (unit?: string, quantity = 2) => `${unit ?? "unit"}${quantity === 1 ? "" : "s"}`;
