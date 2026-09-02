import type {
  Dataset,
  DatasetHealthIssue,
  DatasetSummary,
  Insight,
  VariableProfile,
} from "../../types";
import { sampleDatasetOptions, type SampleDatasetKey } from "../../data/samples/sampleDatasets";
import { Badge, Button, Card, EmptyState, SectionHeader } from "../../components/ui/Primitives";
import { formatNumber } from "../../utils/format";

export const OverviewPage = ({
  dataset,
  summary,
  issues,
  insights,
  profiles,
  dismissedOnboarding,
  onDismissOnboarding,
  onRequestImport,
  onLoadSample,
  onExploreInsight,
  onOpenVariable,
}: {
  dataset: Dataset | null;
  summary: DatasetSummary | null;
  issues: DatasetHealthIssue[];
  insights: Insight[];
  profiles: VariableProfile[];
  dismissedOnboarding: boolean;
  onDismissOnboarding: () => void;
  onRequestImport: () => void;
  onLoadSample: (key: SampleDatasetKey) => void;
  onExploreInsight: (insight: Insight) => void;
  onOpenVariable: (variableId: string) => void;
}) => {
  if (!dataset || !summary) {
    return (
      <div className="overview-stack">
        <EmptyState
          eyebrow="Welcome"
          title="Understand your data without memorizing statistics."
          description="Upload a CSV or start with an example dataset. Everything runs locally in your browser."
          actions={
            <>
              <Button onClick={onRequestImport}>Upload CSV</Button>
              <Button onClick={() => onLoadSample("studentOutcomes")} variant="secondary">
                Start with Student Outcomes
              </Button>
            </>
          }
        />

        <section className="sample-grid">
          {sampleDatasetOptions.map((option) => (
            <Card key={option.key} className="sample-card">
              <h3>{option.name}</h3>
              <p>{option.description}</p>
              <Button onClick={() => onLoadSample(option.key)} variant="ghost">
                Open example
              </Button>
            </Card>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="overview-stack">
      {!dismissedOnboarding ? (
        <Card className="onboarding-card">
          <div>
            <Badge tone="info">First run</Badge>
            <h2>Start with a question, not a test name.</h2>
            <p>
              StatSimple helps you move from a dataset to a recommended analysis, then explains the result in plain English before the technical detail.
            </p>
          </div>
          <Button variant="ghost" onClick={onDismissOnboarding}>
            Dismiss
          </Button>
        </Card>
      ) : null}

      <Card>
        <SectionHeader
          eyebrow="Overview"
          title={`What matters in ${dataset.name}?`}
          description="A quick orientation before you edit data or run a formal analysis."
        />
        <div className="metric-grid">
          <Card className="metric-card">
            <span className="metric-card__label">Rows</span>
            <strong>{formatNumber(summary.rowCount)}</strong>
          </Card>
          <Card className="metric-card">
            <span className="metric-card__label">Variables</span>
            <strong>{formatNumber(summary.variableCount)}</strong>
          </Card>
          <Card className="metric-card">
            <span className="metric-card__label">Numeric variables</span>
            <strong>{formatNumber(summary.numericVariableCount)}</strong>
          </Card>
          <Card className="metric-card">
            <span className="metric-card__label">Categorical variables</span>
            <strong>{formatNumber(summary.categoricalVariableCount)}</strong>
          </Card>
          <Card className="metric-card">
            <span className="metric-card__label">Missing values</span>
            <strong>{formatNumber(summary.missingValueCount)}</strong>
          </Card>
        </div>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Dataset health"
          title={issues.length > 0 ? "Potential issues to keep in mind" : "No urgent data-quality issues detected"}
          description={
            issues.length > 0
              ? "These checks are descriptive guardrails, not automatic judgments."
              : "This dataset looks ready for exploration based on the checks currently implemented."
          }
        />
        {issues.length > 0 ? (
          <div className="health-list">
            {issues.map((issue) => (
              <Card key={issue.id} className="health-item">
                <div className="health-item__header">
                  <Badge tone={issue.severity === "warning" ? "warning" : "info"}>{issue.kind}</Badge>
                  <h3>{issue.title}</h3>
                </div>
                <p>{issue.description}</p>
                {issue.variableId ? (
                  <Button variant="ghost" size="sm" onClick={() => onOpenVariable(issue.variableId ?? "")}>
                    Review variable
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <p className="subtle-copy">You can still inspect variables and run checks inside each analysis.</p>
        )}
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Exploratory findings"
          title="Notable patterns"
          description="These are conservative exploratory cues based on effect size, usable sample size, and data quality."
        />
        {insights.length > 0 ? (
          <div className="insight-grid">
            {insights.map((insight) => (
              <Card key={insight.id} className="insight-card">
                <div className="insight-card__header">
                  <Badge tone={insight.severity === "warning" ? "warning" : "info"}>{insight.type}</Badge>
                  <h3>{insight.title}</h3>
                </div>
                <p>{insight.summary}</p>
                <strong>{insight.metric}</strong>
                {insight.analysisAction ? (
                  <Button variant="ghost" size="sm" onClick={() => onExploreInsight(insight)}>
                    Explore
                  </Button>
                ) : null}
              </Card>
            ))}
          </div>
        ) : (
          <p className="subtle-copy">
            Add more rows or variables to unlock stronger automated exploratory signals.
          </p>
        )}
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Variables"
          title="Quick profiles"
          description="Use these as jumping-off points into the data editor."
        />
        <div className="variable-list">
          {profiles.map((profile) => (
            <button
              key={profile.variableId}
              className="variable-list__item"
              onClick={() => onOpenVariable(profile.variableId)}
              type="button"
            >
              <div>
                <strong>{profile.name}</strong>
                <span>
                  {profile.type} · {profile.validCount} usable
                </span>
              </div>
              <Badge tone={profile.missingRate > 0.2 ? "warning" : "neutral"}>
                {profile.missingCount} missing
              </Badge>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
};
