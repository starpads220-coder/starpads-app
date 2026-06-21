export interface DataPoint {
  label: string;
  value: number;
}

export interface SeriesPoint {
  label: string;
  [series: string]: string | number;
}

export interface MultiSeriesPoint extends SeriesPoint {
  [series: string]: string | number;
}

export interface BarChartData {
  category: string;
  values: { name: string; value: number }[];
}

export interface LineData {
  label: string;
  value: number;
}

export interface MultiLineData {
  label: string;
  [series: string]: string | number;
}

export interface AreaRangeData {
  label: string;
  min: number;
  max: number;
  line?: number;
}

export interface DonutSlice {
  name: string;
  value: number;
  color?: string;
}

export interface HeatmapData {
  date: string;
  value: number;
}

export interface SparklineData {
  label: string;
  value: number;
}

export interface ChartBaseProps<T> {
  data: T[];
  height?: number;
  className?: string;
  showLegend?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  loading?: boolean;
}

export interface BarSeriesConfig {
  dataKey: string;
  name: string;
  color: string;
  stackId?: string;
}
