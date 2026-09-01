# StatSimple

StatSimple is a browser-based statistics workspace that turns CSV data into approachable summaries, charts, and plain-English interpretations.

## Features

- Import CSV files or explore included sample datasets.
- Edit and search data in a spreadsheet-style workspace.
- Run descriptive statistics, mean comparisons, Pearson correlation, and simple linear regression.
- Review interactive charts and readable explanations alongside calculated results.
- Keep recent analyses in browser-local history.

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

## Deployment

StatSimple is deployed as a static GitHub Pages site at [https://gsingh2005.github.io/StatSimple/](https://gsingh2005.github.io/StatSimple/). After GitHub Pages is configured to use GitHub Actions, every push to `main` automatically builds and deploys the site.

The deployment workflow runs `npm run build` and publishes the generated `dist/` directory. No environment variables or server-side configuration are required.

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
