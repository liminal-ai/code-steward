import { NotImplementedError } from "../types/common.js";
import type {
  EngineResult,
  EnvironmentCheckRequest,
  EnvironmentCheckResult,
} from "../types/index.js";

export const checkEnvironment = async (
  _request: EnvironmentCheckRequest = {},
): Promise<EngineResult<EnvironmentCheckResult>> => {
  throw new NotImplementedError("checkEnvironment");
};
