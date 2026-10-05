import type { PayeeBracket, DeductionBreakdown } from "@/types";

export const PAYEE_THRESHOLD = 335000;

export interface PayeBand {
  upperLimit: number | null;
  ratePercent: number;
}

export interface PayeBandResult extends PayeBand {
  lowerLimit: number;
  taxableAmount: number;
  taxAmount: number;
}

// Initial configurable schedule requested by the business. Firestore settings
// override this for future confirmations only; each paid record stores its result.
export const DEFAULT_PAYE_BANDS: PayeBand[] = [
  { upperLimit: 335000, ratePercent: 0 },
  { upperLimit: 410000, ratePercent: 10 },
  { upperLimit: 485000, ratePercent: 25 },
  { upperLimit: null, ratePercent: 30 },
];

/** Rates apply to each slice of gross pay, not to the entire salary. */
export function calculateProgressivePaye(gross: number, bands: PayeBand[]): {
  tax: number;
  breakdown: PayeBandResult[];
} {
  if (!Number.isFinite(gross) || gross < 0) throw new Error("Gross pay must be non-negative.");
  if (!bands.length || bands[bands.length - 1].upperLimit !== null) {
    throw new Error("PAYE bands must finish with an open-ended band.");
  }
  let lowerLimit = 0;
  const breakdown = bands.map((band, index) => {
    const upperLimit = band.upperLimit;
    if (!Number.isFinite(band.ratePercent) || band.ratePercent < 0 || band.ratePercent > 100 ||
        (upperLimit !== null && (!Number.isFinite(upperLimit) || upperLimit <= lowerLimit)) ||
        (upperLimit === null && index !== bands.length - 1)) {
      throw new Error("PAYE bands must have increasing limits and rates from 0% to 100%.");
    }
    const taxableAmount = Math.max(0, Math.min(gross, upperLimit ?? gross) - lowerLimit);
    const taxAmount = taxableAmount * band.ratePercent / 100;
    const result = { ...band, lowerLimit, taxableAmount, taxAmount };
    if (upperLimit !== null) lowerLimit = upperLimit;
    return result;
  });
  return { tax: Math.round(breakdown.reduce((sum, band) => sum + band.taxAmount, 0)), breakdown };
}

export function computePayeeTax(monthlyGross: number, bands: PayeBand[] = DEFAULT_PAYE_BANDS): number {
  return calculateProgressivePaye(monthlyGross, bands).tax;
}

export function getPayeeBracket(monthlyGross: number, bands: PayeBand[] = DEFAULT_PAYE_BANDS): PayeeBracket {
  const applied = bands.find(band => band.upperLimit === null || monthlyGross <= band.upperLimit) ?? bands[bands.length - 1];
  return {
    label: applied.upperLimit === null ? `Above ${bands[bands.length - 2]?.upperLimit?.toLocaleString() ?? 0}` : `Up to ${applied.upperLimit.toLocaleString()}`,
    rate: applied.ratePercent,
    tax: computePayeeTax(monthlyGross, bands),
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
