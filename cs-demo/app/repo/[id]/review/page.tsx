"use client";

import { useState } from "react";
import {
  Shield,
  Wrench,
  FileText,
  Code,
  Zap,
  AlertTriangle,
  Play,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { scanTypes } from "@/lib/mock-data";

const iconMap: Record<string, React.ElementType> = {
  Shield,
  Wrench,
  FileText,
  Code,
  Zap,
};

export default function ReviewPage() {
  const [selectedScan, setSelectedScan] = useState<string | null>(null);
  const [scanState, setScanState] = useState<"idle" | "running" | "complete">(
    "idle"
  );
  const [progress, setProgress] = useState(0);

  function handleRunScan() {
    setScanState("running");
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setScanState("complete");
          return 100;
        }
        return p + Math.random() * 15;
      });
    }, 400);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Codebase Scans</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Run focused analysis passes against the full codebase. One scan at a
          time.
        </p>
      </div>

      <Alert className="border-warning/30 bg-warning/5">
        <AlertTriangle className="size-4 text-warning" />
        <AlertDescription className="text-sm text-warning">
          Full codebase scans are token-intensive. Costs vary by repo size —
          typically $0.50 – $2.00 per scan.
        </AlertDescription>
      </Alert>

      {/* Scan type grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {scanTypes.map((scan) => {
          const Icon = iconMap[scan.icon] ?? Code;
          const isSelected = selectedScan === scan.id;

          return (
            <button
              key={scan.id}
              onClick={() =>
                scanState === "idle" && setSelectedScan(isSelected ? null : scan.id)
              }
              disabled={scanState !== "idle"}
              className={cn(
                "text-left rounded-xl border p-4 transition-all",
                isSelected
                  ? "border-primary/40 bg-primary/5 shadow-sm ring-1 ring-primary/20"
                  : "border-border bg-card hover:border-muted-foreground/30",
                scanState !== "idle" &&
                  !isSelected &&
                  "opacity-40 cursor-not-allowed"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg shrink-0",
                    isSelected
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">{scan.scanType}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    {scan.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Run button */}
      {selectedScan && scanState === "idle" && (
        <div className="flex justify-end">
          <Button onClick={handleRunScan} className="gap-2">
            <Play className="size-3.5" />
            Run Scan
          </Button>
        </div>
      )}

      {/* Progress */}
      {scanState === "running" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="shimmer size-4 rounded-full" />
              <span className="text-sm font-medium">
                Running{" "}
                {scanTypes.find((s) => s.id === selectedScan)?.scanType}...
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {Math.min(100, Math.round(progress))}%
            </span>
          </div>
          <Progress value={Math.min(100, progress)} className="h-1.5" />
          <p className="text-xs text-muted-foreground">
            Analyzing repository files and generating report...
          </p>
        </div>
      )}

      {/* Complete */}
      {scanState === "complete" && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-success" />
              <span className="text-sm font-medium">
                {scanTypes.find((s) => s.id === selectedScan)?.scanType}{" "}
                Complete
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              Cost: $1.24
            </span>
          </div>

          <div className="prose prose-sm prose-light max-w-none text-sm leading-relaxed text-foreground/90">
            <h3>Security Scan Results</h3>
            <p>
              Analyzed 142 files across 12 directories. Found{" "}
              <strong>2 critical</strong>, <strong>5 major</strong>, and{" "}
              <strong>11 minor</strong> findings.
            </p>
            <h3>Critical Findings</h3>
            <p>
              <code>src/middleware/validators/card-validator.ts:34</code> — PAN
              logging violation. Partial card numbers logged in plaintext error
              paths. PCI DSS 3.4 non-compliant.
            </p>
            <p>
              <code>src/config/database.ts:12</code> — Database connection
              string contains credentials in source code. Should use environment
              variables.
            </p>
            <h3>Recommendation</h3>
            <p>
              Address both critical findings immediately. The PAN logging issue
              should block any production deployment. Schedule major findings
              for next sprint.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary">
              Save Report
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setScanState("idle");
                setSelectedScan(null);
              }}
            >
              New Scan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
