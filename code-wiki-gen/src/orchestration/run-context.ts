import { randomUUID } from "node:crypto";
import type { AgentSDKAdapter } from "../adapters/agent-sdk.js";
import type { EngineError } from "../types/common.js";
import type {
  DocumentationProgressEvent,
  DocumentationRunFailure,
  DocumentationRunSuccess,
  DocumentationStage,
  ProgressCallback,
  RunSuccessData,
} from "../types/orchestration.js";

export class RunContext {
  readonly runId: string;
  readonly startTime: number;
  readonly mode: "full" | "update";

  private warnings: string[] = [];
  private onProgress: ProgressCallback | undefined;
  private sdkAdapter: AgentSDKAdapter;

  constructor(
    mode: "full" | "update",
    sdkAdapter: AgentSDKAdapter,
    onProgress?: ProgressCallback,
  ) {
    this.runId = randomUUID();
    this.startTime = Date.now();
    this.mode = mode;
    this.sdkAdapter = sdkAdapter;
    this.onProgress = onProgress;
  }

  emitProgress(
    stage: DocumentationStage,
    extra?: Partial<DocumentationProgressEvent>,
  ): void {
    this.onProgress?.({
      runId: this.runId,
      stage,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  }

  addWarning(message: string): void {
    this.warnings.push(message);
  }

  getWarnings(): string[] {
    return [...this.warnings];
  }

  getSDK(): AgentSDKAdapter {
    return this.sdkAdapter;
  }

  getDurationSeconds(): number {
    return (Date.now() - this.startTime) / 1000;
  }

  assembleSuccessResult(data: RunSuccessData): DocumentationRunSuccess {
    return {
      success: true,
      mode: this.mode,
      runId: this.runId,
      durationSeconds: this.getDurationSeconds(),
      warnings: this.getWarnings(),
      outputPath: data.outputPath,
      generatedFiles: data.generatedFiles,
      modulePlan: data.modulePlan,
      validationResult: data.validationResult,
      qualityReviewPasses: data.qualityReviewPasses,
      costUsd: this.sdkAdapter.computeCost(),
      commitHash: data.commitHash,
      updatedModules: data.updatedModules,
      unchangedModules: data.unchangedModules,
      overviewRegenerated: data.overviewRegenerated,
    };
  }

  assembleFailureResult(
    stage: DocumentationStage,
    error: EngineError,
  ): DocumentationRunFailure {
    return {
      success: false,
      mode: this.mode,
      runId: this.runId,
      durationSeconds: this.getDurationSeconds(),
      warnings: this.getWarnings(),
      failedStage: stage,
      error,
      costUsd: this.sdkAdapter.computeCost(),
    };
  }
}
