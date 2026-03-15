import { z } from "zod";

export const configurationRequestSchema = z.object({
  repoPath: z.string().optional(),
  outputPath: z.string().optional(),
  includePatterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  focusDirs: z.array(z.string()).optional(),
});

export const configurationFileSchema = configurationRequestSchema.omit({
  repoPath: true,
});

export const resolvedConfigurationSchema = z.object({
  outputPath: z.string(),
  includePatterns: z.array(z.string()),
  excludePatterns: z.array(z.string()),
  focusDirs: z.array(z.string()),
});

export const defaultConfigurationSchema = resolvedConfigurationSchema;
