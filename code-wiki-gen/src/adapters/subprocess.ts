import { NotImplementedError } from "../types/common.js";

export interface SubprocessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export const runSubprocess = async (
  _command: string,
  _args: string[],
  _options?: { cwd?: string; timeoutMs?: number },
): Promise<SubprocessResult> => {
  throw new NotImplementedError("runSubprocess");
};
