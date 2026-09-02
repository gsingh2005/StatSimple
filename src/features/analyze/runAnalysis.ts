import type {
  AdvancedAnalysisConfig,
  AnalysisHistoryEntry,
  AnalysisPresentation,
  AnalysisType,
  Dataset,
  GuidedAnalysisConfig,
} from "../../types";
import { getNumericValues, getStringValues, getVariable } from "../../data/model/dataset";
import { analysisTypeLabels, buildRecommendation } from "../../recommendations/analysisRecommendation";
import { describeCategorical, describeNumeric } from "../../statistics/descriptives/describe";
import { pearsonCorrelation, spearmanCorrelation } from "../../statistics/correlation/correlation";
import { simpleLinearRegression, multipleLinearRegression } from "../../statistics/regression/linearRegression";
import {
  oneSampleTTest,
  independentSamplesTTest,
  pairedSamplesTTest,
} from "../../statistics/comparisons/tTests";
import { oneWayAnova } from "../../statistics/anova/anova";
import { chiSquareTestOfIndependence } from "../../statistics/categorical/chiSquare";
import { createId } from "../../utils/id";
import { formatDateTime } from "../../utils/format";
import {
  buildAnovaPresentation,
  buildCategoricalDescriptionPresentation,
  buildChiSquarePresentation,
  buildCorrelationPresentation,
  buildIndependentTPresentation,
  buildMultipleRegressionPresentation,
  buildNumericDescriptionPresentation,
  buildOneSamplePresentation,
  buildPairedTPresentation,
  buildSimpleRegressionPresentation,
} from "../../interpretation/buildResults";

export type AnalysisExecutionResult =
  | {
      ok: true;
      presentation: AnalysisPresentation;
      historyEntry: AnalysisHistoryEntry;
    }
  | {
      ok: false;
      message: string;
      analysisType?: AnalysisType;
    };

const makeHistoryEntry = (
  dataset: Dataset,
  presentation: AnalysisPresentation,
  section: AnalysisHistoryEntry["section"],
  config: GuidedAnalysisConfig | AdvancedAnalysisConfig,
): AnalysisHistoryEntry => ({
  id: createId("history"),
  datasetId: dataset.id,
  datasetName: dataset.name,
  datasetRevision: dataset.revision,
  analysisType: presentation.analysisType,
  title: presentation.title,
  headline: presentation.headline,
  keyResult: presentation.metrics[0]?.value ?? presentation.headline,
  timestamp: new Date().toISOString(),
  section,
  config: config as never,
});

const displayVariableLabel = (dataset: Dataset, variableId: string): string =>
  getVariable(dataset, variableId)?.name ?? "Variable";

const failed = (message: string, analysisType?: AnalysisType): AnalysisExecutionResult => ({
  ok: false,
  message,
  analysisType,
});

const buildValuesMap = (values: Array<number | null>, groups: Array<string | null>) =>
  values.reduce<Record<string, number[]>>((accumulator, value, index) => {
    const group = groups[index];

    if (typeof value !== "number" || group === null) {
      return accumulator;
    }

    if (!accumulator[group]) {
      accumulator[group] = [];
    }

    accumulator[group].push(value);
    return accumulator;
  }, {});

