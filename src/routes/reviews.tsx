import { MessageSquareText } from "lucide-react";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader, PriorityBadge } from "@/components/workspace/primitives";
import { useStore } from "@/lib/store";

export function ReviewsPage() {
  const { tasks, projects, loading, error, setOpenTaskId } = useStore();
  const pending = tasks.filter((task) => task.status === "review");
  return (
    <AppShell>
      <PageHeader
        title="Reviews & Feedback"
        subtitle="Tasks currently marked as ready for review."
      />
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : loading ? (
        <div role="status" className="surface p-10 text-center text-sm text-muted-foreground">
          Loading review queue…
        </div>
      ) : pending.length === 0 ? (
        <div className="surface p-12 text-center">
          <MessageSquareText className="mx-auto size-9 text-muted-foreground/50" />
          <h2 className="mt-3 font-semibold">No tasks awaiting review</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Tasks moved to “In review” will appear here.
          </p>
        </div>
      ) : (
        <div className="surface divide-y divide-border/60">
          {pending.map((task) => (
            <button
              key={task.id}
              onClick={() => setOpenTaskId(task.id)}
              className="flex w-full flex-col gap-3 p-4 text-left hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{task.title}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {projects.find((project) => project.id === task.projectId)?.name ?? "No project"}{" "}
                  · {task.comments.length} comments
                </span>
              </span>
              <PriorityBadge p={task.priority} />
            </button>
          ))}
        </div>
      )}
    </AppShell>
  );
}
