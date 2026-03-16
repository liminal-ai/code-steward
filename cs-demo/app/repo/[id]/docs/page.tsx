"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  FileText,
  AlertTriangle,
  Play,
  RefreshCw,
  Upload,
  ChevronRight,
  CheckCircle2,
  BookOpen,
  GitCommit,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { getRepoById } from "@/lib/mock-data";

const wikiPages = [
  {
    id: "overview",
    title: "Architecture Overview",
    active: true,
    children: [],
  },
  {
    id: "payments",
    title: "Payment Processing",
    active: false,
    children: [
      { id: "stripe", title: "Stripe Integration" },
      { id: "validation", title: "Validation Pipeline" },
      { id: "webhooks", title: "Webhook Handlers" },
    ],
  },
  {
    id: "auth",
    title: "Authentication",
    active: false,
    children: [
      { id: "jwt", title: "JWT Management" },
      { id: "rbac", title: "Role-Based Access" },
    ],
  },
  {
    id: "data",
    title: "Data Layer",
    active: false,
    children: [
      { id: "models", title: "Database Models" },
      { id: "migrations", title: "Migration System" },
    ],
  },
  {
    id: "api",
    title: "API Reference",
    active: false,
    children: [
      { id: "endpoints", title: "REST Endpoints" },
      { id: "middleware", title: "Middleware Stack" },
    ],
  },
];

