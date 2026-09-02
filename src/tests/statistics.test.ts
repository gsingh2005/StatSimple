import { describe, expect, it } from 'vitest';
import { chiSquareIndependence, correlation, describe as summary, independentT, linearRegression, ols, oneWayAnova, oneSampleT, pairedT, quantile, vif } from '../statistics';

describe('statistics engine', () => {
  it('returns a correct sample summary', () => {
    const result = summary([1, 2, 3, 4, 5]);
    expect(result.mean).toBe(3);
    expect(result.median).toBe(3);
    expect(result.sd).toBeCloseTo(1.581139, 5);
  });

  it('detects a perfect linear correlation and regression', () => {
    const result = correlation([1, 2, 3, 4], [2, 4, 6, 8]);
    const model = linearRegression([1, 2, 3, 4], [2, 4, 6, 8]);
    expect(result.r).toBeCloseTo(1, 8);
    expect(model.slope).toBeCloseTo(2, 8);
    expect(model.intercept).toBeCloseTo(0, 8);
  });

  it('reports a meaningful independent-samples difference', () => {
    const result = independentT([9, 10, 11, 10, 9], [1, 2, 3, 2, 1]);
    expect(result.difference).toBeCloseTo(8, 8);
    expect(result.p).toBeLessThan(0.01);
  });

  it('calculates interpolated percentiles and advanced descriptive values', () => {
    const result = summary([1, 2, 3, 4, 5]);
    expect(quantile([1, 2, 3, 4, 5], .25)).toBe(2);
    expect(result.iqr).toBe(2);
    expect(result.confidenceInterval[0]).toBeLessThan(result.mean);
    expect(result.confidenceInterval[1]).toBeGreaterThan(result.mean);
  });

  it('handles Spearman ties, one-sample, paired, and Welch tests', () => {
    const rank = correlation([1, 2, 2, 4, 5], [5, 4, 4, 2, 1], 'spearman');
    const one = oneSampleT([9, 10, 11, 10, 9], 0);
    const paired = pairedT([10, 12, 11, 13], [8, 9, 9, 10]);
    expect(rank.r).toBeCloseTo(-1, 8);
    expect(one.p).toBeLessThan(.01);
    expect(paired.meanDifference).toBeCloseTo(2.5, 8);
  });

  it('computes ANOVA and chi-square tables with expected degrees of freedom', () => {
    const anova = oneWayAnova([{ name: 'A', values: [1, 2, 3] }, { name: 'B', values: [6, 7, 8] }, { name: 'C', values: [10, 11, 12] }]);
    const chi = chiSquareIndependence([[20, 10], [10, 20]]);
    expect(anova.f).toBeGreaterThan(50);
    expect(anova.etaSquared).toBeGreaterThan(.8);
    expect(chi.df).toBe(1);
    expect(chi.p).toBeLessThan(.01);
    expect(chi.expected[0][0]).toBe(15);
  });

  it('fits multiple OLS with robust errors and diagnostics', () => {
    const x = [[1, 2], [2, 1], [3, 4], [4, 3], [5, 7], [6, 5], [7, 8], [8, 6]];
    const y = x.map(([a, b], index) => 3 + 1.5 * a - .7 * b + [0.2, -0.3, 0.1, -0.2, .25, -.15, .05, -.1][index]);
    const model = ols(y, x, ['x1', 'x2'], { standardErrors: 'HC3' });
    expect(model.coefficients[0].estimate).toBeCloseTo(3, 0);
    expect(model.coefficients[1].estimate).toBeCloseTo(1.5, 0);
    expect(model.coefficients[2].estimate).toBeCloseTo(-.7, 0);
    expect(model.r2).toBeGreaterThan(.99);
    expect(model.leverage).toHaveLength(8);
    expect(model.cooksDistance.every(Number.isFinite)).toBe(true);
    expect(model.breuschPagan?.df).toBe(2);
    const vifs = vif(x, ['x1', 'x2']);
    expect(vifs).toHaveLength(2);
    expect(vifs[0].vif).toBeGreaterThan(1);
  });

  it('rejects insufficient and singular regression designs', () => {
    expect(() => ols([1, 2], [[1], [2]], ['x'])).toThrow(/more complete observations/i);
    expect(() => ols([1, 2, 3, 4], [[1, 2], [2, 4], [3, 6], [4, 8]], ['x', 'duplicate'])).toThrow(/singular/i);
    expect(() => correlation([1, 1, 1], [2, 3, 4])).toThrow(/constant/i);
  });
});
