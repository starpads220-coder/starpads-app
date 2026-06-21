"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ProductionEntry, Employee, StageId, STAGE_LABELS } from "@/types";
import { ChartCard } from "@/components/ui/ChartCard";
import { SingleDonutChart } from "@/components/charts/SingleDonutChart";
import { ScreenReadersBarChart } from "@/components/charts/ScreenReadersBarChart";
import { TransactionValueChart } from "@/components/charts/TransactionValueChart";
import { palette, formatCurrency } from "@/components/charts";

export default function WorkerPerformanceDashboard() {
  const params = useParams();
  const id = params.id as string;

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [entries, setEntries] = useState<ProductionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    getDoc(doc(db, "employees", id)).then((snap) => {
      if (snap.exists()) {
        setEmployee({ id: snap.id, ...snap.data() } as Employee);
      }
    });

    const unsub = onSnapshot(
      query(collection(db, "productionEntries"), where("employeeId", "==", id), orderBy("date", "desc"), limit(200)),
      (snap) => {
        setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionEntry)));
        setLoading(false);
      },
      (err) => {
        console.error("productionEntries listener error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [id]);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const dateBounds = useMemo(() => {
    const now = new Date();
    const wStart = new Date(now);
    wStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = wStart.toISOString().split("T")[0];
    const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    return { weekStartStr, monthStartStr };
  }, []);

  const todayEntries = useMemo(() => entries.filter((e) => e.date === today), [entries, today]);
  const weeklyEntries = useMemo(() => entries.filter((e) => e.date >= dateBounds.weekStartStr), [entries, dateBounds.weekStartStr]);
  const monthlyEntries = useMemo(() => entries.filter((e) => e.date >= dateBounds.monthStartStr), [entries, dateBounds.monthStartStr]);

  const todayActual = useMemo(() => todayEntries.reduce((s, e) => s + e.actualPieces, 0), [todayEntries]);
  const todayTarget = useMemo(() => todayEntries.reduce((s, e) => s + e.targetPieces, 0), [todayEntries]);
  const todayPerf = useMemo(() => todayTarget > 0 ? Math.round((todayActual / todayTarget) * 100) : 0, [todayActual, todayTarget]);

  const weekOutput = useMemo(() => weeklyEntries.reduce((s, e) => s + e.actualPieces, 0), [weeklyEntries]);
  const weekEarnings = useMemo(() => weeklyEntries.reduce((s, e) => s + e.earningsUgx, 0), [weeklyEntries]);

  const monthOutput = useMemo(() => monthlyEntries.reduce((s, e) => s + e.actualPieces, 0), [monthlyEntries]);
  const monthEarnings = useMemo(() => monthlyEntries.reduce((s, e) => s + e.earningsUgx, 0), [monthlyEntries]);

  const monthTargetPieces = useMemo(() => monthlyEntries.reduce((s, e) => s + e.targetPieces, 0), [monthlyEntries]);
  const monthProgress = useMemo(() => monthTargetPieces > 0 ? Math.round((monthOutput / monthTargetPieces) * 100) : 0, [monthOutput, monthTargetPieces]);

  const { trendData, isUnderperforming } = useMemo(() => {
    const data: { date: string; performance: number }[] = [];
    let consecutiveLow = 0;

    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];

      const dayEntries = entries.filter((e) => e.date === dateStr);
      if (dayEntries.length > 0) {
        const dayActual = dayEntries.reduce((s, e) => s + e.actualPieces, 0);
        const dayTarget = dayEntries.reduce((s, e) => s + e.targetPieces, 0);
        const perf = dayTarget > 0 ? Math.round((dayActual / dayTarget) * 100) : 0;
        data.push({ date: dateStr.slice(5), performance: perf });
        if (perf < 70) {
          consecutiveLow++;
        } else {
          consecutiveLow = 0;
        }
      } else {
        data.push({ date: dateStr.slice(5), performance: 0 });
        consecutiveLow = 0;
      }
    }

    return { trendData: data, isUnderperforming: consecutiveLow >= 3 };
  }, [entries]);

  const workerStageData = useMemo(() => {
    const stageMap: Record<string, number> = {};
    entries.forEach((e) => {
      const sid = e.stageId as StageId;
      const label = STAGE_LABELS[sid] || sid;
      stageMap[label] = (stageMap[label] || 0) + e.actualPieces;
    });
    return Object.entries(stageMap)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  const weekBarData = useMemo(() => {
    const data: { label: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const dayTotal = entries.filter(e => e.date === dateStr).reduce((s, e) => s + e.actualPieces, 0);
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
      data.push({ label: dayName, value: dayTotal });
    }
    return data;
  }, [entries]);

  const dailyStats = useMemo(() => {
    const monthDays = new Set(monthlyEntries.map(e => e.date)).size;
    const monthTotal = monthlyEntries.reduce((s, e) => s + e.actualPieces, 0);
    const avgOutput = monthDays > 0 ? Math.round(monthTotal / monthDays) : 0;
    const withPerf = monthlyEntries.filter(e => e.performancePct > 0);
    const avgPerf = withPerf.length > 0
      ? Math.round(withPerf.reduce((s, e) => s + e.performancePct, 0) / withPerf.length)
      : 0;
    const byDate: Record<string, number> = {};
    entries.forEach(e => {
      byDate[e.date] = (byDate[e.date] || 0) + e.actualPieces;
    });
    let bestDayPieces = 0;
    Object.values(byDate).forEach(v => { if (v > bestDayPieces) bestDayPieces = v; });
    const totalDays = new Set(entries.map(e => e.date)).size;
    return { avgOutput, avgPerf, bestDayPieces, totalDays, monthDays };
  }, [entries, monthlyEntries]);

  const trendChartData = useMemo(() => trendData.map(d => ({ label: d.date, value: d.performance })), [trendData]);

  const perfColor = todayPerf >= 100 ? palette.emerald : todayPerf >= 70 ? palette.yellow : palette.red;
  const maxWeekBar = Math.max(...weekBarData.map(d => d.value), 1);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading dashboard...</div>;
  if (!employee) return <div className="p-8 text-center text-red-500">Employee not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
          <p className="text-sm text-gray-500">{employee.role.replace(/_/g, " ")} &mdash; {employee.department}</p>
        </div>
        {isUnderperforming && (
          <div className="px-4 py-2 bg-red-100 text-red-700 rounded-md border border-red-200 text-sm font-semibold">
            ⚠️ Underperformance Alert (Below 70% for 3+ days)
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SingleDonutChart
          value={todayActual}
          total={todayTarget}
          title="Today's Performance"
          subtitle="Actual vs target"
          color={perfColor}
          centerLabel={`${todayPerf}%`}
          centerSubLabel="performance"
          height={220}
        />

        <ChartCard title="Today's Output" variant="gradient" accentColor={palette.emerald}>
          <div className="flex flex-col justify-between h-full">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center bg-emerald-50/50 rounded-xl p-3">
                <span className="text-3xl font-bold text-emerald-600">{todayActual.toLocaleString()}</span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Actual</span>
              </div>
              <div className="flex flex-col items-center bg-gray-50 rounded-xl p-3">
                <span className="text-3xl font-bold text-gray-400">{todayTarget.toLocaleString()}</span>
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Target</span>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-500 font-medium">Performance:</span>
              <span className={`font-bold ${perfColor === palette.emerald ? "text-emerald-600" : perfColor === palette.yellow ? "text-yellow-600" : "text-red-600"}`}>
                {todayPerf}%
              </span>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Weekly Output" subtitle="Last 7 days" badge={{ label: "Total", value: weekOutput.toLocaleString(), color: "blue" }}>
          <div className="flex items-end gap-1 h-32 pt-4">
            {weekBarData.map((d, i) => {
              const h = Math.max((d.value / maxWeekBar) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t-md transition-all"
                    style={{ height: h, backgroundColor: i === 6 ? palette.blue : "#e2e8f0", minHeight: 4 }}
                  />
                  <span className="text-[9px] font-semibold text-gray-400">{d.label}</span>
                </div>
              );
            })}
          </div>
        </ChartCard>

        <ChartCard title="Weekly Earnings" subtitle="This week total" variant="gradient" accentColor={palette.green}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-green-600">{formatCurrency(weekEarnings)}</span>
            <span className="text-xs text-gray-500 mt-2">
              Avg {weeklyEntries.length > 0 ? formatCurrency(Math.round(weekEarnings / weeklyEntries.length)) : "UGX 0"} / entry
            </span>
          </div>
        </ChartCard>

        <ChartCard
          title="Monthly Output"
          subtitle="This month"
          badge={{ label: "Progress", value: `${monthProgress}%`, color: monthProgress >= 100 ? "green" : monthProgress >= 70 ? "blue" : "amber" }}
        >
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-baseline justify-center gap-2 mt-2">
              <span className="text-3xl font-bold text-gray-900">{monthOutput.toLocaleString()}</span>
              <span className="text-sm text-gray-400">/ {monthTargetPieces.toLocaleString()} target</span>
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(monthProgress, 100)}%`, backgroundColor: monthProgress >= 100 ? palette.emerald : palette.blue }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-medium">
                <span>{monthProgress}% complete</span>
                <span>{monthOutput.toLocaleString()} / {monthTargetPieces.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Monthly Earnings" subtitle="This month total" variant="gradient" accentColor={palette.purple}>
          <div className="flex flex-col items-center justify-center h-full">
            <span className="text-3xl font-bold text-purple-600">{formatCurrency(monthEarnings)}</span>
            <span className="text-xs text-gray-500 mt-2">
              {dailyStats.monthDays} day{dailyStats.monthDays !== 1 ? "s" : ""} worked
            </span>
          </div>
        </ChartCard>

        {workerStageData.length > 0 ? (
          <ScreenReadersBarChart
            data={workerStageData}
            title="Stage Distribution"
            subtitle="Pieces per stage"
            color={palette.pink}
            height={220}
            labelWidth={120}
          />
        ) : (
          <ChartCard title="Stage Distribution" subtitle="Pieces per stage" variant="gradient">
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">No stage data</div>
          </ChartCard>
        )}

        <TransactionValueChart
          data={trendChartData}
          title="Performance Trend"
          subtitle="30-day performance %"
          color={palette.indigo}
          height={220}
        />

        <ChartCard title="Daily Average" subtitle="Stats overview" variant="gradient" accentColor={palette.teal}>
          <div className="grid grid-cols-2 gap-3 h-full">
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-teal-50 to-white rounded-xl p-3">
              <span className="text-2xl font-bold text-teal-600">{dailyStats.avgOutput.toLocaleString()}</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Avg Daily</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-white rounded-xl p-3">
              <span className="text-2xl font-bold text-indigo-600">{dailyStats.avgPerf}%</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Avg Perf.</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-white rounded-xl p-3">
              <span className="text-2xl font-bold text-amber-600">{dailyStats.bestDayPieces.toLocaleString()}</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Best Day</span>
            </div>
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-white rounded-xl p-3">
              <span className="text-2xl font-bold text-blue-600">{dailyStats.totalDays}</span>
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mt-1">Days Worked</span>
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
