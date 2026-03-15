import { NotImplementedError } from "../types/common.js";
import type { ResolvedConfiguration } from "../types/index.js";

export const loadConfigFile = async (
  _repoPath?: string,
): Promise<Partial<ResolvedConfiguration> | null> => {
  throw new NotImplementedError("loadConfigFile");
};
