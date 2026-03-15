import { beforeEach, describe, expect, it, vi } from "vitest";

import * as gitAdapter from "../../src/adapters/git.js";
import * as pythonAdapter from "../../src/adapters/python.js";
import * as subprocessAdapter from "../../src/adapters/subprocess.js";
import { analyzeRepository } from "../../src/analysis/analyze.js";
import type { RawAnalysisOutput } from "../../src/analysis/raw-output.js";
import type { RepositoryAnalysis } from "../../src/types/index.js";
import { REPOS } from "../helpers/fixtures.js";

const MOCK_COMMIT_HASH = "0123456789abcdef0123456789abcdef01234567";

const expectAnalysis = (
  result: Awaited<ReturnType<typeof analyzeRepository>>,
): RepositoryAnalysis => {
  expect(result.ok).toBe(true);

  if (!result.ok) {
    throw new Error(`Expected analysis to succeed: ${result.error.message}`);
  }

  return result.value;
};

const fileRecord = (
  filePath: string,
  language: string,
  linesOfCode: number,
  supported = true,
) => ({
  language,
  lines_of_code: linesOfCode,
  path: filePath,
  supported,
});

const fileTreeRoot = (): RawAnalysisOutput["file_tree"] => ({
  children: [],
  name: "repo",
  path: ".",
  type: "directory",
});

const baseRawOutput = (): RawAnalysisOutput => ({
  file_tree: fileTreeRoot(),
  functions: [
    {
      component_type: "class",
      depends_on: ["src/session.ts"],
      end_line: 10,
      file_path: "src/auth.ts",
      id: "src/auth.ts:AuthService",
      name: "AuthService",
      relative_path: "src/auth.ts",
      start_line: 3,
    },
    {
      component_type: "function",
      depends_on: ["src/auth.ts"],
      end_line: 6,
      file_path: "src/index.ts",
      id: "src/index.ts:bootstrapAuth",
      name: "bootstrapAuth",
      relative_path: "src/index.ts",
      start_line: 3,
    },
    {
      component_type: "constant",
      depends_on: [],
      end_line: 1,
      file_path: "src/session.ts",
      id: "src/session.ts:SESSION_TTL_MS",
      name: "SESSION_TTL_MS",
      relative_path: "src/session.ts",
      start_line: 1,
    },
    {
      component_type: "function",
      depends_on: [],
      end_line: 5,
      file_path: "src/session.ts",
      id: "src/session.ts:createSession",
      name: "createSession",
      relative_path: "src/session.ts",
      start_line: 3,
    },
  ],
  relationships: [
    {
      callee: "src/session.ts:createSession",
      caller: "src/index.ts:bootstrapAuth",
      is_resolved: true,
    },
  ],
  summary: {
    files: [
      fileRecord("src/auth.ts", "typescript", 10),
      fileRecord("src/index.ts", "typescript", 6),
      fileRecord("src/session.ts", "typescript", 5),
      fileRecord("test/auth.test.ts", "typescript", 4),
    ],
    files_analyzed: 4,
    languages_found: ["typescript"],
    total_files: 4,
    unsupported_files: [],
  },
});

const mockSuccessfulAdapter = (raw: RawAnalysisOutput): void => {
  vi.spyOn(pythonAdapter, "getPythonCommand").mockResolvedValue("python3");
  vi.spyOn(subprocessAdapter, "runSubprocess").mockResolvedValue({
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify(raw),
  });
  vi.spyOn(gitAdapter, "getHeadCommitHash").mockResolvedValue(MOCK_COMMIT_HASH);
};

