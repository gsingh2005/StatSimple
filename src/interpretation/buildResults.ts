import type {
  AnalysisCheck,
  AnalysisPresentation,
  AnalysisType,
  GlossaryTermKey,
  TechnicalDetailSection,
  VisualizationModel,
} from "../types";
import { buildHistogramBins } from "../statistics/descriptives/describe";
import { correlationStrengthLabel, regressionLinePoints } from "../statistics/correlation/correlation";
import { formatConfidenceInterval, formatEquation, formatNumber, formatPValue, formatSignedNumber } from "../utils/format";
import { createId } from "../utils/id";

const metric = (
  label: string,
  value: string,
  detail?: string,
  helpKey?: GlossaryTermKey,
) => ({
  label,
  value,
  detail,
  helpKey,
});

const check = (
  status: AnalysisCheck["status"],
  title: string,
  description: string,
): AnalysisCheck => ({
  id: createId("check"),
  status,
  title,
  description,
});

const details = (
  title: string,
  rows: TechnicalDetailSection["rows"],
): TechnicalDetailSection => ({
  title,
  rows,
});

const basePresentation = ({
  datasetId,
  datasetRevision,
  analysisType,
  title,
  headline,
  interpretation,
  metrics,
  checks,
  technicalDetails,
  visualization,
}: Omit<AnalysisPresentation, "id">): AnalysisPresentation => ({
  id: createId("analysis"),
  datasetId,
  datasetRevision,
  analysisType,
  title,
  headline,
  interpretation,
  metrics,
  checks,
  technicalDetails,
  visualization,
});

export const buildNumericDescriptionPresentation = ({
  datasetId,
  datasetRevision,
  variableLabel,
  values,
  summary,
}: {
  datasetId: string;
  datasetRevision: number;
  variableLabel: string;
  values: number[];
  summary: {
    count: number;
    missing: number;
    mean: number;
    median: number;
    standardDeviation: number;
    variance: number;
    min: number;
    q1: number;
    q3: number;
    max: number;
    iqr: number;
  };
}): AnalysisPresentation =>
  basePresentation({
    datasetId,
    datasetRevision,
    analysisType: "descriptive-numeric",
    title: `${variableLabel} distribution`,
    headline: `${variableLabel} is centered around ${formatNumber(summary.mean)} in this dataset.`,
    interpretation: [
      `${variableLabel} has a median of ${formatNumber(summary.median)}, which helps anchor the typical value even if the distribution is uneven.`,
      `The spread is summarized by a standard deviation of ${formatNumber(summary.standardDeviation)} and an interquartile range of ${formatNumber(summary.iqr)}.`,
      "The median is less affected by unusually large or small observations than the mean.",
    ],
    metrics: [
      metric("Usable observations", formatNumber(summary.count)),
      metric("Missing", formatNumber(summary.missing)),
      metric("Mean", formatNumber(summary.mean), undefined, "mean"),
      metric("Median", formatNumber(summary.median), undefined, "median"),
      metric("Std. deviation", formatNumber(summary.standardDeviation), undefined, "standardDeviation"),
      metric("IQR", formatNumber(summary.iqr)),
    ],
    checks: [
      check("pass", "Usable observations", `${summary.count} numeric values were available for this summary.`),
      check(
        summary.missing > 0 ? "info" : "pass",
        "Missing values",
        summary.missing > 0
          ? `${summary.missing} values were missing and therefore excluded.`
          : "No missing values were excluded from this summary.",
      ),
    ],
    technicalDetails: [
      details("Distribution details", [
        { label: "Variance", value: formatNumber(summary.variance) },
        { label: "Minimum", value: formatNumber(summary.min) },
        { label: "Q1", value: formatNumber(summary.q1) },
        { label: "Q3", value: formatNumber(summary.q3) },
        { label: "Maximum", value: formatNumber(summary.max) },
      ]),
    ],
    visualization: {
      kind: "histogram",
      title: `${variableLabel} distribution`,
      xLabel: variableLabel,
      yLabel: "Count",
      bins: buildHistogramBins(values),
    },
  });

