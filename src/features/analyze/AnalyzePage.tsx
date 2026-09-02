import { useEffect, useMemo, useState } from "react";

import type {
  AnalysisHistoryEntry,
  AnalysisIntent,
  AnalysisPresentation,
  Dataset,
  GuidedAnalysisConfig,
  VariableProfile,
} from "../../types";
import { ResultView } from "../../components/ResultView";
import { Badge, Button, Card, EmptyState, Field, Input, SectionHeader, Select } from "../../components/ui/Primitives";
import {
  analysisTypeLabels,
  buildRecommendation,
  guidedQuestionOptions,
  manualAnalysisOptions,
} from "../../recommendations/analysisRecommendation";
import { runGuidedAnalysis } from "./runAnalysis";

const createDefaultConfig = (): GuidedAnalysisConfig => ({
  question: "describe",
  manualType: null,
  variableId: null,
  variableAId: null,
  variableBId: null,
  outcomeId: null,
  groupId: null,
  predictorId: null,
  referenceValue: "",
});

const isCategorical = (profile: VariableProfile): boolean =>
  ["categorical", "ordinal"].includes(profile.type) &&
  !profile.isIdentifierLike &&
  profile.distinctCount <= 20;

const optionLabel = (profile: VariableProfile): string => {
  const missing = profile.missingRate >= 0.2 ? ` · ${Math.round(profile.missingRate * 100)}% missing` : "";
  return `${profile.name} (${profile.type}${missing})`;
};

const buildIntentConfig = (intent: AnalysisIntent | null): GuidedAnalysisConfig | null => {
  if (!intent?.guidedConfig) {
    return null;
  }

  return {
    ...createDefaultConfig(),
    ...intent.guidedConfig,
  };
};

