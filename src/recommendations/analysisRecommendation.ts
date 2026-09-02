import type {
  AnalysisType,
  Dataset,
  GuidedAnalysisConfig,
  GuidedQuestion,
  Recommendation,
} from "../types";
import { getNumericValues, getStringValues, getVariable } from "../data/model/dataset";

export const guidedQuestionOptions: Array<{
  key: GuidedQuestion;
  title: string;
  description: string;
}> = [
  {
    key: "describe",
    title: "Describe a variable",
    description: "Understand typical values, spread, and distribution.",
  },
  {
    key: "relationship",
    title: "Explore a relationship",
    description: "See whether two numeric variables move together.",
  },
  {
    key: "compare-groups",
    title: "Compare groups",
    description: "Compare one numeric outcome across independent groups.",
  },
  {
    key: "predict",
    title: "Predict an outcome",
    description: "Estimate how a numeric outcome changes with a predictor.",
  },
  {
    key: "before-after",
    title: "Compare before and after",
    description: "Compare two measurements from the same observations.",
  },
  {
    key: "manual",
    title: "I know the test I want",
    description: "Jump directly to a named method.",
  },
];

export const analysisTypeLabels: Record<AnalysisType, string> = {
  "descriptive-numeric": "Descriptive statistics",
  "descriptive-categorical": "Categorical summary",
  "pearson-correlation": "Pearson correlation",
  "spearman-correlation": "Spearman correlation",
  "simple-regression": "Simple linear regression",
  "one-sample-t-test": "One-sample t-test",
  "independent-t-test": "Independent-samples t-test",
  "paired-t-test": "Paired-samples t-test",
  "one-way-anova": "One-way ANOVA",
  "chi-square": "Chi-square test of independence",
  "multiple-regression": "Multiple linear regression",
};

export const manualAnalysisOptions: AnalysisType[] = [
  "descriptive-numeric",
  "descriptive-categorical",
  "pearson-correlation",
  "spearman-correlation",
  "simple-regression",
  "one-sample-t-test",
  "independent-t-test",
  "paired-t-test",
  "one-way-anova",
  "chi-square",
];

const categoricalLike = new Set(["categorical", "ordinal"]);

const usableForModel = (variable: ReturnType<typeof getVariable>): boolean =>
  Boolean(variable && variable.type !== "identifier");

const completeGroupCount = (dataset: Dataset, groupId: string, outcomeId?: string): number => {
  const values = getStringValues(dataset, groupId);
  const outcome = outcomeId ? getNumericValues(dataset, outcomeId) : null;
  const usable = values.filter((value, index) => {
    if (value === null) {
      return false;
    }

    if (!outcome) {
      return true;
    }

    return typeof outcome[index] === "number";
  });

  return new Set(usable).size;
};

const readyRecommendation = (
  type: AnalysisType,
  reason: string,
  alternatives: AnalysisType[] = [],
): Recommendation => ({
  status: "ready",
  recommendedType: type,
  title: `Recommended: ${analysisTypeLabels[type]}`,
  reason,
  alternatives,
});

const incompleteRecommendation = (reason: string): Recommendation => ({
  status: "incomplete",
  recommendedType: null,
  title: "Choose variables to continue",
  reason,
  alternatives: [],
});

const invalidRecommendation = (reason: string, alternatives: AnalysisType[] = []): Recommendation => ({
  status: "invalid",
  recommendedType: null,
  title: "This combination is not ready yet",
  reason,
  alternatives,
});

