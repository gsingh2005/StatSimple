export type VariableType =
  | "numeric"
  | "categorical"
  | "ordinal"
  | "identifier"
  | "date";

export type CellValue = string | number | null;

export interface Variable {
  id: string;
  name: string;
  inferredType: VariableType;
  type: VariableType;
  userOverriddenType: boolean;
}

export interface DataRow {
  id: string;
  values: Record<string, CellValue>;
}

export interface Dataset {
  id: string;
  name: string;
  revision: number;
  variables: Variable[];
  rows: DataRow[];
  origin: "sample" | "import";
  lastUpdated: string;
}

export interface NumericSummary {
  count: number;
  missing: number;
  mean: number;
  median: number;
  variance: number;
  standardDeviation: number;
  min: number;
  q1: number;
  q3: number;
  max: number;
  iqr: number;
}

export interface CategoryFrequency {
  label: string;
  count: number;
  proportion: number;
}

export interface VariableProfile {
  variableId: string;
  name: string;
  type: VariableType;
  validCount: number;
  missingCount: number;
  distinctCount: number;
  missingRate: number;
  isConstant: boolean;
  isNearlyConstant: boolean;
  isMixed: boolean;
  isIdentifierLike: boolean;
  numericSummary?: NumericSummary;
  categories?: CategoryFrequency[];
}

export interface DatasetSummary {
  rowCount: number;
  variableCount: number;
  numericVariableCount: number;
  categoricalVariableCount: number;
  missingValueCount: number;
}

export type DatasetHealthKind =
  | "missingness"
  | "constant"
  | "nearly-constant"
  | "mixed"
  | "empty"
  | "identifier"
  | "duplicate-rows"
  | "small-sample";

export interface DatasetHealthIssue {
  id: string;
  kind: DatasetHealthKind;
  severity: "info" | "warning";
  variableId?: string;
  title: string;
  description: string;
}

export type InsightType =
  | "relationship"
  | "group-difference"
  | "distribution"
  | "data-quality";

export type AppSection = "overview" | "data" | "analyze" | "advanced";

export type GuidedQuestion =
  | "describe"
  | "relationship"
  | "compare-groups"
  | "predict"
  | "before-after"
  | "manual";

export type AnalysisType =
  | "descriptive-numeric"
  | "descriptive-categorical"
  | "pearson-correlation"
  | "spearman-correlation"
  | "simple-regression"
  | "one-sample-t-test"
  | "independent-t-test"
  | "paired-t-test"
  | "one-way-anova"
  | "chi-square"
  | "multiple-regression";

export interface GuidedAnalysisConfig {
  question: GuidedQuestion;
  manualType: AnalysisType | null;
  variableId: string | null;
  variableAId: string | null;
  variableBId: string | null;
  outcomeId: string | null;
  groupId: string | null;
  predictorId: string | null;
  referenceValue: string;
}

export interface AdvancedAnalysisConfig {
  outcomeId: string | null;
  predictorIds: string[];
}

export interface AnalysisIntent {
  section: AppSection;
  guidedConfig?: Partial<GuidedAnalysisConfig>;
  advancedConfig?: Partial<AdvancedAnalysisConfig>;
  autoRun?: boolean;
  focusVariableId?: string;
}

export interface Insight {
  id: string;
  type: InsightType;
  title: string;
  summary: string;
  metric: string;
  variables: string[];
  severity?: "info" | "warning";
  analysisAction?: AnalysisIntent;
}

export interface ResultMetric {
  label: string;
  value: string;
  detail?: string;
  helpKey?: GlossaryTermKey;
}

export interface AnalysisCheck {
  id: string;
  status: "pass" | "warning" | "error" | "info";
  title: string;
  description: string;
}

export type VisualizationModel =
  | {
      kind: "histogram";
      title: string;
      xLabel: string;
      yLabel: string;
      bins: Array<{
        label: string;
        start: number;
        end: number;
        count: number;
      }>;
    }
  | {
      kind: "bar";
      title: string;
      xLabel: string;
      yLabel: string;
      categories: CategoryFrequency[];
    }
  | {
      kind: "scatter";
      title: string;
      xLabel: string;
      yLabel: string;
      points: Array<{
        x: number;
        y: number;
      }>;
      line?: Array<{
        x: number;
        y: number;
      }>;
    }
  | {
      kind: "group-strip";
      title: string;
      xLabel: string;
      yLabel: string;
      points: Array<{
        group: string;
        groupIndex: number;
        x: number;
        y: number;
      }>;
      means: Array<{
        group: string;
        groupIndex: number;
        mean: number;
      }>;
    }
  | {
      kind: "paired-differences";
      title: string;
      xLabel: string;
      yLabel: string;
      bins: Array<{
        label: string;
        start: number;
        end: number;
        count: number;
      }>;
      pairs: Array<{
        before: number;
        after: number;
      }>;
      beforeLabel: string;
      afterLabel: string;
    }
  | {
      kind: "coefficients";
      title: string;
      xLabel: string;
      coefficients: Array<{
        label: string;
        estimate: number;
        lower: number;
        upper: number;
      }>;
    }
  | {
      kind: "contingency";
      title: string;
      rows: string[];
      columns: string[];
      observed: number[][];
      expected: number[][];
    };

export interface TechnicalDetailSection {
  title: string;
  rows: Array<{
    label: string;
    value: string;
  }>;
}

export interface AnalysisPresentation {
  id: string;
  analysisType: AnalysisType;
  datasetId: string;
  datasetRevision: number;
  title: string;
  headline: string;
  interpretation: string[];
  metrics: ResultMetric[];
  checks: AnalysisCheck[];
  technicalDetails: TechnicalDetailSection[];
  visualization?: VisualizationModel;
}

export type StatisticalErrorCode =
  | "not-enough-data"
  | "no-variation"
  | "invalid-input"
  | "too-many-groups"
  | "singular-matrix"
  | "unsupported";

export interface StatisticalError {
  code: StatisticalErrorCode;
  message: string;
}

export interface StatisticalWarning {
  id: string;
  message: string;
}

export type StatisticalResult<T> =
  | {
      ok: true;
      value: T;
      warnings: StatisticalWarning[];
    }
  | {
      ok: false;
      error: StatisticalError;
    };

export interface Recommendation {
  status: "incomplete" | "invalid" | "ready";
  recommendedType: AnalysisType | null;
  title: string;
  reason: string;
  alternatives: AnalysisType[];
}

export interface AnalysisHistoryEntryBase {
  id: string;
  datasetId: string;
  datasetName: string;
  datasetRevision: number;
  analysisType: AnalysisType;
  title: string;
  headline: string;
  keyResult: string;
  timestamp: string;
}

export type AnalysisHistoryEntry =
  | (AnalysisHistoryEntryBase & {
      section: "analyze";
      config: GuidedAnalysisConfig;
    })
  | (AnalysisHistoryEntryBase & {
      section: "advanced";
      config: AdvancedAnalysisConfig;
    });

export interface StoredAppState {
  dataset: Dataset | null;
  analysisHistory: AnalysisHistoryEntry[];
  dismissedOnboarding: boolean;
}

export type GlossaryTermKey =
  | "mean"
  | "median"
  | "standardDeviation"
  | "variance"
  | "confidenceInterval"
  | "correlation"
  | "slope"
  | "intercept"
  | "rSquared"
  | "effectSize"
  | "pValue"
  | "standardError"
  | "degreesOfFreedom"
  | "residual"
  | "anova"
  | "nullHypothesis"
  | "cramersV";
