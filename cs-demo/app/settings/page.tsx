"use client";

import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [docPath, setDocPath] = useState("docs/wiki");
  const [synthesisPrompt, setSynthesisPrompt] = useState(
    "Consolidate all review results into a single coherent report. Resolve contradictions, eliminate redundancy, prioritize findings by severity, and produce an executive summary with actionable items."
  );

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-6 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure Code Steward defaults
          </p>
        </div>

        <Separator />

        {/* General */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            General
          </h2>

          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <Label className="text-sm font-medium">
                Auto-refresh on load
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Automatically pull latest status for all repos when the
                dashboard loads
              </p>
            </div>
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Label htmlFor="doc-path" className="text-sm font-medium">
              Default documentation output path
            </Label>
            <Input
              id="doc-path"
              value={docPath}
              onChange={(e) => setDocPath(e.target.value)}
              className="font-mono text-sm"
              placeholder="docs/wiki"
            />
            <p className="text-xs text-muted-foreground">
              Relative to repository root. Used when generating documentation.
            </p>
          </div>
        </section>

        <Separator />

        {/* Review */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Code Review
          </h2>

          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Label htmlFor="synthesis-prompt" className="text-sm font-medium">
              Default synthesis prompt
            </Label>
            <Textarea
              id="synthesis-prompt"
              value={synthesisPrompt}
              onChange={(e) => setSynthesisPrompt(e.target.value)}
              rows={4}
              className="text-sm resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Used when consolidating multiple review results into a single
              report.
            </p>
          </div>
        </section>

        <Separator />

        <div className="flex justify-end">
          <Button>Save Settings</Button>
        </div>
      </main>
    </div>
  );
}
