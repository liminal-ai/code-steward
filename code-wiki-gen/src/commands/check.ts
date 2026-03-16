import { defineCommand } from "citty";
import { EXIT_OPERATIONAL_FAILURE, EXIT_SUCCESS } from "../cli/exit-codes.js";
import {
  writeHumanEnvironmentCheck,
  writeHumanError,
  writeJsonError,
  writeJsonResult,
} from "../cli/output.js";
import { checkEnvironment } from "../environment/check.js";

export default defineCommand({
  args: {
    json: {
      default: false,
      description: "Emit machine-readable JSON output.",
      type: "boolean",
    },
    "repo-path": {
      description:
        "Optional repository path to validate alongside runtime dependencies.",
      type: "string",
    },
  },
  meta: {
    description: "Check environment readiness.",
    name: "check",
  },
  async run({ args }) {
    const result = await checkEnvironment({
      repoPath: args["repo-path"],
    });

    if (!result.ok) {
      if (args.json) {
        writeJsonError("check", result.error);
      } else {
        writeHumanError(result.error);
      }

      process.exitCode = EXIT_OPERATIONAL_FAILURE;
      return;
    }

    if (!result.value.passed) {
      const firstError = result.value.findings.find(
        (finding) => finding.severity === "error",
      );

      if (firstError) {
        const errorCode =
          firstError.category === "missing-dependency"
            ? "DEPENDENCY_MISSING"
            : "ENVIRONMENT_ERROR";
        const error = {
          code: errorCode,
          message: firstError.message,
          details: firstError.dependencyName
            ? { dependency: firstError.dependencyName }
            : undefined,
        };

        if (args.json) {
          writeJsonError("check", error);
        } else {
          writeHumanError(error);
        }

        process.exitCode = EXIT_OPERATIONAL_FAILURE;
        return;
      }
    }

    if (args.json) {
      writeJsonResult("check", result.value);
    } else {
      writeHumanEnvironmentCheck(result.value);
    }

    process.exitCode = result.value.passed
      ? EXIT_SUCCESS
      : EXIT_OPERATIONAL_FAILURE;
  },
});
