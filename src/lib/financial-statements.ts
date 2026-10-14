import { ACCOUNTS, SETTLEMENT_CODES, isRawMaterialCarriageExpense, productionCostItem, resolveAccounting, type Journal, type LedgerSource, type NssfRemittanceEntry, type PayeRemittanceEntry, type ProductionCostEntry, type TaxEntry, type PayrollProductionEntry, type buildAccounts } from "@/lib/accounts";

type AccountsReport = ReturnType<typeof buildAccounts>;
const OPERATING_EXPENSE_NAMES = ["Office and Administration", "Legal and Professional Fees", "Salaries and Wages", "Fuel and Transport", "Data and Communication Costs", "Utilities", "Machine Repair and Maintenance", "Sundries", "Other Costs", "Small Tools and Equipment", "Depreciation"];
export interface ConfirmedLaborPayment { id: string; paidDate: string; status?: string; grossAmount?: number; totalAmount?: number; amountUgx?: number; payrollVersion?: number; payrollAccountingVersion?: number; netPayAmount?: number; payeeTax?: number; nssfEmployeeDeduction?: number; nssfBusinessContribution?: number }
export interface CashFlowLine { name: string; amount: number }
export interface PayrollStatementBreakdown { netPay: number; paye: number; employeeNssf: number; employerNssf: number; notItemised: number }

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
  directLaborBreakdown: PayrollStatementBreakdown;
  otherProductionCosts: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingExpenseLines: Array<{ name: string; amount: number }>;
  salariesWagesBreakdown: PayrollStatementBreakdown;
  incomeBeforeTaxes: number;
  taxDeductions: number;
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
  balanceSheetCashBalance: number;
  cashBalanceDifference: number;
  cashReceivedLines: CashFlowLine[];
  operatingExpenseCashLines: CashFlowLine[];
  investingCashLines: CashFlowLine[];
  financingCashLines: CashFlowLine[];
  otherCashMovementLines: CashFlowLine[];
  cashFromSalesOfPads: number;
  cashFromSalesOfMaterials: number;
  cashFromTrainings: number;
  grantsAndDonationsReceived: number;
  totalCashReceived: number;
  cashPaidForRawMaterials: number;
  cashPaidForCarriageInwards: number;
  cashPaidForDirectLabor: number;
  cashPaidForOtherProductionCosts: number;
  cashPaidForOperatingExpenses: number;
  cashPaidForTaxes: number;
  cashPaidForPayeRemittances: number;
  cashPaidForNssfRemittances: number;
  totalCashPaid: number;
  cashActivityDifference: number;
  transfersNetEffect: number;
  assets: number;
  liabilities: number;
  equity: number;
  retainedEarnings: number;
  balanceDifference: number;
}

const saleAmount = (entry: LedgerSource) => Number(entry.totalAmount) || 0;
const expenseAmount = (entry: LedgerSource) => Number(entry.amountUgx) || 0;
const unpaidStatuses = new Set(["unpaid", "pending", "credit", "due", "outstanding", "not_paid"]);
const actualCashAmount = (entry: LedgerSource, kind: "sale" | "expense") => {
  if (kind === "expense" && entry.payrollExpenseVersion === 2) return Math.max(0, Number(entry.netPayAmount) || 0);
  const explicit = kind === "sale" ? entry.amountReceived ?? entry.receivedAmount : entry.amountPaid ?? entry.paidAmount;
  if (explicit !== undefined && Number.isFinite(Number(explicit))) return Math.max(0, Number(explicit));
  const status = String(entry.paymentStatus ?? entry.status ?? "").trim().toLowerCase().replaceAll(" ", "_");
  if (unpaidStatuses.has(status)) return 0;
  return kind === "sale" ? saleAmount(entry) : expenseAmount(entry);
};
const addLine = (lines: Map<string, CashFlowLine>, name: string, amount: number) => {
  const key = name.trim().toLocaleLowerCase();
  const prior = lines.get(key);
  lines.set(key, { name: prior?.name ?? name.trim(), amount: (prior?.amount ?? 0) + amount });
};