export const runGuidedAnalysis = (
  dataset: Dataset,
  config: GuidedAnalysisConfig,
): AnalysisExecutionResult => {
  const recommendation = buildRecommendation(dataset, config);

  if (recommendation.status !== "ready" || !recommendation.recommendedType) {
    return failed(recommendation.reason);
  }

  const analysisType = config.question === "manual" && config.manualType
    ? config.manualType
    : recommendation.recommendedType;

  if (analysisType === "descriptive-numeric") {
    if (!config.variableId) {
      return failed("Choose the variable you want to describe.", analysisType);
    }
    const values = getNumericValues(dataset, config.variableId);
    const description = describeNumeric(values);
    if (!description.ok) {
      return failed(description.error.message, analysisType);
    }
    const presentation = buildNumericDescriptionPresentation({
      datasetId: dataset.id,
      datasetRevision: dataset.revision,
      variableLabel: displayVariableLabel(dataset, config.variableId),
      values: values.filter((value): value is number => typeof value === "number"),
      summary: description.value,
    });
    return {
      ok: true,
      presentation,
      historyEntry: makeHistoryEntry(dataset, presentation, "analyze", config),
    };
  }

  if (analysisType === "descriptive-categorical") {
    if (!config.variableId) {
      return failed("Choose the variable you want to describe.", analysisType);
    }
    const values = getStringValues(dataset, config.variableId);
    const description = describeCategorical(values);
    if (!description.ok) {
      return failed(description.error.message, analysisType);
    }
    const missing = values.filter((value) => value === null).length;
    const presentation = buildCategoricalDescriptionPresentation({
      datasetId: dataset.id,
      datasetRevision: dataset.revision,
      variableLabel: displayVariableLabel(dataset, config.variableId),
      categories: description.value,
      missing,
    });
    return {
      ok: true,
      presentation,
      historyEntry: makeHistoryEntry(dataset, presentation, "analyze", config),
    };
  }

  if (analysisType === "pearson-correlation" || analysisType === "spearman-correlation") {
    if (!config.variableAId || !config.variableBId) {
      return failed("Choose both variables before running this analysis.", analysisType);
    }
    const x = getNumericValues(dataset, config.variableAId);
    const y = getNumericValues(dataset, config.variableBId);
    const result =
      analysisType === "pearson-correlation"
        ? pearsonCorrelation(x, y)
        : spearmanCorrelation(x, y);
    if (!result.ok) {
      return failed(result.error.message, analysisType);
    }
    const points = x
      .map((value, index) => [value, y[index]] as const)
      .filter(
        (pair): pair is [number, number] =>
          typeof pair[0] === "number" && typeof pair[1] === "number",
      );
    const presentation = buildCorrelationPresentation({
      datasetId: dataset.id,
      datasetRevision: dataset.revision,
      analysisType,
      xLabel: displayVariableLabel(dataset, config.variableAId),
      yLabel: displayVariableLabel(dataset, config.variableBId),
      x: points.map(([value]) => value),
      y: points.map(([, value]) => value),
      coefficient: result.value.coefficient,
      pValue: result.value.pValue,
      confidenceInterval: result.value.confidenceInterval,
      n: result.value.n,
      warnings: result.warnings.map((warning) => warning.message),
    });
    return {
      ok: true,
      presentation,
      historyEntry: makeHistoryEntry(dataset, presentation, "analyze", config),
    };
  }

  if (analysisType === "simple-regression") {
    if (!config.outcomeId || !config.predictorId) {
      return failed("Choose an outcome and predictor before running regression.", analysisType);
    }
    const x = getNumericValues(dataset, config.predictorId);
    const y = getNumericValues(dataset, config.outcomeId);
    const result = simpleLinearRegression(x, y);
    if (!result.ok) {
      return failed(result.error.message, analysisType);
    }
    const pairs = x
      .map((value, index) => [value, y[index]] as const)
      .filter(
        (pair): pair is [number, number] =>
          typeof pair[0] === "number" && typeof pair[1] === "number",
      );
    const presentation = buildSimpleRegressionPresentation({
      datasetId: dataset.id,
      datasetRevision: dataset.revision,
      predictorLabel: displayVariableLabel(dataset, config.predictorId),
      outcomeLabel: displayVariableLabel(dataset, config.outcomeId),
      x: pairs.map(([value]) => value),
      y: pairs.map(([, value]) => value),
      result: result.value,
      warnings: result.warnings.map((warning) => warning.message),
    });
    return {
      ok: true,
      presentation,
      historyEntry: makeHistoryEntry(dataset, presentation, "analyze", config),
    };
  }

  if (analysisType === "one-sample-t-test") {
    if (!config.variableId) {
      return failed("Choose the variable you want to compare with the reference value.", analysisType);
    }
    const referenceValue = Number(config.referenceValue);
    if (Number.isNaN(referenceValue)) {
      return failed("Enter a valid reference value to continue.", analysisType);
    }
    const values = getNumericValues(dataset, config.variableId);
    const result = oneSampleTTest(values, referenceValue);
    if (!result.ok) {
      return failed(result.error.message, analysisType);
    }
    const presentation = buildOneSamplePresentation({
      datasetId: dataset.id,
      datasetRevision: dataset.revision,
      variableLabel: displayVariableLabel(dataset, config.variableId),
      values: values.filter((value): value is number => typeof value === "number"),
      referenceValue,
      result: result.value,
      warnings: result.warnings.map((warning) => warning.message),
    });
    return {
      ok: true,
      presentation,
      historyEntry: makeHistoryEntry(dataset, presentation, "analyze", config),
    };
  }

  if (analysisType === "independent-t-test") {
    if (!config.outcomeId || !config.groupId) {
      return failed("Choose both the outcome and grouping variable.", analysisType);
    }
    const values = getNumericValues(dataset, config.outcomeId);
    const groups = getStringValues(dataset, config.groupId);
    const result = independentSamplesTTest(values, groups);
    if (!result.ok) {
      return failed(result.error.message, analysisType);
    }
    const presentation = buildIndependentTPresentation({
      datasetId: dataset.id,
      datasetRevision: dataset.revision,
      outcomeLabel: displayVariableLabel(dataset, config.outcomeId),
      result: result.value,
      groupValues: buildValuesMap(values, groups),
      warnings: result.warnings.map((warning) => warning.message),
    });
    return {
      ok: true,
      presentation,
      historyEntry: makeHistoryEntry(dataset, presentation, "analyze", config),
    };
  }

  if (analysisType === "paired-t-test") {
    if (!config.variableAId || !config.variableBId) {
      return failed("Choose the before and after measurements to continue.", analysisType);
    }
    const before = getNumericValues(dataset, config.variableAId);
    const after = getNumericValues(dataset, config.variableBId);
    const result = pairedSamplesTTest(before, after);
    if (!result.ok) {
      return failed(result.error.message, analysisType);
    }
    const pairs = before
      .map((value, index) => [value, after[index]] as const)
      .filter(
        (pair): pair is [number, number] =>
          typeof pair[0] === "number" && typeof pair[1] === "number",
      )
      .map(([beforeValue, afterValue]) => ({
        before: beforeValue,
        after: afterValue,
      }));
    const presentation = buildPairedTPresentation({
      datasetId: dataset.id,
      datasetRevision: dataset.revision,
      beforeLabel: displayVariableLabel(dataset, config.variableAId),
      afterLabel: displayVariableLabel(dataset, config.variableBId),
      pairs,
      result: result.value,
      warnings: result.warnings.map((warning) => warning.message),
    });
    return {
      ok: true,
      presentation,
      historyEntry: makeHistoryEntry(dataset, presentation, "analyze", config),
    };
  }

  if (analysisType === "one-way-anova") {
    if (!config.outcomeId || !config.groupId) {
      return failed("Choose an outcome and grouping variable to continue.", analysisType);
    }
    const values = getNumericValues(dataset, config.outcomeId);
    const groups = getStringValues(dataset, config.groupId);
    const result = oneWayAnova(values, groups);
    if (!result.ok) {
      return failed(result.error.message, analysisType);
    }
    const presentation = buildAnovaPresentation({
      datasetId: dataset.id,
      datasetRevision: dataset.revision,
      outcomeLabel: displayVariableLabel(dataset, config.outcomeId),
      result: result.value,
      groupValues: buildValuesMap(values, groups),
      warnings: result.warnings.map((warning) => warning.message),
    });
    return {
      ok: true,
      presentation,
      historyEntry: makeHistoryEntry(dataset, presentation, "analyze", config),
    };
  }

  if (analysisType === "chi-square") {
    if (!config.variableAId || !config.variableBId) {
      return failed("Choose the two categorical variables you want to compare.", analysisType);
    }
    const left = getStringValues(dataset, config.variableAId);
    const right = getStringValues(dataset, config.variableBId);
    const result = chiSquareTestOfIndependence(left, right);
    if (!result.ok) {
      return failed(result.error.message, analysisType);
    }
    const presentation = buildChiSquarePresentation({
      datasetId: dataset.id,
      datasetRevision: dataset.revision,
      leftLabel: displayVariableLabel(dataset, config.variableAId),
      rightLabel: displayVariableLabel(dataset, config.variableBId),
      result: result.value,
      warnings: result.warnings.map((warning) => warning.message),
    });
    return {
      ok: true,
      presentation,
      historyEntry: makeHistoryEntry(dataset, presentation, "analyze", config),
    };
  }

  return failed(`Unsupported analysis: ${analysisTypeLabels[analysisType] ?? analysisType}`);
};

