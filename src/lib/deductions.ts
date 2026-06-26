import type { PayeeBracket, DeductionBreakdown } from "@/types";

export function computePayeeTax(monthlyGross: number): number {
  if (monthlyGross <= 335000) return 0;
  if (monthlyGross <= 410000) return Math.round((monthlyGross - 335000) * 0.10);
  if (monthlyGross <= 485000) {
    return Math.round(75000 * 0.10 + (monthlyGross - 410000) * 0.20);
  }
  if (monthlyGross <= 10000000) {
    return Math.round(75000 * 0.10 + 75000 * 0.20 + (monthlyGross - 485000) * 0.30);
  }
  return Math.round(
    75000 * 0.10 + 75000 * 0.20 + 9515000 * 0.30 + (monthlyGross - 10000000) * 0.40
  );
}

export function getPayeeBracket(monthlyGross: number): PayeeBracket {
  if (monthlyGross <= 335000) return { label: "0 — 335,000", rate: 0, tax: 0 };
  if (monthlyGross <= 410000) return { label: "335,001 — 410,000", rate: 10, tax: computePayeeTax(monthlyGross) };
  if (monthlyGross <= 485000) return { label: "410,001 — 485,000", rate: 20, tax: computePayeeTax(monthlyGross) };
  if (monthlyGross <= 10000000) return { label: "485,001 — 10,000,000", rate: 30, tax: computePayeeTax(monthlyGross) };
  return { label: "Above 10,000,000", rate: 40, tax: computePayeeTax(monthlyGross) };
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
