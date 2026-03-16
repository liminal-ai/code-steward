import type { EngineError } from "./common.js";
import type { ResolvedConfiguration } from "./configuration.js";
import type { ModulePlan } from "./planning.js";
import type { QualityReviewConfig } from "./quality-review.js";
import type { ValidationResult } from "./validation.js";

export type ProgressCallback = (event: DocumentationProgressEvent) => void;

export type DocumentationStage =
  | "checking-environment"
  | "analyzing-structure"
  | "computing-changes"
  | "planning-modules"
  | "generating-module"
  | "generating-overview"
  | "validating-output"
  | "quality-review"
  | "writing-metadata"
  | "complete"
  | "failed";

export interface DocumentationProgressEvent {
  runId: string;
  stage: DocumentationStage;
  moduleName?: string;
  completed?: number;
  total?: number;
  timestamp: string;
}

export interface DocumentationRunRequest {
  repoPath: string;
  mode: "full" | "update";
  outputPath?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusDirs?: string[];
  qualityReview?: QualityReviewConfig;
}

export type DocumentationRunResult =
  | DocumentationRunSuccess
  | DocumentationRunFailure;

export interface DocumentationRunResultBase {
  mode: "full" | "update";
  runId: string;
  durationSeconds: number;
  warnings: string[];
}

export interface DocumentationRunSuccess extends DocumentationRunResultBase {
  success: true;
  outputPath: string;
  generatedFiles: string[];
  modulePlan: ModulePlan;
  validationResult: ValidationResult;
  qualityReviewPasses: number;
  costUsd: number | null;
  commitHash: string;
  updatedModules?: string[];
  unchangedModules?: string[];
  overviewRegenerated?: boolean;
}

export interface DocumentationRunFailure extends DocumentationRunResultBase {
  success: false;
  failedStage: DocumentationStage;
  error: EngineError;
  outputPath?: string;
  commitHash?: string;
  generatedFiles?: string[];
  modulePlan?: ModulePlan;
  validationResult?: ValidationResult;
  qualityReviewPasses?: number;
  costUsd?: number | null;
}

export interface ResolvedRunConfig extends ResolvedConfiguration {
  repoPath: string;
  mode: "full" | "update";
  qualityReview: Required<QualityReviewConfig>;
}

export interface ValidationAndReviewResult {
  validationResult: ValidationResult;
  qualityReviewPasses: number;
  hasBlockingErrors: boolean;
}

export interface RunSuccessData {
  outputPath: string;
  generatedFiles: string[];
  modulePlan: ModulePlan;
  validationResult: ValidationResult;
  qualityReviewPasses: number;
  commitHash: string;
  updatedModules?: string[];
  unchangedModules?: string[];
  overviewRegenerated?: boolean;
}
