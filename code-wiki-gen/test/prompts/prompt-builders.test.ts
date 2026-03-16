import { buildClusteringPrompt } from "../../src/prompts/clustering.js";
import { buildModuleDocPrompt } from "../../src/prompts/module-doc.js";
import { buildOverviewPrompt } from "../../src/prompts/overview.js";
import { buildQualityReviewPrompt } from "../../src/prompts/quality-review.js";
import type {
  AnalyzedRelationship,
  RepositoryAnalysis,
} from "../../src/types/analysis.js";
import type { GeneratedModuleSet } from "../../src/types/generation.js";
import type { ModulePlan, PlannedModule } from "../../src/types/planning.js";
import type { ValidationResult } from "../../src/types/validation.js";

const buildAnalysis = (
  componentPaths: string[],
  relationships: AnalyzedRelationship[],
): RepositoryAnalysis => ({
  commitHash: "abcdefabcdefabcdefabcdefabcdefabcdefabcd",
  components: Object.fromEntries(
    componentPaths.map((filePath, index) => [
      filePath,
      {
        exportedSymbols: [
          {
            kind: index % 2 === 0 ? "function" : "type",
            lineNumber: index + 2,
            name: `export${index + 1}`,
          },
        ],
        filePath,
        language: "typescript",
        linesOfCode: (index + 1) * 12,
      },
    ]),
  ),
  focusDirs: ["src/config", "src/analysis"],
  relationships,
  repoPath: "/tmp/documentation-engine",
  summary: {
    languagesFound: ["typescript"],
    languagesSkipped: [],
    totalComponents: componentPaths.length,
    totalFilesAnalyzed: componentPaths.length,
    totalRelationships: relationships.length,
  },
});

describe("prompt builders", () => {
  it("clustering prompt includes component list", () => {
    const analysis = buildAnalysis(
      ["src/index.ts", "src/config/resolver.ts", "src/analysis/analyze.ts"],
      [
        {
          source: "src/index.ts",
          target: "src/config/resolver.ts",
          type: "import",
        },
      ],
    );

    const value = buildClusteringPrompt(analysis);

    expect(value.userMessage).toContain("src/index.ts");
    expect(value.userMessage).toContain("src/config/resolver.ts");
    expect(value.userMessage).toContain("src/analysis/analyze.ts");
    expect(value.userMessage).toContain("export1");
    expect(value.userMessage).toContain("12 LOC");
  });

  it("clustering prompt includes relationship graph", () => {
    const analysis = buildAnalysis(
      ["src/index.ts", "src/config/resolver.ts", "src/analysis/analyze.ts"],
      [
        {
          source: "src/index.ts",
          target: "src/config/resolver.ts",
          type: "import",
        },
        {
          source: "src/analysis/analyze.ts",
          target: "src/config/resolver.ts",
          type: "usage",
        },
      ],
    );

    const value = buildClusteringPrompt(analysis);

    expect(value.userMessage).toContain(
      "src/index.ts -> src/config/resolver.ts (import)",
    );
    expect(value.userMessage).toContain(
      "src/analysis/analyze.ts -> src/config/resolver.ts (usage)",
    );
    expect(value.userMessage).toContain(
      "Focus directories: src/analysis, src/config",
    );
  });

  it("module-doc prompt includes cross-module context", () => {
    const module: PlannedModule = {
      components: ["src/index.ts"],
      description: "Core runtime",
      name: "core",
    };
    const modulePlan: ModulePlan = {
      modules: [module],
      unmappedComponents: [],
    };
    const analysis = buildAnalysis(["src/index.ts"], []);

    expect(() => buildModuleDocPrompt(module, modulePlan, analysis)).toThrow(
      "not implemented",
    );
  });

  it("overview prompt includes module summaries", () => {
    const modulePlan: ModulePlan = {
      modules: [
        {
          components: ["src/index.ts"],
          description: "Core runtime",
          name: "core",
        },
      ],
      unmappedComponents: [],
    };
    const generatedModules: GeneratedModuleSet = new Map();
    const analysis = buildAnalysis(["src/index.ts"], []);

    expect(() =>
      buildOverviewPrompt(modulePlan, generatedModules, analysis),
    ).toThrow("not implemented");
  });

  it("quality-review prompt includes fix scope constraints", () => {
    const validationResult: ValidationResult = {
      errorCount: 1,
      findings: [
        {
          category: "broken-link",
          filePath: "docs/overview.md",
          message: "Broken link",
          severity: "error",
        },
      ],
      status: "fail",
      warningCount: 0,
    };

    expect(() =>
      buildQualityReviewPrompt(
        validationResult,
        {},
        {
          secondModelReview: false,
          selfReview: true,
        },
      ),
    ).toThrow("not implemented");
  });

  it("quality-review prompt includes validation findings", () => {
    const validationResult: ValidationResult = {
      errorCount: 0,
      findings: [
        {
          category: "mermaid",
          filePath: "docs/overview.md",
          message: "Malformed Mermaid block",
          severity: "warning",
        },
      ],
      status: "warn",
      warningCount: 1,
    };

    expect(() =>
      buildQualityReviewPrompt(
        validationResult,
        { "docs/overview.md": "# Overview" },
        {
          secondModelReview: true,
          selfReview: true,
        },
      ),
    ).toThrow("not implemented");
  });
});
