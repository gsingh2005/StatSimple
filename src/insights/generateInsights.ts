import type { Dataset, Insight } from "../types";
import { getNumericValues, getStringValues } from "../data/model/dataset";
import { buildDatasetHealth } from "../data/validation/profileDataset";
import { pearsonCorrelation } from "../statistics/correlation/correlation";
import { independentSamplesTTest } from "../statistics/comparisons/tTests";
import { formatNumber, formatSignedNumber } from "../utils/format";
import { createId } from "../utils/id";

export const generateInsights = (dataset: Dataset): Insight[] => {
  const { profiles, issues } = buildDatasetHealth(dataset);
  const insights: Insight[] = [];
  const numericProfiles = profiles.filter(
    (profile) =>
      profile.type === "numeric" &&
      !profile.isIdentifierLike &&
      !profile.isConstant &&
      profile.missingRate < 0.5,
  );

  let bestCorrelation:
    | {
        leftId: string;
        rightId: string;
        leftName: string;
        rightName: string;
        coefficient: number;
        n: number;
      }
    | undefined;

  for (let leftIndex = 0; leftIndex < numericProfiles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < numericProfiles.length; rightIndex += 1) {
      const left = numericProfiles[leftIndex];
      const right = numericProfiles[rightIndex];
      const result = pearsonCorrelation(
        getNumericValues(dataset, left.variableId),
        getNumericValues(dataset, right.variableId),
      );

      if (!result.ok || result.value.n < 8 || Math.abs(result.value.coefficient) < 0.35) {
        continue;
      }

      if (!bestCorrelation || Math.abs(result.value.coefficient) > Math.abs(bestCorrelation.coefficient)) {
        bestCorrelation = {
          leftId: left.variableId,
          rightId: right.variableId,
          leftName: left.name,
          rightName: right.name,
          coefficient: result.value.coefficient,
          n: result.value.n,
        };
      }
    }
  }

  if (bestCorrelation) {
    insights.push({
      id: createId("insight"),
      type: "relationship",
      title: "Strong relationship",
      summary: `${bestCorrelation.leftName} and ${bestCorrelation.rightName} appear to move together in this dataset.`,
      metric: `r = ${formatSignedNumber(bestCorrelation.coefficient, 2)} · n = ${bestCorrelation.n}`,
      variables: [bestCorrelation.leftId, bestCorrelation.rightId],
      analysisAction: {
        section: "analyze",
        guidedConfig: {
          question: "relationship",
          variableAId: bestCorrelation.leftId,
          variableBId: bestCorrelation.rightId,
        },
        autoRun: true,
      },
    });
  }

  const categoricalProfiles = profiles.filter(
    (profile) =>
      ["categorical", "ordinal"].includes(profile.type) &&
      !profile.isIdentifierLike &&
      profile.distinctCount <= 20,
  );
  let bestDifference:
    | {
        outcomeId: string;
        groupId: string;
        outcomeName: string;
        groupName: string;
        difference: number;
      }
    | undefined;

  for (const outcome of numericProfiles) {
    for (const group of categoricalProfiles) {
      const result = independentSamplesTTest(
        getNumericValues(dataset, outcome.variableId),
        getStringValues(dataset, group.variableId),
      );

      if (!result.ok || result.value.groups.some((candidate) => candidate.n < 5)) {
        continue;
      }

      const differenceMagnitude = Math.abs(result.value.difference);

      if (!bestDifference || differenceMagnitude > Math.abs(bestDifference.difference)) {
        bestDifference = {
          outcomeId: outcome.variableId,
          groupId: group.variableId,
          outcomeName: outcome.name,
          groupName: group.name,
          difference: result.value.difference,
        };
      }
    }
  }

  if (bestDifference && Math.abs(bestDifference.difference) > 1) {
    insights.push({
      id: createId("insight"),
      type: "group-difference",
      title: "Possible group difference",
      summary: `${bestDifference.groupName} may separate ${bestDifference.outcomeName} in a practically meaningful way.`,
      metric: `Difference ≈ ${formatSignedNumber(bestDifference.difference, 2)}`,
      variables: [bestDifference.outcomeId, bestDifference.groupId],
      analysisAction: {
        section: "analyze",
        guidedConfig: {
          question: "compare-groups",
          outcomeId: bestDifference.outcomeId,
          groupId: bestDifference.groupId,
        },
        autoRun: true,
      },
    });
  }

  const outlierCandidate = numericProfiles.find((profile) => {
    if (!profile.numericSummary) {
      return false;
    }

    return (
      profile.numericSummary.max > profile.numericSummary.q3 + 1.5 * profile.numericSummary.iqr ||
      profile.numericSummary.min < profile.numericSummary.q1 - 1.5 * profile.numericSummary.iqr
    );
  });

  if (outlierCandidate?.numericSummary) {
    insights.push({
      id: createId("insight"),
      type: "distribution",
      title: "Potential outliers",
      summary: `${outlierCandidate.name} contains values far from most of the distribution.`,
      metric: `Range ${formatNumber(outlierCandidate.numericSummary.min)} to ${formatNumber(outlierCandidate.numericSummary.max)}`,
      variables: [outlierCandidate.variableId],
      analysisAction: {
        section: "analyze",
        guidedConfig: {
          question: "describe",
          variableId: outlierCandidate.variableId,
        },
        autoRun: true,
      },
    });
  }

  const firstIssue = issues[0];

  if (firstIssue) {
    insights.push({
      id: createId("insight"),
      type: "data-quality",
      title: firstIssue.title,
      summary: firstIssue.description,
      metric: firstIssue.severity === "warning" ? "Review variable" : "Exploratory note",
      variables: firstIssue.variableId ? [firstIssue.variableId] : [],
      severity: firstIssue.severity,
      analysisAction: firstIssue.variableId
        ? {
            section: "data",
            focusVariableId: firstIssue.variableId,
          }
        : undefined,
    });
  }

  return insights.slice(0, 4);
};
