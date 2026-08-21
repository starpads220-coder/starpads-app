export type EmployeeRole =
  | "ADMIN"
  | "PRODUCTION_SUPERVISOR"
  | "WORKER"
  | "STORE_MANAGER"
  | "SALES_STAFF"
  | "FINANCE"
  | "FINANCIAL_MANAGER"
  | "SALES_MANAGER";

export type Department = "PRODUCTION" | "STORAGE" | "SALES";

export type MaterialCategory = "SEWING_INNER" | "SEWING_OUTER" | "OVERLOCK";

export type MaterialType =
  | "FLEECE"
  | "FLANNEL"
  | "PUL"
  | "MICROFIBER"
  | "COMBINED";

export type StageId = "STG-01" | "STG-02" | "STG-03" | "STG-04" | "STG-05" | "STG-06" | "STG-07" | "STG-08" | "STG-09" | "STG-10";

export const STAGE_LABELS: Record<StageId, string> = {
  "STG-01": "Cutting & Measuring",
  "STG-02": "Sewing Inner [Middle]",
  "STG-03": "Sewing Outer [TopLayer]",
  "STG-04": "Overlocking",
  "STG-05": "Pouch Cutting",
  "STG-06": "Pouch Making",
  "STG-07": "Checking",
  "STG-08": "Holling",
  "STG-09": "Pinning and Folding",
  "STG-10": "Packaging",
};

export const STAGE_ORDER: StageId[] = [
  "STG-01", "STG-02", "STG-03", "STG-04", "STG-05", "STG-06", "STG-07", "STG-08", "STG-09", "STG-10"
];

export const MATERIAL_CATEGORY_OPTIONS: Record<MaterialCategory, MaterialType[]> = {
  SEWING_INNER: ["MICROFIBER", "FLANNEL"],
  SEWING_OUTER: ["MICROFIBER", "FLANNEL", "PUL"],
  OVERLOCK: ["COMBINED"],
};

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  SEWING_INNER: "Sewing-Inner",
  SEWING_OUTER: "Sewing-Outer",
  OVERLOCK: "Overlock",
};

export const CUTTING_MATERIALS: MaterialType[] = ["FLEECE", "FLANNEL", "PUL"];

export const CUTTING_LABELS: Record<MaterialType, string> = {
  FLEECE: "Fleece (Microfiber)",
  FLANNEL: "Flannel",
  PUL: "PUL",
  MICROFIBER: "Microfiber",
  COMBINED: "Combined",
};

export const CUTTING_RATIOS: Record<string, number> = {
  FLEECE: 56,
  FLANNEL: 15,
  PUL: 15,
};

export const ROLL_LENGTHS: Record<string, number> = {
  FLEECE: 84,
  FLANNEL: 88,
  PUL: 86,
};

export type PackSize = "HALF_DOZEN" | "DOZEN" | "CARTON" | "ONE_PACK";

export const PACK_SIZES: Record<PackSize, number> = {
  HALF_DOZEN: 6,
  DOZEN: 12,
  CARTON: 120,
  ONE_PACK: 1,
};

export type CustomerCategory = "B2B" | "B2C";

export type CustomerType = "RETAIL" | "BULK" | "AGENT";

export type CustomerSubType =
  | "INDIVIDUAL"
  | "PRIVATE_COMPANY"
  | "NON_PROFIT"
  | "RETAILER";

export type PackVariant = "" | "MAX" | "STANDARD";

export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER";

// ─── Firestore document types ────────────────────────────────────────────────

export interface ProductionEntry {
  id: string;
  employeeId: string;
  date: string;
  stageId: StageId;
  actualPieces: number;
  targetPieces: number;
  earningsUgx: number;
  performancePct: number;
  batchRef: string;
  materialType?: MaterialType;
  materialCategory?: MaterialCategory;
  materialTypes?: MaterialType[];
  metersInput?: number;
  wastePct?: number;
  inputMode?: "manual" | "measure";
  notes?: string;
  paymentStatus?: "due" | "paid";
  paymentId?: string;
  movedToStockAt?: import("firebase/firestore").Timestamp | null;
}

export interface StockIn {
  id: string;
  date: string;
  batchRef: string;
  packSize: PackSize;
  quantity: number;
  receivedBy: string;
  notes?: string;
}

export interface StockOut {
  id: string;
  date: string;
  batchRef: string;
  packSize: PackSize;
  quantity: number;
  destination: string;
  customerRef?: string;
  dispatchedBy: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  startDate: string;
  completionDate?: string;
  status: "ACTIVE" | "INACTIVE" | "COMPLETE";
  maxPacks: number;
  packsProduced: number;
  notes?: string;
}

export interface SaleTransaction {
  id: string;
  date: string;
  customerName: string;
  customerType: CustomerType;
  customerCategory?: CustomerCategory;
  customerSubType?: CustomerSubType;
  packSize: PackSize;
  packVariant?: PackVariant;
  quantitySold: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  salespersonId: string;
  batchRef: string;
  notes?: string;
}

export type ExpenseCategory =
  | "RAW_MATERIALS"
  | "LABOUR"
  | "UTILITIES"
  | "TRANSPORT"
  | "PACKAGING_SUPPLIES"
  | "EQUIPMENT_MAINTENANCE"
  | "MARKETING"
  | "CONTRIBUTIONS"
  | "CUSTOM"
  | "MISCELLANEOUS";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  subcategory?: string;
  unitCost?: number;
  itemCount?: number;
  labourTotalPayments?: number;
  description: string;
  amountUgx: number;
  paidBy: string;
  notes?: string;
}

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  department?: Department;
  phone?: string;
  email?: string;
  startDate?: string;
  active?: boolean;
  isActive?: boolean;
}

export interface ProductionStage {
  id: string;
  name: string;
  isActive: boolean;
  stageId: StageId;
  materialTargets?: Record<MaterialType, number>;
  defaultTarget: number;
  defaultWageRate: number;
}
export interface Payment {
  id: string;
  employeeId: string;
  paidDate: string;
  amountUgx: number;
  periodStart?: string;
  periodEnd?: string;
  method?: string;
  notes?: string;
  grossAmount?: number;
  nssfEmployeeDeduction?: number;
  nssfBusinessContribution?: number;
  payeeTax?: number;
  netPayAmount?: number;
  totalAmount?: number;
  receiptNumber?: string;
  status?: "due" | "paid";
}

export interface TargetConfig {
  employeeId: string;
  stageId: StageId;
  effectiveDate: string;
  dailyTarget: number;
  overrideTarget: number;
}

export interface SalesTarget {
  id: string;
  targetType: "MONTHLY" | "QUARTERLY" | "SIX_MONTHS" | "ANNUAL";
  periodReference: string;
  targetAmount: number;
  description: string;
}

export interface PayeeBracket {
  label: string;
  rate: number;
  tax: number;
}

export interface DeductionBreakdown {
  grossAmount: number;
  nssfEmployeeDeduction: number;
  nssfBusinessContribution: number;
  payeeTax: number;
  netPayAmount: number;
  payeeBracket?: PayeeBracket;
}
