# Charts Library & Analytics Revamp — Implementation Plan

> **Status:** Draft for review  
> **Target:** Production-ready visual overhaul of all analytics screens via a unified `src/components/charts/` library  
> **Stack:** Next.js 16 + React 19 + Recharts 2.15 + Tailwind CSS 4 + TypeScript 5

---

## 1. PRIMARY OBJECTIVE

Build a comprehensive `src/components/charts/` library containing **30+ reusable chart components** that visually revamp every analytics-bearing screen in the app — `/sales`, `/payments`, `/payments/worker/[id]`, `/storage`, `/expenses`, `/analytics`, `/production` — by replacing all inline Recharts code with polished, consistent, importable chart components.

## 2. SECONDARY OBJECTIVES

- Refactor `src/components/ui/ChartCard.tsx` to support dark/colored card variants, header badges, trend indicators, and action slots
- Upgrade `ChartCard` to be the single consistent wrapper for every chart instance
- Add new visual flourishes: gradient fills, rounded bar caps, animated tooltips, richer legends, sparkline variants, compact card formats
- Add chart component story/demo page at `/dev/charts` for rapid visual reference (optional, proposed)
- Ensure all charts follow consistent color palette, typography, and spacing

## 3. CONTEXT

### Project Overview
A sanitary pad manufacturing ERP/monitoring dashboard built with Next.js App Router. Users are factory admins, supervisors, store managers, and sales staff. It runs as a PWA on desktop and tablet.

### Tech Stack
- Next.js 16.2.9 + React 19.2.4 + TypeScript 5
- Recharts 2.15.3 (only chart library installed)
- Tailwind CSS 4 (utility-first)
- Firebase 10.14 (Auth, Firestore)
- TanStack React Query 5
- date-fns 4.1

### Files Involved

**New directory to create:**
- `src/components/charts/` — all new chart components

**Files to modify:**
- `src/components/ui/ChartCard.tsx` — enhanced wrapper
- `src/components/sales/SalesCharts.tsx` — refactor to use chart library
- `src/components/payments/PaymentChart.tsx` — refactor
- `src/components/production/PerformanceChart.tsx` — refactor
- `src/app/storage/page.tsx` — replace inline Recharts
- `src/app/expenses/page.tsx` — replace inline Recharts
- `src/app/analytics/page.tsx` — replace inline Recharts
- `src/app/payments/page.tsx` — replace PaymentChart usage
- `src/app/payments/worker/[id]/page.tsx` — add chart(s)
- `src/app/production/page.tsx` — add production trend charts

### Current Behavior
- Charts are built inline using raw Recharts in each page/component
- `SalesCharts.tsx` has 6 charts, 454 lines (hard to maintain)
- `Expenses` and `Storage` pages use inline `PieChart`/`BarChart` directly
- `Analytics` pages inline charts inside JSX
- `PaymentChart` exists as a standalone component but duplicates Recharts boilerplate
- `PerformanceChart` is unused
- No shared chart configs, gradients, or theme
- Inconsistent visual quality across pages

### Expected Behavior
- Every chart is an import from `src/components/charts/`
- Charts accept typed data props and optional config overrides
- All charts use the enhanced `ChartCard` wrapper with consistent header/subtitle/badges
- Charts share a unified color palette and gradient definitions
- Total code duplication eliminated; each screen is cleaner and more maintainable

## 4. ISSUES

- **[DESIGN] Inconsistent chart visual quality** — Some charts have gradient fills, some don't. Tooltip styles vary. Bar radius is applied inconsistently.
- **[MAINTAINABILITY] Recharts boilerplate duplication** — Every chart repeats `ResponsiveContainer`, `CartesianGrid`, `XAxis`/`YAxis`, `Tooltip`, `defs`/`linearGradient` setup.
- **[MAINTAINABILITY] SalesCharts.tsx is 454 lines** — mixing data transformation, chart rendering, and KPI cards in one component.
- **[FEATURE] Missing chart types** — No horizontal bar charts, donut charts (only pie), calendar heatmaps, bubble/scatter plots, stacked area charts, combo charts, or sparkline charts exist.
- **[FEATURE] Production page has zero charts** — Only KPI cards. No trend or performance visualization.
- **[FEATURE] Worker payment detail view has no charts** — Only tabular data.
- **[UX] ChartCard is limited** — No support for gradient backgrounds, colored accent headers, action buttons, or badge slots.

