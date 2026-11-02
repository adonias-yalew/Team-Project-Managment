import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";
import { TaskWorkspace } from "@/components/workspace/task-views";
import { useStore } from "@/lib/store";
import { CURRENT_USER_ID } from "@/lib/data";
export const Route = createFileRoute("/my-tasks")({
  head: () => ({ meta: [{ title: "My Tasks · WORKSPACE" }, { name: "description", content: "My Tasks in WORKSPACE." }, { property: "og:title", content: "My Tasks · WORKSPACE" }, { property: "og:description", content: "My Tasks in WORKSPACE." }] }),
  component: Page,
});

function Page() {
  const { tasks } = useStore();
  return (
    <AppShell>
      <PageHeader title="My Tasks" subtitle="Tasks assigned to you." />
      <TaskWorkspace tasks={tasks.filter((t) => t.assignees.includes(CURRENT_USER_ID))} />
    </AppShell>
  );
}
