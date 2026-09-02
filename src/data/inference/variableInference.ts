import type { CellValue, VariableType } from "../../types";

export interface InferenceDetails {
  type: VariableType;
  isMixed: boolean;
  isIdentifierLike: boolean;
}

const parseNumeric = (value: CellValue): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    const parsed = Number(trimmed);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
};

const looksLikeDate = (value: string): boolean =>
  /[-/]/.test(value) && !Number.isNaN(Date.parse(value));

export const inferVariableType = (name: string, values: CellValue[]): InferenceDetails => {
  const usable = values
    .filter((value): value is string | number => value !== null && `${value}`.trim() !== "")
    .map((value) => (typeof value === "string" ? value.trim() : value));

  if (usable.length === 0) {
    return {
      type: "categorical",
      isMixed: false,
      isIdentifierLike: false,
    };
  }

  const numericCount = usable.filter((value) => parseNumeric(value) !== null).length;
  const stringValues = usable.map((value) => String(value));
  const uniqueRatio = new Set(stringValues).size / usable.length;
  const booleanLike = usable.every((value) =>
    ["true", "false", "yes", "no", "y", "n", "0", "1"].includes(String(value).toLowerCase()),
  );
  const integerLike = usable.every((value) => {
    const numeric = parseNumeric(value);
    return numeric !== null && Number.isInteger(numeric);
  });
  const isIdentifierLike =
    /(^|[_\s-])(id|identifier|code)([_\s-]|$)/i.test(name) ||
    (uniqueRatio > 0.95 &&
      usable.length >= 20 &&
      integerLike);
  const isMixed = numericCount > 0 && numericCount < usable.length;

  if (usable.every((value) => typeof value === "string" && looksLikeDate(value))) {
    return {
      type: "date",
      isMixed: false,
      isIdentifierLike: false,
    };
  }

  if (isIdentifierLike) {
    return {
      type: "identifier",
      isMixed,
      isIdentifierLike: true,
    };
  }

  if (!isMixed && numericCount === usable.length) {
    return {
      type: "numeric",
      isMixed: false,
      isIdentifierLike: false,
    };
  }

  if (booleanLike || new Set(stringValues).size <= Math.min(10, Math.max(3, Math.floor(usable.length / 2)))) {
    return {
      type: "categorical",
      isMixed,
      isIdentifierLike: false,
    };
  }

  return {
    type: "categorical",
    isMixed,
    isIdentifierLike: false,
  };
};

export const coerceValueForType = (value: CellValue, type: VariableType): CellValue => {
  if (value === null || value === undefined) {
    return null;
  }

  const trimmed = typeof value === "string" ? value.trim() : value;

  if (trimmed === "") {
    return null;
  }

  if (type === "numeric") {
    const parsed = parseNumeric(trimmed);
    return parsed ?? String(trimmed);
  }

  if (typeof trimmed === "number") {
    return String(trimmed);
  }

  return String(trimmed);
};

export const parseNumericValue = (value: CellValue): number | null => parseNumeric(value);
