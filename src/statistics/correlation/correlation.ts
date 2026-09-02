import { jStat } from "jstat";

import type { StatisticalResult } from "../../types";
import {
  covariance,
  finiteValues,
  makeError,
  makeSuccess,
  makeWarning,
  probability,
  ranks,
  sampleStandardDeviation,
} from "../shared/math";

export interface CorrelationValue {
  coefficient: number;
  pValue: number;
  confidenceInterval: [number, number] | null;
  n: number;
  method: "pearson" | "spearman";
}

const buildCorrelation = (
  x: number[],
  y: number[],
  method: "pearson" | "spearman",
): StatisticalResult<CorrelationValue> => {
  if (x.length !== y.length || x.length < 3) {
    return makeError("not-enough-data", "At least three paired observations are required.");
  }

  const xSd = sampleStandardDeviation(x);
  const ySd = sampleStandardDeviation(y);

  if (xSd === 0 || ySd === 0) {
    return makeError("no-variation", "Correlation requires both variables to vary.");
  }

  const coefficient = covariance(x, y) / (xSd * ySd);
  const bounded = Math.max(-1, Math.min(1, coefficient));
  const denominator = 1 - bounded ** 2;
  const tStatistic = denominator <= 0 ? Number.POSITIVE_INFINITY : bounded * Math.sqrt((x.length - 2) / denominator);
  const pValue =
    Number.isFinite(tStatistic) && x.length > 2
      ? probability(2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), x.length - 2)))
      : 0;

  let confidenceInterval: [number, number] | null = null;

  if (x.length > 3 && Math.abs(bounded) < 1) {
    const fisherZ = 0.5 * Math.log((1 + bounded) / (1 - bounded));
    const standardError = 1 / Math.sqrt(x.length - 3);
    const critical = 1.96;
    const lowerZ = fisherZ - critical * standardError;
    const upperZ = fisherZ + critical * standardError;
    const lower = (Math.exp(2 * lowerZ) - 1) / (Math.exp(2 * lowerZ) + 1);
    const upper = (Math.exp(2 * upperZ) - 1) / (Math.exp(2 * upperZ) + 1);
    confidenceInterval = [lower, upper];
  }

  const warnings = [];

  if (x.length < 10) {
    warnings.push(makeWarning("small-sample", "This correlation is based on a small number of observations."));
  }

  if (method === "spearman") {
    warnings.push(
      makeWarning(
        "spearman-approximation",
        "The Spearman p-value uses a t-distribution approximation, which is less precise for small samples or many ties.",
      ),
    );
  }

  return makeSuccess(
    {
      coefficient: bounded,
      pValue,
      confidenceInterval,
      n: x.length,
      method,
    },
    warnings,
  );
};

export const pearsonCorrelation = (
  rawX: Array<number | null | undefined>,
  rawY: Array<number | null | undefined>,
): StatisticalResult<CorrelationValue> => {
  const pairs = rawX
    .map((value, index) => [value, rawY[index]] as const)
    .filter(
      (pair): pair is [number, number] =>
        typeof pair[0] === "number" &&
        Number.isFinite(pair[0]) &&
        typeof pair[1] === "number" &&
        Number.isFinite(pair[1]),
    );

  return buildCorrelation(
    pairs.map(([x]) => x),
    pairs.map(([, y]) => y),
    "pearson",
  );
};

export const spearmanCorrelation = (
  rawX: Array<number | null | undefined>,
  rawY: Array<number | null | undefined>,
): StatisticalResult<CorrelationValue> => {
  const pairs = rawX
    .map((value, index) => [value, rawY[index]] as const)
    .filter(
      (pair): pair is [number, number] =>
        typeof pair[0] === "number" &&
        Number.isFinite(pair[0]) &&
        typeof pair[1] === "number" &&
        Number.isFinite(pair[1]),
    );

  const x = pairs.map(([value]) => value);
  const y = pairs.map(([, value]) => value);

  return buildCorrelation(ranks(x), ranks(y), "spearman");
};

export const correlationStrengthLabel = (value: number): string => {
  const magnitude = Math.abs(value);

  if (magnitude >= 0.7) {
    return "strong";
  }

  if (magnitude >= 0.4) {
    return "moderately strong";
  }

  if (magnitude >= 0.2) {
    return "modest";
  }

  return "little";
};

export const regressionLinePoints = (x: number[], slope: number, intercept: number) => {
  const usable = finiteValues(x);
  const min = Math.min(...usable);
  const max = Math.max(...usable);

  return [
    {
      x: min,
      y: intercept + slope * min,
    },
    {
      x: max,
      y: intercept + slope * max,
    },
  ];
};
