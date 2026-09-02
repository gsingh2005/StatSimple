import { describe, expect, it } from "vitest";

import { createDatasetFromColumns, updateCellValue } from "../data/model/dataset";
import { inferVariableType } from "../data/inference/variableInference";
import { parseCsvText } from "../data/parsing/csv";
import { generateInsights } from "../insights/generateInsights";
import { buildRecommendation } from "../recommendations/analysisRecommendation";
import { loadStoredState } from "../storage/localStorage";
import { runGuidedAnalysis } from "../features/analyze/runAnalysis";

describe("data and state hardening", () => {
  it("parses quoted commas, trims headers, and rejects blank headers", () => {
    const valid = parseCsvText("people", 'name,score\n"Smith, John",82\n"Lee, Ana",91\n\n');
    const blank = parseCsvText("people", "name,,score\nA,x,5");
    expect(valid.dataset?.rows).toHaveLength(2);
    expect(valid.dataset?.variables[0]?.name).toBe("name");
    expect(blank.error).toMatch(/header is blank/i);
  });

  it("makes cautious type inferences for identifiers, mixed columns, booleans, and all-missing data", () => {
    expect(inferVariableType("student_id", ["1001", "1002", "1003"]).type).toBe("identifier");
    expect(inferVariableType("score", ["10", "11", "unknown", "13"]).isMixed).toBe(true);
    expect(inferVariableType("consent", ["yes", "no", "yes"]).type).toBe("categorical");
    expect(inferVariableType("empty", [null, null]).type).toBe("categorical");
  });

  it("does not mine identifiers or tiny groups for overview findings", () => {
    const dataset = createDatasetFromColumns({
      name: "Adversarial",
      headers: ["student_id", "score", "group"],
      rows: Array.from({ length: 12 }, (_, index) => [1000 + index, index * 10, index === 0 ? "A" : "B"]),
      origin: "import",
    });
    const insights = generateInsights(dataset);
    expect(insights
      .filter((insight) => insight.type === "relationship" || insight.type === "group-difference")
      .some((insight) => insight.variables.some((id) => dataset.variables.find((variable) => variable.id === id)?.name === "student_id"))).toBe(false);
    expect(insights.some((insight) => insight.type === "group-difference")).toBe(false);
  });

  it("does not recommend identifier variables for relationship workflows", () => {
    const dataset = createDatasetFromColumns({
      name: "Identifiers",
      headers: ["record_id", "score"],
      rows: [[1, 10], [2, 20], [3, 30]],
      origin: "import",
    });
    const [identifier, score] = dataset.variables;
    const recommendation = buildRecommendation(dataset, {
      question: "relationship",
      manualType: null,
      variableId: null,
      variableAId: identifier.id,
      variableBId: score.id,
      outcomeId: null,
      groupId: null,
      predictorId: null,
      referenceValue: "",
    });
    expect(recommendation.status).toBe("invalid");
  });

  it("binds a presentation to a dataset revision so later edits make it stale", () => {
    const dataset = createDatasetFromColumns({
      name: "Regression",
      headers: ["x", "y"],
      rows: [[1, 2], [2, 4], [3, 7], [4, 8]],
      origin: "import",
    });
    const [x, y] = dataset.variables;
    const execution = runGuidedAnalysis(dataset, {
      question: "predict",
      manualType: null,
      variableId: null,
      variableAId: null,
      variableBId: null,
      outcomeId: y.id,
      groupId: null,
      predictorId: x.id,
      referenceValue: "",
    });
    expect(execution.ok).toBe(true);
    const changed = updateCellValue(dataset, dataset.rows[0].id, y.id, "3");
    if (!execution.ok) return;
    expect(changed.revision).toBe(execution.presentation.datasetRevision + 1);
  });

  it("recovers gracefully from malformed persisted data", () => {
    window.localStorage.setItem("statsimple:v1", "{ definitely not json");
    expect(loadStoredState()).toEqual({ dataset: null, analysisHistory: [], dismissedOnboarding: false });
    window.localStorage.setItem("statsimple:v1", JSON.stringify({ dataset: { id: 4 }, analysisHistory: [{ nope: true }] }));
    expect(loadStoredState()).toEqual({ dataset: null, analysisHistory: [], dismissedOnboarding: false });
  });
});
