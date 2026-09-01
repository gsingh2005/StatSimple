import { describe, expect, it } from 'vitest';
import { correlation, describe as summary, independentT, linearRegression } from '../statistics';

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
});
