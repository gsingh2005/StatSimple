import { describe, expect, it } from "vitest";

import { oneWayAnova } from "../statistics/anova/anova";
import { chiSquareTestOfIndependence } from "../statistics/categorical/chiSquare";
import { independentSamplesTTest, oneSampleTTest, pairedSamplesTTest } from "../statistics/comparisons/tTests";
import { pearsonCorrelation, spearmanCorrelation } from "../statistics/correlation/correlation";
import { describeNumeric } from "../statistics/descriptives/describe";
import { multipleLinearRegression, simpleLinearRegression } from "../statistics/regression/linearRegression";
import { formatPValue } from "../utils/format";

describe("statistical validation fixtures", () => {
  it("uses linear-interpolated quartiles consistently", () => {
    const result = describeNumeric([1, 2, 3, 4, 5, 6, 7, 8, null]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject({ count: 8, missing: 1, mean: 4.5, median: 4.5, variance: 6, min: 1, max: 8 });
    expect(result.value.q1).toBeCloseTo(2.75, 12);
    expect(result.value.q3).toBeCloseTo(6.25, 12);
    expect(result.value.iqr).toBeCloseTo(3.5, 12);
  });

  it("handles correlation pairing, constants, and perfect relationships safely", () => {
    const perfect = pearsonCorrelation([1, 2, 3, null], [2, 4, 6, 999]);
    const constant = pearsonCorrelation([1, 1, 1], [2, 3, 4]);
    const tooSmall = pearsonCorrelation([1, null], [2, 3]);
    expect(perfect.ok).toBe(true);
    if (perfect.ok) {
      expect(perfect.value.coefficient).toBe(1);
      expect(perfect.value.n).toBe(3);
      expect(perfect.value.confidenceInterval).toBeNull();
      expect(perfect.value.pValue).toBe(0);
    }
    expect(constant).toMatchObject({ ok: false, error: { code: "no-variation" } });
    expect(tooSmall).toMatchObject({ ok: false, error: { code: "not-enough-data" } });
  });

  it("uses average ranks for Spearman ties and labels its approximate inference", () => {
    const result = spearmanCorrelation([1, 2, 2, 4, 5], [5, 1, 3, 4, 2]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.coefficient).toBeCloseTo(-0.4103913408, 10);
    expect(result.warnings.some((warning) => warning.id === "spearman-approximation")).toBe(true);
  });

  it("calculates simple regression coefficients and suppresses invalid perfect-fit inference", () => {
    const noisy = simpleLinearRegression([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]);
    expect(noisy.ok).toBe(true);
    if (!noisy.ok) return;
    expect(noisy.value.slope).toBeCloseTo(0.6, 12);
    expect(noisy.value.intercept).toBeCloseTo(2.2, 12);
    expect(noisy.value.slopeStandardError).toBeCloseTo(Math.sqrt(0.08), 12);
    expect(noisy.value.slopeConfidenceInterval?.[0]).toBeLessThan(noisy.value.slopeConfidenceInterval?.[1] ?? 0);

    const exact = simpleLinearRegression([1, 2, 3, 4], [3, 5, 7, 9]);
    expect(exact.ok).toBe(true);
    if (!exact.ok) return;
    expect(exact.value).toMatchObject({ slope: 2, intercept: 1, slopePValue: null, slopeStandardError: null });
    expect(exact.value.slopeConfidenceInterval).toBeNull();
  });

  it("keeps paired observations aligned by their original rows", () => {
    const result = pairedSamplesTTest([1, null, 100, 4], [2, 1000, null, 8]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.n).toBe(2);
    expect(result.value.meanDifference).toBeCloseTo(2.5, 12);
    expect(result.value.tStatistic).toBeCloseTo(1.6666666667, 10);
  });

  it("implements Welch's t-test with Welch-Satterthwaite degrees of freedom", () => {
    const result = independentSamplesTTest([1, 2, 3, 10, 12, 14], ["A", "A", "A", "B", "B", "B"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.difference).toBe(-10);
    expect(result.value.tStatistic).toBeCloseTo(-7.745966692, 9);
    expect(result.value.degreesOfFreedom).toBeCloseTo(50 / 17, 12);
  });

  it("reports responsible failures for degenerate t-tests and ANOVA", () => {
    expect(oneSampleTTest([5, 5, 5], 5)).toMatchObject({ ok: false, error: { code: "no-variation" } });
    expect(oneWayAnova([1, 1, 1, 1, 1, 1], ["A", "A", "B", "B", "C", "C"])).toMatchObject({ ok: false, error: { code: "no-variation" } });
  });

  it("matches known ANOVA and chi-square values and warns on sparse expected counts", () => {
    const anova = oneWayAnova([2, 3, 4, 5, 6, 7, 8, 9, 10], ["A", "A", "A", "B", "B", "B", "C", "C", "C"]);
    const chi = chiSquareTestOfIndependence(["A", "A", "B", "B"], ["X", "Y", "X", "Y"]);
    expect(anova.ok).toBe(true);
    expect(chi.ok).toBe(true);
    if (!anova.ok || !chi.ok) return;
    expect(anova.value.fStatistic).toBeCloseTo(27, 12);
    expect(anova.value.etaSquared).toBeCloseTo(0.9, 12);
    expect(chi.value.chiSquare).toBe(0);
    expect(chi.warnings.some((warning) => warning.id === "expected-counts")).toBe(true);
  });

  it("detects collinearity and preserves estimable multiple-regression coefficients", () => {
    const exact = multipleLinearRegression(
      [3, 6, 9, 10, 11, 12],
      [[1, 2, 3, 4, 5, 6], [2, 1, 0, 1, 2, 3]],
      ["x1", "x2"],
    );
    const collinear = multipleLinearRegression([1, 2, 3, 4, 5], [[1, 2, 3, 4, 5], [2, 4, 6, 8, 10]], ["x", "double x"]);
    expect(exact.ok).toBe(true);
    if (exact.ok) {
      expect(exact.value.coefficients.map((coefficient) => coefficient.estimate)).toEqual(expect.arrayContaining([
        expect.closeTo(3, 12),
        expect.closeTo(2, 12),
        expect.closeTo(-1, 12),
      ]));
      expect(exact.value.fPValue).toBeNull();
    }
    expect(collinear).toMatchObject({ ok: false, error: { code: "singular-matrix" } });
  });

  it("never formats a p-value as zero", () => {
    expect(formatPValue(0)).toBe("p < 0.001");
    expect(formatPValue(0.004)).toBe("p = 0.004");
    expect(formatPValue(null)).toBe("Unavailable");
  });
});
