import { useEffect, useMemo, useState } from "react";

import type {
  AdvancedAnalysisConfig,
  AnalysisHistoryEntry,
  AnalysisIntent,
  AnalysisPresentation,
  Dataset,
  VariableProfile,
} from "../../types";
import { ResultView } from "../../components/ResultView";
import { Badge, Button, Card, EmptyState, SectionHeader } from "../../components/ui/Primitives";
import { runAdvancedAnalysis } from "../analyze/runAnalysis";

const createDefaultConfig = (): AdvancedAnalysisConfig => ({
  outcomeId: null,
  predictorIds: [],
});

export const AdvancedPage = ({
  dataset,
  profiles,
  initialIntent,
  onConsumeInitialIntent,
  onSaveAnalysis,
}: {
  dataset: Dataset | null;
  profiles: VariableProfile[];
  initialIntent: AnalysisIntent | null;
  onConsumeInitialIntent: () => void;
  onSaveAnalysis: (entry: AnalysisHistoryEntry) => void;
}) => {
  const initialConfig =
    initialIntent?.section === "advanced" && initialIntent.advancedConfig
      ? {
          ...createDefaultConfig(),
          ...initialIntent.advancedConfig,
        }
      : createDefaultConfig();
  const initialExecution =
    initialIntent?.section === "advanced" && initialIntent.autoRun && dataset
      ? runAdvancedAnalysis(dataset, initialConfig)
      : null;
  const [config, setConfig] = useState<AdvancedAnalysisConfig>(initialConfig);
  const [result, setResult] = useState<AnalysisPresentation | null>(
    initialExecution?.ok ? initialExecution.presentation : null,
  );
  const [error, setError] = useState<string | null>(
    initialExecution && !initialExecution.ok ? initialExecution.message : null,
  );

  useEffect(() => {
    if (initialIntent) {
      onConsumeInitialIntent();
    }

    if (initialExecution?.ok) {
      onSaveAnalysis(initialExecution.historyEntry);
    }
  }, [initialExecution, initialIntent, onConsumeInitialIntent, onSaveAnalysis]);

  const numericProfiles = useMemo(
    () => profiles.filter((profile) => profile.type === "numeric"),
    [profiles],
  );

  if (!dataset) {
    return (
      <EmptyState
        eyebrow="Advanced"
        title="Multiple regression needs a dataset first."
        description="Load a dataset with at least three numeric variables to explore conditional associations across multiple predictors."
      />
    );
  }

  if (numericProfiles.length < 3) {
    return (
      <EmptyState
        eyebrow="Advanced"
        title="Multiple regression needs one outcome and at least two predictors."
        description="This dataset does not currently contain enough numeric variables to support that model."
      />
    );
  }

  const runModel = () => {
    const execution = runAdvancedAnalysis(dataset, config);

    if (execution.ok) {
      setResult(execution.presentation);
      setError(null);
      onSaveAnalysis(execution.historyEntry);
    } else {
      setResult(null);
      setError(execution.message);
    }
  };

  const staleMessage = result
    ? result.datasetId !== dataset.id
      ? "This model belongs to a different dataset. Run it again with the active dataset."
      : result.datasetRevision !== dataset.revision
        ? `This model used dataset revision ${result.datasetRevision}; the current dataset is revision ${dataset.revision}.`
        : null
    : null;

  return (
    <div className="analysis-layout">
      <div className="analysis-setup">
        <Card>
          <SectionHeader
            eyebrow="Advanced"
            title="Multiple linear regression"
            description="Estimate how a numeric outcome changes with multiple numeric predictors, with coefficients and model-level diagnostics."
          />
          <div className="setup-fields">
            <label className="field">
              <span className="field__label">Outcome</span>
              <select
                className="field__control"
                value={config.outcomeId ?? ""}
                onChange={(event) => {
                  setConfig((current) => ({ ...current, outcomeId: event.target.value || null }));
                  setResult(null);
                  setError(null);
                }}
              >
                <option value="">Choose a numeric outcome</option>
                {numericProfiles.map((profile) => (
                  <option key={profile.variableId} value={profile.variableId}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="predictor-list">
            {numericProfiles
              .filter((profile) => profile.variableId !== config.outcomeId)
              .map((profile) => {
                const selected = config.predictorIds.includes(profile.variableId);

                return (
                  <button
                    key={profile.variableId}
                    className={selected ? "predictor-pill predictor-pill--active" : "predictor-pill"}
                    onClick={() => {
                      setConfig((current) => ({
                        ...current,
                        predictorIds: selected
                          ? current.predictorIds.filter((id) => id !== profile.variableId)
                          : [...current.predictorIds, profile.variableId],
                      }));
                      setResult(null);
                      setError(null);
                    }}
                    type="button"
                  >
                    <strong>{profile.name}</strong>
                    <span>{selected ? "Selected predictor" : "Add predictor"}</span>
                  </button>
                );
              })}
          </div>

          <div className="recommendation-actions">
            <Badge tone="info">Advanced users can inspect coefficients and model fit below.</Badge>
            <Button onClick={runModel}>Run multiple regression</Button>
          </div>
          {error ? <p className="error-copy">{error}</p> : null}
        </Card>
      </div>

      <div className="analysis-results">
        <ResultView
          result={result}
          staleMessage={staleMessage}
          onRerun={runModel}
          emptyTitle="Choose an outcome and at least two predictors."
          emptyDescription="The multiple regression result will summarize model fit, coefficient estimates, and warnings about overlapping predictors."
        />
      </div>
    </div>
  );
};
