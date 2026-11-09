import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Circle, FolderKanban, ListTodo, Plus } from "lucide-react";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader, PriorityBadge, StatusBadge } from "@/components/workspace/primitives";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useAuth } from "@/modules/auth/auth-context";

export function OverviewPage() {
  const { tasks, projects, loading, error, setOpenTaskId, setCreating, members } = useStore();
  const { user } = useAuth();
  const mine = tasks.filter((task) => task.assignees.includes(user?.id ?? ""));
  const openTasks = tasks.filter((task) => task.status !== "done");
  const dueSoon = openTasks.filter(
    (task) =>
      task.due && task.due <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
  );
  const completed = tasks.filter((task) => task.status === "done").length;
  const name =
    typeof user?.user_metadata?.["full_name"] === "string"
      ? user.user_metadata["full_name"].split(" ")[0]
      : "there";

  return (
    <AppShell>
      <PageHeader
        title={`Good to see you, ${name}`}
        subtitle="A current view of work in your selected workspace."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 size-4" />
            New task
          </Button>
        }
      />
      {error && (
        <div
          role="alert"
          className="mb-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {loading ? (
        <div className="surface p-12 text-center text-sm text-muted-foreground" role="status">
          Loading workspace overview…
        </div>
      ) : (
        <>
          <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Open tasks",
                value: openTasks.length,
                hint: "Across this workspace",
                icon: ListTodo,
              },
              {
                label: "Assigned to me",
                value: mine.filter((task) => task.status !== "done").length,
                hint: "Still in progress",
                icon: Circle,
              },
              {
                label: "Projects",
                value: projects.filter((project) => project.status === "active").length,
                hint: "Active projects",
                icon: FolderKanban,
              },
              {
                label: "Completed",
                value: completed,
                hint: `${tasks.length ? Math.round((completed / tasks.length) * 100) : 0}% of workspace tasks`,
                icon: CheckCircle2,
              },
            ].map(({ label, value, hint, icon: Icon }) => (
              <article key={label} className="surface p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <Icon className="size-4 text-primary" />
                </div>
                <div className="mt-3 font-display text-3xl">{value}</div>
                <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
              </article>
            ))}
          </section>
          <div className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
            <section className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="font-semibold">Tasks due soon</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Due dates in the next seven days
                  </p>
                </div>
                <Link
                  to="/team-tasks"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                >
                  All tasks <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {dueSoon.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No upcoming task deadlines.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {dueSoon.slice(0, 8).map((task) => (
                    <li key={task.id}>
                      <button
                        onClick={() => setOpenTaskId(task.id)}
                        className="grid w-full gap-2 px-5 py-4 text-left hover:bg-muted/30 sm:grid-cols-[1fr_auto_auto] sm:items-center"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{task.title}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {projects.find((project) => project.id === task.projectId)?.name ??
                              "No project"}{" "}
                            ·{" "}
                            {task.due
                              ? new Date(`${task.due}T00:00:00`).toLocaleDateString()
                              : "No due date"}
                          </span>
                        </span>
                        <StatusBadge s={task.status} />
                        <PriorityBadge p={task.priority} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b p-5">
                <div>
                  <h2 className="font-semibold">Active projects</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Progress from completed tasks
                  </p>
                </div>
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary"
                >
                  Projects <ArrowRight className="size-3.5" />
                </Link>
              </div>
              {projects.filter((project) => project.status === "active").length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No active projects in this workspace.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {projects
                    .filter((project) => project.status === "active")
                    .slice(0, 6)
                    .map((project) => {
                      const projectTasks = tasks.filter((task) => task.projectId === project.id);
                      const done = projectTasks.filter((task) => task.status === "done").length;
                      const percent = projectTasks.length
                        ? Math.round((done / projectTasks.length) * 100)
                        : 0;
                      return (
                        <li key={project.id} className="p-5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-medium">{project.name}</h3>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {projectTasks.length} tasks · {members.length} workspace members
                              </p>
                            </div>
                            <span className="text-xs font-semibold">{percent}%</span>
                          </div>
                          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                          </div>
                        </li>
                      );
                    })}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
