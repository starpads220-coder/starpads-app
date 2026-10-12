"use client";

import { useState } from "react";
import { NssfRemittanceCard } from "@/components/payments/NssfRemittanceCard";
import { PayeRemittanceCard } from "@/components/payments/PayeRemittanceCard";

export function StatutoryRemittancesCard() {
  const [tab, setTab] = useState<"paye" | "nssf">("paye");
  return <div className="space-y-3">
    <div className="inline-flex w-full rounded-lg border border-gray-200 bg-gray-100 p-1 sm:w-auto" role="tablist" aria-label="Statutory remittances">
      {([['paye', 'PAYE'], ['nssf', 'NSSF']] as const).map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`flex-1 rounded-md px-6 py-2 text-sm font-semibold transition sm:flex-none ${tab === value ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"}`}>{label}</button>)}
    </div>
    {/* Keep both forms mounted so switching tabs never discards unsaved input. */}
    <div className={tab === "paye" ? "block" : "hidden"}><PayeRemittanceCard /></div>
    <div className={tab === "nssf" ? "block" : "hidden"}><NssfRemittanceCard /></div>
  </div>;
}