export const runAdvancedAnalysis = (
  dataset: Dataset,
  config: AdvancedAnalysisConfig,
): AnalysisExecutionResult => {
  if (!config.outcomeId || config.predictorIds.length < 2) {
    return failed("Choose one numeric outcome and at least two predictors.");
  }

  const outcome = getNumericValues(dataset, config.outcomeId);
  const predictors = config.predictorIds.map((predictorId) => getNumericValues(dataset, predictorId));
  const predictorLabels = config.predictorIds.map((predictorId) => displayVariableLabel(dataset, predictorId));
  const result = multipleLinearRegression(outcome, predictors, predictorLabels);

  if (!result.ok) {
    return failed(result.error.message, "multiple-regression");
  }

  const presentation = buildMultipleRegressionPresentation({
    datasetId: dataset.id,
    datasetRevision: dataset.revision,
    outcomeLabel: displayVariableLabel(dataset, config.outcomeId),
    result: result.value,
    warnings: result.warnings.map((warning) => warning.message),
  });

  return {
    ok: true,
    presentation,
    historyEntry: makeHistoryEntry(dataset, presentation, "advanced", config),
  };
};

export const describeHistoryStaleness = (
  currentDataset: Dataset | null,
  historyEntry: AnalysisHistoryEntry,
): string | null => {
  if (!currentDataset || currentDataset.id !== historyEntry.datasetId) {
    return `This analysis was created for ${historyEntry.datasetName} on ${formatDateTime(historyEntry.timestamp)}.`;
  }

  if (currentDataset.revision !== historyEntry.datasetRevision) {
    return `This analysis used dataset revision ${historyEntry.datasetRevision}; the current dataset is revision ${currentDataset.revision}.`;
  }

  return null;
};

export const buildResultSummary = (presentation: AnalysisPresentation): string =>
  presentation.metrics
    .slice(0, 3)
    .map((item) => `${item.label}: ${item.value}`)
    .join(" · ");
