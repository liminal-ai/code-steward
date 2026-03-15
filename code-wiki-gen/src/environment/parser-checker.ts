import { NotImplementedError } from "../types/common.js";
import type { EnvironmentCheckFinding } from "../types/index.js";

export const checkParserAvailability = async (
  _languages: string[],
): Promise<EnvironmentCheckFinding[]> => {
  throw new NotImplementedError("checkParserAvailability");
};
