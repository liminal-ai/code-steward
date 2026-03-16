import type { RepositoryAnalysis } from "../types/analysis.js";
import type { ModulePlan, PlannedModule } from "../types/planning.js";

export const buildModuleDocPrompt = (
  _module: PlannedModule,
  _modulePlan: ModulePlan,
  _analysis: RepositoryAnalysis,
): { systemPrompt: string; userMessage: string } => {
  throw new Error("not implemented");
};
