import path from "node:path";

import { z } from "zod";

import { resolveConfiguration } from "../../config/resolver.js";
import { err, ok } from "../../types/common.js";
import type {
  DocumentationRunRequest,
  EngineResult,
  ResolvedRunConfig,
} from "../../types/index.js";

const documentationRunRequestSchema = z.object({
  repoPath: z.string().trim().min(1),
  mode: z.enum(["full", "update"]),
  outputPath: z.string().optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  focusDirs: z.array(z.string()).optional(),
  qualityReview: z
    .object({
      selfReview: z.boolean().optional(),
      secondModelReview: z.boolean().optional(),
    })
    .optional(),
});

export const resolveAndValidateRequest = async (
  request: DocumentationRunRequest,
): Promise<EngineResult<ResolvedRunConfig>> => {
  const parsedRequest = documentationRunRequestSchema.safeParse(request);

  if (!parsedRequest.success) {
    const issue = parsedRequest.error.issues[0];

    return err("CONFIGURATION_ERROR", "Documentation run request is invalid", {
      field: issue ? issue.path.join(".") || "request" : "request",
      issues: parsedRequest.error.issues,
      reason:
        issue?.message ??
        "Documentation run request does not match the expected shape",
    });
  }

  const repoPath = path.resolve(parsedRequest.data.repoPath);
  const configurationResult = await resolveConfiguration({
    excludePatterns: parsedRequest.data.excludePatterns,
    focusDirs: parsedRequest.data.focusDirs,
    includePatterns: parsedRequest.data.includePatterns,
    outputPath: parsedRequest.data.outputPath,
    repoPath,
  });

  if (!configurationResult.ok) {
    return configurationResult;
  }

  return ok({
    ...configurationResult.value,
    mode: parsedRequest.data.mode,
    qualityReview: {
      secondModelReview:
        parsedRequest.data.qualityReview?.secondModelReview ?? false,
      selfReview: parsedRequest.data.qualityReview?.selfReview ?? true,
    },
    repoPath,
  });
};