export const buildCategoricalDescriptionPresentation = ({
  datasetId,
  datasetRevision,
  variableLabel,
  categories,
  missing,
}: {
  datasetId: string;
  datasetRevision: number;
  variableLabel: string;
  categories: Array<{ label: string; count: number; proportion: number }>;
  missing: number;
}): AnalysisPresentation =>
  basePresentation({
    datasetId,
    datasetRevision,
    analysisType: "descriptive-categorical",
    title: `${variableLabel} summary`,
    headline: `${variableLabel} is distributed across ${categories.length} categories in this dataset.`,
    interpretation: [
      `The largest category is ${categories[0]?.label ?? "Unavailable"}, which represents about ${formatNumber(
        (categories[0]?.proportion ?? 0) * 100,
        0,
      )}% of usable rows.`,
      "Category counts are often the clearest starting point before moving to comparisons or association tests.",
    ],
    metrics: [
      metric(
        "Usable observations",
        formatNumber(categories.reduce((total, category) => total + category.count, 0)),
      ),
      metric("Missing", formatNumber(missing)),
      metric("Categories", formatNumber(categories.length)),
      metric("Largest category", categories[0]?.label ?? "Unavailable"),
    ],
    checks: [
      check("pass", "Usable categories", `${categories.length} categories were available to summarize.`),
      check(
        missing > 0 ? "info" : "pass",
        "Missing values",
        missing > 0
          ? `${missing} missing values were excluded from the frequency table.`
          : "No missing values were excluded from the frequency table.",
      ),
    ],
    technicalDetails: [
      details(
        "Category breakdown",
        categories.map((category) => ({
          label: category.label,
          value: `${category.count} (${formatNumber(category.proportion * 100, 1)}%)`,
        })),
      ),
    ],
    visualization: {
      kind: "bar",
      title: `${variableLabel} category frequencies`,
      xLabel: variableLabel,
      yLabel: "Count",
      categories,
    },
  });

export const buildCorrelationPresentation = ({
  datasetId,
  datasetRevision,
  analysisType,
  xLabel,
  yLabel,
  x,
  y,
  coefficient,
  pValue,
  confidenceInterval,
  n,
  warnings,
}: {
  datasetId: string;
  datasetRevision: number;
  analysisType: AnalysisType;
  xLabel: string;
  yLabel: string;
  x: number[];
  y: number[];
  coefficient: number;
  pValue: number;
  confidenceInterval: [number, number] | null;
  n: number;
  warnings: string[];
}): AnalysisPresentation => {
  const direction = coefficient > 0 ? "positive" : coefficient < 0 ? "negative" : "little";
  const symbol = analysisType === "spearman-correlation" ? "ρ" : "r";
  const tStatistic =
    Math.abs(coefficient) === 1 ? Number.POSITIVE_INFINITY : coefficient * Math.sqrt((n - 2) / (1 - coefficient ** 2));

  return basePresentation({
    datasetId,
    datasetRevision,
    analysisType,
    title: `${xLabel} and ${yLabel}`,
    headline: `${xLabel} and ${yLabel} have a ${correlationStrengthLabel(coefficient)} ${direction} relationship in this dataset.`,
    interpretation: [
      `${
        analysisType === "spearman-correlation" ? "Spearman correlation" : "Correlation"
      } summarizes how these variables tend to move together without implying that one causes the other.`,
      confidenceInterval
        ? `A 95% confidence interval of ${formatConfidenceInterval(
            confidenceInterval[0],
            confidenceInterval[1],
          )} shows the range of relationship strengths reasonably compatible with this dataset under the model.`
        : "With a very small sample or a perfect relationship, a confidence interval is less informative here.",
      "Correlation does not by itself establish causation.",
    ],
    metrics: [
      metric(symbol, formatSignedNumber(coefficient, 2), undefined, "correlation"),
      metric("Usable pairs", formatNumber(n)),
      metric("P-value", formatPValue(pValue), undefined, "pValue"),
      ...(confidenceInterval
        ? [metric("95% CI", formatConfidenceInterval(confidenceInterval[0], confidenceInterval[1]), undefined, "confidenceInterval")]
        : []),
    ],
    checks: [
      check("pass", "Paired observations", `${n} rows contained usable values for both variables.`),
      check("pass", "Variation", "Both variables contain enough variation to estimate a relationship."),
      ...warnings.map((warning) => check("warning", "Interpret with caution", warning)),
    ],
    technicalDetails: [
      details("Statistical details", [
        { label: "Method", value: analysisType === "spearman-correlation" ? "Spearman rank correlation" : "Pearson correlation" },
        { label: "Test statistic", value: Number.isFinite(tStatistic) ? formatNumber(tStatistic, 3) : "Infinite" },
        { label: "Degrees of freedom", value: formatNumber(n - 2) },
        { label: "P-value", value: formatPValue(pValue) },
      ]),
    ],
    visualization: {
      kind: "scatter",
      title: `${xLabel} vs ${yLabel}`,
      xLabel,
      yLabel,
      points: x.map((value, index) => ({
        x: value,
        y: y[index],
      })),
    },
  });
};

