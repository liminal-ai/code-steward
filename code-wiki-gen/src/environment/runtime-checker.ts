import { NotImplementedError } from "../types/common.js";
import type { EnvironmentCheckFinding } from "../types/index.js";

export const checkRuntimeDependencies = async (): Promise<
  EnvironmentCheckFinding[]
> => {
  throw new NotImplementedError("checkRuntimeDependencies");
};
