"use client";

import { useState } from "react";
import {
  BarChart3,
  Clock,
  DollarSign,
  FileSearch,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  reviewHistory,
  paymentServiceNotes,
  paymentServiceTasks,
  type RepoTask,
} from "@/lib/mock-data";

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      {sub && (
        <div className="text-xs text-muted-foreground mt-1">{sub}</div>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const [tasks, setTasks] = useState<RepoTask[]>(paymentServiceTasks);
  const [newTask, setNewTask] = useState("");

  function toggleTask(id: string) {
    setTasks((t) =>
      t.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  function addTask() {
    if (!newTask.trim()) return;
    setTasks((t) => [
      {
        id: `task-${Date.now()}`,
        text: newTask,
        completed: false,
        createdAt: new Date().toISOString(),
      },
      ...t,
    ]);
    setNewTask("");
  }

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={FileSearch}
          label="Total Reviews"
          value="5"
          sub="3 PR reviews, 2 scans"
        />
        <StatCard
          icon={DollarSign}
          label="Total Cost"
          value="$3.00"
          sub="This repo lifetime"
        />
        <StatCard
          icon={Clock}
          label="Review Frequency"
          value="3.2/wk"
          sub="Last 30 days"
        />
        <StatCard
          icon={BarChart3}
          label="Documentation"
          value="Stale"
          sub="14 commits behind"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Review History */}
        <div>
          <h3 className="font-semibold mb-4">Review History</h3>
          <div className="space-y-2">
            {reviewHistory.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg shrink-0",
                      entry.type === "PR Review"
                        ? "bg-primary/10 text-primary"
                        : "bg-warning/10 text-warning"
                    )}
                  >
                    {entry.type === "PR Review" ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <FileSearch className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.target}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {entry.date}
                      </span>
                      <div className="flex gap-1">
                        {entry.reviewTypes.map((rt) => (
                          <Badge
                            key={rt}
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {rt}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground font-mono shrink-0 ml-2">
                  ${entry.cost.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes & Tasks */}
        <div className="space-y-6">
          {/* Tasks */}
          <div>
            <h3 className="font-semibold mb-4">Tasks</h3>
            <div className="space-y-1.5 mb-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 group rounded-lg px-3 py-2 hover:bg-accent/30 transition-colors"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <span
                    className={cn(
                      "text-sm flex-1",
                      task.completed &&
                        "line-through text-muted-foreground/50"
                    )}
                  >
                    {task.text}
                  </span>
                  <button className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a task..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                className="text-sm"
              />
              <Button
                size="icon"
                variant="secondary"
                onClick={addTask}
                disabled={!newTask.trim()}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Notes */}
          <div>
            <h3 className="font-semibold mb-4">Notes</h3>
            <div className="space-y-3">
              {paymentServiceNotes.map((note) => (
                <div
                  key={note.id}
                  className="rounded-lg border border-border bg-card p-4"
                >
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {note.content}
                  </p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <span>
                      Updated{" "}
                      {new Date(note.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