const validateManualSelection = (dataset: Dataset, config: GuidedAnalysisConfig): Recommendation => {
  const manualType = config.manualType;

  if (!manualType) {
    return incompleteRecommendation("Select a statistical method to configure it directly.");
  }

  if (manualType === "descriptive-numeric") {
    const variable = config.variableId ? getVariable(dataset, config.variableId) : null;
    if (!variable) {
      return incompleteRecommendation("Choose the variable you want to summarize.");
    }
    return variable.type === "numeric"
      ? readyRecommendation(manualType, "This variable is numeric, so a numeric summary is appropriate.")
      : invalidRecommendation("Numeric descriptive statistics require a numeric variable.", [
          "descriptive-categorical",
        ]);
  }

  if (manualType === "descriptive-categorical") {
    const variable = config.variableId ? getVariable(dataset, config.variableId) : null;
    if (!variable) {
      return incompleteRecommendation("Choose the variable you want to summarize.");
    }
    return categoricalLike.has(variable.type)
      ? readyRecommendation(manualType, "This variable is categorical-like, so a frequency summary is appropriate.")
      : invalidRecommendation("Categorical summaries require a categorical variable.", [
          "descriptive-numeric",
        ]);
  }

  if (manualType === "pearson-correlation" || manualType === "spearman-correlation") {
    const left = config.variableAId ? getVariable(dataset, config.variableAId) : null;
    const right = config.variableBId ? getVariable(dataset, config.variableBId) : null;
    if (!left || !right) {
      return incompleteRecommendation("Choose two numeric variables to continue.");
    }
    return left.type === "numeric" && right.type === "numeric" && usableForModel(left) && usableForModel(right)
      ? readyRecommendation(manualType, "Both variables are numeric, so this correlation method can be used.")
      : invalidRecommendation("Correlation requires two numeric variables.");
  }

  if (manualType === "simple-regression") {
    const outcome = config.outcomeId ? getVariable(dataset, config.outcomeId) : null;
    const predictor = config.predictorId ? getVariable(dataset, config.predictorId) : null;
    if (!outcome || !predictor) {
      return incompleteRecommendation("Choose a numeric outcome and a numeric predictor.");
    }
    return outcome.type === "numeric" && predictor.type === "numeric" && usableForModel(outcome) && usableForModel(predictor)
      ? readyRecommendation(manualType, "Simple regression estimates how a numeric outcome changes with a numeric predictor.")
      : invalidRecommendation("Simple regression requires one numeric outcome and one numeric predictor.");
  }

  if (manualType === "one-sample-t-test") {
    const variable = config.variableId ? getVariable(dataset, config.variableId) : null;
    if (!variable) {
      return incompleteRecommendation("Choose a numeric variable and a reference value.");
    }
    if (variable.type !== "numeric") {
      return invalidRecommendation("A one-sample t-test requires a numeric variable.");
    }
    if (config.referenceValue.trim() === "" || Number.isNaN(Number(config.referenceValue))) {
      return incompleteRecommendation("Enter the reference value you want to compare against.");
    }
    return readyRecommendation(manualType, "You are comparing a sample mean with a specific reference value.");
  }

  if (manualType === "independent-t-test" || manualType === "one-way-anova") {
    const outcome = config.outcomeId ? getVariable(dataset, config.outcomeId) : null;
    const group = config.groupId ? getVariable(dataset, config.groupId) : null;
    if (!outcome || !group) {
      return incompleteRecommendation("Choose a numeric outcome and a grouping variable.");
    }
    if (outcome.type !== "numeric" || !categoricalLike.has(group.type) || !usableForModel(outcome) || !usableForModel(group)) {
      return invalidRecommendation("This method requires a numeric outcome and a categorical grouping variable.");
    }
    const groups = completeGroupCount(dataset, group.id, outcome.id);
    if (manualType === "independent-t-test" && groups !== 2) {
      return invalidRecommendation("Independent-samples t-tests require exactly two usable groups.", [
        "one-way-anova",
      ]);
    }
    if (manualType === "one-way-anova" && groups < 3) {
      return invalidRecommendation("One-way ANOVA requires at least three usable groups.", [
        "independent-t-test",
      ]);
    }
    return readyRecommendation(
      manualType,
      manualType === "independent-t-test"
        ? "You are comparing one numeric outcome between two independent groups."
        : "You are comparing one numeric outcome across three or more groups.",
    );
  }

  if (manualType === "paired-t-test") {
    const first = config.variableAId ? getVariable(dataset, config.variableAId) : null;
    const second = config.variableBId ? getVariable(dataset, config.variableBId) : null;
    if (!first || !second) {
      return incompleteRecommendation("Choose the before and after measures to compare.");
    }
    return first.type === "numeric" && second.type === "numeric" && usableForModel(first) && usableForModel(second)
      ? readyRecommendation(manualType, "Paired t-tests compare two numeric measurements from the same observations.")
      : invalidRecommendation("Paired t-tests require two numeric variables measured on the same rows.");
  }

  if (manualType === "chi-square") {
    const left = config.variableAId ? getVariable(dataset, config.variableAId) : null;
    const right = config.variableBId ? getVariable(dataset, config.variableBId) : null;
    if (!left || !right) {
      return incompleteRecommendation("Choose the two categorical variables you want to compare.");
    }
    return categoricalLike.has(left.type) && categoricalLike.has(right.type) && usableForModel(left) && usableForModel(right)
      ? readyRecommendation(manualType, "Both variables are categorical, so a contingency-table analysis is appropriate.")
      : invalidRecommendation("Chi-square requires two categorical variables.");
  }

  return invalidRecommendation("This manual analysis is not supported in the current setup.");
};

