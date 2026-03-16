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

export const getChangedFilesBetweenCommits = async (
  repoPath: string,
  fromCommit: string,
  toCommit: string,
): Promise<import("../types/update.js").ChangedFile[]> => {
  const result = await runSubprocess(
    "git",
    ["diff", "--name-status", "--find-renames", fromCommit, toCommit],
    {
      cwd: repoPath,
      timeoutMs: 10_000,
    },
  );

  if (result.exitCode !== 0) {
    throw new Error(result.stderr || "Failed to compute changed files");
  }

  return result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseChangedFileLine);
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

const parseChangedFileLine = (
  line: string,
): import("../types/update.js").ChangedFile => {
  const parts = line.split("\t");
  const status = parts[0] ?? "";

  if (status.startsWith("R")) {
    const oldPath = parts[1];
    const newPath = parts[2];

    if (!oldPath || !newPath) {
      throw new Error(`Unable to parse renamed file entry: ${line}`);
    }

    return {
      changeType: "renamed",
      oldPath,
      path: newPath,
    };
  }

  const changedPath = parts[1];

  if (!changedPath) {
    throw new Error(`Unable to parse changed file entry: ${line}`);
  }

  switch (status) {
    case "A":
      return { changeType: "added", path: changedPath };
    case "D":
      return { changeType: "deleted", path: changedPath };
    case "M":
      return { changeType: "modified", path: changedPath };
    default:
      return { changeType: "modified", path: changedPath };
  }
};
