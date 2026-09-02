import { useMemo, useState } from "react";

import type { Dataset, VariableProfile } from "../../types";
import { applyTransformation, transformationLabelMap, type TransformationKind } from "../../data/transforms/transformations";
import {
  addEmptyRow,
  cleanDataset,
  changeVariableType,
  datasetToCsv,
  deleteRow,
  deleteVariable,
  renameVariable,
  updateCellValue,
} from "../../data/model/dataset";
import { Button, Card, EmptyState, Field, Input, SectionHeader, Select } from "../../components/ui/Primitives";
import { VariableProfilePanel } from "./VariableProfilePanel";

const transformationKinds: TransformationKind[] = ["standardize", "natural-log", "square"];

export const DataPage = ({
  dataset,
  profiles,
  selectedVariableId,
  onSelectVariable,
  onUpdateDataset,
}: {
  dataset: Dataset | null;
  profiles: VariableProfile[];
  selectedVariableId: string | null;
  onSelectVariable: (variableId: string | null) => void;
  onUpdateDataset: (dataset: Dataset, notice: string) => void;
}) => {
  const [search, setSearch] = useState("");
  const [showTransformPanel, setShowTransformPanel] = useState(false);
  const [showCleanPanel, setShowCleanPanel] = useState(false);
  const [transformKind, setTransformKind] = useState<TransformationKind>("standardize");
  const [transformSourceId, setTransformSourceId] = useState<string | null>(null);
  const [newVariableNameOverride, setNewVariableNameOverride] = useState("");

  const selectedProfile = useMemo(
    () => (selectedVariableId ? profiles.find((profile) => profile.variableId === selectedVariableId) ?? null : null),
    [profiles, selectedVariableId],
  );

  const filteredRows = useMemo(() => {
    if (!dataset) {
      return [];
    }

    if (!search.trim()) {
      return dataset.rows;
    }

    const query = search.toLowerCase();

    return dataset.rows.filter((row) =>
      dataset.variables.some((variable) =>
        String(row.values[variable.id] ?? "")
          .toLowerCase()
          .includes(query),
      ),
    );
  }, [dataset, search]);

  if (!dataset) {
    return (
      <EmptyState
        eyebrow="Data"
        title="Add a dataset to inspect and edit it."
        description="Once a dataset is loaded, you can clean rows, profile variables, override types, and create transformed variables here."
      />
    );
  }

  const numericVariables = profiles.filter((profile) => profile.type === "numeric");
  const effectiveTransformSourceId = transformSourceId ?? selectedVariableId ?? numericVariables[0]?.variableId ?? null;
  const transformSourceName =
    dataset.variables.find((variable) => variable.id === effectiveTransformSourceId)?.name ?? "variable";
  const suggestedVariableName = `${
    transformKind === "standardize" ? "z_" : transformKind === "natural-log" ? "log_" : "sq_"
  }${transformSourceName.toLowerCase().replace(/\s+/g, "_")}`;
  const newVariableName = newVariableNameOverride || suggestedVariableName;

  const handleExport = () => {
    const blob = new Blob([datasetToCsv(dataset)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${dataset.name.replace(/\s+/g, "_").toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const applyTransform = () => {
    if (!effectiveTransformSourceId || !newVariableName.trim()) {
      return;
    }

    const result = applyTransformation(dataset, effectiveTransformSourceId, transformKind, newVariableName.trim());
    onUpdateDataset(result.dataset, result.summary);
    setShowTransformPanel(false);
    setNewVariableNameOverride("");
  };

  const confirmClean = () => {
    const result = cleanDataset(dataset);
    onUpdateDataset(result.dataset, result.summary);
    setShowCleanPanel(false);
  };

  return (
    <div className="data-page">
      <Card>
        <SectionHeader
          eyebrow="Data"
          title="Dataset editor"
          description="This editor is designed to support analysis, not to replace a full spreadsheet."
          actions={
            <div className="toolbar-actions">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onUpdateDataset(addEmptyRow(dataset), "Added a new row.")}
              >
                Add row
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCleanPanel((value) => !value)}>
                Clean data
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowTransformPanel((value) => !value)}>
                Transform
              </Button>
              <Button size="sm" variant="ghost" onClick={handleExport}>
                Export CSV
              </Button>
            </div>
          }
        />

        <div className="data-toolbar">
          <Field label="Search rows">
            <Input
              aria-label="Search rows"
              placeholder="Search any cell value"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
        </div>

        {showCleanPanel ? (
          <Card className="inline-panel">
            <h3>Clean dataset</h3>
            <p>
              This trims whitespace, normalizes empty strings to missing values, removes completely empty rows, and removes exact duplicate rows.
            </p>
            <div className="inline-confirm__actions">
              <Button size="sm" onClick={confirmClean}>
                Apply cleaning
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCleanPanel(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : null}

        {showTransformPanel ? (
          <Card className="inline-panel">
            <SectionHeader
              title="Create a derived variable"
              description="Transformations create a new variable rather than overwriting the source."
            />
            <div className="inline-form">
              <Field label="Source variable">
                <Select
                  value={transformSourceId ?? ""}
                  onChange={(event) => {
                    setTransformSourceId(event.target.value || null);
                    setNewVariableNameOverride("");
                  }}
                >
                  <option value="">Choose a numeric variable</option>
                  {numericVariables.map((profile) => (
                    <option key={profile.variableId} value={profile.variableId}>
                      {profile.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Transformation">
                <Select
                  value={transformKind}
                  onChange={(event) => {
                    setTransformKind(event.target.value as TransformationKind);
                    setNewVariableNameOverride("");
                  }}
                >
                  {transformationKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {transformationLabelMap[kind]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="New variable name">
                <Input
                  value={newVariableName}
                  onChange={(event) => setNewVariableNameOverride(event.target.value)}
                />
              </Field>
            </div>
            <p className="subtle-copy">
              Natural log leaves non-positive source values missing because the transformation is only defined for positive numbers.
            </p>
            <div className="inline-confirm__actions">
              <Button size="sm" onClick={applyTransform}>
                Create variable
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowTransformPanel(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        ) : null}
      </Card>

      <div className="data-layout">
        <Card className="data-table-card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {dataset.variables.map((variable) => (
                    <th key={variable.id}>
                      <button onClick={() => onSelectVariable(variable.id)} type="button">
                        <span>{variable.name}</span>
                        <small>{variable.type}</small>
                      </button>
                    </th>
                  ))}
                  <th>Row</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.id}>
                    {dataset.variables.map((variable) => (
                      <td key={`${row.id}-${variable.id}`}>
                        <input
                          aria-label={`${variable.name} value`}
                          className="table-input"
                          defaultValue={row.values[variable.id] === null ? "" : String(row.values[variable.id])}
                          onBlur={(event) => {
                            if (String(row.values[variable.id] ?? "") !== event.target.value) {
                              onUpdateDataset(updateCellValue(dataset, row.id, variable.id, event.target.value), "Updated a cell value.");
                            }
                          }}
                        />
                      </td>
                    ))}
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          onUpdateDataset(deleteRow(dataset, row.id), "Deleted a row.")
                        }
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <VariableProfilePanel
          key={selectedProfile?.variableId ?? "no-variable"}
          dataset={dataset}
          profile={selectedProfile}
          onRename={(name) => {
            if (!selectedProfile) {
              return;
            }

            const result = renameVariable(dataset, selectedProfile.variableId, name);
            onUpdateDataset(result.dataset, result.error ?? "Renamed variable.");
          }}
          onChangeType={(nextType) => {
            if (!selectedProfile) {
              return;
            }

            onUpdateDataset(changeVariableType(dataset, selectedProfile.variableId, nextType), `Changed ${selectedProfile.name} to ${nextType}.`);
          }}
          onDeleteVariable={() => {
            if (!selectedProfile) {
              return;
            }

            onUpdateDataset(deleteVariable(dataset, selectedProfile.variableId), "Deleted variable.");
          }}
        />
      </div>
    </div>
  );
};
