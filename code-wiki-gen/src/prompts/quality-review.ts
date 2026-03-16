import type { QualityReviewConfig } from "../types/quality-review.js";
import type { ValidationResult } from "../types/validation.js";

export const buildQualityReviewPrompt = (
  _validationResult: ValidationResult,
  _fileContents: Record<string, string>,
  _config: Required<QualityReviewConfig>,
): { systemPrompt: string; userMessage: string } => {
  throw new Error("not implemented");
};
