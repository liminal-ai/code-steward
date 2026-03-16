import type { RepositoryAnalysis } from "../types/analysis.js";

export const buildClusteringPrompt = (
  _analysis: RepositoryAnalysis,
): { systemPrompt: string; userMessage: string } => {
  throw new Error("not implemented");
};
