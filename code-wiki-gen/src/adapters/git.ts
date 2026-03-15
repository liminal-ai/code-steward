import { realpath, stat } from "node:fs/promises";
import path from "node:path";

import { runSubprocess } from "./subprocess.js";

export type GitRepositoryStatus = "valid" | "invalid-path" | "invalid-repo";

export const getHeadCommitHash = async (repoPath: string): Promise<string> => {
  const result = await runSubprocess("git", ["rev-parse", "HEAD"], {
    cwd: repoPath,
    timeoutMs: 10_000,
  });

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to resolve git commit hash");
  }

  return result.stdout.trim();
};

export const isGitRepository = async (repoPath: string): Promise<boolean> => {
  const repositoryStatus = await getGitRepositoryStatus(repoPath);
  return repositoryStatus === "valid";
};

export const getGitRepositoryStatus = async (
  repoPath: string,
): Promise<GitRepositoryStatus> => {
  try {
    const repoStats = await stat(repoPath);

    if (!repoStats.isDirectory()) {
      return "invalid-path";
    }

    const result = await runSubprocess(
      "git",
      ["rev-parse", "--show-toplevel"],
      {
        cwd: repoPath,
        timeoutMs: 10_000,
      },
    );

    if (result.exitCode !== 0) {
      return "invalid-repo";
    }

    const [gitRootPath, requestedRepoPath] = await Promise.all([
      realpath(path.resolve(result.stdout.trim())),
      realpath(path.resolve(repoPath)),
    ]);

    return gitRootPath === requestedRepoPath ? "valid" : "invalid-repo";
  } catch {
    return "invalid-path";
  }
};

export const isGitAvailable = async (): Promise<boolean> => {
  try {
    const result = await runSubprocess("git", ["--version"], {
      timeoutMs: 10_000,
    });

    return result.exitCode === 0;
  } catch {
    return false;
  }
};
