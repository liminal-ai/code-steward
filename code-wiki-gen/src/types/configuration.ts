import type { ZodIssue } from "zod";

export interface ConfigurationRequest {
  repoPath?: string;
  outputPath?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusDirs?: string[];
}

export interface ConfigurationErrorDetails {
  field: string;
  reason: string;
  value?: unknown;
  path?: string;
  issues?: ZodIssue[];
}

export interface ResolvedConfiguration {
  outputPath: string;
  includePatterns: string[];
  excludePatterns: string[];
  focusDirs: string[];
}

export interface DefaultConfiguration extends ResolvedConfiguration {}
