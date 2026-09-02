import { describe, expect, it } from "vitest";

import { parseCsvText } from "../data/parsing/csv";
import { getSampleDataset } from "../data/samples/sampleDatasets";
import { changeVariableType, getVariableValues } from "../data/model/dataset";

describe("dataset handling", () => {
  it("rejects duplicate CSV headers with a helpful message", () => {
    const result = parseCsvText("scores", "score,score\n1,2\n3,4");

    expect(result.dataset).toBeUndefined();
    expect(result.error).toMatch(/both named "score"/i);
  });

  it("allows variable type overrides and re-coerces numeric values", () => {
    const dataset = getSampleDataset("studentOutcomes");
    const tutoring = dataset.variables.find((variable) => variable.name === "tutoring");

    expect(tutoring).toBeDefined();
    if (!tutoring) {
      return;
    }

    const changed = changeVariableType(dataset, tutoring.id, "identifier");
    const values = getVariableValues(changed, tutoring.id);

    expect(changed.variables.find((variable) => variable.id === tutoring.id)?.type).toBe("identifier");
    expect(values[0]).toBe("No");
  });
});
