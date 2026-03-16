import { defineCommand } from "citty";
import { finalizeCancellation } from "../cli/cancellation.js";
import { mergeRunRequest } from "../cli/config-merger.js";
import { EXIT_OPERATIONAL_FAILURE, mapToExitCode } from "../cli/exit-codes.js";
import {
  writeHumanError,
  writeHumanRunResult,
  writeJsonError,
  writeJsonResult,
} from "../cli/output.js";
import { createProgressRenderer } from "../cli/progress.js";
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
      description: "Repository path to update documentation for.",
      required: true,
      type: "string",
    },
  },
  meta: {
    description: "Update existing documentation.",
    name: "update",
  },
  async run({ args }) {
    const onProgress = createProgressRenderer(args.json);
    const requestResult = await mergeRunRequest(
      {
        config: args.config,
        exclude: args.exclude,
        focus: args.focus,
        include: args.include,
        outputPath: args["output-path"],
        repoPath: args["repo-path"],
      },
      "update",
    );

    if (!requestResult.ok) {
      if (args.json) {
        writeJsonError("update", requestResult.error);
      } else {
        writeHumanError(requestResult.error);
      }

      process.exitCode = EXIT_OPERATIONAL_FAILURE;
      return;
    }

    if (finalizeCancellation(args.json)) {
      return;
    }

    const result = await generateDocumentation(requestResult.value, onProgress);

    if (finalizeCancellation(args.json)) {
      return;
    }

    if (args.json) {
      if (result.success) {
        writeJsonResult("update", result);
      } else {
        writeJsonError("update", result.error);
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
