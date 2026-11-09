import { CalendarDays } from "lucide-react";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader, StatusBadge } from "@/components/workspace/primitives";
import { useStore } from "@/lib/store";

export function PlannerPage() {
  const { tasks, projects, loading, error, setOpenTaskId } = useStore();
  const scheduled = tasks
    .filter((task) => task.due)
    .sort((left, right) => left.due.localeCompare(right.due));
  return (
    <AppShell>
      <PageHeader title="Planner" subtitle="Plan from task due dates in your active workspace." />
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : loading ? (
        <div role="status" className="surface p-10 text-center text-sm text-muted-foreground">
          Loading your plan…
        </div>
      ) : scheduled.length === 0 ? (
        <div className="surface p-12 text-center">
          <CalendarDays className="mx-auto size-9 text-muted-foreground/50" />
          <h2 className="mt-3 font-semibold">Nothing scheduled yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add due dates to tasks to see them here.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {scheduled.map((task) => (
            <li key={task.id}>
              <button
                onClick={() => setOpenTaskId(task.id)}
                className="surface flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-muted/30"
              >
                <span className="w-24 shrink-0 text-xs font-semibold text-muted-foreground">
                  {new Date(`${task.due}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{task.title}</span>
                  <span className="mt-1 block truncate text-xs text-muted-foreground">
                    {projects.find((project) => project.id === task.projectId)?.name ??
                      "No project"}
                  </span>
                </span>
                <StatusBadge s={task.status} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </AppShell>
  );
}
