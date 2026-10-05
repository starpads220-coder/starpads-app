export type AccountPeriodKey = "week" | "month" | "12months" | "custom";

export interface AccountPeriodRange {
  key: AccountPeriodKey;
  start: string;
  end: string;
  label: string;
}

const EAT_TIME_ZONE = "Africa/Nairobi";

function datePartsInEat(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: "year" | "month" | "day") => Number(parts.find(item => item.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day") };
}

const keyFromUtc = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
const utcFromKey = (key: string) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
};

export function todayInEat(date = new Date()): string {
  const { year, month, day } = datePartsInEat(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function addCalendarDays(key: string, days: number): string {
  const date = utcFromKey(key);
  date.setUTCDate(date.getUTCDate() + days);
  return keyFromUtc(date);
}

export function formatAccountDate(key: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return key;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: EAT_TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(utcFromKey(key));
}

export function resolveAccountPeriod(key: AccountPeriodKey, customStart = "", customEnd = "", now = new Date()): AccountPeriodRange {
  if (key === "custom") {
    const label = customStart && customEnd ? `${formatAccountDate(customStart)} to ${formatAccountDate(customEnd)}` : "Custom period";
    return { key, start: customStart, end: customEnd, label };
  }
  const today = todayInEat(now);
  const current = utcFromKey(today);
  let start = today;
  let end = today;
  if (key === "week") {
    const mondayOffset = (current.getUTCDay() + 6) % 7;
    start = addCalendarDays(today, -mondayOffset);
    end = addCalendarDays(start, 6);
  } else if (key === "month") {
    start = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}-01`;
    end = keyFromUtc(new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + 1, 0, 12)));
  } else {
    const priorYear = new Date(current);
    priorYear.setUTCFullYear(priorYear.getUTCFullYear() - 1);
    start = addCalendarDays(keyFromUtc(priorYear), 1);
  }
  return { key, start, end, label: `${formatAccountDate(start)} to ${formatAccountDate(end)}` };
}

export function accountPeriodError(range: AccountPeriodRange): string {
  if (!range.start || !range.end) return "Select both a start date and an end date for the custom period.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(range.start) || !/^\d{4}-\d{2}-\d{2}$/.test(range.end)) return "Enter valid start and end dates.";
  if (range.start > range.end) return "The custom start date must be on or before the end date.";
  return "";
}

export function comparisonAccountPeriods(range: AccountPeriodRange): Array<{ label: string; start: string; end: string }> {
  if (range.key === "custom") return [{ label: range.label, start: range.start, end: range.end }];
  const shift = range.key === "week" ? 7 : range.key === "month" ? 0 : 0;
  return [2, 1, 0].map(offset => {
    if (range.key === "week") {
      const start = addCalendarDays(range.start, -offset * shift);
      const end = addCalendarDays(range.end, -offset * shift);
      return { label: `${formatAccountDate(start)} – ${formatAccountDate(end)}`, start, end };
    }
    if (range.key === "month") {
      const active = utcFromKey(range.start);
      const startDate = new Date(Date.UTC(active.getUTCFullYear(), active.getUTCMonth() - offset, 1, 12));
      const endDate = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, 0, 12));
      const start = keyFromUtc(startDate);
      const end = keyFromUtc(endDate);
      return { label: new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: EAT_TIME_ZONE }).format(startDate), start, end };
    }
    const start = utcFromKey(range.start);
    const end = utcFromKey(range.end);
    start.setUTCFullYear(start.getUTCFullYear() - offset);
    end.setUTCFullYear(end.getUTCFullYear() - offset);
    return { label: `${formatAccountDate(keyFromUtc(start))} – ${formatAccountDate(keyFromUtc(end))}`, start: keyFromUtc(start), end: keyFromUtc(end) };
  });
}

