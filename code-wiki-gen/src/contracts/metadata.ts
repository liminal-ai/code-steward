import { z } from "zod";

export const generatedDocumentationMetadataSchema = z.object({
  generatedAt: z.string(),
  commitHash: z.string(),
  outputPath: z.string(),
  filesGenerated: z.array(z.string()),
  componentCount: z.number(),
  mode: z.enum(["full", "update"]),
});

export const metadataWriteRequestSchema = z.object({
  outputPath: z.string(),
  metadata: generatedDocumentationMetadataSchema,
});
