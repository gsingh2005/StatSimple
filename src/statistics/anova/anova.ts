import { jStat } from "jstat";

import type { StatisticalResult } from "../../types";
import { makeError, makeSuccess, makeWarning, mean, probability, sum } from "../shared/math";

export interface AnovaGroupSummary {
  label: string;
  n: number;
  mean: number;
  min: number;
  max: number;
}

export interface AnovaValue {
  groups: AnovaGroupSummary[];
  n: number;
  fStatistic: number;
  degreesOfFreedomBetween: number;
  degreesOfFreedomWithin: number;
  pValue: number;
  etaSquared: number;
}

export const oneWayAnova = (
  outcome: Array<number | null | undefined>,
  groups: Array<string | number | null | undefined>,
): StatisticalResult<AnovaValue> => {
  const usable = outcome
    .map((value, index) => [value, groups[index]] as const)
    .filter(
      (pair): pair is [number, string] =>
        typeof pair[0] === "number" &&
        Number.isFinite(pair[0]) &&
        pair[1] !== null &&
        pair[1] !== undefined &&
        String(pair[1]).trim() !== "",
    )
    .map(([value, group]) => ({ value, group: String(group).trim() }));

  const labels = [...new Set(usable.map((row) => row.group))];

  if (labels.length < 3) {
    return makeError("invalid-input", "ANOVA requires at least three usable groups.");
  }

  const grouped = labels.map((label) => ({
    label,
    values: usable.filter((row) => row.group === label).map((row) => row.value),
  }));

  if (grouped.some((group) => group.values.length < 2)) {
    return makeError("not-enough-data", "Each ANOVA group needs at least two usable observations.");
  }

  const allValues = usable.map((row) => row.value);
  const grandMean = mean(allValues);
  const ssBetween = sum(
    grouped.map((group) => group.values.length * (mean(group.values) - grandMean) ** 2),
  );
  const ssWithin = sum(
    grouped.flatMap((group) => group.values.map((value) => (value - mean(group.values)) ** 2)),
  );
  const degreesOfFreedomBetween = grouped.length - 1;
  const degreesOfFreedomWithin = allValues.length - grouped.length;

  if (degreesOfFreedomWithin <= 0 || ssWithin === 0) {
    return makeError("no-variation", "There is not enough within-group variation to estimate ANOVA.");
  }

  const msBetween = ssBetween / degreesOfFreedomBetween;
  const msWithin = ssWithin / degreesOfFreedomWithin;
  const fStatistic = msBetween / msWithin;
  const pValue = probability(1 - jStat.centralF.cdf(fStatistic, degreesOfFreedomBetween, degreesOfFreedomWithin));
  const etaSquared = (ssBetween + ssWithin) === 0 ? 0 : ssBetween / (ssBetween + ssWithin);
  const warnings = [];

  if (grouped.some((group) => group.values.length < 5)) {
    warnings.push(makeWarning("small-groups", "Some ANOVA groups are small, so results need extra caution."));
  }

  return makeSuccess(
    {
      groups: grouped.map((group) => ({
        label: group.label,
        n: group.values.length,
        mean: mean(group.values),
        min: Math.min(...group.values),
        max: Math.max(...group.values),
      })),
      n: allValues.length,
      fStatistic,
      degreesOfFreedomBetween,
      degreesOfFreedomWithin,
      pValue,
      etaSquared,
    },
    warnings,
  );
};
