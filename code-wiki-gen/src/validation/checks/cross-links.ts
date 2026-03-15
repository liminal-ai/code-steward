import { NotImplementedError } from "../../types/common.js";
import type { ValidationFinding } from "../../types/index.js";

export const checkCrossLinks = async (
  _outputPath: string,
): Promise<ValidationFinding[]> => {
  throw new NotImplementedError("checkCrossLinks");
};
