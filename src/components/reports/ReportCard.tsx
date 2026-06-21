"use client";

import { useState, useCallback } from "react";
import { PeriodSelector, type PeriodSelection, getDefaultSelection } from "./PeriodSelector";

interface ReportCardProps {
  title: string;
  subtitle?: string;
  onGenerate: (selection: PeriodSelection) => Promise<void>;
}

export function ReportCard({ title, subtitle, onGenerate }: ReportCardProps) {
  const [selection, setSelection] = useState<PeriodSelection>(getDefaultSelection);
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await onGenerate(selection);
    } finally {
      setGenerating(false);
    }
  }, [selection, onGenerate]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      <div className="mt-4">
        <PeriodSelector value={selection} onChange={setSelection} />
      </div>
      <div className="mt-4">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="rounded-md bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {generating ? "Generating..." : "Download PDF"}
        </button>
      </div>
    </div>
  );
}
