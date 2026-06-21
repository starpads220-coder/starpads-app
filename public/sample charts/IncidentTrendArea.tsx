"use client";
import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
  Legend
);

const trendData = [
  { period: "Jan", mechanical: 120, medical: 40 },
  { period: "Feb", mechanical: 150, medical: 35 },
  { period: "Mar", mechanical: 110, medical: 55 },
  { period: "Apr", mechanical: 190, medical: 60 },
  { period: "May", mechanical: 170, medical: 45 },
  { period: "Jun", mechanical: 210, medical: 70 },
  { period: "Jul", mechanical: 180, medical: 50 },
  { period: "Aug", mechanical: 230, medical: 65 },
  { period: "Sep", mechanical: 200, medical: 80 },
  { period: "Oct", mechanical: 250, medical: 55 },
];

/**
 * Vehicle Incident Track
 * Styled after the "Transactions" area chart from the design reference.
 * — High-fidelity Stacked Area Chart.
 * — Data nodes (points) with white borders.
 * — Vibrant blue and purple area fills.
 * 
 * NOTE: Using Inline Styles as Tailwind is not configured in this project.
 */
export default function IncidentTrendArea() {
  const data = {
    labels: trendData.map((d) => d.period),
    datasets: [
      {
        fill: true,
        label: "Mechanical",
        data: trendData.map((d) => d.mechanical),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        tension: 0.4,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#2563eb",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        fill: true,
        label: "Medical",
        data: trendData.map((d) => d.medical),
        borderColor: "#7c3aed",
        backgroundColor: "rgba(124, 58, 237, 0.08)",
        tension: 0.4,
        pointBackgroundColor: "#fff",
        pointBorderColor: "#7c3aed",
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#0f172a",
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
      },
    },
    scales: {
      x: {
        display: true,
        grid: { display: false },
        ticks: {
          color: "#94a3b8",
          font: { size: 9, weight: "bold" as const },
        },
      },
      y: {
        display: false,
        grid: { display: false },
      },
    },
  };

  return (
    <div style={{
      width: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      fontFamily: "'DM Sans', sans-serif"
    }}>
      {/* ── Subtitle / Header info ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: "-1px", lineHeight: 1 }}>
            18
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: 4 }}>
            Incidents Tracked
          </div>
        </div>
        <div style={{ 
          display: "flex", alignItems: "center", gap: 4, 
          background: "#ecfdf5", padding: "3px 10px", 
          borderRadius: 12, border: "1px solid #d1fae5" 
        }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#10b981" }}>
            -12%
          </span>
          <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
             <path d="M1 1L9 9M9 9V1M9 9H1" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(180 5 5)"/>
          </svg>
        </div>
      </div>

      <div style={{ width: "100%", height: 130, position: "relative" }}>
        <Line data={data} options={options} />
      </div>

      {/* ── Legend footer ── */}
      <div style={{ 
        marginTop: 18, paddingTop: 12, borderTop: "1px solid #f1f5f9", 
        display: "flex", gap: 14 
      }}>
         <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
           <div style={{ width: 10, height: 10, borderRadius: 3, background: "#2563eb" }}></div>
           <span style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Mechanical</span>
         </div>
         <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
           <div style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed" }}></div>
           <span style={{ fontSize: 9, fontWeight: 800, color: "#64748b", textTransform: "uppercase" }}>Medical</span>
         </div>
      </div>
    </div>
  );
}

