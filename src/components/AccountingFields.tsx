"use client";
import { ACCOUNTS, SALES_ENTRY_ACCOUNT_CODES, SETTLEMENT_CODES, type AccountingSelection, type AccountGroup } from "@/lib/accounts";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
export function AccountingFields({ value, onChange, kind }: { value: AccountingSelection; onChange: (v: AccountingSelection) => void; kind: "sale" | "expense" }) {
  const groups: AccountGroup[] = kind === "sale" ? ["Income", "Other Income"] : ["Cost of Sales", "Expenses"];
  const defaultGroup: AccountGroup = kind === "sale" ? "Income" : "Expenses";
  const { data } = useRealtimeCollection<{ accounting?: AccountingSelection }>(kind === "sale" ? "saleTransactions" : "expenses");
  const saved = [...new Map(data.flatMap(row => row.accounting?.accountCode.startsWith("custom:") && groups.includes(row.accounting.accountGroup) ? [[row.accounting.accountCode, row.accounting] as const] : [])).values()];
  const availableAccounts = ACCOUNTS.filter(account => groups.includes(account.group) && (kind !== "sale" || SALES_ENTRY_ACCOUNT_CODES.includes(account.code as typeof SALES_ENTRY_ACCOUNT_CODES[number])));
  const input = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm";
  return <fieldset className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
    <legend className="px-2 font-semibold text-gray-800">Chart of Accounts</legend>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Account / subcategory<select required className={input} value={value.accountCode.startsWith("custom:") ? "custom" : value.accountCode} onChange={e => {
        const a = ACCOUNTS.find(a => a.code === e.target.value);
        const previous = saved.find(a => a.accountCode === e.target.value);
        const accountGroup = a?.group ?? previous?.accountGroup ?? (groups.includes(value.accountGroup) ? value.accountGroup : defaultGroup);
        onChange({ ...value, accountGroup, accountCode: a?.code ?? previous?.accountCode ?? `custom:${accountGroup}:`, accountName: a?.name ?? previous?.accountName ?? "", accountDetail: "" });
      }}><option value="">Select account...</option>{groups.map(group => {
        const options = availableAccounts.filter(account => account.group === group);
        return options.length > 0 ? <optgroup key={group} label={group}>{options.map(account => <option key={account.code} value={account.code}>{account.name}</option>)}</optgroup> : null;
      })}{saved.map(a => <option key={a.accountCode} value={a.accountCode}>{a.accountName} (custom)</option>)}<option value="custom">Custom subcategory...</option></select></label>
      {value.accountCode.startsWith("custom:") && <label className="text-sm">Custom subcategory name<input required maxLength={100} className={input} value={value.accountName} onChange={e => onChange({ ...value, accountName: e.target.value, accountCode: `custom:${value.accountGroup}:${e.target.value.trim().toLowerCase()}` })} /></label>}
      {kind === "expense" && ["5080", "5090"].includes(value.accountCode) && <label className="text-sm">{value.accountCode === "5080" ? "Direct material details" : "Direct labour details"}<input required maxLength={120} className={input} value={value.accountDetail ?? ""} onChange={e => onChange({ ...value, accountDetail: e.target.value })} placeholder={value.accountCode === "5080" ? "Enter the material purchased or used" : "Enter the labour activity or worker details"} /></label>}
      <label className="text-sm">{kind === "sale" ? "Received into" : "Paid from"}<select required className={input} value={value.settlementCode} onChange={e => onChange({ ...value, settlementCode: e.target.value })}><option value="">Select cash / bank account...</option>{ACCOUNTS.filter(a => SETTLEMENT_CODES.includes(a.code)).map(a => <option key={a.code} value={a.code}>{a.name}</option>)}</select></label>
    </div>
  </fieldset>;
}
