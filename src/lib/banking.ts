import { ACCOUNTS, SETTLEMENT_CODES, type Journal } from "@/lib/accounts";

export const bankAccounts = ACCOUNTS.filter(account => account.group === "Current Assets" && account.code === "1000");
export const cashAccounts = ACCOUNTS.filter(account => SETTLEMENT_CODES.includes(account.code) && account.code !== "1000");
export const isBankCode = (code: string) => bankAccounts.some(account => account.code === code);
export const isCashCode = (code: string) => cashAccounts.some(account => account.code === code);
export const isMoneyCode = (code: string) => isBankCode(code) || isCashCode(code);
export const DEFAULT_BANK_NAMES = ["Bank of Baroda", "Bank of Africa"] as const;
export const CUSTOM_BANK_VALUE = "__other__";
/** Single configurable offset for new standalone deposits. */
export const DEPOSIT_OFFSET_ACCOUNT_CODE = "3000";
export const normaliseBankNameKey = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
export const cleanBankName = (value: string) => value.trim().replace(/\s+/g, " ");

export const bankingAccountName = (code: string) => {
  if (isBankCode(code)) return "Bank";
  if (code === "1030") return "Cash";
  if (code === "1010") return "Mobile Money [MTN]";
  if (code === "1020") return "Mobile Money [Airtel]";
  return ACCOUNTS.find(account => account.code === code)?.name ?? code;
};

export function transferDirection(entry: Journal) {
  return { fromCode: entry.creditCode, toCode: entry.debitCode };
}

export function isCashToBank(entry: Journal) {
  return entry.bankingKind === "transfer" && isCashCode(entry.creditCode) && isBankCode(entry.debitCode);
}

export function validateTransfer(fromCode: string, toCode: string, amount: number, available: number) {
  if (!isMoneyCode(fromCode) || !isMoneyCode(toCode)) throw new Error("Select an existing Bank or Cash account for both sides.");
  if (fromCode === toCode || isBankCode(fromCode) === isBankCode(toCode)) throw new Error("Transfer between different Bank and Cash accounts.");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Enter an amount greater than zero.");
  if (amount > available + 0.005) throw new Error("The transfer amount exceeds the available balance of the source account.");
}
