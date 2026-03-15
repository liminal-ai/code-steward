import { NotImplementedError } from "../types/common.js";
import type {
  AnalysisOptions,
  EngineResult,
  RepositoryAnalysis,
} from "../types/index.js";

export const analyzeRepository = async (
  _options: AnalysisOptions,
): Promise<EngineResult<RepositoryAnalysis>> => {
  throw new NotImplementedError("analyzeRepository");
};
