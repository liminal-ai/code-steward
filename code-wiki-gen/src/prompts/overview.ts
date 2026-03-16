import type { RepositoryAnalysis } from "../types/analysis.js";
import type { GeneratedModuleSet } from "../types/generation.js";
import type { ModulePlan } from "../types/planning.js";

export const buildOverviewPrompt = (
  _modulePlan: ModulePlan,
  _generatedModules: GeneratedModuleSet,
  _analysis: RepositoryAnalysis,
): { systemPrompt: string; userMessage: string } => {
  throw new Error("not implemented");
};
