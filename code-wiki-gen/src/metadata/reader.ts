import { NotImplementedError } from "../types/common.js";
import type {
  EngineResult,
  GeneratedDocumentationMetadata,
} from "../types/index.js";

export const readMetadata = async (
  _outputPath: string,
): Promise<EngineResult<GeneratedDocumentationMetadata>> => {
  throw new NotImplementedError("readMetadata");
};
