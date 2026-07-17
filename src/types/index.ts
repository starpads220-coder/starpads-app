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

export type StageId = "STG-01" | "STG-02" | "STG-03" | "STG-04" | "STG-05" | "STG-06" | "STG-07" | "STG-08";

export type MaterialType = "FLANNEL" | "FLEECE" | "PUL" | "COMBINED" | "MICROFIBER";

export type MaterialCategory = "SEWING_INNER" | "SEWING_OUTER" | "OVERLOCK";

export type PackSize = "HALF_DOZEN" | "DOZEN" | "CARTON" | "ONE_PACK";

export type PackVariant = "MAX" | "STANDARD" | "";
export type CuttingInputMode = "manual" | "measure";

export type CustomerType = "BULK" | "RETAIL" | "AGENT";
export type CustomerCategory = "B2B" | "B2C";
export type CustomerSubType = "INDIVIDUAL" | "PRIVATE_COMPANY" | "NON_PROFIT" | "RETAILER";

export type PaymentMethod = "CASH" | "MOBILE_MONEY" | "BANK_TRANSFER";

export type ExpenseCategory =
  | "RAW_MATERIALS"
  | "LABOUR"
  | "UTILITIES"
  | "TRANSPORT"
  | "PACKAGING_SUPPLIES"
  | "EQUIPMENT_MAINTENANCE"
  | "MARKETING"
  | "MISCELLANEOUS";

export type BatchStatus = "ACTIVE" | "COMPLETE";
export type PaymentStatus = "due" | "paid";
export type AccountStatus = "active" | "pending";

export interface Employee {
  id: string;
  name: string;
  role: EmployeeRole;
  department: Department;
  dailyWageRate: number;
  startDate: string;
  isActive: boolean;
}

export interface ProductionStage {
  id: string;
  stageId: StageId;
  name: string;
  defaultTarget: number;
  defaultWageRate: number;
  unit: string;
  materialTargets?: Partial<Record<MaterialType, number>>;
}

export interface TargetConfig {
  id: string;
  employeeId: string;
  stageId: StageId;
  dailyTarget: number;
  effectiveDate: string;
}

export interface ProductionEntry {
  id: string;
  employeeId: string;
  date: string;
  stageId: StageId;
  materialType: MaterialType | null;
  materialTypes?: MaterialType[];
  materialCategory?: MaterialCategory | null;
  inputMode?: CuttingInputMode;
  metersInput?: number;
  wastePct?: number;
  targetPieces: number;
  actualPieces: number;
  batchRef: string;
  performancePct: number;
  earningsUgx: number;
  paymentStatus?: PaymentStatus;
  paymentId?: string;
  notes: string;
  createdAt: string;
  createdBy: string;
  movedToStockAt?: string;
}

export interface Batch {
  id: string;
  batchNumber: string;
  startDate: string;
  completionDate: string | null;
  status: BatchStatus;
  maxPacks: number;
  packsProduced: number;
}

export interface Payment {
  id: string;
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  grossAmount: number;
  totalAmount: number;
  nssfEmployeeDeduction: number;
  nssfBusinessContribution: number;
  payeeTax: number;
  netPayAmount: number;
  status: PaymentStatus;
  paidDate: string | null;
  receiptNumber: string | null;
  notes: string;
  createdAt: string;
  createdBy: string;
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
  payeeBracket: PayeeBracket;
}

export interface StockIn {
  id: string;
  date: string;
  batchRef: string;
  packSize: PackSize;
  quantity: number;
  receivedBy: string;
  notes: string;
}

export interface StockOut {
  id: string;
  date: string;
  destination: string;
  customerRef: string;
  batchRef: string;
  packSize: PackSize;
  quantity: number;
  dispatchedBy: string;
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
  notes: string;
  batchRef?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  amountUgx: number;
  paidBy: string;
  receiptRef: string;
}

export interface SalesTarget {
  id: string;
  targetType: "MONTHLY" | "QUARTERLY" | "SIX_MONTHS" | "ANNUAL";
  targetAmount: number;
  periodReference: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

export interface UserRole {
  uid: string;
  email: string;
  role: EmployeeRole;
  employeeId: string | null;
  status: AccountStatus;
  createdAt: string;
}

export const PACK_SIZES: Record<PackSize, number> = {
  HALF_DOZEN: 6,
  DOZEN: 12,
  CARTON: 120,
  ONE_PACK: 3,
};

export const STAGE_LABELS: Record<StageId, string> = {
  "STG-01": "Cutting & Measuring",
  "STG-02": "Sewing Inner [Middle]",
  "STG-03": "Sewing Outer [TopLayer]",
  "STG-04": "Overlocking",
  "STG-05": "Pouch Making",
  "STG-06": "Checking and Holding",
  "STG-07": "Pinning and Folding",
  "STG-08": "Packaging",
};

export const STAGE_ORDER: StageId[] = [
  "STG-01", "STG-02", "STG-03", "STG-04", "STG-05", "STG-06", "STG-07", "STG-08",
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
