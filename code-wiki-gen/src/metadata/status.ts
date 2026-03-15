import { NotImplementedError } from "../types/common.js";
import type {
  DocumentationStatus,
  DocumentationStatusRequest,
  EngineResult,
} from "../types/index.js";

export const getDocumentationStatus = async (
  _request: DocumentationStatusRequest,
): Promise<EngineResult<DocumentationStatus>> => {
  throw new NotImplementedError("getDocumentationStatus");
};
