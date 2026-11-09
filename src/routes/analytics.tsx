import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";
import { useStore } from "@/lib/store";

export function AnalyticsPage() {
  const { tasks, projects, members, loading, error } = useStore();
  const done = tasks.filter((task) => task.status === "done").length;
  const overdue = tasks.filter(
    (task) =>
      task.status !== "done" && task.due && task.due < new Date().toISOString().slice(0, 10),
  ).length;
  return (
    <AppShell>
      <PageHeader title="Analytics" subtitle="Live delivery metrics for the active workspace." />
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : loading ? (
        <div role="status" className="surface p-10 text-center text-sm text-muted-foreground">
          Loading workspace analytics…
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total tasks", value: tasks.length },
              { label: "Completed", value: done },
              {
                label: "Completion",
                value: `${tasks.length ? Math.round((done / tasks.length) * 100) : 0}%`,
              },
              { label: "Overdue", value: overdue },
            ].map((metric) => (
              <article key={metric.label} className="surface p-5">
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="mt-3 font-display text-3xl">{metric.value}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className="surface p-5">
              <h2 className="font-semibold">Project progress</h2>
              <div className="mt-4 space-y-5">
                {projects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No projects to report.</p>
                ) : (
                  projects.map((project) => {
                    const items = tasks.filter((task) => task.projectId === project.id);
                    const finished = items.filter((task) => task.status === "done").length;
                    const rate = items.length ? Math.round((finished / items.length) * 100) : 0;
                    return (
                      <div key={project.id}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{project.name}</span>
                          <span className="text-muted-foreground">
                            {finished}/{items.length} · {rate}%
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-primary" style={{ width: `${rate}%` }} />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
            <section className="surface p-5">
              <h2 className="font-semibold">Open tasks by teammate</h2>
              <div className="mt-4 space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No workspace members to report.</p>
                ) : (
                  members.map((member) => {
                    const count = tasks.filter(
                      (task) => task.status !== "done" && task.assignees.includes(member.id),
                    ).length;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                      >
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs capitalize text-muted-foreground">{member.role}</p>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
                          {count}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
