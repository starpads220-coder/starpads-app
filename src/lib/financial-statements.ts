import { ACCOUNTS, SETTLEMENT_CODES, isRawMaterialCarriageExpense, resolveAccounting, type Journal, type LedgerSource, type ProductionCostEntry, type buildAccounts } from "@/lib/accounts";

type AccountsReport = ReturnType<typeof buildAccounts>;
export interface ConfirmedLaborPayment { id: string; paidDate: string; status?: string; grossAmount?: number; totalAmount?: number; amountUgx?: number }

export interface FinancialStatements {
  revenue: number;
  salesOfPads: number;
  otherIncome: number;
  salesOfMaterials: number;
  trainings: number;
  grantsAndDonations: number;
  customIncome: Array<{ name: string; amount: number }>;
  costOfProduction: number;
  purchasesOfRawMaterials: number;
  carriageInwards: number;
  directLabor: number;
  otherProductionCosts: number;
  grossProfit: number;
  operatingExpenses: number;
  netIncome: number;
  cashInflows: number;
  cashOutflows: number;
  cashAdjustments: number;
  nonCashAdjustments: number;
  workingCapitalAdjustments: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  otherCashFlow: number;
  netCashFlow: number;
  beginningCashBalance: number;
  endingCashBalance: number;
  assets: number;
  liabilities: number;
  equity: number;
  retainedEarnings: number;
  balanceDifference: number;
}

const saleAmount = (entry: LedgerSource) => Number(entry.totalAmount) || 0;
const expenseAmount = (entry: LedgerSource) => Number(entry.amountUgx) || 0;

