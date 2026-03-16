import { query, type SDKResultMessage } from "@anthropic-ai/claude-agent-sdk";

import { type EngineResult, err } from "../types/common.js";

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
  let accumulatedCostUsd = 0;
  let hasMissingCost = false;
  const accumulatedUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
  };

  return {
    async query<T>(
      options: AgentQueryOptions,
    ): Promise<EngineResult<AgentQueryResult<T>>> {
      try {
        const result = await executeQuery(options);
        const usage = extractUsage(result);

        accumulatedUsage.inputTokens += usage.inputTokens;
        accumulatedUsage.outputTokens += usage.outputTokens;

        if (
          typeof result.total_cost_usd === "number" &&
          Number.isFinite(result.total_cost_usd)
        ) {
          accumulatedCostUsd += result.total_cost_usd;
        } else {
          hasMissingCost = true;
        }

        if (result.subtype !== "success") {
          return err(
            "ORCHESTRATION_ERROR",
            buildExecutionErrorMessage(result),
            {
              errors: result.errors,
              stopReason: result.stop_reason,
              subtype: result.subtype,
            },
          );
        }

        if (options.outputSchema) {
          const output =
            result.structured_output ?? extractStructuredOutput(result.result);

          if (output === undefined) {
            return err(
              "ORCHESTRATION_ERROR",
              "Agent SDK returned no structured output for the requested schema",
              {
                rawResult: result.result,
                stopReason: result.stop_reason,
              },
            );
          }

          return {
            ok: true,
            value: {
              output: output as T,
              usage,
            },
          };
        }

        return {
          ok: true,
          value: {
            output: result.result as T,
            usage,
          },
        };
      } catch (error) {
        return err(
          "ORCHESTRATION_ERROR",
          "Agent SDK query failed unexpectedly",
          error instanceof Error ? { cause: error.message } : error,
        );
      }
    },

    getAccumulatedUsage(): TokenUsage {
      return { ...accumulatedUsage };
    },

    computeCost(): number | null {
      if (hasMissingCost) {
        return null;
      }

      return Number(accumulatedCostUsd.toFixed(6));
    },
  };
};

const DEFAULT_MAX_TURNS = 3;

const executeQuery = async (
  options: AgentQueryOptions,
): Promise<SDKResultMessage> => {
  let finalResult: SDKResultMessage | null = null;

  for await (const message of query({
    options: {
      additionalDirectories: resolveAdditionalDirectories(
        options.cwd,
        options.allowedPaths,
      ),
      cwd: options.cwd,
      maxTurns: DEFAULT_MAX_TURNS,
      model: options.model,
      outputFormat: options.outputSchema
        ? {
            type: "json_schema",
            schema: options.outputSchema,
          }
        : undefined,
      permissionMode: "dontAsk",
      systemPrompt: options.systemPrompt,
      tools: [],
    },
    prompt: buildPrompt(options),
  })) {
    if (message.type === "result") {
      finalResult = message;
    }
  }

  if (!finalResult) {
    throw new Error("Agent SDK query completed without a final result message");
  }

  return finalResult;
};

const resolveAdditionalDirectories = (
  cwd: string | undefined,
  allowedPaths: string[] | undefined,
): string[] | undefined => {
  if (!allowedPaths || allowedPaths.length === 0) {
    return undefined;
  }

  const normalizedCwd = cwd ? normalizePath(cwd) : null;
  const directories = new Set<string>();

  for (const allowedPath of allowedPaths) {
    const normalizedPath = normalizePath(allowedPath);

    if (normalizedPath === normalizedCwd) {
      continue;
    }

    directories.add(normalizedPath);
  }

  return directories.size > 0 ? [...directories].sort() : undefined;
};

const normalizePath = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const buildPrompt = (options: AgentQueryOptions): string => {
  if (!options.outputSchema) {
    return options.userMessage;
  }

  return [
    options.userMessage,
    "",
    "Return only valid JSON that matches the requested schema exactly.",
    "Do not include markdown fences, prose, labels, or explanatory text.",
    "If a field contains markdown content, place that markdown inside the JSON string value.",
    "",
    "Requested JSON schema:",
    JSON.stringify(options.outputSchema, null, 2),
  ].join("\n");
};

const extractUsage = (result: {
  usage: Record<string, unknown>;
}): TokenUsage => ({
  inputTokens: readUsageNumber(result.usage, "inputTokens", "input_tokens"),
  outputTokens: readUsageNumber(result.usage, "outputTokens", "output_tokens"),
});

const readUsageNumber = (
  usage: Record<string, unknown>,
  camelKey: string,
  snakeKey: string,
): number => {
  const value = usage[camelKey] ?? usage[snakeKey];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
};

const buildExecutionErrorMessage = (result: {
  errors: string[];
  subtype: string;
}): string =>
  result.errors[0] ??
  `Agent SDK execution failed with result subtype "${result.subtype}"`;

const extractStructuredOutput = (rawResult: string): unknown => {
  const trimmedResult = rawResult.trim();

  for (const candidate of [
    trimmedResult,
    ...extractFencedCodeBlocks(trimmedResult),
  ]) {
    try {
      return JSON.parse(candidate);
    } catch {
      // Keep trying other structured candidates.
    }
  }

  return undefined;
};

const extractFencedCodeBlocks = (value: string): string[] =>
  [...value.matchAll(/```(?:json)?\s*([\s\S]*?)```/giu)]
    .map((match) => match[1]?.trim())
    .filter((match): match is string => Boolean(match));
