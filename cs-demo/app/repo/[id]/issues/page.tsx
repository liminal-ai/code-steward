"use client";

import { CircleDot, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IssuesPage() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted mb-6">
        <CircleDot className="size-7 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold mb-2">Issues — Coming Soon</h2>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        Pull GitHub issues, discuss them with Claude, and draft new issues —
        all from your review workstation. This capability is planned for a
        future release.
      </p>
      <Button variant="outline" className="gap-2">
        <ExternalLink className="size-4" />
        View Issues on GitHub
      </Button>
    </div>
  );
}
