/** Derived metrics consumed by total, filtered, selected, and aggregation panels. @feature Status Bar */
export interface StatusMetrics {
  total: number;
  filtered: number;
  selected: number;
  values: readonly number[];
}
export function aggregate(metrics: StatusMetrics): {
  count: number;
  sum: number;
  min: number | null;
  max: number | null;
  avg: number | null;
} {
  const values = metrics.values.filter(Number.isFinite);
  const sum = values.reduce((total, value) => total + value, 0);
  return {
    count: values.length,
    sum,
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
    avg: values.length ? sum / values.length : null,
  };
}
