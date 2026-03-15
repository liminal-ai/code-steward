export interface EnvironmentCheckRequest {
  repoPath?: string;
}

export interface EnvironmentCheckResult {
  passed: boolean;
  findings: EnvironmentCheckFinding[];
  detectedLanguages: string[];
}

export interface EnvironmentCheckFinding {
  severity: "warning" | "error";
  category:
    | "missing-dependency"
    | "invalid-repo"
    | "invalid-path"
    | "environment";
  message: string;
  dependencyName?: string;
  path?: string;
}
