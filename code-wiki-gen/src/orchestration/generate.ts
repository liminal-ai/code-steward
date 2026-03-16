import { createAgentSDKAdapter } from "../adapters/agent-sdk.js";
import type {
  DocumentationRunRequest,
  DocumentationRunResult,
  ProgressCallback,
  RunSuccessData,
  ValidationAndReviewResult,
  ValidationResult,
} from "../types/index.js";
import { resolveOutputPath } from "./output-path.js";
import { RunContext } from "./run-context.js";
import { runEnvironmentCheck } from "./stages/environment-check.js";
import {
  cleanupPersistedRunFiles,
  MODULE_PLAN_FILE_NAME,
  writeRunMetadata,
  writeValidationArtifacts,
} from "./stages/metadata-write.js";
import { generateModuleDocs } from "./stages/module-generation.js";
import { planModules } from "./stages/module-planning.js";
import { writeModuleTree } from "./stages/module-tree-write.js";
import { generateOverview } from "./stages/overview-generation.js";
import { resolveAndValidateRequest } from "./stages/resolve-and-validate.js";
import { runStructuralAnalysis } from "./stages/structural-analysis.js";
import {
  ValidationAndReviewError,
  validateAndReview,
} from "./stages/validation-and-review.js";

export const generateDocumentation = async (
  request: DocumentationRunRequest,
  onProgress?: ProgressCallback,
): Promise<DocumentationRunResult> => {
  const context = new RunContext(
    request.mode === "update" ? "update" : "full",
    onProgress,
  );
  const resolvedRequest = await resolveAndValidateRequest(request);

  if (!resolvedRequest.ok) {
    return context.assembleFailureResult(
      "resolving-configuration",
      resolvedRequest.error,
    );
  }

  if (resolvedRequest.value.mode !== "full") {
    return context.assembleFailureResult("computing-changes", {
      code: "ORCHESTRATION_ERROR",
      message: "Update mode is not implemented yet",
    });
  }

  try {
    context.setSDK(createAgentSDKAdapter());
  } catch (error) {
    return context.assembleFailureResult("planning-modules", {
      code: "ORCHESTRATION_ERROR",
      message: "Unable to initialize Agent SDK adapter",
      details: error instanceof Error ? { cause: error.message } : error,
    });
  }

  const config = resolvedRequest.value;
  const outputPath = resolveOutputPath(config);
  context.emitProgress("checking-environment");
  const environmentResult = await runEnvironmentCheck(config);

  if (!environmentResult.ok) {
    return context.assembleFailureResult(
      "checking-environment",
      environmentResult.error,
      {
        outputPath,
      },
    );
  }

  context.emitProgress("analyzing-structure");
  const analysisResult = await runStructuralAnalysis(config);

  if (!analysisResult.ok) {
    return context.assembleFailureResult(
      "analyzing-structure",
      analysisResult.error,
      {
        outputPath,
      },
    );
  }

  const analysis = analysisResult.value;
  context.emitProgress("planning-modules");
  const planResult = await planModules(analysis, context.getSDK());

  if (!planResult.ok) {
    return context.assembleFailureResult("planning-modules", planResult.error, {
      commitHash: analysis.commitHash,
      outputPath,
    });
  }

  const modulePlan = planResult.value;

  if (modulePlan.modules.length === 0) {
    return context.assembleFailureResult(
      "planning-modules",
      {
        code: "ORCHESTRATION_ERROR",
        message: "Module planning produced no modules",
      },
      {
        commitHash: analysis.commitHash,
        modulePlan,
        outputPath,
      },
    );
  }

  const moduleDocsResult = await generateModuleDocs(
    modulePlan,
    analysis,
    config,
    context.getSDK(),
    (moduleName, completed, total) => {
      context.emitProgress("generating-module", {
        completed,
        moduleName,
        total,
      });
    },
  );

  if (!moduleDocsResult.ok) {
    return context.assembleFailureResult(
      "generating-module",
      moduleDocsResult.error,
      {
        commitHash: analysis.commitHash,
        modulePlan,
        outputPath,
      },
    );
  }

  const moduleDocs = moduleDocsResult.value;
  context.emitProgress("generating-overview");
  const overviewResult = await generateOverview(
    moduleDocs,
    analysis,
    config,
    context.getSDK(),
  );

  if (!overviewResult.ok) {
    return context.assembleFailureResult(
      "generating-overview",
      overviewResult.error,
      {
        commitHash: analysis.commitHash,
        generatedFiles: collectGeneratedFiles(moduleDocs),
        modulePlan,
        outputPath,
      },
    );
  }

  const treeResult = await writeModuleTree(modulePlan, outputPath);

  if (!treeResult.ok) {
    return context.assembleFailureResult(
      "writing-module-tree",
      treeResult.error,
      {
        commitHash: analysis.commitHash,
        generatedFiles: collectGeneratedFiles(moduleDocs),
        modulePlan,
        outputPath,
      },
    );
  }

  const generatedFiles = collectGeneratedFiles(moduleDocs, {
    includeMetadata: true,
    includeModulePlan: true,
  });
  const provisionalRunData: RunSuccessData = {
    commitHash: analysis.commitHash,
    generatedFiles,
    metadataOutputPath: config.outputPath,
    mode: config.mode,
    modulePlan,
    outputPath,
    qualityReviewPasses: 0,
    validationResult: {
      errorCount: 0,
      findings: [],
      status: "pass",
      warningCount: 0,
    },
  };
  const provisionalMetadataResult = await writeValidationArtifacts(
    {
      commitHash: provisionalRunData.commitHash,
      generatedFiles: provisionalRunData.generatedFiles,
      metadataOutputPath: provisionalRunData.metadataOutputPath,
      mode: provisionalRunData.mode,
    },
    modulePlan,
    outputPath,
  );

  if (!provisionalMetadataResult.ok) {
    return context.assembleFailureResult(
      "writing-metadata",
      provisionalMetadataResult.error,
      {
        commitHash: analysis.commitHash,
        generatedFiles: collectGeneratedFiles(moduleDocs, {
          includeMetadata: true,
          includeModulePlan: true,
        }),
        modulePlan,
        outputPath,
      },
    );
  }

  let validationResult: ValidationAndReviewResult;

  try {
    context.emitProgress("validating-output");
    validationResult = await validateAndReview(
      outputPath,
      config.qualityReview,
      context.getSDK(),
    );
  } catch (error) {
    await cleanupPersistedRunFiles(outputPath);
    const engineError =
      error instanceof ValidationAndReviewError
        ? error.engineError
        : {
            code: "VALIDATION_ERROR" as const,
            details: error instanceof Error ? { cause: error.message } : error,
            message: "Validation and review failed unexpectedly",
          };

    return context.assembleFailureResult("validating-output", engineError, {
      commitHash: analysis.commitHash,
      generatedFiles: collectGeneratedFiles(moduleDocs, {
        includeMetadata: true,
        includeModulePlan: true,
      }),
      modulePlan,
      outputPath,
    });
  }

  if (validationResult.hasBlockingErrors) {
    await cleanupPersistedRunFiles(outputPath);
    return context.assembleFailureResult(
      "validating-output",
      {
        code: "ORCHESTRATION_ERROR",
        message: "Generated output failed validation",
      },
      {
        commitHash: analysis.commitHash,
        generatedFiles: collectGeneratedFiles(moduleDocs),
        modulePlan,
        outputPath,
        qualityReviewPasses: validationResult.qualityReviewPasses,
        validationResult: validationResult.validationResult,
      },
    );
  }

  const finalRunData: RunSuccessData = {
    ...provisionalRunData,
    qualityReviewPasses: validationResult.qualityReviewPasses,
    validationResult: validationResult.validationResult,
  };
  const successWarnings = [
    ...collectThinModuleWarnings(modulePlan),
    ...collectValidationWarnings(validationResult.validationResult),
  ];
  context.emitProgress("writing-metadata");
  const finalMetadataResult = await writeRunMetadata(
    finalRunData,
    modulePlan,
    outputPath,
  );

  if (!finalMetadataResult.ok) {
    await cleanupPersistedRunFiles(outputPath);
    return context.assembleFailureResult(
      "writing-metadata",
      finalMetadataResult.error,
      {
        commitHash: analysis.commitHash,
        generatedFiles: collectGeneratedFiles(moduleDocs),
        modulePlan,
        outputPath,
        qualityReviewPasses: validationResult.qualityReviewPasses,
        validationResult: validationResult.validationResult,
      },
    );
  }

  for (const warning of successWarnings) {
    context.addWarning(warning);
  }

  context.emitProgress("complete");
  return context.assembleSuccessResult(finalRunData);
};

const collectGeneratedFiles = (
  moduleDocs: Map<string, { fileName: string }>,
  options?: {
    includeMetadata?: boolean;
    includeModulePlan?: boolean;
  },
): string[] =>
  [
    ...[...moduleDocs.values()]
      .map((moduleDoc) => moduleDoc.fileName)
      .sort((left, right) => left.localeCompare(right)),
    ...(options?.includeMetadata ? [".doc-meta.json"] : []),
    ...(options?.includeModulePlan ? [MODULE_PLAN_FILE_NAME] : []),
    "module-tree.json",
    "overview.md",
  ].sort((left, right) => left.localeCompare(right));

const collectThinModuleWarnings = (
  modulePlan: RunSuccessData["modulePlan"],
): string[] =>
  modulePlan.modules
    .filter((module) => module.components.length <= 1)
    .map((module) => {
      const componentLabel =
        module.components.length === 1 ? "1 component" : "0 components";

      return `Thin module "${module.name}" has ${componentLabel}; generated docs may be sparse.`;
    });

const collectValidationWarnings = (
  validationResult: ValidationResult,
): string[] =>
  validationResult.findings
    .filter((finding) => finding.severity === "warning")
    .map((finding) => finding.message);
