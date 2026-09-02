# StatSimple

StatSimple is a browser-based statistics workspace for people who understand their data and research question but do not necessarily know which statistical method to use first.

The app is fully static and keeps all parsing, transformations, and statistical calculations inside the browser so datasets stay local.

## What It Does

- Imports CSV files locally in the browser.
- Ships guided sample datasets for common beginner workflows.
- Profiles variables with deterministic type inference and manual type overrides.
- Supports spreadsheet-style edits, cleaning, transformations, CSV export, and local undo.
- Recommends analyses from question-first workflows.
- Renders contextual charts, plain-English interpretations, analysis checks, and technical details.
- Stores recent analyses locally and warns when they came from an earlier dataset revision.

Statistical conventions, missing-data handling, and inference limitations are documented in [STATISTICAL_VALIDATION.md](/Users/gurjotsingh/Documents/Playground/StatSimple/docs/STATISTICAL_VALIDATION.md).

## Supported Analyses

- Numeric descriptive statistics
- Categorical frequency summaries
- Pearson correlation
- Spearman correlation
- Simple linear regression
- One-sample t-test
- Independent-samples Welch t-test
- Paired-samples t-test
- One-way ANOVA
- Chi-square test of independence
- Multiple linear regression

## Development

```bash
npm install
npm run dev
```

## Testing

```bash
npm test
npm run typecheck
npm run lint
```

## Production Build

```bash
npm run build
```

The Vite config uses `base: "/StatSimple/"` so the generated assets work for the GitHub Pages repository path `https://gsingh2005.github.io/StatSimple/`.

## Deployment

GitHub Pages deployment is configured in [deploy-pages.yml](/Users/gurjotsingh/Documents/Playground/StatSimple/.github/workflows/deploy-pages.yml). The workflow:

1. Checks out the repository.
2. Configures GitHub Pages.
3. Installs dependencies with `npm ci`.
4. Runs tests, typecheck, and lint.
5. Builds the static `dist/` output.
6. Uploads `dist/` as a Pages artifact.
7. Deploys that artifact to the `github-pages` environment.

In the repository settings, the Pages publishing source should be set to GitHub Actions.

## Architecture

The application is split into a few clear layers:

- Data layer: canonical dataset model, CSV parsing, type inference, profiling, cleaning, transformations, and local persistence.
- Statistics layer: pure functions for descriptive statistics, correlation, regression, group comparisons, ANOVA, and chi-square.
- Interpretation layer: converts structured numerical results into beginner-friendly headlines, metrics, checks, technical details, and visualization models.
- UI layer: React pages for Overview, Data, Analyze, and Advanced, plus shared components for checks, glossary help, history, and charts.

## Privacy

StatSimple does not send datasets to a backend or third-party analysis API. Core functionality is entirely local to the browser.
