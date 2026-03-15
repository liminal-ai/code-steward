export interface AnalysisOptions {
  repoPath: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  focusDirs?: string[];
}

export interface RepositoryAnalysis {
  repoPath: string;
  commitHash: string;
  summary: AnalysisSummary;
  components: Record<string, AnalyzedComponent>;
  relationships: AnalyzedRelationship[];
  focusDirs: string[];
}

export interface AnalysisSummary {
  totalFilesAnalyzed: number;
  totalComponents: number;
  totalRelationships: number;
  languagesFound: string[];
  languagesSkipped: string[];
}

export interface AnalyzedComponent {
  filePath: string;
  language: string;
  exportedSymbols: ExportedSymbol[];
  linesOfCode: number;
}

export interface ExportedSymbol {
  name: string;
  kind:
    | "function"
    | "class"
    | "interface"
    | "type"
    | "variable"
    | "enum"
    | "constant"
    | "other";
  lineNumber: number;
}

export interface AnalyzedRelationship {
  source: string;
  target: string;
  type: "import" | "inheritance" | "implementation" | "composition" | "usage";
}

export interface RawAnalysisOutput {
  functions: RawNode[];
  relationships: RawCallRelationship[];
  file_tree: Record<string, unknown>;
  summary: Record<string, unknown>;
}

export interface RawNode {
  id: string;
  name: string;
  component_type: string;
  file_path: string;
  relative_path: string;
  start_line: number;
  end_line: number;
  depends_on: string[];
  parameters?: string[];
  class_name?: string;
}

export interface RawCallRelationship {
  caller: string;
  callee: string;
  call_line?: number;
  is_resolved: boolean;
}
