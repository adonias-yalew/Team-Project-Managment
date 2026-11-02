import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";
import { TaskWorkspace } from "@/components/workspace/task-views";
import { useStore } from "@/lib/store";
import { CURRENT_USER_ID } from "@/lib/data";
export const Route = createFileRoute("/team-tasks")({
  head: () => ({ meta: [{ title: "Team Tasks · WORKSPACE" }, { name: "description", content: "Team Tasks in WORKSPACE." }, { property: "og:title", content: "Team Tasks · WORKSPACE" }, { property: "og:description", content: "Team Tasks in WORKSPACE." }] }),
  component: Page,
});

function Page() {
  const { tasks } = useStore();
  return (
    <AppShell>
      <PageHeader title="Team Tasks" subtitle="Everything the team is working on." />
      <TaskWorkspace tasks={tasks} showAssigneeFilter />
    </AppShell>
  );
}
