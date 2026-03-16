import type { EngineResult } from "../types/common.js";

export interface AgentSDKAdapter {
  query<T>(
    options: AgentQueryOptions,
  ): Promise<EngineResult<AgentQueryResult<T>>>;
  getAccumulatedUsage(): TokenUsage;
  computeCost(): number | null;
}

export interface AgentQueryOptions {
  systemPrompt: string;
  userMessage: string;
  outputSchema?: Record<string, unknown>;
  model?: string;
  maxTokens?: number;
  cwd?: string;
  allowedPaths?: string[];
}

export interface AgentQueryResult<T> {
  output: T;
  usage: TokenUsage | null;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
}

export const createAgentSDKAdapter = (): AgentSDKAdapter => {
  throw new Error("createAgentSDKAdapter: not yet implemented");
};
