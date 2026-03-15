import { NotImplementedError } from "../types/common.js";
import type {
  RawAnalysisOutput,
  ResolvedConfiguration,
} from "../types/index.js";

export const runAnalysis = async (
  _repoPath: string,
  _config: ResolvedConfiguration,
): Promise<RawAnalysisOutput> => {
  throw new NotImplementedError("runAnalysis");
};
