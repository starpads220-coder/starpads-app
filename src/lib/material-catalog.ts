export type StockUnit = "metre" | "kilogram" | "piece" | "litre";
export type PurchaseUnit = "roll" | "bag" | "bale" | "box" | "pack" | "cone" | "bundle" | "piece" | "kilogram" | "litre";

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
  { code: "PUL", name: "PUL", category: "Fabric", stockUnit: "metre", purchaseUnit: "roll", accountCode: "1240", reorderLevel: 100 },
  { code: "FLANNEL", name: "Flannel", category: "Fabric", stockUnit: "metre", purchaseUnit: "roll", accountCode: "1240", reorderLevel: 100 },
  { code: "FLEECE", name: "Fleece", category: "Fabric", stockUnit: "metre", purchaseUnit: "roll", accountCode: "1240", reorderLevel: 100 },
  { code: "MICROFIBER", name: "Microfiber", category: "Fabric", stockUnit: "metre", purchaseUnit: "roll", accountCode: "1240", reorderLevel: 100 },
  { code: "NON_WOVEN", name: "Non-woven Fabric", category: "Fabric", stockUnit: "metre", purchaseUnit: "roll", accountCode: "1240", reorderLevel: 100 },
  { code: "PULP", name: "Absorbent Pulp", category: "Absorbent", stockUnit: "kilogram", purchaseUnit: "bale", accountCode: "1240", reorderLevel: 25 },
  { code: "SAP", name: "Super Absorbent Polymer (SAP)", category: "Absorbent", stockUnit: "kilogram", purchaseUnit: "bag", accountCode: "1240", reorderLevel: 20 },
  { code: "ABSORBENT_CORE", name: "Absorbent Core Sheet", category: "Absorbent", stockUnit: "piece", purchaseUnit: "pack", accountCode: "1240", reorderLevel: 500 },
  { code: "SNAPS", name: "Snaps / Fasteners", category: "Fastening", stockUnit: "piece", purchaseUnit: "box", accountCode: "1240", reorderLevel: 500 },
  { code: "ADHESIVE", name: "Production Adhesive", category: "Fastening", stockUnit: "kilogram", purchaseUnit: "bag", accountCode: "1240", reorderLevel: 5 },
  { code: "THREAD", name: "Sewing Thread", category: "Sewing", stockUnit: "piece", purchaseUnit: "cone", accountCode: "1240", reorderLevel: 20 },
  { code: "ELASTIC", name: "Elastic / Binding Tape", category: "Sewing", stockUnit: "metre", purchaseUnit: "roll", accountCode: "1240", reorderLevel: 50 },
  { code: "POUCH", name: "Product Pouch", category: "Packaging", stockUnit: "piece", purchaseUnit: "pack", accountCode: "1270", reorderLevel: 200 },
  { code: "LABEL", name: "Product Label", category: "Packaging", stockUnit: "piece", purchaseUnit: "pack", accountCode: "1270", reorderLevel: 500 },
  { code: "POLYBAG", name: "Packaging Polybag", category: "Packaging", stockUnit: "piece", purchaseUnit: "pack", accountCode: "1270", reorderLevel: 200 },
  { code: "CARTON", name: "Shipping Carton", category: "Packaging", stockUnit: "piece", purchaseUnit: "bundle", accountCode: "1270", reorderLevel: 25 },
];

export const materialDefinition = (code?: string) => MATERIAL_CATALOG.find(item => item.code === code) ?? MATERIAL_CATALOG[0];
export const unitLabel = (unit?: string, quantity = 2) => `${unit ?? "unit"}${quantity === 1 ? "" : "s"}`;
