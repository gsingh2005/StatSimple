import { jStat } from "jstat";

import type { StatisticalResult } from "../../types";
import {
  inverseMatrix,
  makeError,
  makeSuccess,
  makeWarning,
  mean,
  multiplyMatrices,
  multiplyMatrixVector,
  sampleStandardDeviation,
  probability,
  sum,
  transpose,
} from "../shared/math";

export interface SimpleRegressionValue {
  n: number;
  slope: number;
  intercept: number;
  rSquared: number;
  adjustedRSquared: number;
  rmse: number;
  slopeStandardError: number | null;
  interceptStandardError: number | null;
  slopePValue: number | null;
  slopeConfidenceInterval: [number, number] | null;
  fitted: number[];
  residuals: number[];
  leverage: number[];
}

export interface MultipleRegressionCoefficient {
  label: string;
  estimate: number;
  standardError: number | null;
  tStatistic: number | null;
  pValue: number | null;
  confidenceInterval: [number, number] | null;
}

export interface MultipleRegressionValue {
  n: number;
  predictorCount: number;
  coefficients: MultipleRegressionCoefficient[];
  rSquared: number;
  adjustedRSquared: number;
  fStatistic: number | null;
  fPValue: number | null;
  rmse: number;
  residuals: number[];
  fitted: number[];
  highCorrelationPairs: Array<[string, string]>;
}

export const simpleLinearRegression = (
  rawX: Array<number | null | undefined>,
  rawY: Array<number | null | undefined>,
): StatisticalResult<SimpleRegressionValue> => {
  const pairs = rawX
    .map((x, index) => [x, rawY[index]] as const)
    .filter(
      (pair): pair is [number, number] =>
        typeof pair[0] === "number" &&
        Number.isFinite(pair[0]) &&
        typeof pair[1] === "number" &&
        Number.isFinite(pair[1]),
    );

  if (pairs.length < 3) {
    return makeError("not-enough-data", "Regression requires at least three complete observations.");
  }

  const x = pairs.map(([value]) => value);
  const y = pairs.map(([, value]) => value);
  const xMean = mean(x);
  const yMean = mean(y);

  let sxx = 0;
  let sxy = 0;

  for (let index = 0; index < x.length; index += 1) {
    sxx += (x[index] - xMean) ** 2;
    sxy += (x[index] - xMean) * (y[index] - yMean);
  }

  if (sxx === 0) {
    return makeError("no-variation", "Regression cannot use a predictor with no variation.");
  }

  const slope = sxy / sxx;
  const intercept = yMean - slope * xMean;
  const fitted = x.map((value) => intercept + slope * value);
  const residuals = y.map((value, index) => value - fitted[index]);
  const sse = sum(residuals.map((value) => value ** 2));
  const sst = sum(y.map((value) => (value - yMean) ** 2));
  const rSquared = sst === 0 ? 1 : 1 - sse / sst;
  const adjustedRSquared = 1 - (1 - rSquared) * ((x.length - 1) / (x.length - 2));
  const residualDegreesOfFreedom = x.length - 2;
  const mse = sse / residualDegreesOfFreedom;
  const rmse = Math.sqrt(Math.max(0, mse));
  const inferenceDefined = sse > Number.EPSILON * Math.max(1, sst) && residualDegreesOfFreedom > 0;
  const slopeStandardError = inferenceDefined ? Math.sqrt(mse / sxx) : null;
  const interceptStandardError = inferenceDefined
    ? Math.sqrt(mse * (1 / x.length + xMean ** 2 / sxx))
    : null;
  const slopeT = slopeStandardError && slopeStandardError > 0 ? slope / slopeStandardError : null;
  const slopePValue = slopeT === null
    ? null
    : probability(2 * (1 - jStat.studentt.cdf(Math.abs(slopeT), residualDegreesOfFreedom)));
  const critical = jStat.studentt.inv(0.975, residualDegreesOfFreedom);
  const slopeConfidenceInterval: [number, number] | null =
    slopeStandardError !== null && Number.isFinite(critical)
    ? [slope - critical * slopeStandardError, slope + critical * slopeStandardError]
    : null;
  const leverage = x.map((value) => 1 / x.length + (value - xMean) ** 2 / sxx);
  const warnings = [];

  if (x.length < 10) {
    warnings.push(makeWarning("small-sample", "This regression is based on a small number of complete observations."));
  }

  if (!inferenceDefined) {
    warnings.push(
      makeWarning(
        "perfect-fit",
        "The line fits these observations exactly or nearly exactly, so standard errors, p-values, and confidence intervals are not reported.",
      ),
    );
  }

  if (leverage.some((value) => value > 4 / x.length)) {
    warnings.push(makeWarning("leverage", "Some observations may have unusually strong influence on the fitted line."));
  }

  if (residuals.some((value) => Math.abs(value) > 2 * sampleStandardDeviation(residuals))) {
    warnings.push(makeWarning("residuals", "Some residuals are large relative to the rest of the data."));
  }

  return makeSuccess(
    {
      n: x.length,
      slope,
      intercept,
      rSquared,
      adjustedRSquared,
      rmse,
      slopeStandardError,
      interceptStandardError,
      slopePValue,
      slopeConfidenceInterval,
      fitted,
      residuals,
      leverage,
    },
    warnings,
  );
};

