"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { cn } from "@/lib/utils";
import { getRepoById } from "@/lib/mock-data";
import {
  GitPullRequest,
  Code,
  FileText,
  CircleDot,
  BarChart3,
} from "lucide-react";

const tabs = [
  { label: "Pull Requests", href: "pulls", icon: GitPullRequest, badge: null as number | null },
  { label: "Code Review", href: "review", icon: Code, badge: null },
  { label: "Documentation", href: "docs", icon: FileText, badge: null },
  { label: "Issues", href: "issues", icon: CircleDot, badge: null },
  { label: "Insights", href: "insights", icon: BarChart3, badge: null },
];

export default function RepoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const repoId = params.id as string;
  const repo = getRepoById(repoId);
  const prCount = repo?.openPRCount ?? 0;

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      {/* Tab bar */}
      {/* Red stripe under header */}
      <div className="header-stripe" />
      <div className="border-b border-border bg-card sticky top-14 z-40">
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex gap-0.5 -mb-px overflow-x-auto">
            {tabs.map((tab) => {
              const href = `/repo/${repoId}/${tab.href}`;
              const isActive = pathname.startsWith(href);
              const Icon = tab.icon;
              const badge = tab.href === "pulls" ? prCount : tab.badge;

              return (
                <Link
                  key={tab.href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                    isActive
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                  )}
                >
                  <Icon className="size-4" />
                  {tab.label}
                  {badge !== null && badge > 0 && (
                    <span
                      className={cn(
                        "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none",
                        isActive
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-6 py-6">
        {children}
      </main>
    </div>
  );
}
