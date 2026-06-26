export type EmployeeRole =
  | "ADMIN"
  | "PRODUCTION_SUPERVISOR"
  | "WORKER"
  | "STORE_MANAGER"
  | "SALES_STAFF"
  | "FINANCE";

export type Department = "PRODUCTION" | "STORAGE" | "SALES";

export type StageId = "STG-01" | "STG-02" | "STG-03" | "STG-04" | "STG-05" | "STG-06" | "STG-07";

export type MaterialType = "FLANNEL" | "FLEECE" | "PUL" | "COMBINED";

export type PackSize = "HALF_DOZEN" | "DOZEN" | "CARTON";

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
};

export const STAGE_LABELS: Record<StageId, string> = {
  "STG-01": "Cutting",
  "STG-02": "Sewing Inner [Middle]",
  "STG-03": "Sewing Outer [TopLayer]",
  "STG-04": "Overlocking",
  "STG-05": "Pouch Making",
  "STG-06": "Checking & Pinning",
  "STG-07": "Packaging",
};

export const STAGE_ORDER: StageId[] = [
  "STG-01", "STG-02", "STG-03", "STG-04", "STG-05", "STG-06", "STG-07",
];
