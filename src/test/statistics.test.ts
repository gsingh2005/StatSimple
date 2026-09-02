import { describe, expect, it } from "vitest";

import { describeNumeric } from "../statistics/descriptives/describe";
import { pearsonCorrelation, spearmanCorrelation } from "../statistics/correlation/correlation";
import { simpleLinearRegression, multipleLinearRegression } from "../statistics/regression/linearRegression";
import {
  independentSamplesTTest,
  oneSampleTTest,
  pairedSamplesTTest,
} from "../statistics/comparisons/tTests";
import { oneWayAnova } from "../statistics/anova/anova";
import { chiSquareTestOfIndependence } from "../statistics/categorical/chiSquare";

describe("statistical engine", () => {
  it("computes descriptive statistics for numeric data", () => {
    const result = describeNumeric([1, 2, 3, 4, 5]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.mean).toBeCloseTo(3, 6);
    expect(result.value.median).toBeCloseTo(3, 6);
    expect(result.value.variance).toBeCloseTo(2.5, 6);
    expect(result.value.standardDeviation).toBeCloseTo(1.58113883, 6);
    expect(result.value.q1).toBeCloseTo(2, 6);
    expect(result.value.q3).toBeCloseTo(4, 6);
  });

  it("computes Pearson and Spearman correlation", () => {
    const pearson = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    const spearman = spearmanCorrelation([1, 2, 3, 4, 5], [5, 6, 7, 8, 7]);

    expect(pearson.ok).toBe(true);
    expect(spearman.ok).toBe(true);
    if (!pearson.ok || !spearman.ok) {
      return;
    }
    expect(pearson.value.coefficient).toBeCloseTo(0.7745966692, 6);
    expect(spearman.value.coefficient).toBeCloseTo(0.8207826817, 6);
  });

  it("computes simple linear regression", () => {
    const result = simpleLinearRegression([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.slope).toBeCloseTo(0.6, 6);
    expect(result.value.intercept).toBeCloseTo(2.2, 6);
    expect(result.value.rSquared).toBeCloseTo(0.6, 6);
  });

  it("computes one-sample, independent, and paired t-tests", () => {
    const oneSample = oneSampleTTest([2, 4, 6, 8, 10], 5);
    const independent = independentSamplesTTest(
      [5, 6, 7, 8, 2, 3, 4, 5],
      ["A", "A", "A", "A", "B", "B", "B", "B"],
    );
    const paired = pairedSamplesTTest([10, 12, 11, 13, 12], [12, 13, 14, 15, 13]);

    expect(oneSample.ok).toBe(true);
    expect(independent.ok).toBe(true);
    expect(paired.ok).toBe(true);
    if (!oneSample.ok || !independent.ok || !paired.ok) {
      return;
    }

    expect(oneSample.value.tStatistic).toBeCloseTo(0.70710678, 6);
    expect(independent.value.difference).toBeCloseTo(3, 6);
    expect(independent.value.degreesOfFreedom).toBeCloseTo(6, 6);
    expect(paired.value.meanDifference).toBeCloseTo(1.8, 6);
    expect(paired.value.tStatistic).toBeCloseTo(4.81070235, 6);
  });

  it("computes ANOVA and chi-square", () => {
    const anova = oneWayAnova(
      [2, 3, 4, 5, 6, 7, 8, 9, 10],
      ["A", "A", "A", "B", "B", "B", "C", "C", "C"],
    );
    const leftValues = [
      ...Array.from({ length: 20 }, () => "Yes"),
      ...Array.from({ length: 10 }, () => "Yes"),
      ...Array.from({ length: 10 }, () => "No"),
      ...Array.from({ length: 20 }, () => "No"),
    ];
    const rightValues = [
      ...Array.from({ length: 20 }, () => "A"),
      ...Array.from({ length: 10 }, () => "B"),
      ...Array.from({ length: 10 }, () => "A"),
      ...Array.from({ length: 20 }, () => "B"),
    ];
    const chiSquare = chiSquareTestOfIndependence(leftValues, rightValues);

    expect(anova.ok).toBe(true);
    expect(chiSquare.ok).toBe(true);
    if (!anova.ok || !chiSquare.ok) {
      return;
    }

    expect(anova.value.fStatistic).toBeCloseTo(27, 6);
    expect(anova.value.etaSquared).toBeCloseTo(0.9, 6);
    expect(chiSquare.value.chiSquare).toBeCloseTo(6.666666667, 6);
  });

  it("computes multiple regression coefficients", () => {
    const result = multipleLinearRegression(
      [3, 6, 9, 10, 11, 12],
      [
        [1, 2, 3, 4, 5, 6],
        [2, 1, 0, 1, 2, 3],
      ],
      ["x1", "x2"],
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.value.coefficients[0]?.estimate).toBeCloseTo(3, 6);
    expect(result.value.coefficients[1]?.estimate).toBeCloseTo(2, 6);
    expect(result.value.coefficients[2]?.estimate).toBeCloseTo(-1, 6);
    expect(result.value.rSquared).toBeCloseTo(1, 6);
  });
});
