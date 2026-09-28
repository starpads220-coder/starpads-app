import { SETTLEMENT_CODES, type Journal, type LedgerSource, type buildAccounts } from "@/lib/accounts";

type AccountsReport = ReturnType<typeof buildAccounts>;

export interface FinancialStatements {
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  operatingExpenses: number;
  netIncome: number;
  cashInflows: number;
  cashOutflows: number;
  cashAdjustments: number;
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
): FinancialStatements {
  const periodSales = sales.filter(entry => entry.date >= start && entry.date <= end);
  const periodExpenses = expenses.filter(entry => entry.date >= start && entry.date <= end);
  const revenue = periodSales.reduce((sum, entry) => sum + saleAmount(entry), 0);
  const costOfGoodsSold = periodExpenses.filter(entry => entry.accounting?.accountGroup === "Cost of Sales").reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const operatingExpenses = periodExpenses.filter(entry => entry.accounting?.accountGroup !== "Cost of Sales").reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const grossProfit = revenue - costOfGoodsSold;
  const netIncome = grossProfit - operatingExpenses;

  const cashInflows = revenue;
  const cashOutflows = periodExpenses.reduce((sum, entry) => sum + expenseAmount(entry), 0);
  const cashAdjustments = journals.filter(entry => entry.date >= start && entry.date <= end).reduce((sum, entry) => {
    const debitCash = SETTLEMENT_CODES.includes(entry.debitCode) ? entry.amount : 0;
    const creditCash = SETTLEMENT_CODES.includes(entry.creditCode) ? entry.amount : 0;
    return sum + debitCash - creditCash;
  }, 0);
  const netCashFlow = cashInflows - cashOutflows + cashAdjustments;
  const endingCashBalance = report.rows.filter(row => SETTLEMENT_CODES.includes(row.code)).reduce((sum, row) => sum + row.balance, 0);
  const beginningCashBalance = endingCashBalance - netCashFlow;
  const assets = report.assets;
  const liabilities = report.liabilities;
  const equity = report.equity;

  return {
    revenue,
    costOfGoodsSold,
    grossProfit,
    operatingExpenses,
    netIncome,
    cashInflows,
    cashOutflows,
    cashAdjustments,
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
