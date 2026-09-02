import Papa from "papaparse";

import type {
  CellValue,
  Dataset,
  DataRow,
  Variable,
  VariableProfile,
  VariableType,
} from "../../types";
import { createId } from "../../utils/id";
import { describeCategorical, describeNumeric } from "../../statistics/descriptives/describe";
import { coerceValueForType, inferVariableType, parseNumericValue } from "../inference/variableInference";

const cloneRows = (rows: DataRow[]): DataRow[] =>
  rows.map((row) => ({
    ...row,
    values: { ...row.values },
  }));

const normalizeCell = (value: unknown): CellValue => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const trimmed = String(value).trim();

  return trimmed === "" ? null : trimmed;
};

export const createDatasetFromColumns = ({
  name,
  headers,
  rows,
  origin,
}: {
  name: string;
  headers: string[];
  rows: unknown[][];
  origin: Dataset["origin"];
}): Dataset => {
  const variables: Variable[] = headers.map((header, index) => {
    const columnValues = rows.map((row) => normalizeCell(row[index]));
    const inference = inferVariableType(header, columnValues);

    return {
      id: createId("variable"),
      name: header,
      inferredType: inference.type,
      type: inference.type,
      userOverriddenType: false,
    };
  });

  const dataRows = rows.map((row) => ({
    id: createId("row"),
    values: Object.fromEntries(
      variables.map((variable, index) => [
        variable.id,
        coerceValueForType(normalizeCell(row[index]), variable.type),
      ]),
    ),
  }));

  return {
    id: createId("dataset"),
    name,
    revision: 1,
    variables,
    rows: dataRows,
    origin,
    lastUpdated: new Date().toISOString(),
  };
};

const nextRevision = (dataset: Dataset, rows: DataRow[], variables: Variable[]): Dataset => ({
  ...dataset,
  rows,
  variables,
  revision: dataset.revision + 1,
  lastUpdated: new Date().toISOString(),
});

export const getVariable = (dataset: Dataset, variableId: string): Variable | undefined =>
  dataset.variables.find((variable) => variable.id === variableId);

export const getVariableValues = (dataset: Dataset, variableId: string): CellValue[] =>
  dataset.rows.map((row) => row.values[variableId] ?? null);

export const getNumericValues = (dataset: Dataset, variableId: string): Array<number | null> =>
  getVariableValues(dataset, variableId).map((value) => parseNumericValue(value));

export const getStringValues = (dataset: Dataset, variableId: string): Array<string | null> =>
  getVariableValues(dataset, variableId).map((value) =>
    value === null || value === undefined || `${value}`.trim() === "" ? null : String(value),
  );

export const profileVariable = (dataset: Dataset, variableId: string): VariableProfile | null => {
  const variable = getVariable(dataset, variableId);

  if (!variable) {
    return null;
  }

  const rawValues = getVariableValues(dataset, variableId);
  const usableStringValues = rawValues
    .filter((value): value is string | number => value !== null && `${value}`.trim() !== "")
    .map((value) => String(value));
  const distinctCount = new Set(usableStringValues).size;
  const missingCount = rawValues.length - usableStringValues.length;
  const inference = inferVariableType(variable.name, rawValues);
  const numericValues = getNumericValues(dataset, variableId);
  const numericDescription = describeNumeric(numericValues);
  const categoricalDescription = describeCategorical(rawValues);
  const topCategoryCount = categoricalDescription.ok ? categoricalDescription.value[0]?.count ?? 0 : 0;

  return {
    variableId: variable.id,
    name: variable.name,
    type: variable.type,
    validCount:
      variable.type === "numeric"
        ? numericValues.filter((value) => typeof value === "number").length
        : usableStringValues.length,
    missingCount,
    distinctCount,
    missingRate: rawValues.length === 0 ? 0 : missingCount / rawValues.length,
    isConstant: distinctCount <= 1 && usableStringValues.length > 0,
    isNearlyConstant:
      usableStringValues.length > 0 && topCategoryCount / usableStringValues.length >= 0.95,
    isMixed: inference.isMixed,
    isIdentifierLike: inference.isIdentifierLike || variable.type === "identifier",
    numericSummary: numericDescription.ok ? numericDescription.value : undefined,
    categories: categoricalDescription.ok ? categoricalDescription.value : undefined,
  };
};

export const profileDataset = (dataset: Dataset): VariableProfile[] =>
  dataset.variables
    .map((variable) => profileVariable(dataset, variable.id))
    .filter((profile): profile is VariableProfile => profile !== null);

export const updateCellValue = (
  dataset: Dataset,
  rowId: string,
  variableId: string,
  value: string,
): Dataset => {
  const variable = getVariable(dataset, variableId);

  if (!variable) {
    return dataset;
  }

  const rows = cloneRows(dataset.rows).map((row) =>
    row.id === rowId
      ? {
          ...row,
          values: {
            ...row.values,
            [variableId]: coerceValueForType(value, variable.type),
          },
        }
      : row,
  );

  return nextRevision(dataset, rows, [...dataset.variables]);
};

export const addEmptyRow = (dataset: Dataset): Dataset => {
  const row: DataRow = {
    id: createId("row"),
    values: Object.fromEntries(dataset.variables.map((variable) => [variable.id, null])),
  };

  return nextRevision(dataset, [...cloneRows(dataset.rows), row], [...dataset.variables]);
};