const correlation = (left: number[], right: number[]): number => {
  const leftMean = mean(left);
  const rightMean = mean(right);
  let numerator = 0;
  let leftDenominator = 0;
  let rightDenominator = 0;

  for (let index = 0; index < left.length; index += 1) {
    numerator += (left[index] - leftMean) * (right[index] - rightMean);
    leftDenominator += (left[index] - leftMean) ** 2;
    rightDenominator += (right[index] - rightMean) ** 2;
  }

  return numerator / Math.sqrt(leftDenominator * rightDenominator);
};

export const multipleLinearRegression = (
  outcome: Array<number | null | undefined>,
  predictors: Array<Array<number | null | undefined>>,
  predictorLabels: string[],
): StatisticalResult<MultipleRegressionValue> => {
  const rows = outcome
    .map((value, index) => ({
      y: value,
      x: predictors.map((predictor) => predictor[index]),
    }))
    .filter((row): row is { y: number; x: number[] } => {
      if (typeof row.y !== "number" || !Number.isFinite(row.y)) {
        return false;
      }

      return row.x.every((value) => typeof value === "number" && Number.isFinite(value));
    });

  if (predictors.length < 2) {
    return makeError("invalid-input", "Multiple regression requires at least two predictors.");
  }

  if (rows.length <= predictors.length + 1) {
    return makeError(
      "not-enough-data",
      "There are not enough complete rows to estimate this model reliably.",
    );
  }

  const xMatrix = rows.map((row) => [1, ...row.x]);
  const yVector = rows.map((row) => row.y);
  const xt = transpose(xMatrix);
  const xtx = multiplyMatrices(xt, xMatrix);
  const xtxInverse = inverseMatrix(xtx);

  if (!xtxInverse) {
    return makeError(
      "singular-matrix",
      "This model cannot be estimated because the predictors are linearly dependent.",
    );
  }

  const xty = multiplyMatrixVector(xt, yVector);
  const beta = multiplyMatrixVector(xtxInverse, xty);
  const fitted = xMatrix.map((row) => row.reduce((total, value, index) => total + value * beta[index], 0));
  const residuals = yVector.map((value, index) => value - fitted[index]);
  const yMean = mean(yVector);
  const sse = sum(residuals.map((value) => value ** 2));
  const sst = sum(yVector.map((value) => (value - yMean) ** 2));
  if (sst <= Number.EPSILON * Math.max(1, sum(yVector.map((value) => value ** 2)))) {
    return makeError("no-variation", "Multiple regression requires an outcome variable with variation.");
  }
  const ssr = sst - sse;
  const dfModel = predictors.length;
  const dfResidual = rows.length - predictors.length - 1;

  if (dfResidual <= 0) {
    return makeError("not-enough-data", "There are not enough degrees of freedom for this model.");
  }

  const mse = sse / dfResidual;
  const msr = ssr / dfModel;
  const inferenceDefined = sse > Number.EPSILON * Math.max(1, sst);
  const fStatistic = inferenceDefined ? msr / mse : null;
  const fPValue = fStatistic === null ? null : probability(1 - jStat.centralF.cdf(fStatistic, dfModel, dfResidual));
  const rSquared = sst === 0 ? 1 : 1 - sse / sst;
  const adjustedRSquared = 1 - (1 - rSquared) * ((rows.length - 1) / dfResidual);
  const critical = jStat.studentt.inv(0.975, dfResidual);
  const covarianceMatrix = xtxInverse.map((row) => row.map((value) => value * mse));
  const coefficients = beta.map((estimate, index) => {
    const standardError = inferenceDefined ? Math.sqrt(Math.max(0, covarianceMatrix[index][index])) : null;
    const tStatistic = standardError && standardError > 0 ? estimate / standardError : null;
    const pValue = tStatistic === null
      ? null
      : probability(2 * (1 - jStat.studentt.cdf(Math.abs(tStatistic), dfResidual)));
    const confidenceInterval = standardError !== null && Number.isFinite(critical)
      ? [estimate - critical * standardError, estimate + critical * standardError] as [number, number]
      : null;

    return {
      label: index === 0 ? "Intercept" : predictorLabels[index - 1],
      estimate,
      standardError,
      tStatistic,
      pValue,
      confidenceInterval,
    };
  });

  const highCorrelationPairs: Array<[string, string]> = [];

  for (let leftIndex = 0; leftIndex < predictors.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < predictors.length; rightIndex += 1) {
      const leftValues = rows.map((row) => row.x[leftIndex]);
      const rightValues = rows.map((row) => row.x[rightIndex]);

      const pairCorrelation = correlation(leftValues, rightValues);
      if (Number.isFinite(pairCorrelation) && Math.abs(pairCorrelation) >= 0.85) {
        highCorrelationPairs.push([predictorLabels[leftIndex], predictorLabels[rightIndex]]);
      }
    }
  }

  const warnings = [];

  if (rows.length < 20) {
    warnings.push(makeWarning("sample-size", "This model is based on a relatively small number of complete rows."));
  }

  if (highCorrelationPairs.length > 0) {
    warnings.push(makeWarning("collinearity", "Some predictors are strongly correlated with each other."));
  }

  if (!inferenceDefined) {
    warnings.push(
      makeWarning(
        "perfect-fit",
        "The model fits these rows exactly or nearly exactly, so inferential statistics are not reported.",
      ),
    );
  }

  return makeSuccess(
    {
      n: rows.length,
      predictorCount: predictors.length,
      coefficients,
      rSquared,
      adjustedRSquared,
      fStatistic,
      fPValue,
      rmse: Math.sqrt(Math.max(0, mse)),
      residuals,
      fitted,
      highCorrelationPairs,
    },
    warnings,
  );
};
