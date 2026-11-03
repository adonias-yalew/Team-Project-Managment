import { AppShell } from "@/components/workspace/app-shell";
import { PageHeader } from "@/components/workspace/primitives";
import { TaskWorkspace } from "@/components/workspace/task-views";
import { useStore } from "@/lib/store";

export function TeamTasksPage() {
  const { tasks } = useStore();

  return (
    <AppShell>
      <PageHeader title="Team Tasks" subtitle="Everything the team is working on." />
      <TaskWorkspace tasks={tasks} showAssigneeFilter />
    </AppShell>
  );
}
