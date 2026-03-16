import { checkEnvironment } from "../../environment/check.js";
import { err } from "../../types/common.js";
import type {
  EngineResult,
  EnvironmentCheckResult,
  ResolvedRunConfig,
} from "../../types/index.js";

export const runEnvironmentCheck = async (
  config: ResolvedRunConfig,
): Promise<EngineResult<EnvironmentCheckResult>> => {
  const result = await checkEnvironment({ repoPath: config.repoPath });

  if (!result.ok) {
    return result;
  }

  if (result.value.passed) {
    return result;
  }

  return err("DEPENDENCY_MISSING", "Environment check failed", {
    findings: result.value.findings,
  });
};
