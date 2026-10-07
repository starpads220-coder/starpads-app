import { ACCOUNTS, type buildAccounts } from "@/lib/accounts";
import { balanceSheetRows } from "@/lib/balance-sheet-sections";

type Report = ReturnType<typeof buildAccounts>;
export type JournalCategory = "Assets" | "Liabilities" | "Equity";
export type JournalSection = "Current Assets" | "Fixed Assets" | "Current Liabilities" | "Long-Term Liabilities" | "Equity";
export interface JournalLine { code: string; name: string; accountCode: string | null; reason?: string }

export const JOURNAL_STRUCTURE: Record<JournalCategory, Array<{ label: JournalSection; group: string }>> = {
  Assets: [{ label: "Current Assets", group: "Current Assets" }, { label: "Fixed Assets", group: "Non-Current Assets" }],
  Liabilities: [{ label: "Current Liabilities", group: "Current Liabilities" }, { label: "Long-Term Liabilities", group: "Non-Current Liabilities" }],
  Equity: [{ label: "Equity", group: "Equity" }],
};

export function journalLines(report: Report, section: JournalSection): JournalLine[] {
  const group = Object.values(JOURNAL_STRUCTURE).flat().find(item => item.label === section)?.group;
  if (!group) return [];
  return balanceSheetRows(report, group).map(row => {
    if (row.code === "balance-cash") return { code: row.code, name: row.name, accountCode: null, reason: "Cash combines physical cash and two mobile-money accounts. Choose a specific account through an existing journal entry; no mapping was assumed." };
    if (row.code === "3050") return { code: row.code, name: row.name, accountCode: null, reason: "Retained Earnings includes calculated profit and cannot be posted here without double counting." };
    if (row.code === "1830") return { code: row.code, name: row.name, accountCode: null, reason: "Accumulated Depreciation is updated through depreciation entries and is excluded to prevent double counting." };
    const accountCode = row.code === "balance-bank" ? "1000" : row.code === "balance-prepaid" ? "1320" : row.code;
    if (!ACCOUNTS.some(account => account.code === accountCode)) return { code: row.code, name: row.name, accountCode: null, reason: "No matching Chart of Accounts entry; mapping required." };
    return { code: row.code, name: row.name, accountCode };
  });
}

export function journalPathForCode(report: Report, accountCode: string) {
  for (const [category, sections] of Object.entries(JOURNAL_STRUCTURE) as Array<[JournalCategory, typeof JOURNAL_STRUCTURE[JournalCategory]]>) {
    for (const section of sections) {
      if (journalLines(report, section.label).some(line => line.accountCode === accountCode)) return { category, section: section.label };
    }
  }
  return null;
}
