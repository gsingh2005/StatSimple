export type Cell = string | number | null;
export type DataRow = Record<string, Cell>;
export type Dataset = { id: string; name: string; columns: string[]; rows: DataRow[]; createdAt: string };
export type AnalysisKind = 'descriptive' | 'ttest' | 'correlation' | 'regression';
export type AnalysisRecord = { id: string; kind: AnalysisKind; title: string; createdAt: string; datasetId: string };
