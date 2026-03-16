"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AddRepoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [repoUrl, setRepoUrl] = useState("");
  const [isCloning, setIsCloning] = useState(false);

  function handleAdd() {
    setIsCloning(true);
    // Demo: simulate clone
    setTimeout(() => {
      setIsCloning(false);
      setRepoUrl("");
      onOpenChange(false);
    }, 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Repository</DialogTitle>
          <DialogDescription>
            Enter a GitHub repo URL or org/repo shorthand. Code Steward will
            clone it into its managed directory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="repo-url">Repository</Label>
            <Input
              id="repo-url"
              placeholder="acme/payment-service or https://github.com/..."
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          {isCloning && (
            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="shimmer size-4 rounded-full" />
              <span className="text-sm text-muted-foreground">
                Cloning repository...
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCloning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!repoUrl.trim() || isCloning}
          >
            {isCloning ? "Cloning..." : "Clone & Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
