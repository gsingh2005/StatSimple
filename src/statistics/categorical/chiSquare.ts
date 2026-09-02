import { jStat } from "jstat";

import type { StatisticalResult } from "../../types";
import { makeError, makeSuccess, makeWarning, probability, sum } from "../shared/math";

export interface ChiSquareValue {
  rows: string[];
  columns: string[];
  observed: number[][];
  expected: number[][];
  n: number;
  chiSquare: number;
  degreesOfFreedom: number;
  pValue: number;
  cramersV: number;
}

export const chiSquareTestOfIndependence = (
  leftValues: Array<string | number | null | undefined>,
  rightValues: Array<string | number | null | undefined>,
): StatisticalResult<ChiSquareValue> => {
  const pairs = leftValues
    .map((value, index) => [value, rightValues[index]] as const)
    .filter(
      (pair): pair is [string, string] =>
        pair[0] !== null &&
        pair[0] !== undefined &&
        `${pair[0]}`.trim() !== "" &&
        pair[1] !== null &&
        pair[1] !== undefined &&
        `${pair[1]}`.trim() !== "",
    )
    .map(([left, right]) => [String(left).trim(), String(right).trim()] as const);

  if (pairs.length < 4) {
    return makeError("not-enough-data", "Chi-square needs more complete observations.");
  }

  const rows = [...new Set(pairs.map(([left]) => left))];
  const columns = [...new Set(pairs.map(([, right]) => right))];

  if (rows.length < 2 || columns.length < 2) {
    return makeError("invalid-input", "Both variables need at least two categories.");
  }

  const observed = rows.map((row) =>
    columns.map((column) => pairs.filter((pair) => pair[0] === row && pair[1] === column).length),
  );
  const rowTotals = observed.map((row) => sum(row));
  const columnTotals = columns.map((_, columnIndex) => sum(observed.map((row) => row[columnIndex])));
  const n = sum(rowTotals);
  const expected = rows.map((_, rowIndex) =>
    columns.map((_, columnIndex) => (rowTotals[rowIndex] * columnTotals[columnIndex]) / n),
  );
  const chiSquare = observed.reduce(
    (total, row, rowIndex) =>
      total +
      row.reduce((rowTotal, value, columnIndex) => {
        const expectedValue = expected[rowIndex][columnIndex];
        return rowTotal + (value - expectedValue) ** 2 / expectedValue;
      }, 0),
    0,
  );
  const degreesOfFreedom = (rows.length - 1) * (columns.length - 1);
  const pValue = probability(1 - jStat.chisquare.cdf(chiSquare, degreesOfFreedom));
  const cramersV = Math.sqrt(chiSquare / (n * Math.min(rows.length - 1, columns.length - 1)));
  const smallExpected = expected.flat().filter((value) => value < 5).length;
  const warnings = [];

  if (smallExpected > 0) {
    warnings.push(
      makeWarning(
        "expected-counts",
        "Some expected counts are small, so the chi-square approximation may be less reliable.",
      ),
    );
  }

  return makeSuccess(
    {
      rows,
      columns,
      observed,
      expected,
      n,
      chiSquare,
      degreesOfFreedom,
      pValue,
      cramersV,
    },
    warnings,
  );
};