## 5. DELIVERABLES

### 5.1 Chart Library (`src/components/charts/`)

Each component follows the pattern:
```tsx
// Generic interface
interface ChartProps<T> {
  data: T[];
  height?: number;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  // ... chart-specific overrides
}
```

Planned component inventory (mapping to the 32 reference chart types):

| # | Component Name | Chart Type | Reference Label |
|---|---|---|---|
| 1 | `VerticalBarChart` | Grouped vertical bars | "Vertical bar — Statistics of the month" |
| 2 | `AreaRangeChart` | Area range + line overlay | "Temperatures — Average temperatures for July" |
| 3 | `DualAreaLineChart` | Dual-line area | "Temperature theme — 4.875 / 85km/h" |
| 4 | `StandardBarChart` | Grouped/stacked vertical bar | "Bar chart — +86%" |
| 5 | `HorizontalBarChart` | Rounded horizontal bars | "Horizontal bar chart with border radius" |
| 6 | `DonutChart` | Donut (browser shares) | "Contributions — 99% — Firefox / Chrome / Opera" |
| 7 | `CalendarHeatmapChart` | GitHub-style heatmap | "Sales per employee per month" |
| 8 | `StorageDonutChart` | Donut (storage) | "Storage of your device — Used storage 137GB" |
| 9 | `SemiDonutChart` | Semi donut | "My Storage — 70%" |
| 10 | `MultiLineAreaChart` | Multi-line area | "Wind speed — Wednesday 18" |
| 11 | `MultiLineChart` | Multi-line | "Historic World Population" |
| 12 | `SparklineAreaChart` | Area sparkline | "Statement of Earnings — $9834.72" |
| 13 | `SparklineAreaChart` (reuse) | Area sparkline | "Expected earnings — €682.5" |
| 14 | `SmoothLineChart` | Smooth line | "Monthly Average Rainfall" |
| 15 | `ScreenReadersBarChart` | Horizontal bar (scatter-style) | "Most common desktop screen readers" |
| 16 | `MiniBarChart` | Mini bar sparkline | "Collection — Diagnostics 2.4K" |
| 17 | `ComboBarLineChart` | Bar + line combo | "Statistic — $890.93" |
| 18 | `UserSuppliedDataChart` | Multi-line | "User supplied data" |
| 19 | `SingleBarChart` | Single series vertical bar | "Contributions — Balance of downloads" |
| 20 | `PersonalDiagnosticsChart` | Mini bar sparkline | "Personal Diagnostics — Marvin McKinney" |
| 21 | `AtmosphereLineChart` | Smooth line | "Atmosphere Temperature by Altitude" |
| 22 | `GradientHorizontalBarChart` | Gradient horizontal bar | "Average of the first economies" |
| 23 | `TransactionValueChart` | Area line | "Value of transactions in the last year" |
| 24 | `ImportStatusDonutChart` | Donut | "Status of imports — January 2021 — 73%" |
| 25 | `StackedColumnChart` | Stacked vertical bar | "Stacked column chart" |
| 26 | `StackedAreaChart` | Stacked area | "Intensity — September 2021 — 80%" |
| 27 | `ExchangeRateChart` | Line + brush | "Historical USD to EUR Exchange Rate" |
| 28 | `BubbleChart` | Bubble/scatter | "Countries compared by population density" |
| 29 | `SingleDonutChart` | Mono-segment donut | "Browser Market Shares — 98% Browser" |
| 30 | `PieWithLegendChart` | Pie/donut with list legend | "List countries" |
| 31 | `TechShareDonutChart` | Three-segment donut | "Doughnut — Browser market shares 2014" |
| 32 | `WorldPopulationAreaChart` | Multi-area | "Estimated Worldwide Population" |

