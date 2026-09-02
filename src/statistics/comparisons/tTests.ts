import { jStat } from "jstat";

import type { StatisticalResult } from "../../types";
import {
  makeError,
  makeSuccess,
  makeWarning,
  mean,
  probability,
  sampleStandardDeviation,
  sampleVariance,
} from "../shared/math";

export interface OneSampleTValue {
  n: number;
  mean: number;
  standardDeviation: number;
  difference: number;
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
}

export interface IndependentTValue {
  groups: [
    { label: string; n: number; mean: number; standardDeviation: number },
    { label: string; n: number; mean: number; standardDeviation: number },
  ];
  difference: number;
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
}

export interface PairedTValue {
  n: number;
  meanBefore: number;
  meanAfter: number;
  meanDifference: number;
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  confidenceInterval: [number, number];
  effectSize: number;
}

export const oneSampleTTest = (
  values: Array<number | null | undefined>,
  referenceValue: number,
): StatisticalResult<OneSampleTValue> => {
  const usable = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  if (usable.length < 2) {
    return makeError("not-enough-data", "A one-sample t-test requires at least two usable observations.");
  }

  const sampleMean = mean(usable);
  const standardDeviation = sampleStandardDeviation(usable);

  if (standardDeviation === 0) {
    return makeError("no-variation", "The sample has no variation, so the t-test is not informative.");
  }

  const difference = sampleMean - referenceValue;
  const standardError = standardDeviation / Math.sqrt(usable.length);
  const degreesOfFreedom = usable.length - 1;
  const tStatistic = difference / standardError;
  const pValue = probability(2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), degreesOfFreedom)));
  const critical = jStat.studentt.inv(0.975, degreesOfFreedom);

  return makeSuccess(
    {
      n: usable.length,
      mean: sampleMean,
      standardDeviation,
      difference,
      tStatistic,
      degreesOfFreedom,
      pValue,
      confidenceInterval: [difference - critical * standardError, difference + critical * standardError],
      effectSize: difference / standardDeviation,
    },
    usable.length < 10 ? [makeWarning("small-sample", "This test is based on a small sample.")] : [],
  );
};

export const independentSamplesTTest = (
  outcome: Array<number | null | undefined>,
  groups: Array<string | number | null | undefined>,
): StatisticalResult<IndependentTValue> => {
  const usable = outcome
    .map((value, index) => [value, groups[index]] as const)
    .filter(
      (pair): pair is [number, string] =>
        typeof pair[0] === "number" &&
        Number.isFinite(pair[0]) &&
        pair[1] !== null &&
        pair[1] !== undefined &&
        String(pair[1]).trim() !== "",
    )
    .map(([value, group]) => ({ value, group: String(group).trim() }));

  const labels = [...new Set(usable.map((row) => row.group))];

  if (labels.length !== 2) {
    return labels.length > 2
      ? makeError("too-many-groups", "This comparison has more than two groups. ANOVA is more appropriate.")
      : makeError("invalid-input", "Two non-empty groups are required for this comparison.");
  }

  const first = usable.filter((row) => row.group === labels[0]).map((row) => row.value);
  const second = usable.filter((row) => row.group === labels[1]).map((row) => row.value);

  if (first.length < 2 || second.length < 2) {
    return makeError("not-enough-data", "Each group needs at least two usable observations.");
  }

  const meanA = mean(first);
  const meanB = mean(second);
  const varianceA = sampleVariance(first);
  const varianceB = sampleVariance(second);
  const se = Math.sqrt(varianceA / first.length + varianceB / second.length);

  if (se === 0) {
    return makeError("no-variation", "The group values do not vary enough to run Welch's t-test.");
  }

  const difference = meanA - meanB;
  const tStatistic = difference / se;
  const numerator = (varianceA / first.length + varianceB / second.length) ** 2;
  const denominator =
    (varianceA ** 2) / (first.length ** 2 * (first.length - 1)) +
    (varianceB ** 2) / (second.length ** 2 * (second.length - 1));
  const degreesOfFreedom = numerator / denominator;
  const pValue = probability(2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), degreesOfFreedom)));
  const critical = jStat.studentt.inv(0.975, degreesOfFreedom);
  const pooled = Math.sqrt(
    (((first.length - 1) * varianceA + (second.length - 1) * varianceB) /
      (first.length + second.length - 2)) || 0,
  );
  const d = pooled === 0 ? 0 : difference / pooled;
  const effectSize = d * (1 - 3 / (4 * (first.length + second.length) - 9));
  const warnings = [];

  if (first.length < 5 || second.length < 5) {
    warnings.push(makeWarning("small-groups", "One or both groups are quite small."));
  }

  return makeSuccess(
    {
      groups: [
        {
          label: labels[0],
          n: first.length,
          mean: meanA,
          standardDeviation: sampleStandardDeviation(first),
        },
        {
          label: labels[1],
          n: second.length,
          mean: meanB,
          standardDeviation: sampleStandardDeviation(second),
        },
      ],
      difference,
      tStatistic,
      degreesOfFreedom,
      pValue,
      confidenceInterval: [difference - critical * se, difference + critical * se],
      effectSize,
    },
    warnings,
  );
};

export const pairedSamplesTTest = (
  before: Array<number | null | undefined>,
  after: Array<number | null | undefined>,
): StatisticalResult<PairedTValue> => {
  const pairs = before
    .map((value, index) => [value, after[index]] as const)
    .filter(
      (pair): pair is [number, number] =>
        typeof pair[0] === "number" &&
        Number.isFinite(pair[0]) &&
        typeof pair[1] === "number" &&
        Number.isFinite(pair[1]),
    );

  if (pairs.length < 2) {
    return makeError("not-enough-data", "A paired t-test requires at least two complete pairs.");
  }

  const differences = pairs.map(([left, right]) => right - left);
  const differenceSd = sampleStandardDeviation(differences);

  if (differenceSd === 0) {
    return makeError("no-variation", "The paired differences do not vary enough to estimate uncertainty.");
  }

  const meanDifference = mean(differences);
  const standardError = differenceSd / Math.sqrt(differences.length);
  const degreesOfFreedom = differences.length - 1;
  const tStatistic = meanDifference / standardError;
  const pValue = probability(2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), degreesOfFreedom)));
  const critical = jStat.studentt.inv(0.975, degreesOfFreedom);

  return makeSuccess(
    {
      n: pairs.length,
      meanBefore: mean(pairs.map(([value]) => value)),
      meanAfter: mean(pairs.map(([, value]) => value)),
      meanDifference,
      tStatistic,
      degreesOfFreedom,
      pValue,
      confidenceInterval: [
        meanDifference - critical * standardError,
        meanDifference + critical * standardError,
      ],
      effectSize: meanDifference / differenceSd,
    },
    pairs.length < 10 ? [makeWarning("small-sample", "This paired comparison is based on a small sample.")] : [],
  );
};
