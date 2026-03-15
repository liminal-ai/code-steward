import { NotImplementedError } from "../types/common.js";
import type {
  AnalysisSummary,
  AnalyzedComponent,
  AnalyzedRelationship,
  RawAnalysisOutput,
  ResolvedConfiguration,
} from "../types/index.js";

export interface NormalizedAnalysis {
  summary: AnalysisSummary;
  components: Record<string, AnalyzedComponent>;
  relationships: AnalyzedRelationship[];
  focusDirs: string[];
}

export const normalize = (
  _raw: RawAnalysisOutput,
  _config: ResolvedConfiguration,
): NormalizedAnalysis => {
  throw new NotImplementedError("normalize");
};
