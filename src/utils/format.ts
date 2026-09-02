const baseFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const preciseFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 3,
  minimumFractionDigits: 0,
});

export const humanizeVariableName = (name: string): string =>
  name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const formatNumber = (
  value: number | null | undefined,
  maximumFractionDigits = 2,
): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: value % 1 === 0 ? 0 : Math.min(1, maximumFractionDigits),
  }).format(value);
};

export const formatSignedNumber = (
  value: number | null | undefined,
  maximumFractionDigits = 2,
): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }
  const absolute = formatNumber(Math.abs(value), maximumFractionDigits);

  if (value > 0) {
    return `+${absolute}`;
  }

  if (value < 0) {
    return `-${absolute}`;
  }

  return absolute;
};

export const formatPercent = (value: number, digits = 0): string =>
  `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: digits,
  }).format(value * 100)}%`;

export const formatPValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "Unavailable";
  }

  if (value < 0.001) {
    return "p < 0.001";
  }

  return `p = ${preciseFormatter.format(value)}`;
};

export const formatConfidenceInterval = (
  lower: number,
  upper: number,
  digits = 2,
): string => {
  if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
    return "Unavailable";
  }

  return `[${formatNumber(Math.min(lower, upper), digits)}, ${formatNumber(Math.max(lower, upper), digits)}]`;
};

export const formatEquation = (
  outcomeLabel: string,
  intercept: number,
  slope: number,
  predictorLabel: string,
): string => {
  const slopeSign = slope >= 0 ? "+" : "−";
  const slopeValue = formatNumber(Math.abs(slope), 2);
  const interceptValue = formatNumber(Math.abs(intercept), 2);
  const interceptSign = intercept >= 0 ? "" : "−";

  return `${outcomeLabel} = ${interceptSign}${interceptValue} ${slopeSign} ${slopeValue} × ${predictorLabel}`;
};

export const formatDateTime = (isoString: string): string =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(isoString));

export const formatCompactNumber = (value: number): string =>
  baseFormatter.format(value);
