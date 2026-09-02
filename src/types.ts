export type Cell = string | number | boolean | null;
export type DataRow = Record<string, Cell>;
export type ColumnType = 'numeric' | 'integer' | 'categorical' | 'text' | 'boolean' | 'date' | 'mixed' | 'unknown';
export interface ColumnProfile { name: string; type: ColumnType; nonMissing: number; missing: number; unique: number; numericValues: number[]; likelyBinary: boolean; mixed: boolean; }
export interface Dataset { id: string; name: string; columns: string[]; rows: DataRow[]; createdAt: string; updatedAt?: string; profiles?: Record<string, ColumnType>; }
export type AnalysisKind = 'descriptive' | 'ttest' | 'pairedT' | 'correlation' | 'anova' | 'chiSquare' | 'regression';
export interface AnalysisRecord { id: string; kind: AnalysisKind; title: string; createdAt: string; datasetId: string; options: Record<string, string | number | boolean>; summary: string; }
export interface CleanSuggestion { id: string; label: string; detail: string; affected: number; safe: boolean; apply: (dataset: Dataset) => Dataset; }
export interface CoefficientResult { name: string; estimate: number; standardError: number; t: number; p: number; lower: number; upper: number; vif?: number; }
export interface RegressionResult { coefficients: CoefficientResult[]; n: number; k: number; r2: number; adjustedR2: number; rmse: number; residualDf: number; fStatistic: number; modelP: number; rss: number; tss: number; fitted: number[]; residuals: number[]; leverage: number[]; cooksDistance: number[]; durbinWatson: number; breuschPagan?: { statistic: number; df: number; p: number }; standardErrorType: 'conventional' | 'HC0' | 'HC1' | 'HC2' | 'HC3'; }
