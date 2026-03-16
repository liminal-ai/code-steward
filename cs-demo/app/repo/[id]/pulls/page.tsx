"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MessageSquare,
  Play,
  Terminal,
  ThumbsUp,
  MessageCircle,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  paymentServicePRs,
  pr139Reviews,
  pr139Synthesis,
  formatRelativeDate,
  type PR,
} from "@/lib/mock-data";

function CSReviewBadge({ status }: { status: PR["csReviewStatus"] }) {
  if (status === "complete")
    return (
      <Badge className="bg-success/10 text-success border-success/20">
        <CheckCircle2 className="size-3 mr-1" />
        Reviewed
      </Badge>
    );
  if (status === "in-progress")
    return (
      <Badge className="bg-primary/10 text-primary border-primary/20">
        <Clock className="size-3 mr-1" />
        In Progress
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not Reviewed
    </Badge>
  );
}

function GHStatusBadge({ status }: { status: PR["ghReviewStatus"] }) {
  if (status === "approved")
    return (
      <Badge className="bg-success/10 text-success border-success/20">
        Approved
      </Badge>
    );
  if (status === "changes-requested")
    return (
      <Badge className="bg-warning/10 text-warning border-warning/20">
        Changes Requested
      </Badge>
    );
  return null;
}

// ─── PR List ───

