import type { PayeeBracket, DeductionBreakdown } from "@/types";

export const PAYEE_RATE = 0.20;
export const PAYEE_THRESHOLD = 335000;

export function computePayeeTax(monthlyGross: number): number {
  if (monthlyGross <= PAYEE_THRESHOLD) return 0;
  return Math.round(monthlyGross * PAYEE_RATE);
}

export function getPayeeBracket(monthlyGross: number): PayeeBracket {
  if (monthlyGross <= PAYEE_THRESHOLD) {
    return { label: `0 — ${PAYEE_THRESHOLD.toLocaleString()}`, rate: 0, tax: 0 };
  }
  return {
    label: `Above ${PAYEE_THRESHOLD.toLocaleString()} (flat)`,
    rate: PAYEE_RATE * 100,
    tax: computePayeeTax(monthlyGross),
  };
}

export function computeNssfEmployee(grossAmount: number): number {
  return Math.round(grossAmount * 0.05);
}

export function computeNssfBusiness(grossAmount: number): number {
  return Math.round(grossAmount * 0.10);
}

export function computeAllDeductions(monthlyGross: number): DeductionBreakdown {
  const nssfEmployeeDeduction = computeNssfEmployee(monthlyGross);
  const nssfBusinessContribution = computeNssfBusiness(monthlyGross);
  const payeeTax = computePayeeTax(monthlyGross);
  const netPayAmount = monthlyGross - nssfEmployeeDeduction - payeeTax;

  return {
    grossAmount: monthlyGross,
    nssfEmployeeDeduction,
    nssfBusinessContribution,
    payeeTax,
    netPayAmount,
    payeeBracket: getPayeeBracket(monthlyGross),
  };
}