export const buildSimpleRegressionPresentation = ({
  datasetId,
  datasetRevision,
  predictorLabel,
  outcomeLabel,
  x,
  y,
  result,
  warnings,
}: {
  datasetId: string;
  datasetRevision: number;
  predictorLabel: string;
  outcomeLabel: string;
  x: number[];
  y: number[];
  result: {
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
    leverage: number[];
  };
  warnings: string[];
}): AnalysisPresentation => {
  const direction = result.slope >= 0 ? "higher" : "lower";
  const slopeDescription = `${formatNumber(Math.abs(result.slope), 2)} ${Math.abs(result.slope) === 1 ? "unit" : "units"}`;

  return basePresentation({
    datasetId,
    datasetRevision,
    analysisType: "simple-regression",
    title: `${outcomeLabel} by ${predictorLabel}`,
    headline: `${direction === "higher" ? "Higher" : "Lower"} ${predictorLabel} was associated with ${direction} ${outcomeLabel} in this dataset.`,
    interpretation: [
      `Each one-unit increase in ${predictorLabel} was associated with approximately ${slopeDescription} ${result.slope >= 0 ? "higher" : "lower"} ${outcomeLabel}.`,
      `${predictorLabel} accounted for about ${formatNumber(result.rSquared * 100, 0)}% of the variation in ${outcomeLabel} under this linear model.`,
      "Regression shows association under the fitted model, not proof of causation.",
    ],
    metrics: [
      metric("Equation", formatEquation(outcomeLabel, result.intercept, result.slope, predictorLabel)),
      metric("Slope", formatSignedNumber(result.slope, 2), undefined, "slope"),
      metric("Intercept", formatSignedNumber(result.intercept, 2), undefined, "intercept"),
      metric("R²", formatNumber(result.rSquared, 2), undefined, "rSquared"),
      metric("Usable pairs", formatNumber(result.n)),
      metric("P-value", formatPValue(result.slopePValue), undefined, "pValue"),
      ...(result.slopeConfidenceInterval
        ? [metric("95% CI for slope", formatConfidenceInterval(result.slopeConfidenceInterval[0], result.slopeConfidenceInterval[1]), undefined, "confidenceInterval")]
        : []),
    ],
    checks: [
      check("pass", "Complete observations", `${result.n} rows had usable values for both variables.`),
      check("pass", "Predictor variation", `${predictorLabel} contains enough variation to estimate a slope.`),
      ...warnings.map((warning) => check("warning", "Interpret with caution", warning)),
    ],
    technicalDetails: [
      details("Coefficient details", [
        { label: "Slope SE", value: formatNumber(result.slopeStandardError, 3) },
        { label: "Intercept SE", value: formatNumber(result.interceptStandardError, 3) },
        { label: "Adjusted R²", value: formatNumber(result.adjustedRSquared, 3) },
        { label: "RMSE", value: formatNumber(result.rmse, 3) },
      ]),
    ],
    visualization: {
      kind: "scatter",
      title: `${outcomeLabel} versus ${predictorLabel}`,
      xLabel: predictorLabel,
      yLabel: outcomeLabel,
      points: x.map((value, index) => ({
        x: value,
        y: y[index],
      })),
      line: regressionLinePoints(x, result.slope, result.intercept),
    },
  });
};

