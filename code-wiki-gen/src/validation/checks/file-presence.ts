import path from "node:path";

import { METADATA_FILE_NAME } from "../../metadata/file.js";
import type { ValidationFinding } from "../../types/index.js";
import { pathExists } from "./shared.js";

const REQUIRED_FILES = ["overview.md", "module-tree.json", METADATA_FILE_NAME];

export const checkFilePresence = async (
  outputPath: string,
): Promise<ValidationFinding[]> => {
  const findings: ValidationFinding[] = [];

  for (const requiredFile of REQUIRED_FILES) {
    const filePath = path.join(outputPath, requiredFile);

    if (await pathExists(filePath)) {
      continue;
    }

    findings.push({
      category: "missing-file",
      filePath,
      message: `Missing required file: ${filePath}`,
      severity: "error",
    });
  }

  return findings;
};
