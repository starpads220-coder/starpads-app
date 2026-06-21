"use client";

import { useCallback } from "react";

export type PeriodType = "daily" | "weekly" | "monthly" | "6months" | "annually" | "custom";

export interface PeriodSelection {
  type: PeriodType;
  startDate: string;
  endDate: string;
  periodLabel: string;
}

interface PeriodSelectorProps {
  value: PeriodSelection;
  onChange: (selection: PeriodSelection) => void;
}

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "6months", label: "6 Months" },
  { value: "annually", label: "Annually" },
  { value: "custom", label: "Custom" },
];

function computeToday(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getWeekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getMonthRange(monthStr: string): { start: string; end: string } {
  const [year, month] = monthStr.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getSixMonthRange(endDate: string): { start: string; end: string } {
  const end = new Date(endDate + "T00:00:00");
  const start = new Date(end);
  start.setMonth(end.getMonth() - 6);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getYearRange(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function getDefaultSelection(): PeriodSelection {
  const today = computeToday();
  return { type: "daily", startDate: today, endDate: today, periodLabel: today };
}

function computeSelection(type: PeriodType, current: PeriodSelection, dateVal?: string, monthVal?: string, yearVal?: number, startVal?: string, endVal?: string): PeriodSelection {
  switch (type) {
    case "daily": {
      const d = dateVal || computeToday();
      return { type, startDate: d, endDate: d, periodLabel: formatDate(d) };
    }
    case "weekly": {
      const d = dateVal || computeToday();
      const range = getWeekRange(d);
      return { type, startDate: range.start, endDate: range.end, periodLabel: `Week of ${formatDate(range.start)}` };
    }
    case "monthly": {
      const m = monthVal || new Date().toISOString().slice(0, 7);
      const range = getMonthRange(m);
      const [y, mo] = m.split("-");
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      return { type, startDate: range.start, endDate: range.end, periodLabel: `${months[parseInt(mo)-1]} ${y}` };
    }
    case "6months": {
      const s = startVal || computeToday();
      const e = endVal || computeToday();
      const range = getSixMonthRange(e);
      return { type, startDate: range.start, endDate: e, periodLabel: `${formatDate(range.start)} to ${formatDate(e)}` };
    }
    case "annually": {
      const y = yearVal || new Date().getFullYear();
      const range = getYearRange(y);
      return { type, startDate: range.start, endDate: range.end, periodLabel: String(y) };
    }
    case "custom": {
      const s = startVal || computeToday();
      const e = endVal || computeToday();
      return { type, startDate: s, endDate: e, periodLabel: `${formatDate(s)} to ${formatDate(e)}` };
    }
    default:
      return current;
  }
}

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  const today = computeToday();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  const handleTypeChange = useCallback((type: PeriodType) => {
    onChange(computeSelection(type, value));
  }, [value, onChange]);

  const handleDateChange = useCallback((dateVal: string) => {
    onChange(computeSelection(value.type, value, dateVal));
  }, [value, onChange]);

  const handleMonthChange = useCallback((monthVal: string) => {
    onChange(computeSelection(value.type, value, undefined, monthVal));
  }, [value, onChange]);

  const handleYearChange = useCallback((yearVal: number) => {
    onChange(computeSelection(value.type, value, undefined, undefined, yearVal));
  }, [value, onChange]);

  const handleStartChange = useCallback((startVal: string) => {
    onChange(computeSelection(value.type, value, undefined, undefined, undefined, startVal, value.endDate));
  }, [value, onChange]);

  const handleEndChange = useCallback((endVal: string) => {
    onChange(computeSelection(value.type, value, undefined, undefined, undefined, value.startDate, endVal));
  }, [value, onChange]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleTypeChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              value.type === opt.value
                ? "bg-gray-900 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {value.type === "daily" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
            <input type="date" value={value.startDate} onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
        )}

        {value.type === "weekly" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Any day in week</label>
            <input type="date" value={value.startDate} onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
        )}

        {value.type === "monthly" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
            <input type="month" value={value.startDate.slice(0, 7)} onChange={(e) => handleMonthChange(e.target.value)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
          </div>
        )}

        {value.type === "6months" && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input type="date" value={value.endDate} onChange={(e) => handleEndChange(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <span className="text-xs text-gray-400 pb-1.5">(last 6 months)</span>
          </>
        )}

        {value.type === "annually" && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Year</label>
            <select value={value.startDate.slice(0, 4)} onChange={(e) => handleYearChange(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm">
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}

        {value.type === "custom" && (
          <>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input type="date" value={value.startDate} onChange={(e) => handleStartChange(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
              <input type="date" value={value.endDate} onChange={(e) => handleEndChange(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm" />
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-400 font-medium">
        Period: {value.periodLabel}
      </p>
    </div>
  );
}
