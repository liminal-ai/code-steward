import { defineCommand } from "citty";
import { mergeRunRequest } from "../cli/config-merger.js";
import { EXIT_OPERATIONAL_FAILURE, mapToExitCode } from "../cli/exit-codes.js";
import {
  writeHumanError,
  writeHumanRunResult,
  writeJsonError,
  writeJsonResult,
} from "../cli/output.js";
import { generateDocumentation } from "../orchestration/generate.js";

export default defineCommand({
  args: {
    config: {
      description: "Path to a configuration file.",
      type: "string",
    },
    exclude: {
      description: "Comma-separated exclude patterns.",
      type: "string",
    },
    focus: {
      description: "Comma-separated focus directories.",
      type: "string",
    },
    include: {
      description: "Comma-separated include patterns.",
      type: "string",
    },
    json: {
      default: false,
      description: "Emit machine-readable JSON output.",
      type: "boolean",
    },
    "output-path": {
      description: "Output path for generated documentation.",
      type: "string",
    },
    "repo-path": {
      description: "Repository path to document.",
      required: true,
      type: "string",
    },
  },
  meta: {
    description: "Generate documentation.",
    name: "generate",
  },
  async run({ args }) {
    const requestResult = await mergeRunRequest(
      {
        config: args.config,
        exclude: args.exclude,
        focus: args.focus,
        include: args.include,
        outputPath: args["output-path"],
        repoPath: args["repo-path"],
      },
      "full",
    );

    if (!requestResult.ok) {
      if (args.json) {
        writeJsonError("generate", requestResult.error);
      } else {
        writeHumanError(requestResult.error);
      }

      process.exitCode = EXIT_OPERATIONAL_FAILURE;
      return;
    }

    const result = await generateDocumentation(requestResult.value);

    if (args.json) {
      if (result.success) {
        writeJsonResult("generate", result);
      } else {
        writeJsonError("generate", result.error);
      }
    } else {
      writeHumanRunResult(result);

      if (!result.success) {
        writeHumanError(result.error);
      }
    }

    process.exitCode = mapToExitCode(result, false);
  },
});
