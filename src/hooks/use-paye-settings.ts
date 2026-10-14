"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_NSSF_EMPLOYEE_RATE_PERCENT, DEFAULT_NSSF_EMPLOYER_RATE_PERCENT, DEFAULT_PAYE_BANDS, type PayeBand, calculateProgressivePaye } from "@/lib/deductions";

export const PAYE_SETTINGS_REF = "current";

export function usePayeSettings() {
  const [bands, setBands] = useState<PayeBand[]>(DEFAULT_PAYE_BANDS);
  const [loading, setLoading] = useState(!!db);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(false);
  const [nssfEmployeeRatePercent, setNssfEmployeeRatePercent] = useState(DEFAULT_NSSF_EMPLOYEE_RATE_PERCENT);
  const [nssfEmployerRatePercent, setNssfEmployerRatePercent] = useState(DEFAULT_NSSF_EMPLOYER_RATE_PERCENT);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, "payeSettings", PAYE_SETTINGS_REF), snapshot => {
      try {
        const saved = snapshot.data()?.bands as PayeBand[] | undefined;
        if (saved) calculateProgressivePaye(0, saved);
        setBands(saved ?? DEFAULT_PAYE_BANDS);
        setNssfEmployeeRatePercent(Number(snapshot.data()?.nssfEmployeeRatePercent) || DEFAULT_NSSF_EMPLOYEE_RATE_PERCENT);
        setNssfEmployerRatePercent(Number(snapshot.data()?.nssfEmployerRatePercent) || DEFAULT_NSSF_EMPLOYER_RATE_PERCENT);
        setConfigured(snapshot.exists());
        setError(null);
      } catch {
        setError("PAYE settings contain invalid bands. Payments are unavailable until corrected.");
      }
      setLoading(false);
    }, err => { setError(err.message); setLoading(false); });
  }, []);

  return { bands, nssfEmployeeRatePercent, nssfEmployerRatePercent, loading, error, configured };
}
