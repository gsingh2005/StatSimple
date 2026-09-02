import type { PropsWithChildren } from "react";

import type { AppSection, Dataset } from "../../types";
import { sampleDatasetOptions, type SampleDatasetKey } from "../../data/samples/sampleDatasets";
import { Badge, Button, Card } from "../../components/ui/Primitives";

const sectionLabels: Record<AppSection, string> = {
  overview: "Overview",
  data: "Data",
  analyze: "Analyze",
  advanced: "Advanced",
};

export const AppShell = ({
  children,
  section,
  dataset,
  historyCount,
  notice,
  canUndo,
  onNavigate,
  onLoadSample,
  onRequestImport,
  onToggleHistory,
  onUndo,
  onDismissNotice,
}: PropsWithChildren<{
  section: AppSection;
  dataset: Dataset | null;
  historyCount: number;
  notice: string | null;
  canUndo: boolean;
  onNavigate: (section: AppSection) => void;
  onLoadSample: (key: SampleDatasetKey) => void;
  onRequestImport: () => void;
  onToggleHistory: () => void;
  onUndo: () => void;
  onDismissNotice: () => void;
}>) => (
  <div className="app-shell">
    <header className="app-header">
      <div className="app-header__brand">
        <div className="app-header__eyebrow">Local-first statistics workspace</div>
        <h1>StatSimple</h1>
        <p>Dataset → question → recommended analysis → visualization → plain-English interpretation.</p>
      </div>

      <div className="app-header__controls">
        <Card className="dataset-pill">
          <span>Dataset</span>
          <strong>{dataset?.name ?? "None selected"}</strong>
          {dataset ? <Badge tone="info">Revision {dataset.revision}</Badge> : null}
        </Card>

        <div className="app-header__actions">
          <Button variant="secondary" onClick={onRequestImport}>
            Import CSV
          </Button>
          <details className="sample-menu">
            <summary className="button button--ghost button--md">Examples</summary>
            <div className="sample-menu__content">
              {sampleDatasetOptions.map((option) => (
                <button
                  key={option.key}
                  className="sample-menu__item"
                  onClick={() => onLoadSample(option.key)}
                  type="button"
                >
                  <strong>{option.name}</strong>
                  <span>{option.description}</span>
                </button>
              ))}
            </div>
          </details>
          <Button variant="ghost" onClick={onToggleHistory}>
            History ({historyCount})
          </Button>
          {canUndo ? (
            <Button variant="ghost" onClick={onUndo}>
              Undo
            </Button>
          ) : null}
        </div>
      </div>
    </header>

    <nav aria-label="Primary" className="primary-nav">
      {Object.entries(sectionLabels).map(([key, label]) => (
        <button
          key={key}
          className={key === section ? "primary-nav__item primary-nav__item--active" : "primary-nav__item"}
          onClick={() => onNavigate(key as AppSection)}
          type="button"
        >
          {label}
        </button>
      ))}
      <div className="privacy-note">Your data is processed locally in this browser.</div>
    </nav>

    {notice ? (
      <div className="notice-banner" role="status">
        <span>{notice}</span>
        <button className="notice-banner__dismiss" onClick={onDismissNotice} type="button">
          Dismiss
        </button>
      </div>
    ) : null}

    <main className="page-shell">{children}</main>
  </div>
);
