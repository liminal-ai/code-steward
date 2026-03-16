"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/app-header";
import { RepoCard } from "@/components/repo-card";
import { AddRepoDialog } from "@/components/add-repo-dialog";
import { repos } from "@/lib/mock-data";
import { useState } from "react";

export default function Dashboard() {
  const [showAddRepo, setShowAddRepo] = useState(false);

  return (
    <div className="min-h-screen">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Repositories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {repos.length} repos managed &middot; Last refreshed just now
            </p>
          </div>
          <Button
            onClick={() => setShowAddRepo(true)}
            className="gap-2"
          >
            <Plus className="size-4" />
            Add Repo
          </Button>
        </div>

        {/* Repo grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo, i) => (
            <RepoCard key={repo.id} repo={repo} index={i} />
          ))}
        </div>
      </main>

      <AddRepoDialog open={showAddRepo} onOpenChange={setShowAddRepo} />
    </div>
  );
}
