import { NotImplementedError } from "../types/common.js";
import type {
  EngineResult,
  ValidationRequest,
  ValidationResult,
} from "../types/index.js";

export const validateDocumentation = async (
  _request: ValidationRequest,
): Promise<EngineResult<ValidationResult>> => {
  throw new NotImplementedError("validateDocumentation");
};
