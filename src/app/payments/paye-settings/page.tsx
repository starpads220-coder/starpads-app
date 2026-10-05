"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { showToast } from "@/components/ui/Toast";
import { calculateProgressivePaye, type PayeBand } from "@/lib/deductions";
import { PAYE_SETTINGS_REF, usePayeSettings } from "@/hooks/use-paye-settings";

export default function PayeSettingsPage() {
  const { userRole } = useAuth();
  const { bands, loading, error } = usePayeSettings();
  const canEdit = ["ADMIN", "FINANCIAL_MANAGER"].includes(userRole?.role ?? "");
  return <RouteGuard><div className="space-y-5">
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">PAYE Settings</h1><p className="text-sm text-gray-500">Monthly progressive bands. Edits affect future confirmations only.</p></div><Link href="/payments" className="text-sm text-blue-700 hover:underline">Back to Payments</Link></div>
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p>Loading settings…</p> : <PayeSettingsEditor key={JSON.stringify(bands)} bands={bands} canEdit={canEdit} error={error} updatedBy={userRole?.uid ?? ""} />}
  </div></RouteGuard>;
}

function PayeSettingsEditor({ bands, canEdit, error, updatedBy }: { bands: PayeBand[]; canEdit: boolean; error: string | null; updatedBy: string }) {
  const [draft, setDraft] = useState<PayeBand[]>(bands);
  const [saving, setSaving] = useState(false);

  const updateBand = (index: number, key: keyof PayeBand, value: number | null) => {
    setDraft(previous => previous.map((band, i) => i === index ? { ...band, [key]: value } : band));
  };

  const save = async () => {
    try {
      calculateProgressivePaye(0, draft);
      setSaving(true);
      await setDoc(doc(db, "payeSettings", PAYE_SETTINGS_REF), {
        bands: draft,
        updatedAt: serverTimestamp(),
        updatedBy,
      });
      showToast("PAYE bands saved. Confirmed payments are unchanged.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not save PAYE settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  return <div className="rounded-xl border bg-white p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3 text-sm font-semibold text-gray-600"><span>From (UGX)</span><span>To (UGX)</span><span>Rate (%)</span></div>
        {draft.map((band, index) => <div key={index} className="grid grid-cols-3 gap-3 items-center">
          <span className="text-sm">{index === 0 ? "0" : ((draft[index - 1].upperLimit ?? 0) + 1).toLocaleString()}</span>
          {index === draft.length - 1 ? <span className="text-sm">No upper limit</span> : <input aria-label={`Band ${index + 1} upper limit`} type="number" min="1" step="1" disabled={!canEdit} value={band.upperLimit ?? ""} onChange={e => updateBand(index, "upperLimit", Number(e.target.value))} className="w-full rounded-md border p-2 text-sm" />}
          <input aria-label={`Band ${index + 1} rate percent`} type="number" min="0" max="100" step="0.01" disabled={!canEdit} value={band.ratePercent} onChange={e => updateBand(index, "ratePercent", Number(e.target.value))} className="w-full rounded-md border p-2 text-sm" />
        </div>)}
        {canEdit && <button type="button" onClick={save} disabled={saving || !!error} className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saving…" : "Save bands"}</button>}
  </div>;
}
