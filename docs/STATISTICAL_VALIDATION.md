# Statistical conventions

StatSimple uses complete-case handling for each analysis: a row is included only
when every variable required by that analysis is usable. Paired t-tests preserve
row pairing and exclude an entire pair when either measurement is missing.

- Numeric summaries use sample variance and sample standard deviation (`n - 1`).
- Quartiles use linear interpolation at position `(n - 1) * p` (the R type 7 /
  NumPy default convention). Histograms use deterministic square-root binning,
  clamped from 5 to 12 bins.
- Pearson and Spearman correlations use two-sided t-distribution approximations.
  Spearman uses average ranks for ties; its p-value is labeled as approximate.
- Independent comparisons use Welch's t-test and report bias-corrected Hedges'
  g, computed from the pooled standard deviation.
- One-way ANOVA reports eta squared. Chi-square reports Cramer's V and warns
  when any expected count is below 5.
- Linear models use ordinary least squares with an intercept. Exact or nearly
  exact fits retain coefficient estimates but suppress standard errors,
  confidence intervals, and p-values because residual-based inference is not
  stable in that situation.

These methods support exploration and education. They do not establish
causation or replace subject-matter judgment about study design and assumptions.
