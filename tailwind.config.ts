import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#f9fafb",
        foreground: "#111827",
        "performance-green": "#22c55e",
        "performance-amber": "#f59e0b",
        "performance-red": "#ef4444",
        "stock-blue": "#3b82f6",
        "stock-orange": "#f97316",
        ugx: "#059669",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Arial", "Helvetica", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      animation: {
        "border-morph": "border-morph 4s ease-in-out infinite",
      },
      keyframes: {
        "border-morph": {
          "0%, 100%": { borderRadius: "16px" },
          "50%": { borderRadius: "24px" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
