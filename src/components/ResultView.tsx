import type { AnalysisPresentation } from "../types";
import { AnalysisChecksList } from "./feedback/AnalysisChecks";
import { HelpTerm } from "./help/HelpTerm";
import { AnalysisVisualization } from "./charts/AnalysisVisualization";
import { Badge, Card, Disclosure, EmptyState, SectionHeader } from "./ui/Primitives";

export const ResultView = ({
  result,
  staleMessage,
  onRerun,
  emptyTitle,
  emptyDescription,
}: {
  result: AnalysisPresentation | null;
  staleMessage?: string | null;
  onRerun?: () => void;
  emptyTitle: string;
  emptyDescription: string;
}) => {
  if (!result) {
    return (
      <EmptyState
        eyebrow="Results"
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="result-stack">
      <Card className="result-hero">
        <SectionHeader
          eyebrow="Main finding"
          title={result.title}
          description={result.headline}
          actions={<Badge tone="info">{result.analysisType}</Badge>}
        />
        {staleMessage ? (
          <div className="stale-banner">
            <div>
              <strong>Result may be out of date.</strong>
              <p>{staleMessage}</p>
            </div>
            {onRerun ? (
              <button className="button button--secondary button--sm" onClick={onRerun}>
                Run again
              </button>
            ) : null}
          </div>
        ) : null}
      </Card>

      <div className="metric-grid">
        {result.metrics.map((item) => (
          <Card key={`${item.label}-${item.value}`} className="metric-card">
            <div className="metric-card__label">
              <span>{item.label}</span>
              {item.helpKey ? <HelpTerm term={item.helpKey} /> : null}
            </div>
            <strong>{item.value}</strong>
            {item.detail ? <p>{item.detail}</p> : null}
          </Card>
        ))}
      </div>

      <AnalysisVisualization visualization={result.visualization} />

      <Card>
        <SectionHeader
          eyebrow="Checks"
          title="Analysis checks"
          description="These checks help show whether the result is usable and where extra caution is warranted."
        />
        <AnalysisChecksList checks={result.checks} />
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Interpretation"
          title="Plain-English interpretation"
          description="StatSimple leads with the question you asked, then the evidence supporting it."
        />
        <div className="interpretation-list">
          {result.interpretation.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </Card>

      <Disclosure title="Show statistical details">
        <div className="technical-grid">
          {result.technicalDetails.map((section) => (
            <Card key={section.title}>
              <h3>{section.title}</h3>
              <dl className="detail-list">
                {section.rows.map((row) => (
                  <div key={`${section.title}-${row.label}`} className="detail-list__row">
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      </Disclosure>
    </div>
  );
};
