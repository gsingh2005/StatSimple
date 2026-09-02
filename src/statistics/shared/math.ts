import type { StatisticalError, StatisticalResult, StatisticalWarning } from "../../types";

export const sum = (values: number[]): number =>
  values.reduce((total, value) => total + value, 0);

export const mean = (values: number[]): number => sum(values) / values.length;

export const sampleVariance = (values: number[]): number => {
  if (values.length < 2) {
    return 0;
  }

  const center = mean(values);
  const squared = values.map((value) => (value - center) ** 2);

  return sum(squared) / (values.length - 1);
};

export const sampleStandardDeviation = (values: number[]): number =>
  Math.sqrt(sampleVariance(values));

export const quantile = (values: number[], probability: number): number => {
  const sorted = [...values].sort((left, right) => left - right);

  if (sorted.length === 1) {
    return sorted[0];
  }

  const position = (sorted.length - 1) * probability;
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];

  if (lower === upper) {
    return lower;
  }

  return lower + (upper - lower) * (position - lowerIndex);
};

export const median = (values: number[]): number => quantile(values, 0.5);

export const covariance = (x: number[], y: number[]): number => {
  const xMean = mean(x);
  const yMean = mean(y);
  let total = 0;

  for (let index = 0; index < x.length; index += 1) {
    total += (x[index] - xMean) * (y[index] - yMean);
  }

  return total / (x.length - 1);
};

export const ranks = (values: number[]): number[] => {
  const indexed = values
    .map((value, index) => ({ value, index }))
    .sort((left, right) => left.value - right.value);

  const result = new Array(values.length).fill(0);
  let cursor = 0;

  while (cursor < indexed.length) {
    let end = cursor;

    while (end + 1 < indexed.length && indexed[end + 1].value === indexed[cursor].value) {
      end += 1;
    }

    const averageRank = (cursor + end + 2) / 2;

    for (let index = cursor; index <= end; index += 1) {
      result[indexed[index].index] = averageRank;
    }

    cursor = end + 1;
  }

  return result;
};

export const finiteValues = (values: Array<number | null | undefined>): number[] =>
  values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));

export const makeWarning = (id: string, message: string): StatisticalWarning => ({
  id,
  message,
});

export const makeError = (code: StatisticalError["code"], message: string): StatisticalResult<never> => ({
  ok: false,
  error: {
    code,
    message,
  },
});

export const makeSuccess = <T>(
  value: T,
  warnings: StatisticalWarning[] = [],
): StatisticalResult<T> => ({
  ok: true,
  value,
  warnings,
});

// Distribution libraries can return values a few ulps outside [0, 1]. Keep
// tail probabilities valid without rounding any values used in calculations.
export const probability = (value: number): number => Math.max(0, Math.min(1, value));

export const transpose = (matrix: number[][]): number[][] =>
  matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex]));

export const multiplyMatrices = (left: number[][], right: number[][]): number[][] =>
  left.map((row) =>
    right[0].map((_, columnIndex) =>
      row.reduce((total, value, rowIndex) => total + value * right[rowIndex][columnIndex], 0),
    ),
  );

export const multiplyMatrixVector = (matrix: number[][], vector: number[]): number[] =>
  matrix.map((row) => row.reduce((total, value, index) => total + value * vector[index], 0));

export const inverseMatrix = (matrix: number[][]): number[][] | null => {
  const size = matrix.length;
  const augmented = matrix.map((row, rowIndex) => [
    ...row,
    ...new Array(size).fill(0).map((_, columnIndex) => (columnIndex === rowIndex ? 1 : 0)),
  ]);

  for (let pivotIndex = 0; pivotIndex < size; pivotIndex += 1) {
    let maxRow = pivotIndex;

    for (let rowIndex = pivotIndex + 1; rowIndex < size; rowIndex += 1) {
      if (Math.abs(augmented[rowIndex][pivotIndex]) > Math.abs(augmented[maxRow][pivotIndex])) {
        maxRow = rowIndex;
      }
    }

    if (Math.abs(augmented[maxRow][pivotIndex]) < 1e-10) {
      return null;
    }

    [augmented[pivotIndex], augmented[maxRow]] = [augmented[maxRow], augmented[pivotIndex]];

    const pivot = augmented[pivotIndex][pivotIndex];

    for (let columnIndex = 0; columnIndex < size * 2; columnIndex += 1) {
      augmented[pivotIndex][columnIndex] /= pivot;
    }

    for (let rowIndex = 0; rowIndex < size; rowIndex += 1) {
      if (rowIndex === pivotIndex) {
        continue;
      }

      const factor = augmented[rowIndex][pivotIndex];

      for (let columnIndex = 0; columnIndex < size * 2; columnIndex += 1) {
        augmented[rowIndex][columnIndex] -= factor * augmented[pivotIndex][columnIndex];
      }
    }
  }

  return augmented.map((row) => row.slice(size));
};

export const range = (start: number, end: number, count: number): number[] => {
  if (count <= 1) {
    return [start];
  }

  const step = (end - start) / (count - 1);

  return Array.from({ length: count }, (_, index) => start + step * index);
};
