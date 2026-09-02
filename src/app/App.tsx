import { lazy, Suspense, useMemo, useRef } from "react";

import { AppShell } from "./layout/AppShell";
import { ErrorBoundary } from "./layout/ErrorBoundary";
import { AppProvider, useAppState } from "./providers/AppProvider";
import { useHashSection } from "./hooks/useHashSection";
import { parseCsvText } from "../data/parsing/csv";
import { buildDatasetHealth } from "../data/validation/profileDataset";
import { generateInsights } from "../insights/generateInsights";
import { OverviewPage } from "../features/overview/OverviewPage";
import { HistoryDrawer } from "../features/history/HistoryDrawer";
import type { AnalysisIntent } from "../types";

const DataPage = lazy(() => import("../features/data/DataPage").then((module) => ({ default: module.DataPage })));
const AnalyzePage = lazy(() => import("../features/analyze/AnalyzePage").then((module) => ({ default: module.AnalyzePage })));
const AdvancedPage = lazy(() => import("../features/advanced/AdvancedPage").then((module) => ({ default: module.AdvancedPage })));

const InnerApp = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { state, actions } = useAppState();
  const { section, setSection } = useHashSection();
  const health = useMemo(
    () => (state.dataset ? buildDatasetHealth(state.dataset) : null),
    [state.dataset],
  );
  const insights = useMemo(
    () => (state.dataset ? generateInsights(state.dataset) : []),
    [state.dataset],
  );

  const openDataVariable = (variableId: string) => {
    actions.selectVariable(variableId);
    setSection("data");
  };

  const queueIntentAndNavigate = (intent: AnalysisIntent) => {
    actions.queueIntent(intent);
    if (intent.focusVariableId) {
      actions.selectVariable(intent.focusVariableId);
    }
    setSection(intent.section);
  };

  const handleImportRequest = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file: File | null) => {
    if (!file) {
      return;
    }

    const text = await file.text();
    const parsed = parseCsvText(file.name.replace(/\.csv$/i, ""), text);

    if (parsed.dataset) {
      actions.replaceDataset(parsed.dataset, `Imported ${file.name}.`);
      setSection("overview");
      return;
    }

    actions.showNotice(parsed.error ?? "We could not import that CSV file.");
  };

  const renderSection = () => {
    if (section === "overview") {
      return (
        <OverviewPage
          dataset={state.dataset}
          summary={health?.summary ?? null}
          issues={health?.issues ?? []}
          insights={insights}
          profiles={health?.profiles ?? []}
          dismissedOnboarding={state.dismissedOnboarding}
          onDismissOnboarding={actions.dismissOnboarding}
          onRequestImport={handleImportRequest}
          onLoadSample={(key) => {
            actions.loadSampleDataset(key);
            setSection("overview");
          }}
          onExploreInsight={(insight) => {
            if (insight.analysisAction) {
              queueIntentAndNavigate(insight.analysisAction);
            }
          }}
          onOpenVariable={openDataVariable}
        />
      );
    }

    if (section === "data") {
      return (
        <DataPage
          dataset={state.dataset}
          profiles={health?.profiles ?? []}
          selectedVariableId={state.selectedVariableId}
          onSelectVariable={actions.selectVariable}
          onUpdateDataset={(dataset, notice) => actions.updateDataset(dataset, notice)}
        />
      );
    }

    if (section === "advanced") {
      return (
        <AdvancedPage
          key={`advanced-${state.dataset?.id ?? "none"}-${state.intentVersion}`}
          dataset={state.dataset}
          profiles={health?.profiles ?? []}
          initialIntent={state.pendingAnalysisIntent}
          onConsumeInitialIntent={() => actions.queueIntent(null)}
          onSaveAnalysis={actions.saveAnalysis}
        />
      );
    }

    return (
      <AnalyzePage
        key={`analyze-${state.dataset?.id ?? "none"}-${state.intentVersion}`}
        dataset={state.dataset}
        profiles={health?.profiles ?? []}
        initialIntent={state.pendingAnalysisIntent}
        onConsumeInitialIntent={() => actions.queueIntent(null)}
        onSaveAnalysis={actions.saveAnalysis}
      />
    );
  };

  return (
    <>
      <input
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(event) => {
          void handleImportFile(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />

      <AppShell
        section={section}
        dataset={state.dataset}
        historyCount={state.analysisHistory.length}
        notice={state.notice}
        canUndo={state.undoStack.length > 0}
        onNavigate={setSection}
        onLoadSample={(key) => {
          actions.loadSampleDataset(key);
          setSection("overview");
        }}
        onRequestImport={handleImportRequest}
        onToggleHistory={() => actions.toggleHistory()}
        onUndo={actions.undo}
        onDismissNotice={actions.clearNotice}
      >
        <Suspense fallback={<div className="section-loading" role="status">Loading workspace…</div>}>
          {renderSection()}
        </Suspense>
      </AppShell>

      <HistoryDrawer
        open={state.historyOpen}
        entries={state.analysisHistory}
        currentDataset={state.dataset}
        onClose={() => actions.toggleHistory(false)}
        onReopen={(entry) => {
          const intent =
            entry.section === "advanced"
              ? {
                  section: "advanced" as const,
                  advancedConfig: entry.config,
                  autoRun: true,
                }
              : {
                  section: "analyze" as const,
                  guidedConfig: entry.config,
                  autoRun: true,
                };
          queueIntentAndNavigate(intent);
          actions.toggleHistory(false);
        }}
      />
    </>
  );
};

export const App = () => (
  <AppProvider>
    <ErrorBoundary>
      <InnerApp />
    </ErrorBoundary>
  </AppProvider>
);