function PRList({ onSelect }: { onSelect: (pr: PR) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Open Pull Requests</h2>
        <span className="text-sm text-muted-foreground">
          {paymentServicePRs.length} open
        </span>
      </div>

      {paymentServicePRs.map((pr) => (
        <button
          key={pr.number}
          onClick={() => onSelect(pr)}
          className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-primary/30 hover:bg-accent/30 transition-colors group"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="font-mono text-xs text-muted-foreground">
                  #{pr.number}
                </span>
                {pr.status === "draft" && (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground text-[10px]"
                  >
                    Draft
                  </Badge>
                )}
              </div>
              <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                {pr.title}
              </h3>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="font-mono">{pr.author}</span>
                <span>{formatRelativeDate(pr.createdAt)}</span>
                <span className="font-mono text-[11px]">
                  +{pr.additions} / -{pr.deletions}
                </span>
                <span>{pr.filesChanged} files</span>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <CSReviewBadge status={pr.csReviewStatus} />
                <GHStatusBadge status={pr.ghReviewStatus} />
              </div>
              {pr.newComments > 0 && (
                <div className="flex items-center gap-1 text-xs text-warning">
                  <MessageSquare className="size-3" />
                  {pr.newComments} new
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── PR Detail ───

function PRDetail({ pr, onBack }: { pr: PR; onBack: () => void }) {
  const [reviewTypes, setReviewTypes] = useState<Record<string, boolean>>({
    standard: true,
    security: true,
    performance: false,
    "test-coverage": false,
    architecture: false,
  });
  const [showResults, setShowResults] = useState(pr.csReviewStatus === "complete");
  const [showSynthesis, setShowSynthesis] = useState(pr.csReviewStatus === "complete");
  const [showTerminal, setShowTerminal] = useState(false);
  const [synthesisPrompt, setSynthesisPrompt] = useState(
    "Consolidate all review results into a single coherent report. Resolve contradictions, eliminate redundancy, prioritize findings by severity, and produce an executive summary with actionable items."
  );

  const selected = Object.entries(reviewTypes).filter(([, v]) => v).length;

  function handleRunReviews() {
    setShowResults(true);
    setTimeout(() => setShowSynthesis(true), 300);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-0.5 shrink-0">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm text-muted-foreground">
              #{pr.number}
            </span>
            <CSReviewBadge status={pr.csReviewStatus} />
            <GHStatusBadge status={pr.ghReviewStatus} />
          </div>
          <h2 className="text-xl font-bold">{pr.title}</h2>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span className="font-mono">{pr.author}</span>
            <span>
              <span className="font-mono">{pr.branch}</span>
              <span className="mx-1.5 text-muted-foreground/40">&rarr;</span>
              <span className="font-mono">{pr.baseBranch}</span>
            </span>
            <span>{formatRelativeDate(pr.createdAt)}</span>
            <span className="font-mono text-xs">
              +{pr.additions} / -{pr.deletions} &middot; {pr.filesChanged}{" "}
              files
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          <ExternalLink className="size-3.5" />
          View on GitHub
        </Button>
      </div>

      <Separator />

      {/* Step 1: Review Configuration */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-4">Configure Reviews</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(reviewTypes).map(([type, checked]) => (
            <label
              key={type}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer transition-colors",
                checked
                  ? "border-primary/30 bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(v) =>
                  setReviewTypes((s) => ({ ...s, [type]: !!v }))
                }
              />
              <span className="text-sm capitalize">
                {type.replace("-", " ")}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {selected} review type{selected !== 1 ? "s" : ""} selected
          </span>
          <Button
            onClick={handleRunReviews}
            disabled={selected === 0}
            className="gap-2"
          >
            <Play className="size-3.5" />
            Run Reviews
          </Button>
        </div>
      </div>

      {/* Step 2: Review Results */}
      {showResults && (
        <div className="space-y-3">
          <h3 className="font-semibold">Review Results</h3>
          {pr139Reviews.map((review) => (
            <Collapsible key={review.id} defaultOpen={review.type === "Security Review"}>
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-accent/30 transition-colors">
                  <div className="flex items-center gap-3">
                    {review.status === "complete" ? (
                      <CheckCircle2 className="size-4 text-success" />
                    ) : (
                      <div className="shimmer size-4 rounded-full" />
                    )}
                    <span className="font-medium text-sm">{review.type}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {review.model.split("-").slice(-2).join(" ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {review.annotations.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        {review.annotations.some(
                          (a) => a.severity === "critical"
                        ) && (
                          <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">
                            {
                              review.annotations.filter(
                                (a) => a.severity === "critical"
                              ).length
                            }{" "}
                            critical
                          </Badge>
                        )}
                        {review.annotations.some(
                          (a) => a.severity === "major"
                        ) && (
                          <Badge className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                            {
                              review.annotations.filter(
                                (a) => a.severity === "major"
                              ).length
                            }{" "}
                            major
                          </Badge>
                        )}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground font-mono">
                      ${review.costUsd.toFixed(2)}
                    </span>
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Separator />
                  <div className="p-5 prose prose-sm max-w-none text-sm leading-relaxed prose-light [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_table]:text-xs">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: simpleMarkdown(review.markdown),
                      }}
                    />
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Step 3: Synthesis */}
      {showSynthesis && (
        <div className="space-y-3">
          <h3 className="font-semibold">Synthesis</h3>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1.5 block">
                Synthesis Prompt (editable)
              </label>
              <Textarea
                value={synthesisPrompt}
                onChange={(e) => setSynthesisPrompt(e.target.value)}
                rows={3}
                className="text-sm font-mono resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Model: Opus 4.6 &middot; Est. cost: $0.18
              </span>
              <Button size="sm" variant="secondary">
                Regenerate Synthesis
              </Button>
            </div>
          </div>

          {/* Rendered synthesis */}
          <div className="rounded-md border border-border bg-card p-5">
            <div className="prose prose-sm max-w-none text-sm leading-relaxed prose-light [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_table]:text-xs [&_strong]:text-foreground">
              <div
                dangerouslySetInnerHTML={{
                  __html: simpleMarkdown(pr139Synthesis),
                }}
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" className="gap-1.5">
              <MessageCircle className="size-3.5" />
              Post Summary Comment
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5">
              <ThumbsUp className="size-3.5" />
              Approve PR
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 text-warning border-warning/30 hover:bg-warning/10">
              <AlertTriangle className="size-3.5" />
              Request Changes
            </Button>
            <div className="flex-1" />
            <Button
              size="sm"
              variant="secondary"
              className="gap-1.5"
              onClick={() => setShowTerminal(!showTerminal)}
            >
              <Terminal className="size-3.5" />
              {showTerminal ? "Close Terminal" : "Open Agent Session"}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Embedded Terminal */}
      {showTerminal && (
        <div className="rounded-md border border-border bg-[oklch(0.14_0.01_250)] overflow-hidden shadow-lg">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[oklch(0.18_0.01_250)]">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-red-400/70" />
                <div className="size-2.5 rounded-full bg-yellow-400/70" />
                <div className="size-2.5 rounded-full bg-green-400/70" />
              </div>
              <span className="text-xs text-white/50 font-mono ml-2">
                claude-code — payment-service
              </span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs text-white/50 hover:text-white/80 hover:bg-white/5"
              onClick={() => setShowTerminal(false)}
            >
              <XCircle className="size-3 mr-1" />
              Close
            </Button>
          </div>
          <div className="p-4 font-mono text-sm leading-relaxed h-[340px] overflow-y-auto text-white/80">
            <div className="text-white/40">
              <span className="text-green-400">$</span> claude --prompt
              &quot;Review context loaded...&quot;
            </div>
            <div className="mt-3">
              <span className="text-green-400 font-bold">Claude</span>{" "}
              <span className="text-white/30 text-xs">
                claude-opus-4-6
              </span>
            </div>
            <div className="mt-2 text-white/70 leading-relaxed">
              I have the full context of the PR #139 review. The critical finding
              is the PCI violation in card-validator.ts where partial card numbers
              are logged in plaintext. I also see the zero-amount edge case in
              the validation chain.
            </div>
            <div className="mt-3 text-white/70">
              What would you like me to do? I can:
            </div>
            <div className="mt-1.5 text-white/70">
              &bull; Post the synthesis as a PR comment with inline annotations
            </div>
            <div className="text-white/70">
              &bull; Draft specific inline comments for the critical findings
            </div>
            <div className="text-white/70">
              &bull; Re-review specific files with updated criteria
            </div>
            <div className="text-white/70">
              &bull; Investigate the zero-amount transaction handling further
            </div>
            <div className="mt-4 text-white/40 cursor-blink" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ───

export default function PullsPage() {
  const params = useParams();
  const repoId = params.id as string;
  const [selectedPR, setSelectedPR] = useState<PR | null>(
    repoId === "1" ? null : null
  );

  if (selectedPR) {
    return <PRDetail pr={selectedPR} onBack={() => setSelectedPR(null)} />;
  }

  return <PRList onSelect={setSelectedPR} />;
}

// ─── Simple markdown → HTML (demo only, no external deps) ───

function simpleMarkdown(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^\| (.+)$/gm, (match) => {
      const cells = match.split('|').filter(c => c.trim()).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) return '';
      const tag = cells.every(c => /^\*\*/.test(c)) ? 'th' : 'td';
      return '<tr>' + cells.map(c => `<${tag} class="border border-border px-3 py-1.5">${c}</${tag}>`).join('') + '</tr>';
    })
    .replace(/(<tr>.*<\/tr>\n?)+/gs, '<table class="w-full border-collapse">$&</table>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, '<ul class="list-disc pl-5 space-y-1">$&</ul>')
    .replace(/\n\n/g, '</p><p class="mt-3">')
    .replace(/^(?!<[huptl])/gm, '')
    .replace(/\n/g, '<br/>');
}
