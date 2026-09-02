import type { GlossaryTermKey } from "../../types";

const glossary: Record<
  GlossaryTermKey,
  {
    meaning: string;
    caution?: string;
  }
> = {
  mean: {
    meaning: "The mean is the arithmetic average of the usable values.",
  },
  median: {
    meaning: "The median is the middle value once the usable values are ordered.",
    caution: "Unlike the mean, it is less affected by unusually large or small observations.",
  },
  standardDeviation: {
    meaning: "Standard deviation summarizes how spread out the numeric values are around the mean.",
  },
  variance: {
    meaning: "Variance is the average squared distance from the mean, using the sample formula here.",
  },
  confidenceInterval: {
    meaning: "A confidence interval shows a range of parameter values reasonably compatible with the data under the model and procedure used.",
  },
  correlation: {
    meaning: "A correlation coefficient summarizes the direction and strength of how two numeric variables move together.",
    caution: "Correlation does not by itself establish causation.",
  },
  slope: {
    meaning: "The slope shows how much the outcome tends to change for a one-unit increase in the predictor under the fitted model.",
  },
  intercept: {
    meaning: "The intercept is the model's expected outcome value when the predictor equals zero.",
  },
  rSquared: {
    meaning: "R² describes the proportion of variation in the outcome accounted for by the regression model.",
  },
  effectSize: {
    meaning: "An effect size summarizes practical magnitude, not just whether a p-value is small.",
  },
  pValue: {
    meaning: "A p-value describes how incompatible the observed result is with a model where the null hypothesis is true.",
    caution: "It is not the probability that the null hypothesis is true.",
  },
  standardError: {
    meaning: "A standard error describes how much an estimate would typically vary across repeated samples under the model.",
  },
  degreesOfFreedom: {
    meaning: "Degrees of freedom describe how much independent information contributes to a statistical estimate or test.",
  },
  residual: {
    meaning: "A residual is the difference between an observed outcome and the value predicted by a fitted model.",
  },
  anova: {
    meaning: "ANOVA evaluates whether the data provide evidence that at least one group mean differs from the others.",
  },
  nullHypothesis: {
    meaning: "The null hypothesis is the reference statistical model being tested, often representing no difference or no relationship.",
  },
  cramersV: {
    meaning: "Cramér's V summarizes the strength of association in a contingency table.",
  },
};

export const HelpTerm = ({
  term,
  label,
}: {
  term: GlossaryTermKey;
  label?: string;
}) => {
  const entry = glossary[term];

  return (
    <details className="help-term">
      <summary>{label ?? "What does this mean?"}</summary>
      <div>
        <p>{entry.meaning}</p>
        {entry.caution ? <p>{entry.caution}</p> : null}
      </div>
    </details>
  );
};