export const deleteRow = (dataset: Dataset, rowId: string): Dataset =>
  nextRevision(
    dataset,
    cloneRows(dataset.rows).filter((row) => row.id !== rowId),
    [...dataset.variables],
  );

export const renameVariable = (
  dataset: Dataset,
  variableId: string,
  newName: string,
): { dataset: Dataset; error?: string } => {
  const trimmed = newName.trim();

  if (!trimmed) {
    return {
      dataset,
      error: "Variable names cannot be blank.",
    };
  }

  if (
    dataset.variables.some(
      (variable) => variable.id !== variableId && variable.name.toLowerCase() === trimmed.toLowerCase(),
    )
  ) {
    return {
      dataset,
      error: `A variable named "${trimmed}" already exists.`,
    };
  }

  const variables = dataset.variables.map((variable) =>
    variable.id === variableId ? { ...variable, name: trimmed } : variable,
  );

  return {
    dataset: nextRevision(dataset, cloneRows(dataset.rows), variables),
  };
};

export const changeVariableType = (
  dataset: Dataset,
  variableId: string,
  newType: VariableType,
): Dataset => {
  const variables = dataset.variables.map((variable) =>
    variable.id === variableId
      ? {
          ...variable,
          type: newType,
          userOverriddenType: true,
        }
      : variable,
  );
  const rows = cloneRows(dataset.rows).map((row) => ({
    ...row,
    values: {
      ...row.values,
      [variableId]: coerceValueForType(row.values[variableId], newType),
    },
  }));

  return nextRevision(dataset, rows, variables);
};

export const deleteVariable = (dataset: Dataset, variableId: string): Dataset => {
  const variables = dataset.variables.filter((variable) => variable.id !== variableId);
  const rows = cloneRows(dataset.rows).map((row) => {
    const nextValues = { ...row.values };
    delete nextValues[variableId];
    return {
      ...row,
      values: nextValues,
    };
  });

  return nextRevision(dataset, rows, variables);
};

export const cleanDataset = (
  dataset: Dataset,
): {
  dataset: Dataset;
  summary: string;
} => {
  let trimmedCells = 0;
  let removedEmptyRows = 0;
  let removedDuplicateRows = 0;
  const rows = cloneRows(dataset.rows).map((row) => {
    const nextValues = Object.fromEntries(
      dataset.variables.map((variable) => {
        const original = row.values[variable.id];
        const trimmed =
          typeof original === "string" ? original.trim() : original;

        if (original !== trimmed) {
          trimmedCells += 1;
        }

        return [variable.id, coerceValueForType(trimmed, variable.type)];
      }),
    );

    return {
      ...row,
      values: nextValues,
    };
  });

  const nonEmptyRows = rows.filter((row) => {
    const hasValue = dataset.variables.some((variable) => row.values[variable.id] !== null);

    if (!hasValue) {
      removedEmptyRows += 1;
    }

    return hasValue;
  });
  const seen = new Set<string>();
  const dedupedRows = nonEmptyRows.filter((row) => {
    const signature = JSON.stringify(dataset.variables.map((variable) => row.values[variable.id] ?? null));

    if (seen.has(signature)) {
      removedDuplicateRows += 1;
      return false;
    }

    seen.add(signature);
    return true;
  });

  return {
    dataset: nextRevision(dataset, dedupedRows, [...dataset.variables]),
    summary: `Trimmed ${trimmedCells} cell${trimmedCells === 1 ? "" : "s"}, removed ${removedEmptyRows} empty row${
      removedEmptyRows === 1 ? "" : "s"
    }, and removed ${removedDuplicateRows} duplicate row${removedDuplicateRows === 1 ? "" : "s"}.`,
  };
};

export const previewCleaning = (dataset: Dataset): string => {
  const rows = dataset.rows;
  const emptyRows = rows.filter((row) =>
    dataset.variables.every((variable) => row.values[variable.id] === null),
  ).length;
  const trimmedStrings = rows.reduce((total, row) => {
    return (
      total +
      dataset.variables.filter((variable) => {
        const value = row.values[variable.id];
        return typeof value === "string" && value !== value.trim();
      }).length
    );
  }, 0);
  const duplicates = (() => {
    const seen = new Set<string>();
    let duplicateCount = 0;

    rows.forEach((row) => {
      const signature = JSON.stringify(dataset.variables.map((variable) => row.values[variable.id] ?? null));
      if (seen.has(signature)) {
        duplicateCount += 1;
      } else {
        seen.add(signature);
      }
    });

    return duplicateCount;
  })();

  return `This will trim ${trimmedStrings} text cell${trimmedStrings === 1 ? "" : "s"}, remove ${emptyRows} empty row${
    emptyRows === 1 ? "" : "s"
  }, and remove ${duplicates} duplicate row${duplicates === 1 ? "" : "s"}.`;
};

export const datasetToCsv = (dataset: Dataset): string =>
  Papa.unparse({
    fields: dataset.variables.map((variable) => variable.name),
    data: dataset.rows.map((row) =>
      dataset.variables.map((variable) => row.values[variable.id] ?? ""),
    ),
  });
