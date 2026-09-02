import { useMemo, useState } from "react";

import type { Dataset, VariableProfile, VariableType } from "../../types";
import { buildHistogramBins } from "../../statistics/descriptives/describe";
import { AnalysisVisualization } from "../../components/charts/AnalysisVisualization";
import { Badge, Button, Card, Field, Input, SectionHeader, Select } from "../../components/ui/Primitives";
import { getNumericValues } from "../../data/model/dataset";
import { formatNumber } from "../../utils/format";

const variableTypes: VariableType[] = ["numeric", "categorical", "ordinal", "identifier", "date"];

export const VariableProfilePanel = ({
  dataset,
  profile,
  onRename,
  onChangeType,
  onDeleteVariable,
}: {
  dataset: Dataset;
  profile: VariableProfile | null;
  onRename: (name: string) => void;
  onChangeType: (nextType: VariableType) => void;
  onDeleteVariable: () => void;
}) => {
  const [name, setName] = useState(profile?.name ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const visualization = useMemo(() => {
    if (!profile) {
      return undefined;
    }

    if (profile.type === "numeric" && profile.numericSummary) {
      const values = getNumericValues(dataset, profile.variableId).filter(
        (value): value is number => typeof value === "number",
      );
      return {
        kind: "histogram" as const,
        title: `${profile.name} distribution`,
        xLabel: profile.name,
        yLabel: "Count",
        bins: buildHistogramBins(values),
      };
    }

    if (profile.categories) {
      return {
        kind: "bar" as const,
        title: `${profile.name} frequencies`,
        xLabel: profile.name,
        yLabel: "Count",
        categories: profile.categories,
      };
    }

    return undefined;
  }, [dataset, profile]);

  if (!profile) {
    return (
      <Card className="variable-panel variable-panel--empty">
        <SectionHeader
          eyebrow="Variable profile"
          title="Select a variable"
          description="Click a column header in the data table to inspect it, rename it, or change its type."
        />
      </Card>
    );
  }

  return (
    <Card className="variable-panel">
      <SectionHeader
        eyebrow="Variable profile"
        title={profile.name}
        description={`${profile.type} · ${profile.validCount} usable · ${profile.missingCount} missing`}
      />

      <div className="variable-panel__badges">
        {profile.isConstant ? <Badge tone="warning">Constant</Badge> : null}
        {profile.isMixed ? <Badge tone="warning">Mixed values</Badge> : null}
        {profile.isIdentifierLike ? <Badge tone="info">Identifier-like</Badge> : null}
      </div>

      <Field label="Variable name">
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Button size="sm" variant="secondary" onClick={() => onRename(name)}>
        Save name
      </Button>

      <Field label="Variable type" hint="Changing type updates how the app treats values in analyses.">
        <Select
          value={profile.type}
          onChange={(event) => onChangeType(event.target.value as VariableType)}
        >
          {variableTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </Field>

      {profile.numericSummary ? (
        <dl className="detail-list">
          <div className="detail-list__row">
            <dt>Mean</dt>
            <dd>{formatNumber(profile.numericSummary.mean)}</dd>
          </div>
          <div className="detail-list__row">
            <dt>Median</dt>
            <dd>{formatNumber(profile.numericSummary.median)}</dd>
          </div>
          <div className="detail-list__row">
            <dt>Std. dev.</dt>
            <dd>{formatNumber(profile.numericSummary.standardDeviation)}</dd>
          </div>
          <div className="detail-list__row">
            <dt>Min</dt>
            <dd>{formatNumber(profile.numericSummary.min)}</dd>
          </div>
          <div className="detail-list__row">
            <dt>Max</dt>
            <dd>{formatNumber(profile.numericSummary.max)}</dd>
          </div>
        </dl>
      ) : null}

      {!profile.numericSummary && profile.categories ? (
        <dl className="detail-list">
          <div className="detail-list__row">
            <dt>Categories</dt>
            <dd>{formatNumber(profile.categories.length)}</dd>
          </div>
          {profile.categories.slice(0, 4).map((category) => (
            <div className="detail-list__row" key={category.label}>
              <dt>{category.label}</dt>
              <dd>
                {category.count} ({formatNumber(category.proportion * 100, 1)}%)
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <AnalysisVisualization visualization={visualization} />

      <div className="variable-panel__danger">
        {!confirmDelete ? (
          <Button size="sm" variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete variable
          </Button>
        ) : (
          <div className="inline-confirm">
            <p>Delete this variable and its values from the dataset?</p>
            <div className="inline-confirm__actions">
              <Button size="sm" variant="danger" onClick={onDeleteVariable}>
                Confirm delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
