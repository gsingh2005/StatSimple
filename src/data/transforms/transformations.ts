import type { Dataset } from "../../types";
import { createId } from "../../utils/id";
import { parseNumericValue } from "../inference/variableInference";
import { getVariable } from "../model/dataset";

export type TransformationKind = "standardize" | "natural-log" | "square";

export const transformationLabelMap: Record<TransformationKind, string> = {
  standardize: "Standardize (z-score)",
  "natural-log": "Natural log",
  square: "Square",
};

export const applyTransformation = (
  dataset: Dataset,
  variableId: string,
  kind: TransformationKind,
  newVariableName: string,
): {
  dataset: Dataset;
  summary: string;
} => {
  const sourceVariable = getVariable(dataset, variableId);

  if (!sourceVariable) {
    return {
      dataset,
      summary: "The selected source variable no longer exists.",
    };
  }

  const values = dataset.rows.map((row) => parseNumericValue(row.values[variableId]));
  const usable = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const mean = usable.reduce((total, value) => total + value, 0) / Math.max(usable.length, 1);
  const variance =
    usable.length > 1
      ? usable.reduce((total, value) => total + (value - mean) ** 2, 0) / (usable.length - 1)
      : 0;
  const standardDeviation = Math.sqrt(Math.max(variance, 0));
  let invalidCount = 0;
  const variableIdNew = createId("variable");
  const variables = [
    ...dataset.variables,
    {
      id: variableIdNew,
      name: newVariableName.trim(),
      inferredType: "numeric" as const,
      type: "numeric" as const,
      userOverriddenType: false,
    },
  ];
  const rows = dataset.rows.map((row) => {
    const base = parseNumericValue(row.values[variableId]);
    let nextValue: number | null = null;

    if (typeof base !== "number" || !Number.isFinite(base)) {
      invalidCount += 1;
    } else if (kind === "standardize") {
      nextValue = standardDeviation === 0 ? 0 : (base - mean) / standardDeviation;
    } else if (kind === "natural-log") {
      if (base <= 0) {
        invalidCount += 1;
      } else {
        nextValue = Math.log(base);
      }
    } else {
      nextValue = base ** 2;
    }

    return {
      ...row,
      values: {
        ...row.values,
        [variableIdNew]: nextValue,
      },
    };
  });

  return {
    dataset: {
      ...dataset,
      variables,
      rows,
      revision: dataset.revision + 1,
      lastUpdated: new Date().toISOString(),
    },
    summary:
      invalidCount === 0
        ? `${transformationLabelMap[kind]} created ${newVariableName.trim()}.`
        : `${transformationLabelMap[kind]} created ${newVariableName.trim()}, with ${invalidCount} value${
            invalidCount === 1 ? "" : "s"
          } left missing because the transformation was not valid.`,
  };
};
