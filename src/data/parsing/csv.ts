import Papa from "papaparse";

import type { Dataset } from "../../types";
import { createDatasetFromColumns } from "../model/dataset";

export const parseCsvText = (
  name: string,
  text: string,
): {
  dataset?: Dataset;
  error?: string;
} => {
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: "greedy",
  });

  if (parsed.errors.length > 0) {
    return {
      error: parsed.errors[0]?.message ?? "We could not parse this CSV file.",
    };
  }

  const rows = parsed.data.filter((row) => row.some((cell) => String(cell ?? "").trim() !== ""));

  if (rows.length < 2) {
    return {
      error: "We could not find a usable header row and data rows in this file.",
    };
  }

  const headers = rows[0].map((header) => String(header ?? "").trim());

  if (headers.some((header) => header === "")) {
    return {
      error: "At least one column header is blank. Column names must be filled in before analysis.",
    };
  }

  const lowerCaseHeaders = headers.map((header) => header.toLowerCase());

  if (new Set(lowerCaseHeaders).size !== headers.length) {
    const duplicate = headers.find(
      (header, index) => lowerCaseHeaders.indexOf(header.toLowerCase()) !== index,
    );

    return {
      error: `Two columns are both named "${duplicate}". Column names must be unique before analysis.`,
    };
  }

  return {
    dataset: createDatasetFromColumns({
      name,
      headers,
      rows: rows.slice(1),
      origin: "import",
    }),
  };
};