### 5.2 Core Infrastructure

**`src/components/charts/index.ts`** — barrel export of all chart components
**`src/components/charts/config.ts`** — shared theme: color palette, gradient IDs, default margins, typography
**`src/components/charts/types.ts`** — shared TypeScript interfaces for chart data shapes

### 5.3 Enhanced ChartCard

Upgrade `ChartCard` with:
- `variant?: 'default' | 'gradient' | 'colored'` — card background styling
- `accentColor?: string` — optional colored top accent bar
- `badge?: { label: string; value: string; color?: string }` — header badge
- `action?: ReactNode` — header action slot (buttons, links)
- `footerContent?: ReactNode` — optional footer area
- `headerDivider?: boolean` — control border visibility

### 5.4 Page Integration Plan

| Screen | Current Charts | Replace With |
|---|---|---|
| `/sales` | 6 charts in SalesCharts.tsx | Reuse VerticalBarChart, DonutChart, HorizontalBarChart, StackedColumnChart, SparklineAreaChart, MultiLineAreaChart |
| `/payments` | AreaChart via PaymentChart | TransactionValueChart |
| `/payments/worker/[id]` | None | MiniBarChart, SparklineAreaChart for worker earning trend |
| `/storage` | PieChart, BarChart | StorageDonutChart, DailyStockInBarChart |
| `/analytics` | AreaChart, BarChart | DualAreaLineChart, HorizontalBarChart |
| `/expenses` | PieChart | PieWithLegendChart |
| `/production` | None | MiniBarChart, HorizontalBarChart for stage breakdown |

## 6. CONSTRAINTS & RULES

- **Only Recharts** — No additional chart library dependencies. All 32 chart types must be built using Recharts primitives.
- **Already installed** — Recharts 2.15.3 is in `package.json`. Do not install D3, Chart.js, Nivo, Victory, etc.
- **Tailwind only** — No CSS-in-JS, no CSS modules. All styling via Tailwind utility classes.
- **TypeScript strict** — No `any` types. Every chart component must have typed props and typed data interfaces.
- **No inline Recharts** — After this revamp, no page should import directly from `recharts`. All Recharts imports happen inside `src/components/charts/` only.
- **ChartCard is mandatory** — Every chart must be rendered inside `ChartCard` (or a subclasses variant).
- **Dynamic imports** — All chart components loaded via `next/dynamic` with `ssr: false` since Recharts uses browser APIs.
- **Naming convention** — PascalCase for components, camelCase for props, `I` prefix for interfaces (or not, follow existing codebase style).
- **No breaking changes** — Existing data flow (Firestore → React Query → props) must remain untouched.

## 7. ARCHITECTURE & DATA FLOW

```
Firestore (collections)
  ↓
useCollectionQuery / onSnapshot hooks
  ↓
Page component (e.g. SalesPage)
  ↓  (transforms raw data into typed chart data via useMemo)
Chart data objects (typed interfaces from charts/types.ts)
  ↓
Chart component from src/components/charts/
  ↓  (renders Recharts internally, wrapped in ChartCard)
Polished chart UI
```

**Data flow example for SalesCharts:**
```
SaleTransaction[]
  → transform to GroupedBarData[] { month: string; revenue: number; expenses: number; profit: number }
  → <VerticalBarChart data={...} series={["revenue","expenses","profit"]} />
```

## 8. PHASED IMPLEMENTATION

### Phase 1: Foundation
1. Create `src/components/charts/` directory structure
2. Create `config.ts` — unified palette (`palette.teal`, `palette.pink`, `palette.purple`, `palette.orange`, `palette.blue`, `palette.green`, `palette.grey`)
3. Create `types.ts` — shared data interfaces
4. Create `index.ts` — barrel export
5. Upgrade `ChartCard.tsx` with new variants and slots