describe("analyzeRepository", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("TC-2.1a: successful TypeScript repo analysis", async () => {
    mockSuccessfulAdapter(baseRawOutput());

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(Object.keys(value.components)).toEqual(
      expect.arrayContaining(["src/auth.ts", "src/index.ts", "src/session.ts"]),
    );
    expect(value.relationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "src/auth.ts",
          target: "src/session.ts",
          type: "import",
        }),
      ]),
    );
    expect(value.summary).toEqual({
      languagesFound: ["typescript"],
      languagesSkipped: [],
      totalComponents: 4,
      totalFilesAnalyzed: 4,
      totalRelationships: 3,
    });
  });

  it("TC-2.1b: repo with no source files", async () => {
    mockSuccessfulAdapter({
      file_tree: fileTreeRoot(),
      functions: [],
      relationships: [],
      summary: {
        files: [],
        files_analyzed: 0,
        languages_found: [],
        total_files: 0,
        unsupported_files: [],
      },
    });

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.empty }),
    );

    expect(value.summary.totalComponents).toBe(0);
    expect(value.summary.totalRelationships).toBe(0);
  });

  it("TC-2.2a: include pattern limits scope", async () => {
    mockSuccessfulAdapter(baseRawOutput());

    const value = expectAnalysis(
      await analyzeRepository({
        includePatterns: ["src/**"],
        repoPath: REPOS.validTs,
      }),
    );

    expect(Object.keys(value.components)).toEqual([
      "src/auth.ts",
      "src/index.ts",
      "src/session.ts",
    ]);
    expect(
      vi.mocked(subprocessAdapter.runSubprocess).mock.calls[0]?.[1],
    ).toEqual(expect.arrayContaining(["--include", "src/**"]));
  });

  it("TC-2.2b: no include patterns includes all files", async () => {
    mockSuccessfulAdapter(baseRawOutput());

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(Object.keys(value.components)).toEqual([
      "src/auth.ts",
      "src/index.ts",
      "src/session.ts",
      "test/auth.test.ts",
    ]);
  });

  it("TC-2.3a: exclude pattern removes files", async () => {
    const raw = baseRawOutput();
    raw.functions.push({
      component_type: "function",
      depends_on: [],
      end_line: 8,
      file_path: "src/generated/client.ts",
      id: "src/generated/client.ts:buildClient",
      name: "buildClient",
      relative_path: "src/generated/client.ts",
      start_line: 2,
    });
    raw.summary.files?.push(
      fileRecord("src/generated/client.ts", "typescript", 8),
    );

    mockSuccessfulAdapter(raw);

    const value = expectAnalysis(
      await analyzeRepository({
        excludePatterns: ["**/generated/**"],
        repoPath: REPOS.validTs,
      }),
    );

    expect(value.components["src/generated/client.ts"]).toBeUndefined();
  });

  it("TC-2.3b: include and exclude combined", async () => {
    const raw = baseRawOutput();
    raw.functions.push({
      component_type: "function",
      depends_on: [],
      end_line: 7,
      file_path: "src/index.test.ts",
      id: "src/index.test.ts:indexTest",
      name: "indexTest",
      relative_path: "src/index.test.ts",
      start_line: 1,
    });
    raw.summary.files?.push(fileRecord("src/index.test.ts", "typescript", 7));

    mockSuccessfulAdapter(raw);

    const value = expectAnalysis(
      await analyzeRepository({
        excludePatterns: ["**/*.test.ts"],
        includePatterns: ["src/**"],
        repoPath: REPOS.validTs,
      }),
    );

    expect(Object.keys(value.components)).toEqual([
      "src/auth.ts",
      "src/index.ts",
      "src/session.ts",
    ]);
  });

  it("TC-2.4a: focus dirs preserved in output", async () => {
    mockSuccessfulAdapter(baseRawOutput());

    const value = expectAnalysis(
      await analyzeRepository({
        focusDirs: ["src/core"],
        repoPath: REPOS.validTs,
      }),
    );

    expect(value.focusDirs).toEqual(["src/core"]);
  });

  it("TC-2.4b: non-focus files still included", async () => {
    mockSuccessfulAdapter(baseRawOutput());

    const value = expectAnalysis(
      await analyzeRepository({
        focusDirs: ["src/core"],
        repoPath: REPOS.validTs,
      }),
    );

    expect(Object.keys(value.components)).toContain("src/session.ts");
  });

  it("TC-2.5a: component structure has required fields", async () => {
    mockSuccessfulAdapter({
      file_tree: fileTreeRoot(),
      functions: [
        {
          component_type: "class",
          depends_on: [],
          end_line: 12,
          file_path: "src/api.ts",
          id: "src/api.ts:ApiClient",
          name: "ApiClient",
          relative_path: "src/api.ts",
          start_line: 1,
        },
        {
          component_type: "function",
          depends_on: [],
          end_line: 18,
          file_path: "src/api.ts",
          id: "src/api.ts:createClient",
          name: "createClient",
          relative_path: "src/api.ts",
          start_line: 14,
        },
        {
          component_type: "function",
          depends_on: [],
          end_line: 24,
          file_path: "src/api.ts",
          id: "src/api.ts:destroyClient",
          name: "destroyClient",
          relative_path: "src/api.ts",
          start_line: 20,
        },
      ],
      relationships: [],
      summary: {
        files: [fileRecord("src/api.ts", "typescript", 24)],
        files_analyzed: 1,
        languages_found: ["typescript"],
        total_files: 1,
        unsupported_files: [],
      },
    });

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );
    const component = value.components["src/api.ts"];

    expect(component).toEqual({
      exportedSymbols: [
        { kind: "class", lineNumber: 1, name: "ApiClient" },
        { kind: "function", lineNumber: 14, name: "createClient" },
        { kind: "function", lineNumber: 20, name: "destroyClient" },
      ],
      filePath: "src/api.ts",
      language: "typescript",
      linesOfCode: 24,
    });
  });

  it("TC-2.5b: file with no exports has empty symbols", async () => {
    mockSuccessfulAdapter({
      file_tree: fileTreeRoot(),
      functions: [],
      relationships: [],
      summary: {
        files: [fileRecord("src/bootstrap.ts", "typescript", 6)],
        files_analyzed: 1,
        languages_found: ["typescript"],
        total_files: 1,
        unsupported_files: [],
      },
    });

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(value.components["src/bootstrap.ts"]).toEqual({
      exportedSymbols: [],
      filePath: "src/bootstrap.ts",
      language: "typescript",
      linesOfCode: 6,
    });
  });

  it("TC-2.6a: import relationship captured", async () => {
    mockSuccessfulAdapter(baseRawOutput());

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(value.relationships).toContainEqual({
      source: "src/auth.ts",
      target: "src/session.ts",
      type: "import",
    });
  });

  it("TC-2.6b: no relationships returns empty array", async () => {
    const raw = baseRawOutput();
    raw.functions = raw.functions.map((node) => ({ ...node, depends_on: [] }));
    raw.relationships = [];

    mockSuccessfulAdapter(raw);

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(value.relationships).toEqual([]);
  });

  it("TC-2.7a: commit hash recorded", async () => {
    mockSuccessfulAdapter(baseRawOutput());

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(value.commitHash).toBe(MOCK_COMMIT_HASH);
  });

  it("TC-2.8a: Python unavailable returns DEPENDENCY_MISSING", async () => {
    vi.spyOn(pythonAdapter, "getPythonCommand").mockResolvedValue(null);

    const result = await analyzeRepository({ repoPath: REPOS.validTs });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("DEPENDENCY_MISSING");
  });

  it("TC-2.8b: nonexistent repo path returns PATH_ERROR", async () => {
    const result = await analyzeRepository({
      repoPath: `${REPOS.validTs}/missing`,
    });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("PATH_ERROR");
  });

  it("TC-2.8c: unsupported languages listed in languagesSkipped", async () => {
    mockSuccessfulAdapter({
      file_tree: fileTreeRoot(),
      functions: [],
      relationships: [],
      summary: {
        files: [fileRecord("src/lib.rs", "rust", 14, false)],
        files_analyzed: 0,
        languages_found: [],
        total_files: 1,
        unsupported_files: [fileRecord("src/lib.rs", "rust", 14, false)],
      },
    });

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(value.summary.languagesSkipped).toEqual(["rust"]);
    expect(value.summary.totalComponents).toBe(0);
  });

  it("TC-2.8d: partial language support reports both", async () => {
    const raw = baseRawOutput();
    raw.summary.files?.push(fileRecord("src/lib.rs", "rust", 14, false));
    raw.summary.unsupported_files = [
      fileRecord("src/lib.rs", "rust", 14, false),
    ];

    mockSuccessfulAdapter(raw);

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(value.summary.languagesFound).toEqual(["typescript"]);
    expect(value.summary.languagesSkipped).toEqual(["rust"]);
  });

  it("adapter timeout returns ANALYSIS_ERROR", async () => {
    vi.spyOn(pythonAdapter, "getPythonCommand").mockResolvedValue("python3");
    vi.spyOn(subprocessAdapter, "runSubprocess").mockRejectedValue(
      new Error("Subprocess timed out after 60000ms: python3 analyzer.py"),
    );

    const result = await analyzeRepository({ repoPath: REPOS.validTs });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("ANALYSIS_ERROR");
  });

  it("adapter subprocess crash returns ANALYSIS_ERROR", async () => {
    vi.spyOn(pythonAdapter, "getPythonCommand").mockResolvedValue("python3");
    vi.spyOn(subprocessAdapter, "runSubprocess").mockRejectedValue(
      new Error("subprocess crashed"),
    );

    const result = await analyzeRepository({ repoPath: REPOS.validTs });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("ANALYSIS_ERROR");
  });

  it("normalizer handles empty functions array", async () => {
    mockSuccessfulAdapter({
      file_tree: fileTreeRoot(),
      functions: [],
      relationships: [],
      summary: {
        files: [fileRecord("src/side-effects.ts", "typescript", 9)],
        files_analyzed: 1,
        languages_found: ["typescript"],
        total_files: 1,
        unsupported_files: [],
      },
    });

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(value.components["src/side-effects.ts"]?.exportedSymbols).toEqual(
      [],
    );
  });

  it("normalizer deduplicates relationships between same file pair", async () => {
    mockSuccessfulAdapter({
      file_tree: fileTreeRoot(),
      functions: [
        {
          component_type: "function",
          depends_on: ["src/b.ts"],
          end_line: 4,
          file_path: "src/a.ts",
          id: "src/a.ts:alpha",
          name: "alpha",
          relative_path: "src/a.ts",
          start_line: 1,
        },
        {
          component_type: "function",
          depends_on: [],
          end_line: 4,
          file_path: "src/b.ts",
          id: "src/b.ts:beta",
          name: "beta",
          relative_path: "src/b.ts",
          start_line: 1,
        },
      ],
      relationships: [
        {
          callee: "src/b.ts:beta",
          caller: "src/a.ts:alpha",
          is_resolved: true,
        },
      ],
      summary: {
        files: [
          fileRecord("src/a.ts", "typescript", 4),
          fileRecord("src/b.ts", "typescript", 4),
        ],
        files_analyzed: 2,
        languages_found: ["typescript"],
        total_files: 2,
        unsupported_files: [],
      },
    });

    const value = expectAnalysis(
      await analyzeRepository({ repoPath: REPOS.validTs }),
    );

    expect(value.relationships).toEqual([
      {
        source: "src/a.ts",
        target: "src/b.ts",
        type: "import",
      },
    ]);
  });

  it("adapter invalid payload shape returns ANALYSIS_ERROR", async () => {
    vi.spyOn(pythonAdapter, "getPythonCommand").mockResolvedValue("python3");
    vi.spyOn(subprocessAdapter, "runSubprocess").mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: JSON.stringify({
        file_tree: fileTreeRoot(),
        functions: [{}],
        relationships: [],
        summary: {},
      }),
    });

    const result = await analyzeRepository({ repoPath: REPOS.validTs });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("ANALYSIS_ERROR");
  });

  it("adapter invalid JSON returns ANALYSIS_ERROR", async () => {
    vi.spyOn(pythonAdapter, "getPythonCommand").mockResolvedValue("python3");
    vi.spyOn(subprocessAdapter, "runSubprocess").mockResolvedValue({
      exitCode: 0,
      stderr: "",
      stdout: "{not-json",
    });

    const result = await analyzeRepository({ repoPath: REPOS.validTs });

    expect(result.ok).toBe(false);

    if (result.ok) {
      return;
    }

    expect(result.error.code).toBe("ANALYSIS_ERROR");
  });
});
