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

StatSimple is a static Vite application and can be deployed to Vercel by importing its GitHub repository. Use `npm run build` as the build command and `dist` as the output directory. No server-side configuration or environment variables are required.

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
