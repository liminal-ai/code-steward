import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CliResultEnvelope } from "../../src/types/cli.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLI_PATH = path.resolve(__dirname, "../../dist/cli.js");

export interface CliRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Runs the CLI binary as a subprocess and captures output.
 * Does not throw on non-zero exit codes.
 */
export async function runCli(args: string[]): Promise<CliRunResult> {
  return new Promise((resolve) => {
    const child = execFile(
      "node",
      [CLI_PATH, ...args],
      { timeout: 30_000 },
      (error, stdout, stderr) => {
        resolve({
          stdout: stdout ?? "",
          stderr: stderr ?? "",
          exitCode: child.exitCode ?? (error ? 1 : 0),
        });
      },
    );
  });
}

/**
 * Runs CLI and parses stdout as JSON.
 * Throws if stdout is not valid JSON.
 */
export async function runCliJson<T>(
  args: string[],
): Promise<{ envelope: CliResultEnvelope<T>; exitCode: number }> {
  const result = await runCli(args);
  const envelope = JSON.parse(result.stdout) as CliResultEnvelope<T>;
  return { envelope, exitCode: result.exitCode };
}
