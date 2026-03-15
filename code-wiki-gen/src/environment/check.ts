import { getGitRepositoryStatus } from "../adapters/git.js";
import { err, ok } from "../types/common.js";
import type {
  EngineResult,
  EnvironmentCheckRequest,
  EnvironmentCheckResult,
} from "../types/index.js";
import { detectLanguages } from "./language-detector.js";
import { checkParsers } from "./parser-checker.js";
import { checkRuntimeDependencies } from "./runtime-checker.js";

export const checkEnvironment = async (
  request: EnvironmentCheckRequest = {},
): Promise<EngineResult<EnvironmentCheckResult>> => {
  try {
    const findings = await checkRuntimeDependencies();
    let detectedLanguages: string[] = [];

    if (request.repoPath) {
      const repositoryStatus = await getGitRepositoryStatus(request.repoPath);

      if (repositoryStatus === "invalid-path") {
        findings.push({
          category: "invalid-path",
          message: `Path does not exist: ${request.repoPath}`,
          path: request.repoPath,
          severity: "error",
        });
      } else {
        detectedLanguages = await detectLanguages(request.repoPath);
        findings.push(...(await checkParsers(detectedLanguages)));

        if (repositoryStatus === "invalid-repo") {
          findings.push({
            category: "invalid-repo",
            message: `Path is not a git repository: ${request.repoPath}`,
            path: request.repoPath,
            severity: "error",
          });
        }
      }
    }

    return ok({
      detectedLanguages,
      findings,
      passed: !findings.some((finding) => finding.severity === "error"),
    });
  } catch (error) {
    return err(
      "ENVIRONMENT_ERROR",
      "Failed to complete environment check.",
      error,
    );
  }
};
