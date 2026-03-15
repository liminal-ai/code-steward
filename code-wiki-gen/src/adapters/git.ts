import { NotImplementedError } from "../types/common.js";

export const getHeadCommitHash = async (_repoPath: string): Promise<string> => {
  throw new NotImplementedError("getHeadCommitHash");
};

export const isGitRepository = async (_repoPath: string): Promise<boolean> => {
  throw new NotImplementedError("isGitRepository");
};

export const isGitAvailable = async (): Promise<boolean> => {
  throw new NotImplementedError("isGitAvailable");
};
