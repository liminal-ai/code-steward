import { rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { writeMetadata } from "../../metadata/writer.js";
import { err } from "../../types/common.js";
import type {
  EngineResult,
  ModulePlan,
  RunSuccessData,
} from "../../types/index.js";

export const MODULE_PLAN_FILE_NAME = ".module-plan.json";

export const writeRunMetadata = async (
  result: RunSuccessData,
  plan: ModulePlan,
  outputPath: string,
): Promise<EngineResult<void>> => {
  return writeArtifacts(
    {
      commitHash: result.commitHash,
      generatedFiles: result.generatedFiles,
      metadataOutputPath: result.metadataOutputPath,
      mode: result.mode,
    },
    plan,
    outputPath,
  );
};

export const writeValidationArtifacts = async (
  data: {
    commitHash: string;
    generatedFiles: string[];
    metadataOutputPath: string;
    mode: "full" | "update";
  },
  plan: ModulePlan,
  outputPath: string,
): Promise<EngineResult<void>> => {
  return writeArtifacts(data, plan, outputPath);
};

const writeArtifacts = async (
  data: {
    commitHash: string;
    generatedFiles: string[];
    metadataOutputPath: string;
    mode: "full" | "update";
  },
  plan: ModulePlan,
  outputPath: string,
): Promise<EngineResult<void>> => {
  const modulePlanPath = path.join(outputPath, MODULE_PLAN_FILE_NAME);

  try {
    await writeFile(
      modulePlanPath,
      `${JSON.stringify(plan, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    return err(
      "METADATA_ERROR",
      `Unable to write module plan at ${modulePlanPath}`,
      {
        path: modulePlanPath,
        reason: error instanceof Error ? error.message : String(error),
      },
    );
  }

  const metadataResult = await writeMetadata({
    metadata: {
      commitHash: data.commitHash,
      componentCount: countPlannedComponents(plan),
      filesGenerated: [...data.generatedFiles].sort(),
      generatedAt: new Date().toISOString(),
      mode: data.mode,
      outputPath: data.metadataOutputPath,
    },
    outputPath,
  });

  if (metadataResult.ok) {
    return metadataResult;
  }

  await safeRemove(modulePlanPath);
  return metadataResult;
};

export const cleanupPersistedRunFiles = async (
  outputPath: string,
): Promise<void> => {
  await Promise.all([
    safeRemove(path.join(outputPath, ".doc-meta.json")),
    safeRemove(path.join(outputPath, MODULE_PLAN_FILE_NAME)),
  ]);
};

const countPlannedComponents = (plan: ModulePlan): number =>
  plan.modules.reduce(
    (total, module) => total + module.components.length,
    plan.unmappedComponents.length,
  );

const safeRemove = async (filePath: string): Promise<void> => {
  try {
    await rm(filePath, { force: true });
  } catch {
    // Best-effort cleanup preserves success-only metadata semantics.
  }
};
