# StatSimple

StatSimple is a browser-based statistics and econometrics workspace for exploratory analysis, hypothesis testing, and regression without leaving the browser.

## Features

- Create, upload, duplicate, rename, delete, and reopen multiple browser-local datasets.
- Import CSV files, enter or paste data manually, inspect inferred variable types, and export CSV.
- Use deterministic Quick Clean suggestions for whitespace, missing-value markers, empty rows, and duplicate column names.
- Generate logarithms, squared terms, and standardized variables with explicit validation.
- Use a theme-aware workspace, data editor, chart view, automated data summary, and local analysis history.

## Implemented Methods

- Descriptive statistics: quantiles, standard error, confidence interval, coefficient of variation, skewness, and excess kurtosis.
- Pearson and Spearman correlation with pairwise missing-value exclusion.
- One-sample, Welch independent-samples, and paired t-tests.
- One-way ANOVA and chi-square independence calculations in the calculation engine.
- Multiple ordinary least squares regression with conventional, HC0, HC1, HC2, or HC3 standard errors; confidence intervals; residual diagnostics; VIF; Breusch-Pagan; and Durbin-Watson.

All calculations run locally in the browser. Uploaded data is never sent to a server, and StatSimple needs no API keys, accounts, or database.

## Tech Stack

- React
- TypeScript
- Vite
- Recharts
- Papa Parse
- jStat
- Vitest

## Running Locally

```bash
git clone <repository-url>
cd StatSimple
npm install
npm run dev
```

Vite prints a local URL in the terminal, usually `http://localhost:5173`.

## Production Build

```bash
npm run build
npm run preview
```

The production files are generated in `dist/`.

## Testing

```bash
npm test
```

The Vitest suite covers descriptive statistics, correlations, t-tests, ANOVA, chi-square, multiple OLS, robust errors, diagnostics, VIF, and invalid/singular models.

## Deployment

StatSimple is deployed as a static GitHub Pages site at [https://gsingh2005.github.io/StatSimple/](https://gsingh2005.github.io/StatSimple/). After GitHub Pages is configured to use GitHub Actions, every push to `main` automatically builds and deploys the site.

The deployment workflow runs `npm run build` and publishes the generated `dist/` directory. No environment variables or server-side configuration are required.

## Limitations and Roadmap

StatSimple is intended for teaching, exploratory work, and common applied analysis. It does not replace statistical expertise or full desktop statistical software. Current browser-local limits make it best suited to modest-sized datasets; large data can make charts and calculations slow.

Planned work includes fuller categorical-regressor/dummy workflows, interaction builders, additional transforms, correlation matrices, fixed effects, cluster-robust inference, logistic regression, and time-series diagnostics. These are not advertised as implemented until they have been validated and tested.

## Project Structure

```text
src/
  App.tsx             Main application screens and workflows
  data/               Included example datasets
  statistics.ts       Pure statistical calculation helpers
  styles.css          Responsive application styling
  tests/              Statistics-engine tests
```

## Contributing / Development

Create changes in a branch, then use the standard Git workflow:

```bash
git add .
git commit -m "Describe changes"
git push
```
