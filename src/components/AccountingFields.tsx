"use client";
import { ACCOUNTS, SALES_ENTRY_ACCOUNT_CODES, SETTLEMENT_CODES, type AccountingSelection, type AccountGroup } from "@/lib/accounts";
import { useRealtimeCollection } from "@/hooks/use-firestore-query";
export function AccountingFields({ value, onChange, kind }: { value: AccountingSelection; onChange: (v: AccountingSelection) => void; kind: "sale" | "expense" }) {
  const groups: AccountGroup[] = kind === "sale" ? ["Income", "Other Income"] : ["Cost of Sales", "Expenses"];
  const { data } = useRealtimeCollection<{ accounting?: AccountingSelection }>(kind === "sale" ? "saleTransactions" : "expenses");
  const saved = [...new Map(data.flatMap(row => row.accounting?.accountCode.startsWith("custom:") && row.accounting.accountGroup === value.accountGroup ? [[row.accounting.accountCode, row.accounting] as const] : [])).values()];
  const input = "w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm";
  return <fieldset className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
    <legend className="px-2 font-semibold text-gray-800">Chart of Accounts</legend>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Accounting category<select required className={input} value={value.accountGroup} onChange={e => onChange({ ...value, accountGroup: e.target.value as AccountGroup, accountCode: "", accountName: "" })}>{groups.map(g => <option key={g}>{g}</option>)}</select></label>
      <label className="text-sm">Account / subcategory<select required className={input} value={value.accountCode.startsWith("custom:") ? "custom" : value.accountCode} onChange={e => {
        const a = ACCOUNTS.find(a => a.code === e.target.value);
        const previous = saved.find(a => a.accountCode === e.target.value);
        onChange({ ...value, accountCode: a?.code ?? previous?.accountCode ?? "custom:", accountName: a?.name ?? previous?.accountName ?? "" });
      }}><option value="">Select account...</option>{ACCOUNTS.filter(a => a.group === value.accountGroup && (kind !== "sale" || SALES_ENTRY_ACCOUNT_CODES.includes(a.code as typeof SALES_ENTRY_ACCOUNT_CODES[number]))).map(a => <option key={a.code} value={a.code}>{a.code} — {a.name}</option>)}{saved.map(a => <option key={a.accountCode} value={a.accountCode}>{a.accountName} (custom)</option>)}<option value="custom">Custom subcategory...</option></select></label>
      {value.accountCode.startsWith("custom:") && <label className="text-sm">Custom subcategory name<input required maxLength={100} className={input} value={value.accountName} onChange={e => onChange({ ...value, accountName: e.target.value, accountCode: `custom:${value.accountGroup}:${e.target.value.trim().toLowerCase()}` })} /></label>}
      <label className="text-sm">{kind === "sale" ? "Received into" : "Paid from"}<select required className={input} value={value.settlementCode} onChange={e => onChange({ ...value, settlementCode: e.target.value })}><option value="">Select cash / bank account...</option>{ACCOUNTS.filter(a => SETTLEMENT_CODES.includes(a.code)).map(a => <option key={a.code} value={a.code}>{a.name}</option>)}</select></label>
    </div>
  </fieldset>;
}
