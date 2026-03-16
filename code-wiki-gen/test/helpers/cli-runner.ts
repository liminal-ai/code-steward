import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
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

export interface CliRunOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

/**
 * Runs the CLI binary as a subprocess and captures output.
 * Does not throw on non-zero exit codes.
 */
export async function runCli(
  args: string[],
  options: CliRunOptions = {},
): Promise<CliRunResult> {
  if (!existsSync(CLI_PATH)) {
    throw new Error(
      `CLI binary not built: expected ${CLI_PATH}. Run npm run build before CLI subprocess tests.`,
    );
  }

  return new Promise((resolve) => {
    const child = execFile(
      "node",
      [CLI_PATH, ...args],
      {
        cwd: options.cwd,
        env: {
          ...process.env,
          ...options.env,
        },
        timeout: options.timeoutMs ?? 30_000,
      },
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
  options: CliRunOptions = {},
): Promise<{ envelope: CliResultEnvelope<T>; exitCode: number }> {
  const result = await runCli(args, options);
  const envelope = JSON.parse(result.stdout) as CliResultEnvelope<T>;
  return { envelope, exitCode: result.exitCode };
}