export function buildFinancialStatements(
  sales: LedgerSource[],
  expenses: LedgerSource[],
  journals: Journal[],
  report: AccountsReport,
  start: string,
  end: string,
  payments: ConfirmedLaborPayment[] = [],
  productionCosts: ProductionCostEntry[] = [],
): FinancialStatements {
  const periodSales = sales.filter(entry => entry.date >= start && entry.date <= end && resolveAccounting(entry, "sale"));
  const periodExpenses = expenses.filter(entry => entry.date >= start && entry.date <= end && resolveAccounting(entry, "expense"));
  const revenue = periodSales.reduce((sum, entry) => sum + saleAmount(entry), 0);
  let salesOfPads = 0;
  let salesOfMaterials = 0;
  let trainings = 0;
  let grantsAndDonations = 0;
  const customTotals = new Map<string, { name: string; amount: number }>();
  for (const entry of periodSales) {
    const account = resolveAccounting(entry, "sale")!;
    const amount = saleAmount(entry);
    const code = account.accountCode;
    if (code.startsWith("custom:")) {
      const name = account.accountName.trim() || "Other custom income";
      const key = name.toLocaleLowerCase();
      const previous = customTotals.get(key);
      customTotals.set(key, { name: previous?.name ?? name, amount: (previous?.amount ?? 0) + amount });
    } else if (code === "4081" || account.accountName === "Sale of Material") salesOfMaterials += amount;
    else if (code === "4082" || ["Pad Trainings", "Trainings"].includes(account.accountName)) trainings += amount;
    else if (code === "4083" || account.accountName === "Grants and Donations") grantsAndDonations += amount;
    else if (code === "4080" || account.accountName === "Sale of Pads") salesOfPads += amount;
    else {
      const name = account.accountName.trim() || "Other income";
      const key = name.toLocaleLowerCase();
      const previous = customTotals.get(key);
      customTotals.set(key, { name: previous?.name ?? name, amount: (previous?.amount ?? 0) + amount });
    }
  }
  const customIncome = [...customTotals.values()].sort((a, b) => a.name.localeCompare(b.name));
  const otherIncome = revenue - salesOfPads;
  const purchasesOfRawMaterials = periodExpenses.filter(entry => resolveAccounting(entry, "expense")?.accountCode === "5080").reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const carriageInwards = periodExpenses.filter(isRawMaterialCarriageExpense).reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const directLabor = payments.filter(entry => entry.status === "paid" && entry.paidDate >= start && entry.paidDate <= end).reduce((sum, entry) => sum + (Number(entry.grossAmount ?? entry.totalAmount ?? entry.amountUgx) || 0), 0);
  const recordedOtherCosts = productionCosts.filter(entry => entry.date >= start && entry.date <= end).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const legacyOtherCosts = periodExpenses.filter(entry => ["5070", "5100"].includes(resolveAccounting(entry, "expense")?.accountCode ?? "")).reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const otherProductionCosts = recordedOtherCosts + legacyOtherCosts;
  const costOfProduction = purchasesOfRawMaterials + carriageInwards + directLabor + otherProductionCosts;
  const operatingExpenses = periodExpenses.filter(entry => resolveAccounting(entry, "expense")?.accountGroup !== "Cost of Sales" && !isRawMaterialCarriageExpense(entry)).reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const grossProfit = revenue - costOfProduction;
  const netIncome = grossProfit - operatingExpenses;

  const cashInflows = revenue;
  const cashOutflows = periodExpenses.reduce((sum, entry) => sum + expenseAmount(entry), 0) + recordedOtherCosts;
  const cashAdjustments = journals.filter(entry => entry.date >= start && entry.date <= end).reduce((sum, entry) => {
    const debitCash = SETTLEMENT_CODES.includes(entry.debitCode) ? entry.amount : 0;
    const creditCash = SETTLEMENT_CODES.includes(entry.creditCode) ? entry.amount : 0;
    return sum + debitCash - creditCash;
  }, 0);
  const nonCashAdjustments = periodExpenses.filter(entry => resolveAccounting(entry, "expense")?.accountCode === "6200").reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const nonCashCurrentAssetMovement = report.rows.filter(row => row.group === "Current Assets" && !SETTLEMENT_CODES.includes(row.code)).reduce((sum, row) => sum + row.movement, 0);
  const currentLiabilityMovement = report.rows.filter(row => row.group === "Current Liabilities").reduce((sum, row) => sum + row.movement, 0);
  const workingCapitalAdjustments = -nonCashCurrentAssetMovement + currentLiabilityMovement;
  const operatingCashFlow = netIncome + nonCashAdjustments + workingCapitalAdjustments;
  const accountGroup = (code: string) => ACCOUNTS.find(account => account.code === code)?.group;
  const journalCashFlowFor = (groups: string[]) => journals.filter(entry => entry.date >= start && entry.date <= end).reduce((sum, entry) => {
    const debitIsCash = SETTLEMENT_CODES.includes(entry.debitCode);
    const creditIsCash = SETTLEMENT_CODES.includes(entry.creditCode);
    if (debitIsCash === creditIsCash) return sum;
    const counterpart = debitIsCash ? entry.creditCode : entry.debitCode;
    if (!groups.includes(accountGroup(counterpart) ?? "")) return sum;
    return sum + (debitIsCash ? entry.amount : -entry.amount);
  }, 0);
  const investingCashFlow = journalCashFlowFor(["Non-Current Assets"]);
  const financingCashFlow = journalCashFlowFor(["Current Liabilities", "Non-Current Liabilities", "Equity"]);
  const netCashFlow = report.rows.filter(row => SETTLEMENT_CODES.includes(row.code)).reduce((sum, row) => sum + row.movement, 0);
  const otherCashFlow = netCashFlow - operatingCashFlow - investingCashFlow - financingCashFlow;
  const endingCashBalance = report.rows.filter(row => SETTLEMENT_CODES.includes(row.code)).reduce((sum, row) => sum + row.balance, 0);
  const beginningCashBalance = endingCashBalance - netCashFlow;
  const assets = report.assets;
  const liabilities = report.liabilities;
  const equity = report.equity;

  return {
    revenue,
    salesOfPads,
    otherIncome,
    salesOfMaterials,
    trainings,
    grantsAndDonations,
    customIncome,
    costOfProduction,
    purchasesOfRawMaterials,
    carriageInwards,
    directLabor,
    otherProductionCosts,
    grossProfit,
    operatingExpenses,
    netIncome,
    cashInflows,
    cashOutflows,
    cashAdjustments,
    nonCashAdjustments,
    workingCapitalAdjustments,
    operatingCashFlow,
    investingCashFlow,
    financingCashFlow,
    otherCashFlow,
    netCashFlow,
    beginningCashBalance,
    endingCashBalance,
    assets,
    liabilities,
    equity,
    retainedEarnings: report.accumulatedProfit,
    balanceDifference: assets - liabilities - equity,
  };
}
