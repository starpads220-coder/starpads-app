export const palette = {
  teal: "#14b8a6",
  pink: "#ec4899",
  purple: "#8b5cf6",
  orange: "#f97316",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
  grey: "#6b7280",
  dark: "#1f2937",
  indigo: "#4f46e5",
  violet: "#7c3aed",
  sky: "#0ea5e9",
  emerald: "#10b981",
  rose: "#f43f5e",
  slate: "#64748b",
  slateLight: "#94a3b8",
  ghost: "#f1f5f9",
  ink: "#0f172a",
};

export const chartColors = [
  palette.violet,
  palette.sky,
  palette.emerald,
  palette.indigo,
  palette.rose,
  palette.teal,
  palette.purple,
  palette.orange,
  palette.blue,
  palette.green,
  palette.yellow,
  palette.red,
  palette.pink,
  palette.grey,
];

export const gradientColors = [
  { id: "violetGrad", color: palette.violet },
  { id: "skyGrad", color: palette.sky },
  { id: "emeraldGrad", color: palette.emerald },
  { id: "indigoGrad", color: palette.indigo },
  { id: "roseGrad", color: palette.rose },
  { id: "tealGrad", color: palette.teal },
  { id: "purpleGrad", color: palette.purple },
  { id: "orangeGrad", color: palette.orange },
  { id: "blueGrad", color: palette.blue },
  { id: "greenGrad", color: palette.green },
  { id: "yellowGrad", color: palette.yellow },
] as const;

export const animationConfig = {
  bar: { duration: 800, begin: 0, stagger: 120 },
  line: { duration: 1000, begin: 0 },
  area: { duration: 900, begin: 0 },
  pie: { duration: 600, begin: 0 },
  radar: { duration: 700, begin: 0 },
};

export function defaultMargins(top = 12, right = 12, left = -12, bottom = 0) {
  return { top, right, left, bottom };
}

export function formatCurrency(value: number, currency = "UGX") {
  return `${currency} ${Math.round(value).toLocaleString()}`;
}

export function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

export function gradientStop(color: string, id: string) {
  return {
    id,
    stops: [
      { offset: "0%", color, opacity: 0.3 },
      { offset: "50%", color, opacity: 0.08 },
      { offset: "100%", color, opacity: 0 },
    ],
  };
}



export const tickStyles = {
  x: { fontSize: 9, fontWeight: 700, fill: palette.slateLight },
  y: { fontSize: 9, fontWeight: 600, fill: "#c0c8d4" },
};
