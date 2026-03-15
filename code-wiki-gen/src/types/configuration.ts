export interface ConfigurationRequest {
  repoPath?: string;
  outputPath?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusDirs?: string[];
}

export interface ResolvedConfiguration {
  outputPath: string;
  includePatterns: string[];
  excludePatterns: string[];
  focusDirs: string[];
}

export interface DefaultConfiguration extends ResolvedConfiguration {}
