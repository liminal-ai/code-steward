import { NotImplementedError } from "../types/common.js";
import type { EngineResult, MetadataWriteRequest } from "../types/index.js";

export const writeMetadata = async (
  _request: MetadataWriteRequest,
): Promise<EngineResult<void>> => {
  throw new NotImplementedError("writeMetadata");
};
