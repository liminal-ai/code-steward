"use client";

import { useState } from "react";
import { Shield, Terminal, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type CheckState = "pending" | "checking" | "pass" | "fail";

export default function BootPage() {
  const [ghInstalled, setGhInstalled] = useState<CheckState>("pending");
  const [ghAuth, setGhAuth] = useState<CheckState>("pending");

  function runChecks() {
    setGhInstalled("checking");
    setTimeout(() => {
      setGhInstalled("pass");
      setGhAuth("checking");
      setTimeout(() => {
        setGhAuth("fail"); // demo: show the failure state
      }, 800);
    }, 600);
  }

  function retryAuth() {
    setGhAuth("checking");
    setTimeout(() => {
      setGhAuth("pass");
    }, 800);
  }

  const allPassed = ghInstalled === "pass" && ghAuth === "pass";

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-8 px-6">
        {/* Logo */}
        <div className="flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Shield className="size-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Code Steward</h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            Verifying prerequisites
          </p>
        </div>

        {/* Checks */}
        <div className="space-y-3">
          {/* gh CLI */}
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
            <StatusIcon state={ghInstalled} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">GitHub CLI</p>
              <p className="text-xs text-muted-foreground">
                {ghInstalled === "fail"
                  ? "Not found on system"
                  : ghInstalled === "pass"
                  ? "gh version 2.67.0"
                  : "Checking gh --version"}
              </p>
            </div>
          </div>

          {/* gh auth */}
          <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
            <StatusIcon state={ghAuth} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">GitHub Authentication</p>
              <p className="text-xs text-muted-foreground">
                {ghAuth === "fail"
                  ? "Not authenticated"
                  : ghAuth === "pass"
                  ? "Authenticated as @leemoore"
                  : ghAuth === "checking"
                  ? "Checking gh auth status"
                  : "Waiting..."}
              </p>
            </div>
          </div>

          {/* Auth failure instructions */}
          {ghAuth === "fail" && (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-3">
              <p className="text-sm text-warning font-medium">
                Authentication Required
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Run the following command in your terminal to authenticate:
              </p>
              <code className="block rounded-lg bg-black/50 border border-border px-3 py-2 text-xs font-mono text-primary">
                gh auth login
              </code>
              <p className="text-xs text-muted-foreground">
                Then click retry below.
              </p>
              <Button size="sm" onClick={retryAuth} className="w-full">
                Retry Check
              </Button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3">
          {ghInstalled === "pending" && ghAuth === "pending" && (
            <Button onClick={runChecks} className="w-full gap-2">
              <Terminal className="size-4" />
              Run Checks
            </Button>
          )}

          {allPassed && (
            <Link href="/" className="w-full">
              <Button className="w-full gap-2">
                Continue to Dashboard
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ state }: { state: CheckState }) {
  if (state === "pass")
    return <CheckCircle2 className="size-5 text-success shrink-0" />;
  if (state === "fail")
    return <XCircle className="size-5 text-destructive shrink-0" />;
  if (state === "checking")
    return <div className="shimmer size-5 rounded-full shrink-0" />;
  return (
    <div className="size-5 rounded-full border-2 border-border shrink-0" />
  );
}
