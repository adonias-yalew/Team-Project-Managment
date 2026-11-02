import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";
import { TaskWorkspace } from "@/components/workspace/task-views";
import { useStore } from "@/lib/store";
import { CURRENT_USER_ID } from "@/lib/data";
export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Overview · WORKSPACE" }, { name: "description", content: "Overview in WORKSPACE." }, { property: "og:title", content: "Overview · WORKSPACE" }, { property: "og:description", content: "Overview in WORKSPACE." }] }),
  component: Page,
});

function Page() {
  const { tasks } = useStore();
  return (
    <AppShell>
      <PageHeader title="Overview" subtitle="Your week at a glance." />
      <TaskWorkspace tasks={tasks.filter((t) => t.assignees.includes(CURRENT_USER_ID))} />
    </AppShell>
  );
}