### Phase 2: Core Chart Components (Highest Priority — used in pages)
1. `VerticalBarChart` — grouped vertical bars (replaces SalesCharts bar charts, Storage daily stock-in)
2. `DonutChart` — donut with center label (replaces SalesCharts sales mix, Storage pack breakdown)
3. `HorizontalBarChart` — rounded horizontal bars (replaces Analytics worker performance)
4. `MultiLineAreaChart` — multi-series area (replaces SalesCharts revenue trend, PaymentChart)
5. `StackedColumnChart` — stacked bars (replaces SalesCharts pack size volume)

### Phase 3: Secondary Chart Components
6. `AreaRangeChart` — area range with line
7. `DualAreaLineChart` — dual-line gradient area
8. `StandardBarChart` — grouped 3-series bar
9. `HorizontalBarChart` (rounded variant)
10. `CalendarHeatmapChart`
11. `StorageDonutChart` / `SemiDonutChart`
12. `MultiLineChart`
13. `SparklineAreaChart`
14. `SmoothLineChart`
15. `MiniBarChart` / `ComboBarLineChart`
16. `GradientHorizontalBarChart`
17. `StackedAreaChart`

### Phase 4: Enhanced Chart Components
18. `ScreenReadersBarChart`
19. `BubbleChart`
20. `PieWithLegendChart`
21. `WorldPopulationAreaChart`
22. `ExchangeRateChart` (with brush)
23. `SingleDonutChart` / `TechShareDonutChart`
24. `ImportStatusDonutChart`

### Phase 5: Page Integration
1. `/sales` — refactor SalesCharts to use new library
2. `/payments` — replace PaymentChart
3. `/payments/worker/[id]` — add worker trend chart
4. `/storage` — replace inline Recharts
5. `/analytics` — replace inline Recharts
6. `/expenses` — replace inline Recharts
7. `/production` — add production trend and stage distribution charts

### Phase 6: Polish & Cleanup
1. Delete unused `PerformanceChart.tsx`
2. Verify all pages still render correctly
3. Ensure dynamic imports work with SSR disabled
4. Remove all direct `recharts` imports from page files
5. Run lint + typecheck

## 9. RISK FLAGS

- **Recharts limitations** — Calendar heatmaps and bubble/scatter plots are not natively supported in Recharts. These may require custom SVG implementations or a fallback chart type.
- **Bundle size** — Importing all 30+ chart components could increase bundle size. Mitigate by keeping dynamic imports and lazy-loading.
- **SSR compatibility** — Recharts requires `"use client"` and `ssr: false`. All chart imports must use `next/dynamic`.
- **Complex chart types** — The combo chart (bar + line) may require careful Recharts configuration to align dual axes properly.

## 10. EDGE CASES

- Empty data states — all charts must show a "No data" placeholder
- Single data point — line/area charts must gracefully handle 0 or 1 data points
- All-zero series — must not break rendering
- Negative values — bar charts must handle negative values appropriately
- Long labels — axis labels must truncate or rotate to avoid overflow
- Missing series — partial data (one series populated, another empty) handled gracefully
- Loading state — ChartCard already handles `loading` prop with skeleton animation

## 11. TESTING

- Visual verification of every chart component across the 7 affected pages
- Empty/null/zero data edge cases for each chart
- Responsive behavior at desktop and tablet widths
- Confirm no regressions in existing data display
- TypeScript compilation check (`tsc --noEmit`)

## 12. PERSONA

> You are a Senior Frontend Engineer with 8+ years building data-heavy dashboards in React/TypeScript. You specialize in Recharts, D3 visual patterns, and Tailwind CSS. You write clean, typed, composable chart components that are easy to drop into any page. You obsess over chart polish: gradient fills, smooth animations, smart tooltips, and consistent spacing. You never write inline Recharts — every chart is a reusable, typed, documented component.

---

## NEXT STEPS

1. **Review this plan** — confirm scope, priorities, and approach
2. **Phase 1 execution** — create the chart library infrastructure
3. **Phase 2 execution** — build the 5 core chart components
4. **Phase 5 execution** — integrate into the 7 pages
5. **Phase 6 execution** — cleanup and verification

Shall I proceed with Phase 1 (Foundation)?
