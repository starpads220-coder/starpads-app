"use client";

import { MultiLineAreaChart } from "@/components/charts/MultiLineAreaChart";
import { palette } from "@/components/charts";

interface PaymentChartData {
  date: string;
  Due: number;
  Paid: number;
}

export default function PaymentChart({ data }: { data: PaymentChartData[] }) {
  const chartData = data.map((d) => ({
    label: d.date,
    due: d.Due,
    paid: d.Paid,
  }));

  return (
    <MultiLineAreaChart
      data={chartData}
      series={[
        { dataKey: "due", name: "Due", color: palette.orange, gradientId: "dueGrad" },
        { dataKey: "paid", name: "Paid", color: palette.green, gradientId: "paidGrad" },
      ]}
      title="Daily Payment Trend"
      subtitle="Flow of due vs paid earnings"
      height={250}
    />
  );
}
