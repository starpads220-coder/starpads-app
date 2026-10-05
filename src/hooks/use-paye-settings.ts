"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DEFAULT_PAYE_BANDS, type PayeBand, calculateProgressivePaye } from "@/lib/deductions";

export const PAYE_SETTINGS_REF = "current";

export function usePayeSettings() {
  const [bands, setBands] = useState<PayeBand[]>(DEFAULT_PAYE_BANDS);
  const [loading, setLoading] = useState(!!db);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) return;
    return onSnapshot(doc(db, "payeSettings", PAYE_SETTINGS_REF), snapshot => {
      try {
        const saved = snapshot.data()?.bands as PayeBand[] | undefined;
        if (saved) calculateProgressivePaye(0, saved);
        setBands(saved ?? DEFAULT_PAYE_BANDS);
        setError(null);
      } catch {
        setError("PAYE settings contain invalid bands. Payments are unavailable until corrected.");
      }
      setLoading(false);
    }, err => { setError(err.message); setLoading(false); });
  }, []);

  return { bands, loading, error };
}
