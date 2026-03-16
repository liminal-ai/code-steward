"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, Settings, RefreshCw } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThemeSwitcher } from "@/components/theme-switcher";

export function AppHeader() {
  const pathname = usePathname();
  const isDashboard = pathname === "/";

  return (
    <>
      <div className="header-stripe" />

      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex size-8 items-center justify-center">
              <Shield className="size-5 text-primary" strokeWidth={2.5} />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground uppercase">
              Code Steward
            </span>
          </Link>

          {!isDashboard && (
            <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-primary transition-colors underline underline-offset-2">
                Dashboard
              </Link>
              <span className="text-muted-foreground/40">&#8250;</span>
              <span className="text-foreground font-medium">
                {decodeRepoFromPath(pathname)}
              </span>
            </nav>
          )}

          <div className="flex items-center gap-1">
            {isDashboard && (
              <Tooltip>
                <TooltipTrigger
                  className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  <RefreshCw className="size-4" />
                </TooltipTrigger>
                <TooltipContent>Refresh all repos</TooltipContent>
              </Tooltip>
            )}
            <ThemeSwitcher />
            <Tooltip>
              <TooltipTrigger
                className="inline-flex items-center justify-center size-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                onClick={() => { window.location.href = "/settings"; }}
              >
                <Settings className="size-4" />
              </TooltipTrigger>
              <TooltipContent>Settings</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>
    </>
  );
}

function decodeRepoFromPath(pathname: string): string {
  const match = pathname.match(/\/repo\/(\d+)/);
  if (!match) return "";

  const repoNames: Record<string, string> = {
    "1": "acme/payment-service",
    "2": "acme/auth-gateway",
    "3": "acme/web-dashboard",
    "4": "acme/data-pipeline",
    "5": "acme/mobile-api",
    "6": "acme/notification-hub",
  };
  return repoNames[match[1]] ?? "Unknown repo";
}