export const buildOneSamplePresentation = ({
  datasetId,
  datasetRevision,
  variableLabel,
  values,
  referenceValue,
  result,
  warnings,
}: {
  datasetId: string;
  datasetRevision: number;
  variableLabel: string;
  values: number[];
  referenceValue: number;
  result: {
    n: number;
    mean: number;
    difference: number;
    tStatistic: number;
    degreesOfFreedom: number;
    pValue: number;
    confidenceInterval: [number, number];
    effectSize: number;
  };
  warnings: string[];
}): AnalysisPresentation => {
  const direction = result.difference >= 0 ? "above" : "below";

  return basePresentation({
    datasetId,
    datasetRevision,
    analysisType: "one-sample-t-test",
    title: `${variableLabel} versus ${formatNumber(referenceValue)}`,
    headline: `The average ${variableLabel} was about ${formatNumber(Math.abs(result.difference))} points ${direction} ${formatNumber(referenceValue)} in this dataset.`,
    interpretation: [
      `This test asks whether the sample mean differs from the reference value of ${formatNumber(referenceValue)}.`,
      `The estimated mean difference was ${formatSignedNumber(result.difference)}, with a 95% confidence interval of ${formatConfidenceInterval(
        result.confidenceInterval[0],
        result.confidenceInterval[1],
      )}.`,
    ],
    metrics: [
      metric("Sample mean", formatNumber(result.mean), undefined, "mean"),
      metric("Reference value", formatNumber(referenceValue)),
      metric("Difference", formatSignedNumber(result.difference)),
      metric("P-value", formatPValue(result.pValue), undefined, "pValue"),
      metric("95% CI", formatConfidenceInterval(result.confidenceInterval[0], result.confidenceInterval[1]), undefined, "confidenceInterval"),
      metric("Cohen's d", formatSignedNumber(result.effectSize, 2), undefined, "effectSize"),
    ],
    checks: [
      check("pass", "Usable observations", `${result.n} numeric values were included.`),
      ...warnings.map((warning) => check("warning", "Interpret with caution", warning)),
    ],
    technicalDetails: [
      details("Statistical details", [
        { label: "t", value: formatNumber(result.tStatistic, 3) },
        { label: "df", value: formatNumber(result.degreesOfFreedom) },
        { label: "P-value", value: formatPValue(result.pValue) },
      ]),
    ],
    visualization: {
      kind: "histogram",
      title: `${variableLabel} distribution`,
      xLabel: variableLabel,
      yLabel: "Count",
      bins: buildHistogramBins(values),
    },
  });
};

const buildGroupStrip = (
  title: string,
  yLabel: string,
  groups: Array<{ label: string; values: number[]; mean: number }>,
): VisualizationModel => ({
  kind: "group-strip",
  title,
  xLabel: "Group",
  yLabel,
  points: groups.flatMap((group, groupIndex) =>
    group.values.map((value, valueIndex) => ({
      group: group.label,
      groupIndex,
      x: groupIndex + ((valueIndex % 5) - 2) * 0.04,
      y: value,
    })),
  ),
  means: groups.map((group, groupIndex) => ({
    group: group.label,
    groupIndex,
    mean: group.mean,
  })),
});

