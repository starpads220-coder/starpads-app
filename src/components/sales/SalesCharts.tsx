"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import type { SaleTransaction, Expense, SalesTarget } from "@/types";
import { MultiLineAreaChart } from "@/components/charts/MultiLineAreaChart";
import { StackedColumnChart } from "@/components/charts/StackedColumnChart";
import { VerticalBarChart } from "@/components/charts/VerticalBarChart";
import { ChartCard } from "@/components/ui/ChartCard";
import {
  palette,
  formatCurrency,
  formatCompact,
  animationConfig,
} from "@/components/charts";

function getFriendlyDate(dateKey: string) {
  const date = new Date(`${dateKey}T00:00:00`);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getWeekRangeLabel(start: Date, end: Date) {
  const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const e = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${s} - ${e}`;
}

const colorWheel = [
  "#EF4444",
  "#F97316",
  "#FBBF24",
  "#84CC16",
  "#3B82F6",
  "#A855F7",
  "#EC4899",
  "#14B8A6",
  "#06B6D4",
];

const paymentColorMap: Record<string, string> = {
  CASH: "#22C55E",
  MOBILE_MONEY: "#A855F7",
  BANK_TRANSFER: "#F97316",
};

interface GlassTooltipProps {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; color?: string }>;
  label?: string;
  formatter?: (value: number) => string;
}

function GlassTooltip({ active, payload, label, formatter }: GlassTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-100/80 bg-white/95 px-4 py-3 shadow-xl backdrop-blur-sm" style={{ minWidth: 120 }}>
      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{label}</p>
      <div className="space-y-1">
        {payload.map((entry, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-[11px] font-semibold text-slate-600">{entry.name}</span>
            </div>
            <span className="text-[11px] font-black text-slate-900">
              {formatter && typeof entry.value === "number" ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CircularGauge({
  percent,
  value,
  target,
  color = palette.violet,
  size = 130,
}: {
  percent: number;
  value: number;
  target: number;
  color?: string;
  size?: number;
}) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - Math.min(percent, 100) / 100 * circumference;
  const clamped = Math.min(percent, 100);

  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id="gaugeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity={0.7} />
              <stop offset="100%" stopColor={color} stopOpacity={1} />
            </linearGradient>
            <filter id="gaugeGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.3" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#gaugeArcGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
              filter: "url(#gaugeGlow)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[28px] font-black text-slate-900 leading-none tracking-tight">
            {clamped}%
          </span>
          <span className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
            of target
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-[10px] font-semibold text-slate-500">
        <span>{formatCurrency(value)}</span>
        <span className="text-slate-300 mx-1">/</span>
        <span>{formatCurrency(target)}</span>
      </div>
    </div>
  );
}

function SemiCircularGauge({
  percent,
  value,
  label,
}: {
  percent: number;
  value: number;
  label: string;
}) {
  const size = 200;
  const strokeWidth = 14;
  const radius = 70;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(percent, 100));
  const offset = circumference - clamped / 100 * circumference;

  const stopColor = clamped >= 20 ? "#84CC16" : clamped >= 10 ? "#F97316" : "#EF4444";

  return (
    <div className="flex flex-col items-center justify-center flex-1">
      <div className="relative" style={{ width: size, height: size * 0.6 }}>
        <svg width={size} height={size * 0.6} viewBox={`0 0 ${size} ${size * 0.6}`}>
          <defs>
            <linearGradient id="semiGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={stopColor} stopOpacity={0.6} />
              <stop offset="100%" stopColor={stopColor} stopOpacity={1} />
            </linearGradient>
            <filter id="semiGlow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComponentTransfer in="blur" result="glow">
                <feFuncA type="linear" slope="0.25" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d={`M ${strokeWidth / 2} ${size * 0.5} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size * 0.5}`}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={`M ${strokeWidth / 2} ${size * 0.5} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size * 0.5}`}
            fill="none"
            stroke="url(#semiGaugeGrad)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
              filter: "url(#semiGlow)",
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ paddingTop: 8 }}>
          <span className="text-[32px] font-black text-slate-900 leading-none tracking-tight">
            {clamped.toFixed(2)}%
          </span>
          <span className="text-[8px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
            {label}
          </span>
        </div>
      </div>
      <div className="mt-2 text-[10px] font-semibold text-slate-500 text-center leading-relaxed">
        Total Profit: {formatCurrency(value)}
      </div>
    </div>
  );
}

function DonutWithLegend({
  data,
  total,
  formatValue = formatCurrency,
}: {
  data: { name: string; value: number; color: string }[];
  total: number;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-slate-400 font-semibold">
        No sales data yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 flex-1">
      <div className="relative shrink-0" style={{ width: 110, height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={38}
              outerRadius={52}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
              animationDuration={animationConfig.pie.duration}
            >
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={<GlassTooltip formatter={formatValue} />}
              cursor={{ fill: "rgba(15,23,42,0.03)" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[16px] font-black text-slate-900 leading-none">
            {formatCompact(total)}
          </span>
          <span className="text-[7px] font-bold text-slate-400 mt-0.5 uppercase tracking-widest">
            total
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {data.map((d) => {
          const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0";
          return (
            <div key={d.name} className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-sm"
                style={{ width: 8, height: 8, backgroundColor: d.color }}
              />
              <span className="text-[10px] font-semibold text-slate-500 flex-1 truncate">
                {d.name}
              </span>
              <span className="text-[10px] font-bold text-slate-800">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColoredHorizBarChart({
  data,
  formatter = formatCurrency,
  emptyMessage = "No data",
}: {
  data: { label: string; value: number; color: string }[];
  formatter?: (v: number) => string;
  emptyMessage?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-slate-400 font-semibold">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="flex-1" style={{ minHeight: 0 }}>
      <ResponsiveContainer width="100%" height={data.length * 42 + 20}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
          barSize={18}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" hide />
          <YAxis
            dataKey="label"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fontWeight: 700, fill: "#64748b" }}
            width={90}
          />
          <Tooltip
            content={<GlassTooltip formatter={formatter} />}
            cursor={{ fill: "rgba(15,23,42,0.03)" }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} animationDuration={animationConfig.bar.duration}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function SparklineRevenueCard({
  daily,
  weekly,
  monthly,
  avgTicket,
  sparkline,
}: {
  daily: number;
  weekly: number;
  monthly: number;
  avgTicket: number;
  sparkline: number[];
}) {
  const maxVal = Math.max(...sparkline, 1);
  const today = new Date().getDay();

  const metrics = [
    { label: "Today", value: daily },
    { label: "This Week", value: weekly },
    { label: "This Month", value: monthly },
  ];

  return (
    <div className="flex flex-col flex-1 gap-3">
      <div className="flex items-end gap-[3px]" style={{ height: 52 }}>
        {sparkline.map((val, i) => {
          const h = (val / maxVal) * 48;
          const dayOfWeek = (i + 1) % 7;
          const isToday = dayOfWeek === today;
          return (
            <div
              key={i}
              className="flex-1 rounded-sm transition-all duration-500"
              style={{
                height: Math.max(h, 2),
                background: isToday
                  ? "linear-gradient(to top, #7c3aed, #a78bfa)"
                  : "linear-gradient(to top, #e2e8f0, #f1f5f9)",
                boxShadow: isToday ? "0 2px 8px rgba(124,58,237,0.25)" : "none",
              }}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 text-center">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{m.label}</p>
            <p className="text-[13px] font-black text-slate-900 mt-0.5">{formatCompact(m.value)}</p>
          </div>
        ))}
      </div>
      <div className="mt-auto pt-1 flex items-center justify-between border-t border-slate-100">
        <span className="text-[9px] font-semibold text-slate-400">Avg Ticket</span>
        <span className="text-[11px] font-bold text-slate-800">{formatCurrency(avgTicket)}</span>
      </div>
    </div>
  );
}

interface SalesChartsProps {
  transactions: SaleTransaction[];
  expenses: Expense[];
  salesTargets?: SalesTarget[];
}

export default function SalesCharts({ transactions, expenses, salesTargets = [] }: SalesChartsProps) {
  const now = useMemo(() => new Date(), []);

  const revenueByDate = useMemo(() => {
    const map = new Map<string, number>();
    transactions.forEach((t) => map.set(t.date, (map.get(t.date) || 0) + t.totalAmount));
    return map;
  }, [transactions]);

  const expensesByDate = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => map.set(e.date, (map.get(e.date) || 0) + e.amountUgx));
    return map;
  }, [expenses]);

  const last30Revenue = useMemo(() => {
    const points: Array<{ label: string; revenue: number; expenses: number; profit: number }> = [];
    for (let i = 29; i >= 0; i -= 1) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dateKey = day.toISOString().split("T")[0];
      const revenue = revenueByDate.get(dateKey) || 0;
      const expense = expensesByDate.get(dateKey) || 0;
      points.push({
        label: getFriendlyDate(dateKey),
        revenue,
        expenses: expense,
        profit: revenue - expense,
      });
    }
    return points;
  }, [revenueByDate, expensesByDate]);

  const last7WeeksData = useMemo(() => {
    const points: Array<{ label: string; revenue: number }> = [];
    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() - i * 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const weeklyTotal = transactions.reduce((sum, t) => {
        if (
          t.date >= start.toISOString().split("T")[0] &&
          t.date <= end.toISOString().split("T")[0]
        ) {
          return sum + t.totalAmount;
        }
        return sum;
      }, 0);
      points.push({ label: getWeekRangeLabel(start, end), revenue: weeklyTotal });
    }
    return points;
  }, [transactions, now]);

  const typeData = useMemo(() => {
    const typeTotals: Record<string, number> = {};
    transactions.forEach((t) => {
      typeTotals[t.customerType] = (typeTotals[t.customerType] || 0) + t.totalAmount;
    });
    const typeColors: Record<string, string> = {
      RETAIL: "#F97316",
      BULK: "#A855F7",
      AGENT: "#22C55E",
    };
    return Object.entries(typeTotals).map(([name, value]) => ({
      name: name === "RETAIL" ? "Retail" : name === "BULK" ? "Bulk" : "Agent",
      value,
      color: typeColors[name] || palette.grey,
    }));
  }, [transactions]);

  const totalRevenue = useMemo(
    () => transactions.reduce((s, t) => s + t.totalAmount, 0),
    [transactions],
  );

  const totalExpenses = useMemo(
    () => expenses.reduce((s, e) => s + e.amountUgx, 0),
    [expenses],
  );

  const totalProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  const paymentData = useMemo(() => {
    const paymentTotals: Record<string, number> = {};
    transactions.forEach((t) => {
      paymentTotals[t.paymentMethod] = (paymentTotals[t.paymentMethod] || 0) + t.totalAmount;
    });
    return Object.entries(paymentTotals)
      .map(([name, value]) => ({
        label: name
          .replace(/_/g, " ")
          .toLowerCase()
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        value,
        color: paymentColorMap[name] || palette.grey,
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const packSizeData = useMemo(() => {
    const points: Array<{ label: string; HALF_DOZEN: number; DOZEN: number; CARTON: number }> =
      [];
    for (let i = 29; i >= 0; i -= 1) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const dateKey = day.toISOString().split("T")[0];
      const dayTxs = transactions.filter((t) => t.date === dateKey);
      points.push({
        label: getFriendlyDate(dateKey),
        HALF_DOZEN: dayTxs
          .filter((t) => t.packSize === "HALF_DOZEN")
          .reduce((s, t) => s + t.quantitySold, 0),
        DOZEN: dayTxs
          .filter((t) => t.packSize === "DOZEN")
          .reduce((s, t) => s + t.quantitySold, 0),
        CARTON: dayTxs
          .filter((t) => t.packSize === "CARTON")
          .reduce((s, t) => s + t.quantitySold, 0),
      });
    }
    return points;
  }, [transactions]);

  const topCustomers = useMemo(() => {
    const customerTotals: Record<string, number> = {};
    transactions.forEach((t) => {
      customerTotals[t.customerName] =
        (customerTotals[t.customerName] || 0) + t.totalAmount;
    });
    return Object.entries(customerTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, amount], i) => ({
        label: name,
        value: amount,
        color: colorWheel[i % colorWheel.length],
      }));
  }, [transactions]);

  const today = new Date().toISOString().split("T")[0];
  const dailyRevenue = useMemo(
    () =>
      transactions
        .filter((t) => t.date === today)
        .reduce((s, t) => s + t.totalAmount, 0),
    [transactions, today],
  );

  const avgTicket = useMemo(
    () => (transactions.length > 0 ? totalRevenue / transactions.length : 0),
    [transactions, totalRevenue],
  );

  const weekStart = useMemo(() => {
    const d = new Date(now);
    d.setDate(now.getDate() - now.getDay());
    return d;
  }, [now]);

  const weeklyRevenue = useMemo(
    () =>
      transactions
        .filter((t) => t.date >= weekStart.toISOString().split("T")[0])
        .reduce((s, t) => s + t.totalAmount, 0),
    [transactions, weekStart],
  );

  const monthStart = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 1),
    [now],
  );

  const monthlyRevenue = useMemo(
    () =>
      transactions
        .filter((t) => t.date >= monthStart.toISOString().split("T")[0])
        .reduce((s, t) => s + t.totalAmount, 0),
    [transactions, monthStart],
  );

  const year = now.getFullYear().toString();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  const half = month <= 6 ? 1 : 2;
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const quarterStr = `Q${quarter}`;
  const halfStr = `H${half}`;
  const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const currentMonthName = monthNames[month - 1];

  const matchesPeriod = (ref: string, strict: string, flexible: string[]) =>
    ref.startsWith(strict) || flexible.some((f) => ref.toLowerCase().includes(f));

  const currentTarget = useMemo(() => {
    const targets = salesTargets ?? [];

    const annualTarget = targets.find(
      (t) => t.targetType === "ANNUAL" && t.periodReference.startsWith(year)
    );
    if (annualTarget) return { amount: annualTarget.targetAmount / 12, label: "Annual" };

    const sixMonthTarget = targets.find(
      (t) => t.targetType === "SIX_MONTHS" && (
        t.periodReference.includes(halfStr) ||
        (half === 1 && matchesPeriod(t.periodReference, "", ["january", "jan", "first half", "h1"])) ||
        (half === 2 && matchesPeriod(t.periodReference, "", ["july", "jul", "second half", "h2"]))
      )
    );
    if (sixMonthTarget) return { amount: sixMonthTarget.targetAmount / 6, label: "6-Month" };

    const quarterlyTarget = targets.find(
      (t) => t.targetType === "QUARTERLY" && (
        t.periodReference.includes(quarterStr) ||
        t.periodReference.includes(`quarter ${quarter}`)
      )
    );
    if (quarterlyTarget) return { amount: quarterlyTarget.targetAmount / 3, label: "Quarterly" };

    const monthlyTarget = targets.find((t) => {
      if (t.targetType !== "MONTHLY") return false;
      const ref = t.periodReference;
      return ref.startsWith(monthStr) ||
        ref === year ||
        ref.toLowerCase().includes(currentMonthName) ||
        ref.toLowerCase().includes(currentMonthName.slice(0, 3));
    });
    if (monthlyTarget) return { amount: monthlyTarget.targetAmount, label: "Monthly" };

    return null;
  }, [salesTargets, year, monthStr, quarterStr, halfStr, currentMonthName]);

  const monthlyTargetAmount = currentTarget?.amount ?? 0;
  const monthlyProgress =
    monthlyTargetAmount > 0
      ? Math.min(Math.round((monthlyRevenue / monthlyTargetAmount) * 100), 100)
      : 0;

  const revenueSparkline = useMemo(() => {
    const bars: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(day.getDate() - i);
      const key = day.toISOString().split("T")[0];
      bars.push(revenueByDate.get(key) || 0);
    }
    return bars;
  }, [revenueByDate]);

  const typeTotal = typeData.reduce((s, d) => s + d.value, 0);

  const emptyLabel = "No sales data yet — record a sale to get started.";

  return (
    <>
      <svg className="absolute w-0 h-0" aria-hidden>
        <defs>
          <linearGradient id="weeklyBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A855F7" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#A855F7" stopOpacity={0.5} />
          </linearGradient>
          <linearGradient id="revenueAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#EF4444" stopOpacity={0.01} />
          </linearGradient>
          <linearGradient id="expensesAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01} />
          </linearGradient>
          <filter id="areaLineGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComponentTransfer in="blur" result="glow">
              <feFuncA type="linear" slope="0.3" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="glow" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 min-h-0">
            <MultiLineAreaChart
              data={last30Revenue}
              series={[
                { dataKey: "revenue", name: "Revenue", color: "#EF4444", gradientId: "revGrad" },
                { dataKey: "expenses", name: "Expenses", color: "#3B82F6", gradientId: "expGrad" },
              ]}
              title="Revenue Trend"
              subtitle="30-day revenue vs expenses"
              height={220}
              badge={dailyRevenue > 0 ? { label: "Today", value: formatCurrency(dailyRevenue), color: "green" } : undefined}
            />
          </div>

          <ChartCard
            title="Monthly Target"
            subtitle={currentTarget ? `${currentTarget.label} target (${formatCurrency(currentTarget.amount)}/mo)` : "No target configured for this period"}
            variant="gradient"
            badge={monthlyRevenue > 0 ? { label: "Actual", value: formatCurrency(monthlyRevenue), color: "purple" } : undefined}
          >
            {transactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[11px] text-slate-400 font-semibold text-center px-4">
                {emptyLabel}
              </div>
            ) : (
              <CircularGauge
                percent={monthlyProgress}
                value={monthlyRevenue}
                target={monthlyTargetAmount}
                color={monthlyProgress >= 80 ? "#22C55E" : monthlyProgress >= 50 ? "#A855F7" : "#FBBF24"}
              />
            )}
          </ChartCard>

          <ChartCard
            title="Profit Margin"
            subtitle="Net profit as % of revenue"
            variant="gradient"
            badge={totalRevenue > 0 ? { label: "Net Profit", value: formatCurrency(totalProfit), color: profitMargin >= 20 ? "green" : profitMargin >= 10 ? "amber" : "red" } : undefined}
          >
            {transactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[11px] text-slate-400 font-semibold text-center px-4">
                {emptyLabel}
              </div>
            ) : (
              <SemiCircularGauge percent={profitMargin} value={totalProfit} label="margin" />
            )}
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard
            title="Sales Mix"
            subtitle="Revenue by customer type"
            variant="gradient"
          >
            <DonutWithLegend data={typeData} total={typeTotal} />
          </ChartCard>

          <ChartCard
            title="Payment Methods"
            subtitle="Revenue by payment channel"
            variant="gradient"
          >
            <ColoredHorizBarChart
              data={paymentData}
              emptyMessage={emptyLabel}
            />
          </ChartCard>

          <StackedColumnChart
            data={packSizeData}
              series={[
                { dataKey: "HALF_DOZEN", name: "Half Dozen", color: "#EF4444", stackId: "a" },
                { dataKey: "DOZEN", name: "Dozen", color: "#FBBF24", stackId: "a" },
                { dataKey: "CARTON", name: "Carton", color: "#84CC16", stackId: "a" },
              ]}
            title="Pack Size Volume"
            subtitle="Daily units sold by pack size"
            height={220}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <ChartCard
            title="Top Customers"
            subtitle="Highest revenue contributors"
            variant="gradient"
            badge={topCustomers.length > 0 ? { label: "Total", value: topCustomers.length.toString(), color: "blue" } : undefined}
          >
            <ColoredHorizBarChart
              data={topCustomers}
              emptyMessage={emptyLabel}
            />
          </ChartCard>

          <VerticalBarChart
            data={last7WeeksData}
            series={[{ dataKey: "revenue", name: "Revenue", color: "url(#weeklyBarGrad)" }]}
            title="Weekly Revenue"
            subtitle="7-week trend"
            height={220}
            showLegend={false}
          />

          <ChartCard
            title="Revenue Overview"
            subtitle="Daily, weekly & monthly snapshot"
            variant="gradient"
            badge={transactions.length > 0 ? { label: "Transactions", value: transactions.length.toString(), color: "teal" } : undefined}
          >
            {transactions.length === 0 ? (
              <div className="flex items-center justify-center h-full text-[11px] text-slate-400 font-semibold text-center px-4">
                {emptyLabel}
              </div>
            ) : (
              <SparklineRevenueCard
                daily={dailyRevenue}
                weekly={weeklyRevenue}
                monthly={monthlyRevenue}
                avgTicket={avgTicket}
                sparkline={revenueSparkline}
              />
            )}
          </ChartCard>
        </div>
      </div>
    </>
  );
}