export function buildFinancialStatements(
  sales: LedgerSource[],
  expenses: LedgerSource[],
  journals: Journal[],
  report: AccountsReport,
  start: string,
  end: string,
  payments: ConfirmedLaborPayment[] = [],
  productionCosts: ProductionCostEntry[] = [],
  taxEntries: TaxEntry[] = [],
  _payrollEntries: PayrollProductionEntry[] = [],
  openingCashBalanceOverride?: number,
  payeRemittances: PayeRemittanceEntry[] = [],
  nssfRemittances: NssfRemittanceEntry[] = [],
): FinancialStatements {
  // Kept in the public signature for compatibility with existing callers; labor
  // on this statement is deliberately recognized from confirmed payments.
  void _payrollEntries;
  const periodSales = sales.filter(entry => entry.date >= start && entry.date <= end && resolveAccounting(entry, "sale"));
  const periodExpenses = expenses.filter(entry => entry.date >= start && entry.date <= end);
  const expenseCode = (entry: LedgerSource) => resolveAccounting(entry, "expense")?.accountCode ?? entry.accounting?.accountCode ?? "";
  const isRawMaterialPurchase = (entry: LedgerSource) => expenseCode(entry) === "5080" || (!entry.accounting && entry.category === "RAW_MATERIALS");
  const isDirectLaborExpense = (entry: LedgerSource) => expenseCode(entry) === "5090" || (!entry.accounting && entry.category === "LABOUR");
  const isOtherProductionExpense = (entry: LedgerSource) => entry.accounting?.accountGroup === "Cost of Sales" && !isRawMaterialPurchase(entry) && !isDirectLaborExpense(entry);
  const isTaxExpense = (entry: LedgerSource) => expenseCode(entry) === "6195";
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
  const periodProductionCosts = productionCosts.filter(entry => entry.date >= start && entry.date <= end);
  const productionCostTotal = (item: ReturnType<typeof productionCostItem>) => periodProductionCosts
    .filter(entry => productionCostItem(entry) === item)
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const purchasesOfRawMaterials = periodExpenses.filter(isRawMaterialPurchase).reduce((sum, entry) => sum + expenseAmount(entry), 0) + productionCostTotal("purchases_raw_materials");
  const carriageInwards = periodExpenses.filter(isRawMaterialCarriageExpense).reduce((sum, entry) => sum + expenseAmount(entry), 0) + productionCostTotal("carriage_inwards");
  // Income Statement labor is period activity by confirmation date. Production
  // entries remain in the Balance Sheet accrual ledger and are not re-posted.
  const confirmedPeriodPayments = payments.filter(entry => entry.status === "paid" && entry.paidDate >= start && entry.paidDate <= end);
  const directLaborBreakdown = confirmedPeriodPayments.reduce<PayrollStatementBreakdown>((sum, entry) => {
    const gross = Number(entry.grossAmount ?? entry.totalAmount ?? entry.amountUgx) || 0;
    const paye = Number(entry.payeeTax) || 0;
    const employeeNssf = Number(entry.nssfEmployeeDeduction) || 0;
    const employerNssf = entry.payrollAccountingVersion === 3 ? Number(entry.nssfBusinessContribution) || 0 : 0;
    sum.netPay += Number(entry.netPayAmount) || Math.max(0, gross - paye - employeeNssf);
    sum.paye += paye; sum.employeeNssf += employeeNssf; sum.employerNssf += employerNssf;
    return sum;
  }, { netPay: 0, paye: 0, employeeNssf: 0, employerNssf: 0, notItemised: 0 });
  const directLabor = directLaborBreakdown.netPay + directLaborBreakdown.paye + directLaborBreakdown.employeeNssf + directLaborBreakdown.employerNssf;
  const legacyProductionEmployerNssf = confirmedPeriodPayments.filter(entry => entry.payrollAccountingVersion !== 3).reduce((sum, entry) => sum + (Number(entry.nssfBusinessContribution) || 0), 0);
  const recordedOtherCosts = productionCostTotal("other_costs");
  const legacyOtherCosts = periodExpenses.filter(isOtherProductionExpense).reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const otherProductionCosts = recordedOtherCosts + legacyOtherCosts;
  const costOfProduction = purchasesOfRawMaterials + carriageInwards + directLabor + otherProductionCosts;
  const operatingExpenseEntries = periodExpenses.filter(entry => !isRawMaterialPurchase(entry) && !isRawMaterialCarriageExpense(entry) && !isDirectLaborExpense(entry) && !isOtherProductionExpense(entry) && !isTaxExpense(entry));
  const operatingTotals = new Map(OPERATING_EXPENSE_NAMES.map(name => [name.toLocaleLowerCase(), { name, amount: 0 }]));
  for (const entry of operatingExpenseEntries) {
    const name = expenseCode(entry) === "6010"
      ? "Salaries and Wages"
      : entry.accounting?.accountName?.trim() || entry.subcategory?.trim() || entry.category?.trim() || "Uncategorised expenses";
    const key = name.toLocaleLowerCase();
    const previous = operatingTotals.get(key);
    operatingTotals.set(key, { name: previous?.name ?? name, amount: (previous?.amount ?? 0) + expenseAmount(entry) });
  }
  const salaryExpenseEntries = operatingExpenseEntries.filter(entry => expenseCode(entry) === "6010");
  const salariesWagesBreakdown = salaryExpenseEntries.reduce<PayrollStatementBreakdown>((sum, entry) => {
    if (entry.payrollExpenseVersion === 2) {
      sum.netPay += Number(entry.netPayAmount) || 0;
      sum.paye += Number(entry.payeeTax) || 0;
      sum.employeeNssf += Number(entry.nssfEmployeeDeduction) || 0;
      sum.employerNssf += Number(entry.nssfBusinessContribution) || 0;
    } else sum.notItemised += expenseAmount(entry);
    return sum;
  }, { netPay: 0, paye: 0, employeeNssf: 0, employerNssf: legacyProductionEmployerNssf, notItemised: 0 });
  const salariesAndWagesKey = "salaries and wages";
  const salariesAndWages = operatingTotals.get(salariesAndWagesKey)!;
  operatingTotals.set(salariesAndWagesKey, { ...salariesAndWages, amount: salariesAndWages.amount + legacyProductionEmployerNssf });
  const operatingExpenseLines = [...operatingTotals.values()];
  const operatingExpenses = operatingExpenseLines.reduce((sum, line) => sum + line.amount, 0);
  const grossProfit = revenue - costOfProduction;
  const incomeBeforeTaxes = grossProfit - operatingExpenses;
  const taxDeductions = periodExpenses.filter(isTaxExpense).reduce((sum, entry) => sum + expenseAmount(entry), 0) + taxEntries.filter(entry => entry.date >= start && entry.date <= end).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const netIncome = incomeBeforeTaxes - taxDeductions;

  const cashReceived = new Map<string, CashFlowLine>();
  let grantsAndDonationsReceived = 0;
  for (const entry of periodSales) {
    const account = resolveAccounting(entry, "sale")!;
    const amount = actualCashAmount(entry, "sale");
    if (amount <= 0) continue;
    if (account.accountCode === "4083") {
      grantsAndDonationsReceived += amount;
      continue;
    }
    const name = account.accountCode === "4080" ? "Cash from Sales of Pads"
      : account.accountCode === "4081" ? "Cash from Sale of Materials"
        : account.accountCode === "4082" ? "Cash from Trainings"
          : `Cash from ${account.accountName.trim() || "Other Income"}`;
    addLine(cashReceived, name, amount);
  }
  const operatingCashExpenses = new Map(OPERATING_EXPENSE_NAMES.map(name => [name.toLocaleLowerCase(), { name, amount: 0 }]));
  let cashPaidForRawMaterials = 0;
  let cashPaidForCarriageInwards = 0;
  for (const entry of periodExpenses) {
    const amount = actualCashAmount(entry, "expense");
    if (amount <= 0) continue;
    if (expenseCode(entry) === "6200") continue;
    if (isRawMaterialPurchase(entry)) cashPaidForRawMaterials += amount;
    else if (isRawMaterialCarriageExpense(entry)) cashPaidForCarriageInwards += amount;
    else if (!isDirectLaborExpense(entry) && !isOtherProductionExpense(entry) && !isTaxExpense(entry)) {
      const name = entry.accounting?.accountName?.trim() || entry.subcategory?.trim() || entry.category?.trim() || "Uncategorised expenses";
      addLine(operatingCashExpenses, name, amount);
    }
  }
  cashPaidForRawMaterials += productionCostTotal("purchases_raw_materials");
  cashPaidForCarriageInwards += productionCostTotal("carriage_inwards");
  const cashPaidForDirectLabor = payments.filter(entry => entry.status === "paid" && entry.paidDate >= start && entry.paidDate <= end).reduce((sum, entry) => sum + (Number(entry.netPayAmount) || 0), 0);
  const cashPaidForOtherProductionCosts = recordedOtherCosts;
  const cashPaidForOperatingExpenses = [...operatingCashExpenses.values()].reduce((sum, line) => sum + line.amount, 0);
  const cashPaidForPayeRemittances = payeRemittances.filter(entry => entry.paymentDate >= start && entry.paymentDate <= end).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const cashPaidForNssfRemittances = nssfRemittances.filter(entry => entry.paymentDate >= start && entry.paymentDate <= end).reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
  const cashPaidForTaxes = cashPaidForPayeRemittances + cashPaidForNssfRemittances;

  const investing = new Map<string, CashFlowLine>();
  const financing = new Map<string, CashFlowLine>();
  if (grantsAndDonationsReceived > 0) addLine(financing, "Grants and Donations", grantsAndDonationsReceived);
  const otherMovements = new Map<string, CashFlowLine>();
  let cashPaidForCreditExpenses = 0;
  let transfersNetEffect = 0;
  for (const entry of journals.filter(item => item.date >= start && item.date <= end)) {
    const debitCash = SETTLEMENT_CODES.includes(entry.debitCode);
    const creditCash = SETTLEMENT_CODES.includes(entry.creditCode);
    if (debitCash && creditCash) {
      transfersNetEffect += entry.amount - entry.amount;
      continue;
    }
    if (debitCash === creditCash) continue;
    const cashMovement = debitCash ? Number(entry.amount) : -Number(entry.amount);
    const counterpartCode = debitCash ? entry.creditCode : entry.debitCode;
    const counterpart = ACCOUNTS.find(account => account.code === counterpartCode);
    const name = counterpart?.name ?? entry.description?.trim() ?? "Unclassified journal movement";
    if (counterpartCode === "1100" && cashMovement > 0) {
      addLine(cashReceived, "Collections from Customers", cashMovement);
      continue;
    }
    if (counterpartCode === "2110" && cashMovement < 0) {
      cashPaidForCreditExpenses += Math.abs(cashMovement);
      addLine(operatingCashExpenses, "Payments to Suppliers", Math.abs(cashMovement));
      continue;
    }
    if (["Income", "Other Income"].includes(counterpart?.group ?? "") && cashMovement > 0) {
      if (counterpartCode === "4083") {
        grantsAndDonationsReceived += cashMovement;
        addLine(financing, "Grants and Donations", cashMovement);
        continue;
      }
      const receivedName = counterpartCode === "4080" ? "Cash from Sales of Pads"
        : counterpartCode === "4081" ? "Cash from Sale of Materials"
          : counterpartCode === "4082" ? "Cash from Trainings"
            : `Cash from ${name}`;
      addLine(cashReceived, receivedName, cashMovement);
      continue;
    }
    if (counterpart?.group === "Non-Current Assets") addLine(investing, `${cashMovement < 0 ? "Purchase of" : "Proceeds from"} ${name}`, cashMovement);
    else if (["Current Liabilities", "Non-Current Liabilities", "Equity"].includes(counterpart?.group ?? "")) {
      const financingName = counterpartCode === "3000" ? (cashMovement >= 0 ? "Capital Investments received" : "Capital Investments returned")
        : counterpartCode === "3100" ? (cashMovement <= 0 ? "Dividends paid" : "Dividends reversed")
          : `${name} — ${cashMovement >= 0 ? "cash received" : "cash paid"}`;
      addLine(financing, financingName, cashMovement);
    }
    else addLine(otherMovements, name, cashMovement);
  }
  const receivedOrder = (name: string) => name === "Cash from Sales of Pads" ? 0 : name === "Cash from Sale of Materials" ? 1 : name === "Cash from Trainings" ? 2 : 3;
  const cashReceivedLines = [...cashReceived.values()].sort((a, b) => receivedOrder(a.name) - receivedOrder(b.name) || a.name.localeCompare(b.name));
  const totalCashReceived = cashReceivedLines.reduce((sum, line) => sum + line.amount, 0);
  const totalCashPaid = cashPaidForRawMaterials + cashPaidForCarriageInwards + cashPaidForDirectLabor + cashPaidForOtherProductionCosts + cashPaidForOperatingExpenses + cashPaidForCreditExpenses + cashPaidForTaxes;
  const cashInflows = totalCashReceived;
  const cashOutflows = totalCashPaid;
  const cashAdjustments = journals.filter(entry => entry.date >= start && entry.date <= end).reduce((sum, entry) => {
    const debitCash = SETTLEMENT_CODES.includes(entry.debitCode) ? entry.amount : 0;
    const creditCash = SETTLEMENT_CODES.includes(entry.creditCode) ? entry.amount : 0;
    return sum + debitCash - creditCash;
  }, 0);
  const nonCashAdjustments = periodExpenses.filter(entry => resolveAccounting(entry, "expense")?.accountCode === "6200").reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const nonCashCurrentAssetMovement = report.rows.filter(row => row.group === "Current Assets" && !SETTLEMENT_CODES.includes(row.code)).reduce((sum, row) => sum + row.movement, 0);
  const currentLiabilityMovement = report.rows.filter(row => row.group === "Current Liabilities").reduce((sum, row) => sum + row.movement, 0);
  const workingCapitalAdjustments = -nonCashCurrentAssetMovement + currentLiabilityMovement;
  const operatingCashFlow = totalCashReceived - totalCashPaid;
  const investingCashFlow = [...investing.values()].reduce((sum, line) => sum + line.amount, 0);
  const financingCashFlow = [...financing.values()].reduce((sum, line) => sum + line.amount, 0);
  const otherCashFlow = [...otherMovements.values()].reduce((sum, line) => sum + line.amount, 0);
  const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow + otherCashFlow;
  const ledgerCashMovement = report.rows.filter(row => SETTLEMENT_CODES.includes(row.code)).reduce((sum, row) => sum + row.movement, 0);
  const balanceSheetCashBalance = report.rows.filter(row => SETTLEMENT_CODES.includes(row.code)).reduce((sum, row) => sum + row.balance, 0);
  const beginningCashBalance = openingCashBalanceOverride ?? (balanceSheetCashBalance - netCashFlow);
  const endingCashBalance = beginningCashBalance + netCashFlow;
  const cashBalanceDifference = endingCashBalance - balanceSheetCashBalance;
  const cashActivityDifference = netCashFlow - ledgerCashMovement;
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
    directLaborBreakdown,
    otherProductionCosts,
    grossProfit,
    operatingExpenses,
    operatingExpenseLines,
    salariesWagesBreakdown,
    incomeBeforeTaxes,
    taxDeductions,
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
    balanceSheetCashBalance,
    cashBalanceDifference,
    cashReceivedLines,
    operatingExpenseCashLines: [...operatingCashExpenses.values()],
    investingCashLines: [...investing.values()],
    financingCashLines: [...financing.values()],
    otherCashMovementLines: [...otherMovements.values()],
    cashFromSalesOfPads: cashReceived.get("cash from sales of pads")?.amount ?? 0,
    cashFromSalesOfMaterials: cashReceived.get("cash from sale of materials")?.amount ?? 0,
    cashFromTrainings: cashReceived.get("cash from trainings")?.amount ?? 0,
    grantsAndDonationsReceived,
    totalCashReceived,
    cashPaidForRawMaterials,
    cashPaidForCarriageInwards,
    cashPaidForDirectLabor,
    cashPaidForOtherProductionCosts,
    cashPaidForOperatingExpenses,
    cashPaidForTaxes,
    cashPaidForPayeRemittances,
    cashPaidForNssfRemittances,
    totalCashPaid,
    cashActivityDifference,
    transfersNetEffect,
    assets,
    liabilities,
    equity,
    retainedEarnings: report.accumulatedProfit,
    balanceDifference: assets - liabilities - equity,
  };
}
