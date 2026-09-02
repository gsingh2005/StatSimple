import type { Dataset, DatasetHealthIssue, DatasetSummary, VariableProfile } from "../../types";
import { createId } from "../../utils/id";
import { profileDataset } from "../model/dataset";

const countDuplicateRows = (dataset: Dataset): number => {
  const seen = new Set<string>();
  let duplicates = 0;

  dataset.rows.forEach((row) => {
    const signature = JSON.stringify(dataset.variables.map((variable) => row.values[variable.id] ?? null));
    if (seen.has(signature)) {
      duplicates += 1;
    } else {
      seen.add(signature);
    }
  });

  return duplicates;
};

export const summarizeDataset = (dataset: Dataset, profiles: VariableProfile[]): DatasetSummary => ({
  rowCount: dataset.rows.length,
  variableCount: dataset.variables.length,
  numericVariableCount: profiles.filter((profile) => profile.type === "numeric").length,
  categoricalVariableCount: profiles.filter((profile) =>
    ["categorical", "ordinal", "identifier", "date"].includes(profile.type),
  ).length,
  missingValueCount: profiles.reduce((total, profile) => total + profile.missingCount, 0),
});

export const buildDatasetHealth = (dataset: Dataset): {
  profiles: VariableProfile[];
  summary: DatasetSummary;
  issues: DatasetHealthIssue[];
} => {
  const profiles = profileDataset(dataset);
  const summary = summarizeDataset(dataset, profiles);
  const issues: DatasetHealthIssue[] = [];

  profiles.forEach((profile) => {
    if (profile.missingRate >= 0.2) {
      issues.push({
        id: createId("health"),
        kind: "missingness",
        severity: "warning",
        variableId: profile.variableId,
        title: `${profile.name} has missing data`,
        description: `${profile.missingCount} of ${profile.validCount + profile.missingCount} values are missing. Analyses involving this variable may use fewer observations.`,
      });
    }

    if (profile.isConstant) {
      issues.push({
        id: createId("health"),
        kind: "constant",
        severity: "warning",
        variableId: profile.variableId,
        title: `${profile.name} does not vary`,
        description: "This variable has the same usable value throughout the dataset, so many analyses will be unavailable.",
      });
    }

    if (profile.isNearlyConstant && !profile.isConstant) {
      issues.push({
        id: createId("health"),
        kind: "nearly-constant",
        severity: "info",
        variableId: profile.variableId,
        title: `${profile.name} changes very little`,
        description: "This variable is dominated by one value or category, so results may be unstable or uninformative.",
      });
    }

    if (profile.isMixed) {
      issues.push({
        id: createId("health"),
        kind: "mixed",
        severity: "warning",
        variableId: profile.variableId,
        title: `${profile.name} mixes value types`,
        description: "This column contains a mixture of numeric-looking and text values, which can reduce the number of usable rows.",
      });
    }

    if (profile.validCount === 0) {
      issues.push({
        id: createId("health"),
        kind: "empty",
        severity: "warning",
        variableId: profile.variableId,
        title: `${profile.name} is empty`,
        description: "This variable has no usable values yet.",
      });
    }

    if (profile.isIdentifierLike) {
      issues.push({
        id: createId("health"),
        kind: "identifier",
        severity: "info",
        variableId: profile.variableId,
        title: `${profile.name} looks like an identifier`,
        description: "Identifier-like variables are useful for tracking rows but usually not for statistical tests.",
      });
    }

    if (profile.type === "numeric" && profile.validCount > 0 && profile.validCount < 5) {
      issues.push({
        id: createId("health"),
        kind: "small-sample",
        severity: "warning",
        variableId: profile.variableId,
        title: `${profile.name} has very few usable numeric values`,
        description: "Small usable sample sizes limit what can be learned from this variable.",
      });
    }
  });

  const duplicateRows = countDuplicateRows(dataset);

  if (duplicateRows > 0) {
    issues.push({
      id: createId("health"),
      kind: "duplicate-rows",
      severity: "info",
      title: "Duplicate rows detected",
      description: `${duplicateRows} row${duplicateRows === 1 ? "" : "s"} exactly match another row in the dataset.`,
    });
  }

  return {
    profiles,
    summary,
    issues,
  };
};