export const buildIndependentTPresentation = ({
  datasetId,
  datasetRevision,
  outcomeLabel,
  result,
  groupValues,
  warnings,
}: {
  datasetId: string;
  datasetRevision: number;
  outcomeLabel: string;
  result: {
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
  };
  groupValues: Record<string, number[]>;
  warnings: string[];
}): AnalysisPresentation => {
  const higherGroup = result.groups[0].mean >= result.groups[1].mean ? result.groups[0] : result.groups[1];
  const lowerGroup = higherGroup === result.groups[0] ? result.groups[1] : result.groups[0];

  return basePresentation({
    datasetId,
    datasetRevision,
    analysisType: "independent-t-test",
    title: `${outcomeLabel} by group`,
    headline: `The average ${outcomeLabel} was ${formatNumber(Math.abs(higherGroup.mean - lowerGroup.mean), 2)} higher in ${higherGroup.label} than in ${lowerGroup.label}.`,
    interpretation: [
      `${higherGroup.label} averaged ${formatNumber(higherGroup.mean)} while ${lowerGroup.label} averaged ${formatNumber(lowerGroup.mean)}.`,
      `Welch's t-test estimated a mean difference of ${formatSignedNumber(result.difference)}, with a 95% confidence interval of ${formatConfidenceInterval(
        result.confidenceInterval[0],
        result.confidenceInterval[1],
      )}.`,
      "Hedges' g summarizes practical magnitude with a small-sample correction, rather than relying on the p-value alone.",
    ],
    metrics: [
      metric(`${result.groups[0].label} mean`, formatNumber(result.groups[0].mean)),
      metric(`${result.groups[1].label} mean`, formatNumber(result.groups[1].mean)),
      metric("Difference", formatSignedNumber(result.difference)),
      metric("95% CI", formatConfidenceInterval(result.confidenceInterval[0], result.confidenceInterval[1]), undefined, "confidenceInterval"),
      metric("P-value", formatPValue(result.pValue), undefined, "pValue"),
      metric("Hedges' g", formatSignedNumber(result.effectSize, 2), undefined, "effectSize"),
    ],
    checks: [
      check("pass", "Independent groups", `${result.groups[0].n} rows were used in ${result.groups[0].label} and ${result.groups[1].n} in ${result.groups[1].label}.`),
      ...warnings.map((warning) => check("warning", "Interpret with caution", warning)),
    ],
    technicalDetails: [
      details("Statistical details", [
        { label: "t", value: formatNumber(result.tStatistic, 3) },
        { label: "df", value: formatNumber(result.degreesOfFreedom, 2) },
        { label: `${result.groups[0].label} SD`, value: formatNumber(result.groups[0].standardDeviation, 2) },
        { label: `${result.groups[1].label} SD`, value: formatNumber(result.groups[1].standardDeviation, 2) },
      ]),
    ],
    visualization: buildGroupStrip(`${outcomeLabel} by group`, outcomeLabel, result.groups.map((group) => ({
      label: group.label,
      values: groupValues[group.label] ?? [],
      mean: group.mean,
    }))),
  });
};

export const buildPairedTPresentation = ({
  datasetId,
  datasetRevision,
  beforeLabel,
  afterLabel,
  pairs,
  result,
  warnings,
}: {
  datasetId: string;
  datasetRevision: number;
  beforeLabel: string;
  afterLabel: string;
  pairs: Array<{ before: number; after: number }>;
  result: {
    n: number;
    meanBefore: number;
    meanAfter: number;
    meanDifference: number;
    tStatistic: number;
    degreesOfFreedom: number;
    pValue: number;
    confidenceInterval: [number, number];
    effectSize: number;
  };
  warnings: string[];
}): AnalysisPresentation => {
  const differences = pairs.map((pair) => pair.after - pair.before);

  return basePresentation({
    datasetId,
    datasetRevision,
    analysisType: "paired-t-test",
    title: `${beforeLabel} and ${afterLabel}`,
    headline: `${afterLabel} was ${result.meanDifference >= 0 ? "higher" : "lower"} on average than ${beforeLabel} in this paired dataset.`,
    interpretation: [
      `This comparison preserved row-by-row pairing across ${result.n} usable pairs.`,
      `The mean paired difference was ${formatSignedNumber(result.meanDifference)}, with a 95% confidence interval of ${formatConfidenceInterval(
        result.confidenceInterval[0],
        result.confidenceInterval[1],
      )}.`,
    ],
    metrics: [
      metric("Valid pairs", formatNumber(result.n)),
      metric(`${beforeLabel} mean`, formatNumber(result.meanBefore)),
      metric(`${afterLabel} mean`, formatNumber(result.meanAfter)),
      metric("Mean difference", formatSignedNumber(result.meanDifference)),
      metric("95% CI", formatConfidenceInterval(result.confidenceInterval[0], result.confidenceInterval[1]), undefined, "confidenceInterval"),
      metric("P-value", formatPValue(result.pValue), undefined, "pValue"),
      metric("Cohen's dz", formatSignedNumber(result.effectSize, 2), undefined, "effectSize"),
    ],
    checks: [
      check("pass", "Preserved pairing", "Rows were filtered as complete pairs rather than as separate columns."),
      ...warnings.map((warning) => check("warning", "Interpret with caution", warning)),
    ],
    technicalDetails: [
      details("Statistical details", [
        { label: "t", value: formatNumber(result.tStatistic, 3) },
        { label: "df", value: formatNumber(result.degreesOfFreedom) },
        { label: "P-value", value: formatPValue(result.pValue) },
      ]),
    ],
    visualization: {
      kind: "paired-differences",
      title: "Difference distribution",
      xLabel: `${afterLabel} − ${beforeLabel}`,
      yLabel: "Count",
      bins: buildHistogramBins(differences),
      pairs,
      beforeLabel,
      afterLabel,
    },
  });
};

