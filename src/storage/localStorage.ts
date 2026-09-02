import type { AnalysisHistoryEntry, Dataset, StoredAppState } from "../types";

const STORAGE_KEY = "statsimple:v1";

const fallbackState: StoredAppState = {
  dataset: null,
  analysisHistory: [],
  dismissedOnboarding: false,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isDataset = (value: unknown): value is Dataset =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.name === "string" &&
  typeof value.revision === "number" &&
  Array.isArray(value.variables) &&
  value.variables.every(
    (variable) =>
      isRecord(variable) &&
      typeof variable.id === "string" &&
      typeof variable.name === "string" &&
      typeof variable.type === "string",
  ) &&
  Array.isArray(value.rows) &&
  value.rows.every(
    (row) => isRecord(row) && typeof row.id === "string" && isRecord(row.values));

const isHistoryEntry = (value: unknown): value is AnalysisHistoryEntry =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.datasetId === "string" &&
  typeof value.datasetName === "string" &&
  typeof value.datasetRevision === "number" &&
  typeof value.analysisType === "string" &&
  typeof value.timestamp === "string" &&
  (value.section === "analyze" || value.section === "advanced") &&
  isRecord(value.config);

export const loadStoredState = (): StoredAppState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return fallbackState;
    }

    const parsed: unknown = JSON.parse(raw);

    if (!isRecord(parsed)) {
      return fallbackState;
    }

    return {
      dataset: isDataset(parsed.dataset) ? parsed.dataset : null,
      analysisHistory: Array.isArray(parsed.analysisHistory)
        ? parsed.analysisHistory.filter(isHistoryEntry).slice(0, 30)
        : [],
      dismissedOnboarding: parsed.dismissedOnboarding === true,
    };
  } catch {
    return fallbackState;
  }
};

export const saveStoredState = (value: StoredAppState): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore storage failures and keep the app usable.
  }
};
