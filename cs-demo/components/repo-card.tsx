"use client";

import Link from "next/link";
import { GitBranch, Clock, ArrowDownToLine, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type Repo, formatRelativeDate } from "@/lib/mock-data";

export function RepoCard({ repo, index }: { repo: Repo; index: number }) {
  const hasUpdates = repo.syncStatus === "behind";

  return (
    <Link href={`/repo/${repo.id}/pulls`}>
      <div
        className="card-hover accent-left group overflow-hidden rounded-md border border-border bg-card p-5 animate-card-in cursor-pointer"
        style={{ animationDelay: `${index * 60}ms` }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {repo.name}
            </h3>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {repo.org}
            </p>
          </div>

          {/* PR Count Badge */}
          {repo.openPRCount === null ? (
            <div className="shimmer h-6 w-10 rounded-full" />
          ) : repo.openPRCount > 0 ? (
            <Tooltip>
              <TooltipTrigger>
                <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 tabular-nums font-mono font-semibold">
                  {repo.openPRCount} PR{repo.openPRCount !== 1 ? "s" : ""}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {repo.openPRCount} open pull request
                {repo.openPRCount !== 1 ? "s" : ""}
              </TooltipContent>
            </Tooltip>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              0 PRs
            </Badge>
          )}
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3" />
            <span>{formatRelativeDate(repo.lastReviewDate)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitBranch className="size-3" />
            <span className="font-mono">{repo.defaultBranch}</span>
          </div>
        </div>

        {/* Sync status */}
        <div className="mt-3 pt-3 border-t border-border/60">
          {repo.syncStatus === "loading" ? (
            <div className="shimmer h-4 w-28 rounded" />
          ) : repo.syncStatus === "error" ? (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <AlertCircle className="size-3" />
              <span>Refresh failed</span>
            </div>
          ) : hasUpdates ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-warning-foreground">
                <ArrowDownToLine className="size-3 text-warning" />
                <span>Updates available</span>
              </div>
              <button
                className="text-xs text-primary hover:text-primary/80 font-medium underline underline-offset-2 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                Pull
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-success">
              <div className="size-1.5 rounded-full bg-success" />
              <span>Up to date</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