export const buildAnovaPresentation = ({
  datasetId,
  datasetRevision,
  outcomeLabel,
  result,
  groupValues,
  warnings,
}: {
  datasetId: string;
  datasetRevision: number;
  outcomeLabel: string;
  result: {
    groups: Array<{ label: string; n: number; mean: number }>;
    n: number;
    fStatistic: number;
    degreesOfFreedomBetween: number;
    degreesOfFreedomWithin: number;
    pValue: number;
    etaSquared: number;
  };
  groupValues: Record<string, number[]>;
  warnings: string[];
}): AnalysisPresentation =>
  basePresentation({
    datasetId,
    datasetRevision,
    analysisType: "one-way-anova",
    title: `${outcomeLabel} across groups`,
    headline:
      result.pValue < 0.05
        ? `The data provide evidence that average ${outcomeLabel} differs across groups.`
        : `The group means for ${outcomeLabel} were not clearly separated in this dataset.`,
    interpretation: [
      "ANOVA evaluates whether at least one group mean differs from the others, without by itself identifying which specific groups differ.",
      `The model attributed about ${formatNumber(result.etaSquared * 100, 0)}% of the total variation in ${outcomeLabel} to group differences.`,
    ],
    metrics: [
      metric("Groups", formatNumber(result.groups.length)),
      metric("Usable rows", formatNumber(result.n)),
      metric("F", formatNumber(result.fStatistic, 3), undefined, "anova"),
      metric("P-value", formatPValue(result.pValue), undefined, "pValue"),
      metric("Eta squared", formatNumber(result.etaSquared, 2), undefined, "effectSize"),
    ],
    checks: [
      check("pass", "Usable groups", `${result.groups.length} groups were included in the comparison.`),
      ...warnings.map((warning) => check("warning", "Interpret with caution", warning)),
    ],
    technicalDetails: [
      details("Group means", result.groups.map((group) => ({
        label: `${group.label} (n = ${group.n})`,
        value: formatNumber(group.mean),
      }))),
      details("Statistical details", [
        { label: "df between", value: formatNumber(result.degreesOfFreedomBetween) },
        { label: "df within", value: formatNumber(result.degreesOfFreedomWithin) },
        { label: "P-value", value: formatPValue(result.pValue) },
      ]),
    ],
    visualization: buildGroupStrip(
      `${outcomeLabel} across groups`,
      outcomeLabel,
      result.groups.map((group) => ({
        label: group.label,
        values: groupValues[group.label] ?? [],
        mean: group.mean,
      })),
    ),
  });

export const buildChiSquarePresentation = ({
  datasetId,
  datasetRevision,
  leftLabel,
  rightLabel,
  result,
  warnings,
}: {
  datasetId: string;
  datasetRevision: number;
  leftLabel: string;
  rightLabel: string;
  result: {
    rows: string[];
    columns: string[];
    observed: number[][];
    expected: number[][];
    n: number;
    chiSquare: number;
    degreesOfFreedom: number;
    pValue: number;
    cramersV: number;
  };
  warnings: string[];
}): AnalysisPresentation =>
  basePresentation({
    datasetId,
    datasetRevision,
    analysisType: "chi-square",
    title: `${leftLabel} and ${rightLabel}`,
    headline:
      result.pValue < 0.05
        ? `${leftLabel} and ${rightLabel} appear to be associated in this dataset.`
        : `${leftLabel} and ${rightLabel} did not show strong evidence of an association in this dataset.`,
    interpretation: [
      "Chi-square compares the observed contingency table with the counts we would expect if the variables were unrelated.",
      `Cramér's V of ${formatNumber(result.cramersV, 2)} helps summarize the strength of the association.`,
    ],
    metrics: [
      metric("Usable rows", formatNumber(result.n)),
      metric("Chi-square", formatNumber(result.chiSquare, 3)),
      metric("df", formatNumber(result.degreesOfFreedom), undefined, "degreesOfFreedom"),
      metric("P-value", formatPValue(result.pValue), undefined, "pValue"),
      metric("Cramér's V", formatNumber(result.cramersV, 2), undefined, "cramersV"),
    ],
    checks: [
      check("pass", "Contingency table", `${result.rows.length} row categories and ${result.columns.length} column categories were included.`),
      ...warnings.map((warning) => check("warning", "Interpret with caution", warning)),
    ],
    technicalDetails: [
      details("Observed counts", result.rows.flatMap((row, rowIndex) =>
        result.columns.map((column, columnIndex) => ({
          label: `${row} × ${column}`,
          value: formatNumber(result.observed[rowIndex][columnIndex]),
        })),
      )),
    ],
    visualization: {
      kind: "contingency",
      title: `${leftLabel} by ${rightLabel}`,
      rows: result.rows,
      columns: result.columns,
      observed: result.observed,
      expected: result.expected,
    },
  });

