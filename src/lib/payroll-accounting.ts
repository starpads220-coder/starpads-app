export const HISTORICAL_ALREADY_SETTLED = "historical_already_settled" as const;

export interface PayrollAccountingTreatment {
  accountingTreatment?: typeof HISTORICAL_ALREADY_SETTLED | "standard";
}

/**
 * Historical confirmations keep production entries operationally paid but do
 * not post cash, payroll expense, PAYE or NSSF because they were settled before
 * those records were brought into the current accounting workflow.
 */
export function affectsPayrollAccounts(payment: PayrollAccountingTreatment) {
  return payment.accountingTreatment !== HISTORICAL_ALREADY_SETTLED;
}
