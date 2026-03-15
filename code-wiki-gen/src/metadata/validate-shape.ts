import { NotImplementedError } from "../types/common.js";
import type { GeneratedDocumentationMetadata } from "../types/index.js";

export const validateMetadataShape = (
  _parsed: unknown,
):
  | { valid: true; metadata: GeneratedDocumentationMetadata }
  | { valid: false; reason: string } => {
  throw new NotImplementedError("validateMetadataShape");
};