export default function DocsPage() {
  const params = useParams();
  const repoId = params.id as string;
  const repo = getRepoById(repoId);
  const hasDocs = repo?.lastDocGeneratedAt !== null;
  const [activePage, setActivePage] = useState("overview");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Show empty state for repos without docs
  if (!hasDocs && !generating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-6">
          <BookOpen className="size-7 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">
          No Documentation Generated
        </h2>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Generate a comprehensive documentation wiki for this repository using
          AST-aware structural analysis and Claude. Includes architecture
          diagrams, module documentation, and API references.
        </p>
        <Alert className="border-warning/30 bg-warning/5 max-w-md mb-6">
          <AlertTriangle className="size-4 text-warning" />
          <AlertDescription className="text-sm text-warning">
            Documentation generation for large repos is token-intensive.
            Estimated cost: $2 – $8 depending on repo size.
          </AlertDescription>
        </Alert>
        <Button
          onClick={() => {
            setGenerating(true);
            let p = 0;
            const interval = setInterval(() => {
              p += Math.random() * 8;
              setProgress(Math.min(100, p));
              if (p >= 100) clearInterval(interval);
            }, 500);
          }}
          className="gap-2"
        >
          <Play className="size-4" />
          Generate Documentation
        </Button>
      </div>
    );
  }

  // Generating state
  if (generating && progress < 100) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-full max-w-md space-y-6">
          <h2 className="text-lg font-semibold text-center">
            Generating Documentation
          </h2>
          <Progress value={progress} className="h-2" />
          <div className="space-y-2 text-sm text-center">
            {progress < 25 && (
              <p className="text-muted-foreground">
                Analyzing repository structure with Tree-sitter...
              </p>
            )}
            {progress >= 25 && progress < 50 && (
              <p className="text-muted-foreground">
                Clustering components into logical modules...
              </p>
            )}
            {progress >= 50 && progress < 80 && (
              <p className="text-muted-foreground">
                Generating module documentation...
              </p>
            )}
            {progress >= 80 && (
              <p className="text-muted-foreground">
                Assembling wiki structure and diagrams...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Staleness check
  const isStale = repo?.lastDocCommitHash === "a1b2c3d"; // demo: this repo is stale

  return (
    <div className="flex gap-6 h-[calc(100vh-10rem)]">
      {/* Sidebar nav */}
      <ScrollArea className="w-56 shrink-0">
        <nav className="space-y-0.5 pr-2">
          {wikiPages.map((page) => (
            <div key={page.id}>
              <button
                onClick={() => setActivePage(page.id)}
                className={cn(
                  "flex items-center gap-2 w-full text-left rounded-lg px-3 py-2 text-sm transition-colors",
                  activePage === page.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
                )}
              >
                <FileText className="size-3.5 shrink-0" />
                {page.title}
              </button>
              {page.children.length > 0 && (
                <div className="ml-5 mt-0.5 space-y-0.5">
                  {page.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => setActivePage(child.id)}
                      className={cn(
                        "flex items-center gap-1.5 w-full text-left rounded px-2.5 py-1.5 text-xs transition-colors",
                        activePage === child.id
                          ? "text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <ChevronRight className="size-3 shrink-0" />
                      {child.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Staleness indicator */}
        {isStale && (
          <div className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 px-4 py-2.5 mb-4">
            <div className="flex items-center gap-2 text-sm text-warning">
              <GitCommit className="size-4" />
              <span>
                Generated at commit{" "}
                <code className="font-mono text-xs">a1b2c3d</code> — current
                HEAD is <code className="font-mono text-xs">f8e9d0a</code>{" "}
                <span className="text-warning/70">(14 commits behind)</span>
              </span>
            </div>
            <Button size="sm" variant="outline" className="gap-1.5 text-warning border-warning/30 hover:bg-warning/10">
              <RefreshCw className="size-3" />
              Update
            </Button>
          </div>
        )}

        {/* Doc content */}
        <ScrollArea className="h-full">
          <div className="prose prose-sm prose-light max-w-none text-foreground/90 leading-relaxed pb-8">
            <h1>Architecture Overview</h1>
            <p>
              The payment-service is a Node.js/Express application that handles
              all payment processing for the Acme platform. It integrates with
              Stripe for payment processing and uses PostgreSQL for persistence.
            </p>

            <h2>System Architecture</h2>

            {/* Mermaid diagram placeholder */}
            <div className="rounded-lg border border-border bg-muted/30 p-6 my-4">
              <div className="text-center text-xs text-muted-foreground mb-4 font-mono">
                Architecture Diagram (Mermaid)
              </div>
              <div className="flex items-center justify-center gap-4">
                <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-2 text-xs font-mono text-primary">
                  API Gateway
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
                <div className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-mono">
                  Payment Service
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
                <div className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-mono">
                  Stripe API
                </div>
              </div>
              <div className="flex justify-center mt-3">
                <div className="text-muted-foreground/40 text-xs">|</div>
              </div>
              <div className="flex justify-center">
                <div className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-mono">
                  PostgreSQL
                </div>
              </div>
            </div>

            <h2>Key Modules</h2>
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Files</th>
                  <th>Purpose</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <code>src/payments/</code>
                  </td>
                  <td>12</td>
                  <td>Core payment processing, charge creation, refunds</td>
                </tr>
                <tr>
                  <td>
                    <code>src/webhooks/</code>
                  </td>
                  <td>6</td>
                  <td>Stripe webhook handlers and event processing</td>
                </tr>
                <tr>
                  <td>
                    <code>src/middleware/</code>
                  </td>
                  <td>8</td>
                  <td>Validation, auth, rate limiting, error handling</td>
                </tr>
                <tr>
                  <td>
                    <code>src/models/</code>
                  </td>
                  <td>5</td>
                  <td>Sequelize models and migration definitions</td>
                </tr>
              </tbody>
            </table>

            <h2>Dependencies</h2>
            <p>
              This service depends on <code>auth-gateway</code> for JWT
              validation and <code>notification-hub</code> for sending payment
              confirmation emails. It exposes a REST API consumed by{" "}
              <code>web-dashboard</code> and <code>mobile-api</code>.
            </p>
          </div>
        </ScrollArea>

        {/* Publish actions */}
        <div className="flex items-center gap-2 pt-4 border-t border-border">
          <Button size="sm" variant="secondary" className="gap-1.5">
            <Upload className="size-3" />
            Publish as PR
          </Button>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            <CheckCircle2 className="size-3 mr-1" />
            Generated Mar 1, 2026
          </Badge>
        </div>
      </div>
    </div>
  );
}
