import type { CategoryFrequency, NumericSummary, StatisticalResult } from "../../types";
import {
  finiteValues,
  makeError,
  makeSuccess,
  mean,
  median,
  quantile,
  sampleStandardDeviation,
  sampleVariance,
} from "../shared/math";

export const describeNumeric = (
  values: Array<number | null | undefined>,
): StatisticalResult<NumericSummary> => {
  const usable = finiteValues(values);
  const missing = values.length - usable.length;

  if (usable.length === 0) {
    return makeError("not-enough-data", "This variable does not contain usable numeric values.");
  }

  const sorted = [...usable].sort((left, right) => left - right);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);

  return makeSuccess({
    count: usable.length,
    missing,
    mean: mean(usable),
    median: median(usable),
    variance: sampleVariance(usable),
    standardDeviation: sampleStandardDeviation(usable),
    min: sorted[0],
    q1,
    q3,
    max: sorted[sorted.length - 1],
    iqr: q3 - q1,
  });
};

export const describeCategorical = (
  values: Array<string | number | null | undefined>,
): StatisticalResult<CategoryFrequency[]> => {
  const usable = values
    .filter((value): value is string | number => value !== null && value !== undefined && `${value}`.trim() !== "")
    .map((value) => String(value).trim());

  if (usable.length === 0) {
    return makeError("not-enough-data", "This variable does not contain usable categories.");
  }

  const counts = new Map<string, number>();

  for (const value of usable) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  const result = [...counts.entries()]
    .map(([label, count]) => ({
      label,
      count,
      proportion: count / usable.length,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

  return makeSuccess(result);
};

export const buildHistogramBins = (
  values: number[],
): Array<{
  label: string;
  start: number;
  end: number;
  count: number;
}> => {
  if (values.length === 0) {
    return [];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    return [
      {
        label: `${min}`,
        start: min,
        end: max,
        count: values.length,
      },
    ];
  }

  const binCount = Math.max(5, Math.min(12, Math.round(Math.sqrt(values.length))));
  const width = (max - min) / binCount;

  return Array.from({ length: binCount }, (_, index) => {
    const start = min + index * width;
    const end = index === binCount - 1 ? max : start + width;
    const count = values.filter((value) =>
      index === binCount - 1 ? value >= start && value <= end : value >= start && value < end,
    ).length;

    return {
      label: `${start.toFixed(1)}–${end.toFixed(1)}`,
      start,
      end,
      count,
    };
  });
};