export const AnalyzePage = ({
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
  const initialConfig = buildIntentConfig(initialIntent) ?? createDefaultConfig();
  const initialExecution =
    initialIntent?.section === "analyze" && initialIntent.autoRun && dataset
      ? runGuidedAnalysis(dataset, initialConfig)
      : null;
  const [config, setConfig] = useState<GuidedAnalysisConfig>(initialConfig);
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
  const categoricalProfiles = useMemo(
    () => profiles.filter((profile) => isCategorical(profile)),
    [profiles],
  );

  const recommendation = useMemo(
    () => (dataset ? buildRecommendation(dataset, config) : null),
    [config, dataset],
  );

  if (!dataset) {
    return (
      <EmptyState
        eyebrow="Analyze"
        title="Upload data or choose an example before running an analysis."
        description="StatSimple will recommend an analysis once it can see your variables."
      />
    );
  }

  const runCurrentAnalysis = () => {
    const execution = runGuidedAnalysis(dataset, config);

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
      ? "This result belongs to a different dataset. Run the analysis again with the active dataset."
      : result.datasetRevision !== dataset.revision
        ? `This result was created on dataset revision ${result.datasetRevision}; the dataset is now revision ${dataset.revision}.`
        : null
    : null;

  return (
    <div className="analysis-layout">
      <div className="analysis-setup">
        <Card>
          <SectionHeader
            eyebrow="Analyze"
            title="What do you want to learn?"
            description="Choose a question-first workflow or jump directly to a named method."
          />
          <div className="question-grid">
            {guidedQuestionOptions.map((option) => (
              <button
                key={option.key}
                className={
                  config.question === option.key ? "question-card question-card--active" : "question-card"
                }
                onClick={() => {
                  setConfig({
                    ...createDefaultConfig(),
                    question: option.key,
                  });
                  setResult(null);
                  setError(null);
                }}
                type="button"
              >
                <strong>{option.title}</strong>
                <span>{option.description}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Setup"
            title="Configure this analysis"
            description="Selectors are filtered to prevent obviously invalid combinations whenever possible."
          />
          <div className="setup-fields">
            {config.question === "describe" ? (
              <Field label="Variable">
                <Select
                  value={config.variableId ?? ""}
                  onChange={(event) => {
                    setConfig((current) => ({ ...current, variableId: event.target.value || null }));
                    setResult(null);
                    setError(null);
                  }}
                >
                  <option value="">Choose a variable</option>
                  {profiles.map((profile) => (
                    <option key={profile.variableId} value={profile.variableId}>
                      {optionLabel(profile)}
                    </option>
                  ))}
                </Select>
              </Field>
            ) : null}

            {(config.question === "relationship" || config.question === "before-after") ? (
              <>
                <Field label={config.question === "before-after" ? "Before" : "Variable 1"}>
                  <Select
                    value={config.variableAId ?? ""}
                    onChange={(event) => {
                      setConfig((current) => ({ ...current, variableAId: event.target.value || null }));
                      setResult(null);
                      setError(null);
                    }}
                  >
                    <option value="">Choose a numeric variable</option>
                    {numericProfiles.map((profile) => (
                      <option key={profile.variableId} value={profile.variableId}>
                        {optionLabel(profile)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={config.question === "before-after" ? "After" : "Variable 2"}>
                  <Select
                    value={config.variableBId ?? ""}
                    onChange={(event) => {
                      setConfig((current) => ({ ...current, variableBId: event.target.value || null }));
                      setResult(null);
                      setError(null);
                    }}
                  >
                    <option value="">Choose a numeric variable</option>
                    {numericProfiles.map((profile) => (
                      <option key={profile.variableId} value={profile.variableId}>
                        {optionLabel(profile)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            {config.question === "compare-groups" ? (
              <>
                <Field label="Numeric outcome">
                  <Select
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
                        {optionLabel(profile)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Grouping variable">
                  <Select
                    value={config.groupId ?? ""}
                    onChange={(event) => {
                      setConfig((current) => ({ ...current, groupId: event.target.value || null }));
                      setResult(null);
                      setError(null);
                    }}
                  >
                    <option value="">Choose a grouping variable</option>
                    {categoricalProfiles.map((profile) => (
                      <option key={profile.variableId} value={profile.variableId}>
                        {optionLabel(profile)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            {config.question === "predict" ? (
              <>
                <Field label="Outcome">
                  <Select
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
                        {optionLabel(profile)}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Predictor">
                  <Select
                    value={config.predictorId ?? ""}
                    onChange={(event) => {
                      setConfig((current) => ({ ...current, predictorId: event.target.value || null }));
                      setResult(null);
                      setError(null);
                    }}
                  >
                    <option value="">Choose a numeric predictor</option>
                    {numericProfiles.map((profile) => (
                      <option key={profile.variableId} value={profile.variableId}>
                        {optionLabel(profile)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </>
            ) : null}

            {config.question === "manual" ? (
              <>
                <Field label="Statistical method">
                  <Select
                    value={config.manualType ?? ""}
                    onChange={(event) => {
                      setConfig({
                        ...createDefaultConfig(),
                        question: "manual",
                        manualType: (event.target.value as GuidedAnalysisConfig["manualType"]) ?? null,
                      });
                      setResult(null);
                      setError(null);
                    }}
                  >
                    <option value="">Choose a method</option>
                    {manualAnalysisOptions.map((analysisType) => (
                      <option key={analysisType} value={analysisType}>
                        {analysisTypeLabels[analysisType]}
                      </option>
                    ))}
                  </Select>
                </Field>

                {(config.manualType === "descriptive-numeric" ||
                  config.manualType === "descriptive-categorical" ||
                  config.manualType === "one-sample-t-test") ? (
                  <Field label="Variable">
                    <Select
                      value={config.variableId ?? ""}
                      onChange={(event) => {
                        setConfig((current) => ({ ...current, variableId: event.target.value || null }));
                        setResult(null);
                        setError(null);
                      }}
                    >
                      <option value="">Choose a variable</option>
                      {profiles.map((profile) => (
                        <option key={profile.variableId} value={profile.variableId}>
                          {optionLabel(profile)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : null}

                {config.manualType === "one-sample-t-test" ? (
                  <Field label="Reference value">
                    <Input
                      inputMode="decimal"
                      value={config.referenceValue}
                      onChange={(event) => {
                        setConfig((current) => ({ ...current, referenceValue: event.target.value }));
                        setResult(null);
                        setError(null);
                      }}
                    />
                  </Field>
                ) : null}

                {(config.manualType === "pearson-correlation" ||
                  config.manualType === "spearman-correlation" ||
                  config.manualType === "paired-t-test" ||
                  config.manualType === "chi-square") ? (
                  <>
                    <Field label="Variable 1">
                      <Select
                        value={config.variableAId ?? ""}
                        onChange={(event) => {
                          setConfig((current) => ({ ...current, variableAId: event.target.value || null }));
                          setResult(null);
                          setError(null);
                        }}
                      >
                        <option value="">Choose a variable</option>
                        {(config.manualType === "chi-square" ? categoricalProfiles : numericProfiles).map((profile) => (
                          <option key={profile.variableId} value={profile.variableId}>
                            {optionLabel(profile)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Variable 2">
                      <Select
                        value={config.variableBId ?? ""}
                        onChange={(event) => {
                          setConfig((current) => ({ ...current, variableBId: event.target.value || null }));
                          setResult(null);
                          setError(null);
                        }}
                      >
                        <option value="">Choose a variable</option>
                        {(config.manualType === "chi-square" ? categoricalProfiles : numericProfiles).map((profile) => (
                          <option key={profile.variableId} value={profile.variableId}>
                            {optionLabel(profile)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </>
                ) : null}

                {(config.manualType === "simple-regression" ||
                  config.manualType === "independent-t-test" ||
                  config.manualType === "one-way-anova") ? (
                  <>
                    <Field label="Outcome">
                      <Select
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
                            {optionLabel(profile)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label={config.manualType === "simple-regression" ? "Predictor" : "Grouping variable"}>
                      <Select
                        value={config.manualType === "simple-regression" ? config.predictorId ?? "" : config.groupId ?? ""}
                        onChange={(event) => {
                          setConfig((current) =>
                            config.manualType === "simple-regression"
                              ? { ...current, predictorId: event.target.value || null }
                              : { ...current, groupId: event.target.value || null },
                          );
                          setResult(null);
                          setError(null);
                        }}
                      >
                        <option value="">
                          {config.manualType === "simple-regression" ? "Choose a predictor" : "Choose a grouping variable"}
                        </option>
                        {(config.manualType === "simple-regression" ? numericProfiles : categoricalProfiles).map((profile) => (
                          <option key={profile.variableId} value={profile.variableId}>
                            {optionLabel(profile)}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </Card>

        <Card>
          <SectionHeader
            eyebrow="Recommendation"
            title={recommendation?.title ?? "Choose a question"}
            description={recommendation?.reason ?? "StatSimple will explain why a method fits your variables."}
          />
          {recommendation?.status === "ready" && recommendation.recommendedType ? (
            <div className="recommendation-actions">
              <Badge tone="success">{analysisTypeLabels[recommendation.recommendedType]}</Badge>
              {recommendation.alternatives.map((alternative) => (
                <Button
                  key={alternative}
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setConfig((current) => ({
                      ...current,
                      question: "manual",
                      manualType: alternative,
                    }));
                    setResult(null);
                    setError(null);
                  }}
                >
                  Use {analysisTypeLabels[alternative]} instead
                </Button>
              ))}
            </div>
          ) : null}
          <div className="recommendation-actions">
            <Button onClick={runCurrentAnalysis} disabled={recommendation?.status !== "ready"}>
              Run analysis
            </Button>
          </div>
          {error ? <p className="error-copy">{error}</p> : null}
        </Card>
      </div>

      <div className="analysis-results">
        <ResultView
          result={result}
          staleMessage={staleMessage}
          onRerun={runCurrentAnalysis}
          emptyTitle="Choose variables to see a guided result."
          emptyDescription="Your result will lead with interpretation, show a contextual chart, and keep technical output behind a disclosure."
        />
      </div>
    </div>
  );
};