export const buildMultipleRegressionPresentation = ({
  datasetId,
  datasetRevision,
  outcomeLabel,
  result,
  warnings,
}: {
  datasetId: string;
  datasetRevision: number;
  outcomeLabel: string;
  result: {
    n: number;
    predictorCount: number;
    coefficients: Array<{
      label: string;
      estimate: number;
      standardError: number | null;
      tStatistic: number | null;
      pValue: number | null;
      confidenceInterval: [number, number] | null;
    }>;
    rSquared: number;
    adjustedRSquared: number;
    fStatistic: number | null;
    fPValue: number | null;
    rmse: number;
    highCorrelationPairs: Array<[string, string]>;
  };
  warnings: string[];
}): AnalysisPresentation => {
  const nonIntercept = result.coefficients.filter((coefficient) => coefficient.label !== "Intercept");
  const leadCoefficient = nonIntercept[0];

  return basePresentation({
    datasetId,
    datasetRevision,
    analysisType: "multiple-regression",
    title: `${outcomeLabel} model`,
    headline: `This model accounted for about ${formatNumber(result.rSquared * 100, 0)}% of the variation in ${outcomeLabel}.`,
    interpretation: [
      leadCoefficient
        ? `Holding the other predictors constant, a one-unit increase in ${leadCoefficient.label} was associated with ${formatSignedNumber(
            leadCoefficient.estimate,
            2,
          )} units of ${outcomeLabel}.`
        : "The fitted model estimates how the outcome changes with all selected predictors together.",
      "Multiple regression coefficients are conditional on the other predictors being held constant.",
    ],
    metrics: [
      metric("Usable rows", formatNumber(result.n)),
      metric("Predictors", formatNumber(result.predictorCount)),
      metric("R²", formatNumber(result.rSquared, 2), undefined, "rSquared"),
      metric("Adjusted R²", formatNumber(result.adjustedRSquared, 2), undefined, "rSquared"),
      metric("Model P-value", formatPValue(result.fPValue), undefined, "pValue"),
      metric("RMSE", formatNumber(result.rmse, 2)),
    ],
    checks: [
      check("pass", "Model identified", `${result.n} complete rows supported this model with ${result.predictorCount} predictors.`),
      ...warnings.map((warning) => check("warning", "Interpret with caution", warning)),
      ...result.highCorrelationPairs.map((pair) =>
        check(
          "warning",
          "Predictor overlap",
          `${pair[0]} and ${pair[1]} are strongly correlated, which can make coefficient estimates less stable.`,
        ),
      ),
    ],
    technicalDetails: [
      details("Model fit", [
        { label: "F", value: formatNumber(result.fStatistic, 3) },
        { label: "P-value", value: formatPValue(result.fPValue) },
        { label: "Adjusted R²", value: formatNumber(result.adjustedRSquared, 3) },
      ]),
      details(
        "Coefficients",
        result.coefficients.map((coefficient) => ({
          label: coefficient.label,
          value: `${formatSignedNumber(coefficient.estimate, 2)} · SE ${formatNumber(
            coefficient.standardError,
            2,
          )} · ${formatPValue(coefficient.pValue)}`,
        })),
      ),
    ],
    visualization: {
      kind: "coefficients",
      title: "Coefficient estimates",
      xLabel: "Estimate",
      coefficients: nonIntercept.map((coefficient) => ({
        label: coefficient.label,
        estimate: coefficient.estimate,
        lower: coefficient.confidenceInterval?.[0] ?? coefficient.estimate,
        upper: coefficient.confidenceInterval?.[1] ?? coefficient.estimate,
      })),
    },
  });
};
