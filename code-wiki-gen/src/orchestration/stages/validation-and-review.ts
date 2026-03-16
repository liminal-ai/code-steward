import type { AgentSDKAdapter } from "../../adapters/agent-sdk.js";
import type {
  EngineError,
  QualityReviewConfig,
  ValidationAndReviewResult,
} from "../../types/index.js";
import { validateDocumentation } from "../../validation/validate.js";

export const validateAndReview = async (
  outputPath: string,
  _config: QualityReviewConfig,
  _sdk: AgentSDKAdapter,
): Promise<ValidationAndReviewResult> => {
  const validationResult = await validateDocumentation({ outputPath });

  if (!validationResult.ok) {
    throw new ValidationAndReviewError(validationResult.error);
  }

  return {
    hasBlockingErrors: validationResult.value.errorCount > 0,
    qualityReviewPasses: 0,
    validationResult: validationResult.value,
  };
};

export class ValidationAndReviewError extends Error {
  readonly engineError: EngineError;

  constructor(engineError: EngineError) {
    super(engineError.message);
    this.engineError = engineError;
    this.name = "ValidationAndReviewError";
  }
}
