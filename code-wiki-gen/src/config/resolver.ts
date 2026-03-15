import { NotImplementedError } from "../types/common.js";
import type {
  ConfigurationRequest,
  EngineResult,
  ResolvedConfiguration,
} from "../types/index.js";

export const resolveConfiguration = async (
  _request?: ConfigurationRequest,
): Promise<EngineResult<ResolvedConfiguration>> => {
  throw new NotImplementedError("resolveConfiguration");
};
