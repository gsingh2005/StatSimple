import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import type {
  AnalysisHistoryEntry,
  AnalysisIntent,
  Dataset,
  StoredAppState,
} from "../../types";
import { getSampleDataset, type SampleDatasetKey } from "../../data/samples/sampleDatasets";
import { loadStoredState, saveStoredState } from "../../storage/localStorage";

interface AppState extends StoredAppState {
  selectedVariableId: string | null;
  pendingAnalysisIntent: AnalysisIntent | null;
  intentVersion: number;
  historyOpen: boolean;
  notice: string | null;
  undoStack: Dataset[];
}

type Action =
  | {
      type: "replace-dataset";
      dataset: Dataset;
      notice: string;
    }
  | {
      type: "update-dataset";
      dataset: Dataset;
      notice: string;
    }
  | {
      type: "select-variable";
      variableId: string | null;
    }
  | {
      type: "dismiss-onboarding";
    }
  | {
      type: "save-analysis";
      entry: AnalysisHistoryEntry;
    }
  | {
      type: "queue-intent";
      intent: AnalysisIntent | null;
    }
  | {
      type: "toggle-history";
      open?: boolean;
    }
  | {
      type: "clear-notice";
    }
  | {
      type: "show-notice";
      notice: string;
    }
  | {
      type: "undo";
    };

interface AppContextValue {
  state: AppState;
  actions: {
    loadSampleDataset: (key: SampleDatasetKey) => void;
    replaceDataset: (dataset: Dataset, notice: string) => void;
    updateDataset: (dataset: Dataset, notice: string) => void;
    selectVariable: (variableId: string | null) => void;
    dismissOnboarding: () => void;
    saveAnalysis: (entry: AnalysisHistoryEntry) => void;
    queueIntent: (intent: AnalysisIntent | null) => void;
    toggleHistory: (open?: boolean) => void;
    showNotice: (notice: string) => void;
    clearNotice: () => void;
    undo: () => void;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

const buildInitialState = (): AppState => {
  const stored = typeof window === "undefined"
    ? {
        dataset: null,
        analysisHistory: [],
        dismissedOnboarding: false,
      }
    : loadStoredState();

  return {
    ...stored,
    selectedVariableId: stored.dataset?.variables[0]?.id ?? null,
    pendingAnalysisIntent: null,
    intentVersion: 0,
    historyOpen: false,
    notice: null,
    undoStack: [],
  };
};

const reducer = (state: AppState, action: Action): AppState => {
  if (action.type === "replace-dataset") {
    return {
      ...state,
      dataset: action.dataset,
      selectedVariableId: action.dataset.variables[0]?.id ?? null,
      pendingAnalysisIntent: null,
      notice: action.notice,
      undoStack: state.dataset ? [...state.undoStack.slice(-19), state.dataset] : state.undoStack,
    };
  }

  if (action.type === "update-dataset") {
    return {
      ...state,
      dataset: action.dataset,
      selectedVariableId:
        action.dataset.variables.some((variable) => variable.id === state.selectedVariableId)
          ? state.selectedVariableId
          : action.dataset.variables[0]?.id ?? null,
      notice: action.notice,
      undoStack: state.dataset ? [...state.undoStack.slice(-19), state.dataset] : state.undoStack,
    };
  }

  if (action.type === "select-variable") {
    return {
      ...state,
      selectedVariableId: action.variableId,
    };
  }

  if (action.type === "dismiss-onboarding") {
    return {
      ...state,
      dismissedOnboarding: true,
    };
  }

  if (action.type === "save-analysis") {
    return {
      ...state,
      analysisHistory: [action.entry, ...state.analysisHistory].slice(0, 30),
    };
  }

  if (action.type === "queue-intent") {
    return {
      ...state,
      pendingAnalysisIntent: action.intent,
      intentVersion: action.intent ? state.intentVersion + 1 : state.intentVersion,
      selectedVariableId: action.intent?.focusVariableId ?? state.selectedVariableId,
    };
  }

  if (action.type === "toggle-history") {
    return {
      ...state,
      historyOpen: action.open ?? !state.historyOpen,
    };
  }

  if (action.type === "clear-notice") {
    return {
      ...state,
      notice: null,
    };
  }

  if (action.type === "show-notice") {
    return {
      ...state,
      notice: action.notice,
    };
  }

  if (action.type === "undo") {
    if (state.undoStack.length === 0) {
      return state;
    }

    const previous = state.undoStack[state.undoStack.length - 1];

    return {
      ...state,
      dataset: previous,
      selectedVariableId:
        previous.variables.some((variable) => variable.id === state.selectedVariableId)
          ? state.selectedVariableId
          : previous.variables[0]?.id ?? null,
      notice: "Undid the most recent dataset change.",
      undoStack: state.undoStack.slice(0, -1),
    };
  }

  return state;
};

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialState);

  useEffect(() => {
    saveStoredState({
      dataset: state.dataset,
      analysisHistory: state.analysisHistory,
      dismissedOnboarding: state.dismissedOnboarding,
    });
  }, [state.analysisHistory, state.dataset, state.dismissedOnboarding]);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      actions: {
        loadSampleDataset: (key) =>
          dispatch({
            type: "replace-dataset",
            dataset: getSampleDataset(key),
            notice: "Loaded sample dataset.",
          }),
        replaceDataset: (dataset, notice) =>
          dispatch({
            type: "replace-dataset",
            dataset,
            notice,
          }),
        updateDataset: (dataset, notice) =>
          dispatch({
            type: "update-dataset",
            dataset,
            notice,
          }),
        selectVariable: (variableId) =>
          dispatch({
            type: "select-variable",
            variableId,
          }),
        dismissOnboarding: () =>
          dispatch({
            type: "dismiss-onboarding",
          }),
        saveAnalysis: (entry) =>
          dispatch({
            type: "save-analysis",
            entry,
          }),
        queueIntent: (intent) =>
          dispatch({
            type: "queue-intent",
            intent,
          }),
        toggleHistory: (open) =>
          dispatch({
            type: "toggle-history",
            open,
          }),
        showNotice: (notice) =>
          dispatch({
            type: "show-notice",
            notice,
          }),
        clearNotice: () =>
          dispatch({
            type: "clear-notice",
          }),
        undo: () =>
          dispatch({
            type: "undo",
          }),
      },
    }),
    [state],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppState = (): AppContextValue => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppState must be used inside AppProvider.");
  }

  return context;
};
