import { readFile } from "node:fs/promises";
import path from "node:path";
import { configurationFileSchema } from "../contracts/configuration.js";
import { err, ok } from "../types/common.js";
import type {
  ConfigurationErrorDetails,
  EngineResult,
  ResolvedConfiguration,
} from "../types/index.js";

export const CONFIG_FILE_NAME = ".docengine.json";

export const loadConfigFile = async (
  repoPath?: string,
): Promise<EngineResult<Partial<ResolvedConfiguration> | null>> => {
  if (!repoPath) {
    return ok(null);
  }

  const configPath = path.join(repoPath, CONFIG_FILE_NAME);

  let fileContents: string;

  try {
    fileContents = await readFile(configPath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return ok(null);
    }

    return err(
      "CONFIGURATION_ERROR",
      `Unable to read configuration file at ${configPath}`,
      {
        field: "configFile",
        path: configPath,
        reason: getErrorMessage(error),
      } satisfies ConfigurationErrorDetails,
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(fileContents);
  } catch (error) {
    return err(
      "CONFIGURATION_ERROR",
      `Invalid JSON in configuration file at ${configPath}`,
      {
        field: "configFile",
        path: configPath,
        reason: getErrorMessage(error),
      } satisfies ConfigurationErrorDetails,
    );
  }

  const result = configurationFileSchema.safeParse(parsed);

  if (!result.success) {
    const issue = result.error.issues[0];

    return err(
      "CONFIGURATION_ERROR",
      `Invalid configuration file at ${configPath}`,
      {
        field: issue ? issue.path.join(".") || "configFile" : "configFile",
        issues: result.error.issues,
        path: configPath,
        reason:
          issue?.message ??
          "Configuration file does not match the expected shape",
      } satisfies ConfigurationErrorDetails,
    );
  }

  return ok(result.data);
};

const isMissingFileError = (error: unknown): error is NodeJS.ErrnoException =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown configuration file error";
