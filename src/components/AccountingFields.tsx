"use client";
import { ACCOUNTS, SALES_ENTRY_ACCOUNT_CODES, type AccountingSelection, type AccountGroup } from "@/lib/accounts";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
const EXPENSE_ACCOUNT_OPTIONS = [
  { name: "Office and Administration", code: "6080" },
  { name: "Legal and Professional Fees", code: "6070" },
  { name: "Salaries and Wages", code: "6010" },
  { name: "Fuel and Transport", code: "6030" },
  { name: "Data and Communication Costs", code: "6113" },
  { name: "Utilities", code: "6100" },
  { name: "Machine Repair and Maintenance", code: "6131" },
  { name: "Sundries", code: "6171" },
  { name: "Other Costs", code: "6172" },
  { name: "Small Tools and Equipment", code: "6050" },
  { name: "Depreciation", code: "6200" },
] as const;
export function AccountingFields({ value, onChange, kind }: { value: AccountingSelection; onChange: (v: AccountingSelection) => void; kind: "sale" | "expense" }) {
  const groups: AccountGroup[] = kind === "sale" ? ["Income", "Other Income"] : ["Cost of Sales", "Expenses"];
  const defaultGroup: AccountGroup = kind === "sale" ? "Income" : "Expenses";
  const { data } = useRealtimeCollection<{ accounting?: AccountingSelection }>(kind === "sale" ? "saleTransactions" : "expenses");
  const saved = [...new Map(data.flatMap(row => row.accounting?.accountCode.startsWith("custom:") && groups.includes(row.accounting.accountGroup) ? [[row.accounting.accountCode, row.accounting] as const] : [])).values()];
  const availableAccounts = ACCOUNTS.filter(account => groups.includes(account.group) && (kind !== "sale" || SALES_ENTRY_ACCOUNT_CODES.includes(account.code as typeof SALES_ENTRY_ACCOUNT_CODES[number])));
  const settlementAccounts = kind === "expense"
    ? [{ code: "1030", name: "Cash" }, { code: "1000", name: "Bank" }]
    : [
        { code: "1030", name: "Cash" },
        { code: "1000", name: "Bank" },
        { code: "1010", name: "Mobile Money [MTN]" },
        { code: "1020", name: "Mobile Money [Airtel]" },
      ];
  const input = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm";
  return <fieldset className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
    <legend className="px-2 font-semibold text-gray-800">Chart of Accounts</legend>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">{kind === "expense" ? "Account Subcategory" : "Account / subcategory"}<select required className={input} value={value.accountCode.startsWith("custom:") ? "custom" : value.accountCode} onChange={e => {
        if (kind === "expense" && !e.target.value) {
          onChange({ ...value, accountCode: "", accountName: "", accountDetail: "" });
          return;
        }
        const a = ACCOUNTS.find(a => a.code === e.target.value);
        const previous = saved.find(a => a.accountCode === e.target.value);
        const accountGroup = a?.group ?? previous?.accountGroup ?? (groups.includes(value.accountGroup) ? value.accountGroup : defaultGroup);
        const expenseLabel = kind === "expense" ? EXPENSE_ACCOUNT_OPTIONS.find(option => option.code === e.target.value)?.name : undefined;
        const accountCode = a?.code ?? previous?.accountCode ?? `custom:${accountGroup}:`;
        onChange({ ...value, accountGroup, accountCode, accountName: expenseLabel ?? a?.name ?? previous?.accountName ?? "", accountDetail: "", ...(kind === "expense" && accountCode === "6200" ? { settlementCode: "" } : {}) });
      }}><option value="">Select account...</option>{kind === "expense" ? EXPENSE_ACCOUNT_OPTIONS.map(option => <option key={option.name} value={option.code}>{option.name}</option>) : groups.map(group => {
        const options = availableAccounts.filter(account => account.group === group);
        return options.length > 0 ? <optgroup key={group} label={group}>{options.map(account => <option key={account.code} value={account.code}>{account.name}</option>)}</optgroup> : null;
      })}{kind === "sale" && saved.map(a => <option key={a.accountCode} value={a.accountCode}>{a.accountName} (custom)</option>)}{kind === "sale" && <option value="custom">Custom subcategory...</option>}</select></label>
      {kind === "sale" && value.accountCode.startsWith("custom:") && <label className="text-sm">Custom subcategory name<input required maxLength={100} className={input} value={value.accountName} onChange={e => onChange({ ...value, accountName: e.target.value, accountCode: `custom:${value.accountGroup}:${e.target.value.trim().toLowerCase()}` })} /></label>}
      {kind === "expense" && ["5080", "5090"].includes(value.accountCode) && <label className="text-sm">{value.accountCode === "5080" ? "Direct material details" : "Direct labour details"}<input required maxLength={120} className={input} value={value.accountDetail ?? ""} onChange={e => onChange({ ...value, accountDetail: e.target.value })} placeholder={value.accountCode === "5080" ? "Enter the material purchased or used" : "Enter the labour activity or worker details"} /></label>}
      {!(kind === "expense" && value.accountCode === "6200") && <label className="text-sm">{kind === "sale" ? "Payment Method" : "Paid from"}<select required className={input} value={value.settlementCode} onChange={e => onChange({ ...value, settlementCode: e.target.value })}>{kind === "expense" ? <option value="" disabled hidden /> : <option value="">Select payment method...</option>}{settlementAccounts.map(account => <option key={account.code} value={account.code}>{account.name}</option>)}</select></label>}
    </div>
  </fieldset>;
}
