import { access } from "node:fs/promises";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  type DocumentationRunResult,
  type DocumentationStatus,
  generateDocumentation,
  readMetadata,
  type ValidationResult,
} from "../../src/index.js";
import { runCli } from "../helpers/cli-runner.js";
import {
  createLiveGenerationRepo,
  type LiveFixtureRepo,
  readJsonFile,
} from "../helpers/live-fixtures.js";

const repos: LiveFixtureRepo[] = [];

const trackRepo = (repo: LiveFixtureRepo): LiveFixtureRepo => {
  repos.push(repo);
  return repo;
};

afterEach(() => {
  for (const repo of repos.splice(0, repos.length)) {
    repo.cleanup();
  }
});

describe("live Claude generation", () => {
  it("SDK full generate succeeds with live Claude on a real git fixture repo", async () => {
    const repo = trackRepo(createLiveGenerationRepo());

    const result = await generateDocumentation({
      mode: "full",
      qualityReview: {
        secondModelReview: false,
        selfReview: false,
      },
      repoPath: repo.repoPath,
    });

    expect(result.success).toBe(true);

    if (!result.success) {
      throw new Error(
        `Expected generation to succeed: ${result.error.code} ${result.error.message}`,
      );
    }

    expect(result.modulePlan.modules.length).toBeGreaterThan(0);
    expect(result.generatedFiles).toContain(".doc-meta.json");
    expect(result.generatedFiles).toContain(".module-plan.json");
    expect(result.generatedFiles).toContain("module-tree.json");
    expect(result.generatedFiles).toContain("overview.md");
    expect(result.validationResult.status).not.toBe("fail");

    const outputPath = path.join(repo.repoPath, "docs", "wiki");
    await access(path.join(outputPath, "overview.md"));
    await access(path.join(outputPath, "module-tree.json"));

    const metadataResult = await readMetadata(outputPath);

    expect(metadataResult.ok).toBe(true);

    if (!metadataResult.ok) {
      throw new Error(metadataResult.error.message);
    }

    expect(metadataResult.value.commitHash).toBe(result.commitHash);
  }, 300_000);

  it("CLI generate emits one JSON envelope and leaves validate/status consistent", async () => {
    const repo = trackRepo(createLiveGenerationRepo());

    const generateRun = await runCli(
      ["generate", "--json", "--repo-path", repo.repoPath],
      {
        timeoutMs: 300_000,
      },
    );

    expect(generateRun.exitCode).toBe(0);
    expect(generateRun.stderr).toBe("");

    const generateEnvelope = JSON.parse(generateRun.stdout) as {
      success: boolean;
      result?: DocumentationRunResult;
      error?: { code: string; message: string };
    };

    expect(generateEnvelope.success).toBe(true);
    expect(generateEnvelope.result?.generatedFiles).toContain("overview.md");
    expect(generateEnvelope.result?.validationResult?.status).not.toBe("fail");

    const validateRun = await runCli(
      [
        "validate",
        "--json",
        "--output-path",
        path.join(repo.repoPath, "docs/wiki"),
      ],
      {
        timeoutMs: 120_000,
      },
    );
    const statusRun = await runCli(
      ["status", "--json", "--repo-path", repo.repoPath],
      {
        timeoutMs: 120_000,
      },
    );

    expect(validateRun.exitCode).toBe(0);
    expect(statusRun.exitCode).toBe(0);
    expect(validateRun.stderr).toBe("");
    expect(statusRun.stderr).toBe("");

    const validateEnvelope = JSON.parse(validateRun.stdout) as {
      success: boolean;
      result?: ValidationResult;
    };
    const statusEnvelope = JSON.parse(statusRun.stdout) as {
      success: boolean;
      result?: DocumentationStatus;
    };

    expect(validateEnvelope.success).toBe(true);
    expect(validateEnvelope.result?.status).not.toBe("fail");
    expect(statusEnvelope.success).toBe(true);
    expect(statusEnvelope.result?.state).toBe("current");
    expect(statusEnvelope.result?.currentHeadCommitHash).toBe(
      statusEnvelope.result?.lastGeneratedCommitHash,
    );

    const metadata = readJsonFile<{ commitHash: string }>(
      path.join(repo.repoPath, "docs/wiki/.doc-meta.json"),
    );
    expect(metadata.commitHash).toBe(
      statusEnvelope.result?.lastGeneratedCommitHash,
    );
  }, 300_000);
});