export const buildRecommendation = (dataset: Dataset, config: GuidedAnalysisConfig): Recommendation => {
  if (config.question === "manual") {
    return validateManualSelection(dataset, config);
  }

  if (config.question === "describe") {
    const variable = config.variableId ? getVariable(dataset, config.variableId) : null;
    if (!variable) {
      return incompleteRecommendation("Choose the variable you want to understand.");
    }

    return variable.type === "numeric"
      ? readyRecommendation(
          "descriptive-numeric",
          "This variable is numeric, so a distribution summary can show its center, spread, and shape.",
        )
      : readyRecommendation(
          "descriptive-categorical",
          "This variable is categorical, so a frequency summary is the clearest way to describe it.",
        );
  }

  if (config.question === "relationship") {
    const left = config.variableAId ? getVariable(dataset, config.variableAId) : null;
    const right = config.variableBId ? getVariable(dataset, config.variableBId) : null;
    if (!left || !right) {
      return incompleteRecommendation("Choose the two variables you want to relate.");
    }
    if (left.type !== "numeric" || right.type !== "numeric" || !usableForModel(left) || !usableForModel(right)) {
      return invalidRecommendation("Correlation requires two numeric variables.", [
        "chi-square",
        "independent-t-test",
      ]);
    }
    return readyRecommendation(
      "pearson-correlation",
      "Both selected variables are numeric. Pearson correlation summarizes the direction and strength of their linear relationship.",
      ["spearman-correlation"],
    );
  }

  if (config.question === "compare-groups") {
    const outcome = config.outcomeId ? getVariable(dataset, config.outcomeId) : null;
    const group = config.groupId ? getVariable(dataset, config.groupId) : null;
    if (!outcome || !group) {
      return incompleteRecommendation("Choose a numeric outcome and a grouping variable.");
    }
    if (outcome.type !== "numeric" || !usableForModel(outcome)) {
      return invalidRecommendation("Group comparisons require a numeric outcome variable.");
    }
    if (!categoricalLike.has(group.type) || !usableForModel(group)) {
      return invalidRecommendation("Group comparisons require a categorical grouping variable.");
    }
    const groups = completeGroupCount(dataset, group.id, outcome.id);
    if (groups < 2) {
      return invalidRecommendation("At least two usable groups are required.");
    }
    if (groups === 2) {
      return readyRecommendation(
        "independent-t-test",
        "You are comparing one numeric measurement between two independent groups.",
        ["one-way-anova"],
      );
    }
    return readyRecommendation(
      "one-way-anova",
      "This grouping variable has three or more usable groups, so ANOVA is more appropriate than a two-group t-test.",
    );
  }

  if (config.question === "predict") {
    const outcome = config.outcomeId ? getVariable(dataset, config.outcomeId) : null;
    const predictor = config.predictorId ? getVariable(dataset, config.predictorId) : null;
    if (!outcome || !predictor) {
      return incompleteRecommendation("Choose a numeric outcome and a numeric predictor.");
    }
    if (outcome.type !== "numeric" || predictor.type !== "numeric" || !usableForModel(outcome) || !usableForModel(predictor)) {
      return invalidRecommendation("Prediction in this guided workflow currently requires numeric outcome and predictor variables.");
    }
    return readyRecommendation(
      "simple-regression",
      "Regression estimates how the outcome tends to change as the predictor changes.",
    );
  }

  if (config.question === "before-after") {
    const before = config.variableAId ? getVariable(dataset, config.variableAId) : null;
    const after = config.variableBId ? getVariable(dataset, config.variableBId) : null;
    if (!before || !after) {
      return incompleteRecommendation("Choose the two measurements collected on the same observations.");
    }
    if (before.type !== "numeric" || after.type !== "numeric" || !usableForModel(before) || !usableForModel(after)) {
      return invalidRecommendation("Paired comparisons require two numeric variables.");
    }
    return readyRecommendation(
      "paired-t-test",
      "You are comparing two numeric measurements from the same rows, so a paired-samples t-test is appropriate.",
    );
  }

  return incompleteRecommendation("Choose a question to get started.");
};
