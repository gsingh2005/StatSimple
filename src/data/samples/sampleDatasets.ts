import type { Dataset } from "../../types";
import { createDatasetFromColumns } from "../model/dataset";

const sampleColumns = {
  studentOutcomes: {
    name: "Student Outcomes",
    headers: ["study_hours", "attendance", "tutoring", "exam_score"],
    rows: [
      [2, 71, "No", 60],
      [3, 74, "No", 64],
      [3.5, 76, "Yes", 71],
      [4, 80, "No", 68],
      [4.5, 82, "Yes", 76],
      [5, 84, "No", 74],
      [5.5, 86, "Yes", 80],
      [6, 87, "No", 79],
      [6.5, 89, "Yes", 84],
      [7, 91, "Yes", 87],
      [7.5, 93, "No", 85],
      [8, 95, "Yes", 92],
    ],
  },
  treatmentStudy: {
    name: "Treatment Study",
    headers: ["participant_id", "before_score", "after_score"],
    rows: [
      [1001, 62, 68],
      [1002, 59, 63],
      [1003, 65, 70],
      [1004, 58, 60],
      [1005, 71, 76],
      [1006, 67, 72],
      [1007, 63, 69],
      [1008, 60, 64],
      [1009, 69, 74],
      [1010, 57, 61],
    ],
  },
  multiGroupProgram: {
    name: "Multi-group Program",
    headers: ["program", "completion_time"],
    rows: [
      ["Workshop", 51],
      ["Workshop", 49],
      ["Workshop", 54],
      ["Workshop", 52],
      ["Hybrid", 46],
      ["Hybrid", 44],
      ["Hybrid", 45],
      ["Hybrid", 47],
      ["Intensive", 39],
      ["Intensive", 38],
      ["Intensive", 41],
      ["Intensive", 40],
    ],
  },
  surveyResponses: {
    name: "Survey Responses",
    headers: ["study_mode", "completed_course"],
    rows: [
      ["Remote", "Yes"],
      ["Remote", "Yes"],
      ["Remote", "No"],
      ["Remote", "Yes"],
      ["In-person", "Yes"],
      ["In-person", "Yes"],
      ["In-person", "Yes"],
      ["In-person", "No"],
      ["Hybrid", "Yes"],
      ["Hybrid", "No"],
      ["Hybrid", "No"],
      ["Hybrid", "Yes"],
    ],
  },
} as const;

export type SampleDatasetKey = keyof typeof sampleColumns;

export const sampleDatasetOptions: Array<{
  key: SampleDatasetKey;
  name: string;
  description: string;
}> = [
  {
    key: "studentOutcomes",
    name: "Student Outcomes",
    description: "Descriptives, correlation, regression, and two-group comparisons.",
  },
  {
    key: "treatmentStudy",
    name: "Treatment Study",
    description: "Paired before-and-after comparisons.",
  },
  {
    key: "multiGroupProgram",
    name: "Multi-group Program",
    description: "One-way ANOVA across three groups.",
  },
  {
    key: "surveyResponses",
    name: "Survey Responses",
    description: "Categorical association with chi-square.",
  },
];

export const getSampleDataset = (key: SampleDatasetKey): Dataset => {
  const sample = sampleColumns[key];

  return createDatasetFromColumns({
    name: sample.name,
    headers: [...sample.headers],
    rows: sample.rows.map((row) => [...row]),
    origin: "sample",
  });
};
